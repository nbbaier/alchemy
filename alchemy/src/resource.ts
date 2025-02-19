import type { type } from "arktype";
import { alchemize } from "./alchemize";
import { type ApplyOptions, apply } from "./apply";
import type { DestroyOptions } from "./destroy";
import { defaultStateStore, deletions, providers } from "./global";
import type { Input as input } from "./input";
import { Output } from "./output";
import { Scope as IScope, getScope, pushScope } from "./scope";
import type { State, StateStore } from "./state";

export type ResourceID = string;
export type ResourceType = string;

export const ResourceID = Symbol.for("ResourceID");
export const Provider = Symbol.for("Provider");
export const Input = Symbol.for("Input");
export const Value = Symbol.for("Value");
export const Apply = Symbol.for("Apply");
export const Provide = Symbol.for("Provide");
export const Scope = Symbol.for("Scope");
export const Options = Symbol.for("Options");

// properties that pierce through the Proxy
const OrthogonalProperties = [
  ResourceID,
  Provider,
  Input,
  Value,
  Apply,
  Provide,
  Scope,
  Options,
] as const;

export type Resource<In = any, Out = any> = {
  [ResourceID]: string;
  [Provider]: Provider<any, any[], any>;
  [Input]: input<In>;
  [Value]?: Out;
  [Apply]: <O>(value: Out) => O;
  [Provide]: (value: Out) => void;
  [Options]: ProviderOptions;
} & Output<Out>;

export interface BaseContext {
  quiet: boolean;
  stage: string;
  resourceID: ResourceID;
  scope: IScope;
  get<T>(key: string): Promise<T | undefined>;
  set<T>(key: string, value: T): Promise<void>;
  delete<T>(key: string): Promise<T | undefined>;
  /**
   * Indicate that this resource is being replaced.
   * This will cause the resource to be deleted at the end of the stack's CREATE phase.
   */
  replace(): void;
}

export interface CreateContext extends BaseContext {
  event: "create";
}

export interface UpdateContext<In, Outputs> extends BaseContext {
  event: "update";
  input: In;
  output: Outputs;
}

export interface DeleteContext<In, Outputs> extends BaseContext {
  event: "delete";
  input: In;
  output: Outputs;
}

export type Context<In, Outputs> =
  | CreateContext
  | UpdateContext<In, Outputs>
  | DeleteContext<In, Outputs>;

export function isProvider(value: any): value is Provider {
  return typeof value === "function" && typeof value.type === "string";
}

export type ProviderOrThunk<P extends Provider = Provider> = P | (() => P);

export type ProviderInstance<T extends ProviderOrThunk> = T extends Provider
  ? InstanceType<T>
  : T extends () => Provider
    ? InstanceType<ReturnType<T>>
    : never;

export function resolveProvider<T extends ProviderOrThunk>(
  provider: T,
): Provider {
  return isProvider(provider) ? provider : provider();
}

export type Provider<
  Type extends ResourceType = ResourceType,
  In = any,
  Out = any,
> = {
  type: Type;
  input: type<In>;
  output: type<Out>;
  example?: string;
  update(
    stage: string,
    resource: Resource,
    deps: Set<ResourceID>,
    inputs: input<In>,
    stateStore: StateStore,
    options: ApplyOptions,
  ): Promise<Awaited<Out>>;
  delete(
    stage: string,
    scope: IScope | undefined,
    resourceID: ResourceID,
    state: State,
    inputs: input<In>,
    options: DestroyOptions,
  ): Promise<void>;
} & (new (
  id: string,
  // we allow arbitrary inputs at the end to allow for arbitrary dependency graph construction
  ...inputs: [input<In>, ...any[]]
) => Resource<In, Out>);

export function isResource(value: any): value is Resource {
  return value?.[ResourceID] !== undefined;
}

export type ResourceHandler<In, Out> = (
  ctx: Context<In, Out>,
  input: In,
  ...args: any[]
) => Promise<input<Out> | void> | input<Out> | void;

export interface ProviderOptions {
  /**
   * If true, the resource will be updated even if the inputs have not changed.
   */
  alwaysUpdate?: boolean;
  example?: string;
  input?: never;
  output?: never;
}

export interface TypedProviderOptions<
  Input extends type<any, any>,
  Output extends type<any, any>,
