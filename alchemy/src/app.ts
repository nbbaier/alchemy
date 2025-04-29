import type { RunOptions } from "./alchemy";
import { Scope, type ScopeOptions } from "./scope";

export interface AppOptions extends Omit<ScopeOptions, "parent"> {}

export class App extends Scope {
  constructor(options: AppOptions) {
    super({
      ...options,
      parent: null,
    });
  }

  /**
   * Create a new Stack inside this Scope.
   */
  public stack(id: string): Scope;

  /**
   * Run a function inside this Scope.
   */
  public stack<T>(fn: (scope: Scope) => Promise<T>): Promise<T>;
  /**
   * Create and run a new Scope inside this Scope.
   */
  public stack<T>(id: string, fn: (scope: Scope) => Promise<T>): Promise<T>;
  /**
   * Create and run a new Scope inside this Scope (with configured options).
   */
  public stack<T>(
    id: string,
    options: RunOptions,
    fn: (scope: Scope) => Promise<T>
  ): Promise<T>;

  public stack<T>(
    ...args:
      | [id: string]
      | [fn: (scope: Scope) => Promise<T>]
      | [id: string, fn: (scope: Scope) => Promise<T>]
      | [id: string, options: RunOptions, fn: (scope: Scope) => Promise<T>]
  ): Promise<T> | Scope {
    if (args.length === 1 && typeof args[0] === "string") {
      return this.enter(args[0]);
    }
    // @ts-ignore
    return this.run(...args);
  }
}
