import type { Context } from "../context.ts";
import {
  Resource,
  ResourceKind,
  ResourceID,
  ResourceFQN,
  ResourceScope,
  ResourceSeq,
} from "../resource.ts";
import { Scope } from "../scope.ts";
import {
  createSupabaseApi,
  type SupabaseApiOptions,
  type SupabaseApi,
} from "./api.ts";
import { handleApiError } from "./api-error.ts";

export interface FunctionProps extends SupabaseApiOptions {
  projectRef: string;
  name?: string;
  body?: string;
  importMap?: Record<string, string>;
  entrypointUrl?: string;
  verifyJwt?: boolean;
  adopt?: boolean;
  delete?: boolean;
}

export interface FunctionResource extends Resource<"supabase::Function"> {
  id: string;
  slug: string;
  name: string;
  status: string;
  version: number;
  createdAt: string;
  updatedAt: string;
}

export function isFunction(resource: Resource): resource is FunctionResource {
  return resource[ResourceKind] === "supabase::Function";
}

export const Function = Resource(
  "supabase::Function",
  async function (
    this: Context<FunctionResource>,
    id: string,
    props: FunctionProps,
  ): Promise<FunctionResource> {
    const api = await createSupabaseApi(props);
    const name = props.name ?? id;

    if (this.phase === "delete") {
      const functionSlug = this.output?.slug;
      if (functionSlug && props.delete !== false) {
        await deleteFunction(api, props.projectRef, functionSlug);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output?.slug) {
      if (props.body) {
        await deployFunction(api, props.projectRef, this.output.slug, {
          body: props.body,
          import_map: props.importMap,
          entrypoint_url: props.entrypointUrl,
          verify_jwt: props.verifyJwt,
        });
      }
      const func = await getFunction(api, props.projectRef, this.output.slug);
      return this(func);
    }

    try {
      const func = await createFunction(api, props.projectRef, {
        slug: name,
        name,
        body: props.body,
        import_map: props.importMap,
        entrypoint_url: props.entrypointUrl,
        verify_jwt: props.verifyJwt,
      });
      return this(func);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingFunc = await findFunctionByName(
          api,
          props.projectRef,
          name,
        );
        if (!existingFunc) {
          throw new Error(
            `Failed to find existing function '${name}' for adoption`,
          );
        }
        return this(existingFunc);
      }
      throw error;
    }
  },
);

async function createFunction(
  api: SupabaseApi,
  projectRef: string,
  params: any,
): Promise<FunctionResource> {
  const response = await api.post(`/projects/${projectRef}/functions`, params);
  if (!response.ok) {
    await handleApiError(response, "creating", "function", params.name);
  }
  const data = await response.json();
  return mapFunctionResponse(data);
}

async function getFunction(
  api: SupabaseApi,
  projectRef: string,
  slug: string,
): Promise<FunctionResource> {
  const response = await api.get(`/projects/${projectRef}/functions/${slug}`);
  if (!response.ok) {
    await handleApiError(response, "getting", "function", slug);
  }
  const data = await response.json();
  return mapFunctionResponse(data);
}

async function deployFunction(
  api: SupabaseApi,
  projectRef: string,
  slug: string,
  params: any,
): Promise<void> {
  const response = await api.post(
    `/projects/${projectRef}/functions/${slug}/deploy`,
    params,
  );
  if (!response.ok) {
    await handleApiError(response, "deploying", "function", slug);
  }
}

async function deleteFunction(
  api: SupabaseApi,
  projectRef: string,
  slug: string,
): Promise<void> {
  const response = await api.delete(
    `/projects/${projectRef}/functions/${slug}`,
  );
  if (!response.ok && response.status !== 404) {
    await handleApiError(response, "deleting", "function", slug);
  }
}

async function findFunctionByName(
  api: SupabaseApi,
  projectRef: string,
  name: string,
): Promise<FunctionResource | null> {
  const response = await api.get(`/projects/${projectRef}/functions`);
  if (!response.ok) {
    await handleApiError(response, "listing", "functions");
  }
  const functions = (await response.json()) as any[];
  const match = functions.find((func: any) => func.name === name);
  return match ? mapFunctionResponse(match) : null;
}

function mapFunctionResponse(data: any): FunctionResource {
  return {
    [ResourceKind]: "supabase::Function",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::Function::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    slug: data.slug,
    name: data.name,
    status: data.status,
    version: data.version,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