> {
  /**
   * If true, the resource will be updated even if the inputs have not changed.
   */
  alwaysUpdate?: boolean;
  example?: string;
  input: Input;
  output: Output;
}

export function Resource<
  const Type extends ResourceType,
  In extends type<any>,
  Out extends type<any>,
>(
  type: Type,
  options: TypedProviderOptions<In, Out>,
  func: ResourceHandler<type.infer<In>, type.infer<Out>>,
): Provider<Type, type.infer<In>, type.infer<Out>>;

export function Resource<const Type extends ResourceType, In, Out>(
  type: Type,
  options: ProviderOptions,
  func: ResourceHandler<In, Out>,
): Provider<Type, In, Out> & {
  input: In;
  output: Out;
};

export function Resource<const Type extends ResourceType, In, Out>(
  type: Type,
  func: ResourceHandler<In, Out>,
): Provider<Type, In, Awaited<Out>>;

export function Resource<const Type extends ResourceType, In, Out>(
  type: Type,
  ...args:
    | [TypedProviderOptions<any, any>, ResourceHandler<any, any>]
    | [ProviderOptions, ResourceHandler<In, Out>]
    | [ResourceHandler<In, Out>]
): Provider<Type, In, Awaited<Out>> {
  if (providers.has(type)) {
    throw new Error(`Resource ${type} already exists`);
  }
  const [options, func] = args.length === 2 ? args : [undefined, args[0]];

  interface Resource {
    [ResourceID]: ResourceID;
    [Provider]: Provider<Type, In, Out>;
    [Input]: [input<In>, ...any[]];
    [Value]?: Out;
    [Scope]: IScope;
    [Options]: ProviderOptions;
  }

  class Resource {
    static readonly type = type;
    static readonly input = options?.input;
    static readonly output = options?.output;

    constructor(id: ResourceID, input: input<In>, ...args: any[]) {
      const scope = getScope();
      const node = {
        provider: Resource,
        resource: this,
      } as const;

      if (scope.nodes.has(id)) {
        // TODO(sam): do we want to throw?
        // it's kind of awesome that you can re-create a resource and call apply
        // console.warn(`Resource ${id} already exists in the stack: ${stack.id}`);
      }
      scope.nodes.set(id, node as any);

      this[ResourceID] = id;
      this[Provider] = Resource as any;
      this[Input] = [input, ...args];
      this[Value] = undefined;
      this[Scope] = scope;
      this[Provide] = (value: Out) => {
        this[Value] = value;
      };
      this[Options] = {
        alwaysUpdate: options?.alwaysUpdate ?? false,
      };

      return new Proxy(this, {
        // TODO(sam): this won't work for the sub-class (class Table extends Resource)
        getPrototypeOf() {
          return Resource.prototype;
        },
        get(target: any, prop) {
          if (OrthogonalProperties.includes(prop as any)) {
            return target[prop];
          } else {
            return target[Apply]((value: Out) => value[prop as keyof Out]);
          }
        },
      });
    }

    public [Apply]<U>(fn: (value: Out) => U): Output<U> {
      return new Output<Out, U>(this as any, fn);
    }

    private box?: {
      value: Out;
    } = undefined;

    public [Provide](value: Out) {
      if (this.box) {
        throw new Error(`Output ${this[ResourceID]} already has a value`);
      }
      this.box = { value };
      const subscribers = this.subscribers;
      this.subscribers = [];
      subscribers.forEach((fn) => fn(value));
    }

    private subscribers: ((value: Out) => void)[] = [];

    /**
     * @internal
     */
    public subscribe(fn: (value: Out) => Promise<void>) {
      if (this.box) {
        fn(this.box.value);
      } else {
        this.subscribers.push(fn);
      }
    }

    static async update(
      stage: string,
      resource: Resource,
      deps: Set<ResourceID>,
      inputs: [In, ...any[]],
      stateStore: StateStore,
      options: ApplyOptions,
    ): Promise<Awaited<Out | void>> {
      // const stack = resource[ResourceStack];
      const resourceID = resource[ResourceID];

      let resourceState: State | undefined = await stateStore.get(resourceID);
      if (resourceState === undefined) {
        resourceState = {
          provider: type,
          status: "creating",
          data: {},
          output: undefined,
          deps: [...deps],
          inputs,
        };
        await stateStore.set(resourceID, resourceState);
      }

      const resourceFQN = `${resource[Scope].getScopePath(stage)}/${resourceID}`;

      // Skip update if inputs haven't changed and resource is in a stable state
      if (
        resourceState.status === "created" ||
        resourceState.status === "updated"
      ) {
        if (
          JSON.stringify(resourceState.inputs) === JSON.stringify(inputs) &&
          !resource[Options].alwaysUpdate
        ) {
          if (!options?.quiet) {
            console.log(`Skip:    ${resourceFQN} (no changes)`);
          }
          if (resourceState.output !== undefined) {
            resource[Provide](resourceState.output);
          }
          return resourceState.output;
        }
      }

      const event = resourceState.status === "creating" ? "create" : "update";
      resourceState.status = event === "create" ? "creating" : "updating";
      resourceState.oldInputs = resourceState.inputs;
      resourceState.inputs = inputs;

      if (!options?.quiet) {
        console.log(
          `${event === "create" ? "Create" : "Update"}:  ${resourceFQN}`,
        );
      }

      await stateStore.set(resourceID, resourceState);

      let isReplaced = false;

      const quiet = options.quiet ?? false;

      const evaluated = await pushScope(
        resource[Scope],
        resourceID,
        async () => {
          const result = await func(
            {
              stage,
              resourceID,
              event,
              scope: getScope(),
              input: resourceState.inputs[0],
              output: resourceState.output,
              replace: () => {
                if (isReplaced) {
                  console.warn(
                    `Resource ${type} ${resourceFQN} is already marked as REPLACE`,
                  );
                  return;
                }
                isReplaced = true;
                deletions.push({
                  id: resourceID,
                  data: {
                    ...resourceState!.data,
                  },
                  inputs: inputs,
                });
              },
              get: (key) => resourceState!.data[key],
              set: async (key, value) => {
                resourceState!.data[key] = value;
                await stateStore.set(resourceID, resourceState!);
              },
              delete: async (key) => {
                const value = resourceState!.data[key];
                delete resourceState!.data[key];
                await stateStore.set(resourceID, resourceState!);
                return value;
              },
              quiet,
            },
            ...inputs,
          );

          if (result === undefined) {
            return undefined;
          }

          const evaluated = await apply(result as Out, {
            stage,
            scope: getScope(),
            quiet,
          });

          return evaluated;
        },
      );

      if (!options?.quiet) {
        console.log(
          `${event === "create" ? "Created" : "Updated"}: ${resourceFQN}`,
        );
      }
      await stateStore.set(resourceID, {
        provider: type,
        data: resourceState.data,
        status: event === "create" ? "created" : "updated",
        output: evaluated,
        inputs,
        deps: [...deps],
      });
      if (evaluated !== undefined) {
        resource[Provide](evaluated);
      }
      return evaluated;
    }

    static async delete(
      stage: string,
      scope: IScope,
      resourceID: ResourceID,
      state: State,
      inputs: [In, ...any[]],
      options: DestroyOptions,
    ) {
      const resourceFQN = `${scope.getScopePath(stage)}/${resourceID}`;
      const nestedScope = new IScope(resourceID, scope);

      await alchemize({
        mode: "destroy",
        stage,
        scope: nestedScope,
        // TODO(sam): should use the appropriate state store
        stateStore: defaultStateStore,
        quiet: options.quiet,
      });

      if (!options?.quiet) {
        console.log(`Delete:  ${resourceFQN}`);
      }

      await func(
        {
          stage,
          scope,
          resourceID: resourceID,
          event: "delete",
          input: state.inputs[0],
          output: state.output,
          replace() {
            throw new Error("Cannot replace a resource that is being deleted");
          },
          get: (key) => {
            return state.data[key];
          },
          set: async (key, value) => {
            state.data[key] = value;
          },
          delete: async (key) => {
            const value = state.data[key];
            delete state.data[key];
            return value;
          },
          quiet: options.quiet ?? false,
        },
        ...inputs,
      );

      if (!options?.quiet) {
        console.log(`Deleted: ${resourceFQN}`);
      }
    }
  }
  providers.set(type, Resource as any);
  return Resource as any;
}
