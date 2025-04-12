/**
 * Policy module for DDD framework
 *
 * Policies (Event Handlers) subscribe to one or more events and process them
 * in FIFO order for a single aggregate ID.
 */
import type { EventEnvelope } from "./event";

/**
 * Policy configuration type
 */
export interface PolicyConfig<E extends EventEnvelope<string, any>> {
  /**
   * The events this policy subscribes to
   */
  on: readonly ((payload: any) => E)[];
}

/**
 * Policy handler function type
 */
export type PolicyHandler<E extends EventEnvelope<string, any>> = (
  event: E
) => Promise<void>;

/**
 * Policy function type
 */
export type PolicyFunction<
  T extends string,
  E extends EventEnvelope<string, any>,
> = {
  /**
   * The name of the policy
   */
  readonly name: T;

  /**
   * The events this policy subscribes to
   */
  readonly events: readonly ((payload: any) => E)[];

  /**
   * The handler function for this policy
   */
  readonly handler: PolicyHandler<E>;

  /**
   * Process an event
   */
  process: (event: E) => Promise<void>;
};

/**
 * Policy creator function
 *
 * @param name The name of the policy
 * @param config The configuration for the policy
 * @param handler The policy handler function
 * @returns The policy function
 */
export function policy<T extends string, E extends EventEnvelope<string, any>>(
  name: T,
  config: PolicyConfig<E>,
  handler: PolicyHandler<E>
): PolicyFunction<T, E> {
  /**
   * Process an event
   *
   * @param event The event to process
   */
  const process = async (event: E): Promise<void> => {
    // Check if this policy should handle this event
    const shouldHandle = config.on.some((eventFactory) => {
      // In a real implementation, we would check the event type more reliably
      return event.type === eventFactory({} as any).type;
    });

    if (shouldHandle) {
      // Handle the event
      await handler(event);
    }
  };

  return {
    name,
    events: config.on,
    handler,
    process,
  };
}
