import { Effect } from "effect";
import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";

/**
 * Creates a Resource that uses Effect throughout the entire lifecycle
 *
 * This wrapper allows resources to be implemented using Effect's declarative
 * flow control features while maintaining compatibility with the existing
 * Resource interface that expects Promise return types.
 * 
 * For delete operations, the effectHandler should handle the deletion logic
 * but NOT call context.destroy() - this wrapper will handle that at the
 * Resource level after the Effect completes successfully.
 */
export function EffectResource<T extends Resource<string>, P>(
  type: string,
  effectHandler: (
    context: Context<T>,
    id: string,
    props: P,
  ) => Effect.Effect<T | null, any>,
) {
  return Resource(
    type,
    async function (this: Context<T>, id: string, props: P): Promise<T> {
      const result = await Effect.runPromise(effectHandler(this, id, props));
      
      // Handle the delete case where effectHandler returns null
      if (result === null) {
        return this.destroy();
      }
      
      return result;
    },
  );
}
