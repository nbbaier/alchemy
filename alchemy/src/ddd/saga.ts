/**
 * Saga module for DDD framework
 *
 * Sagas orchestrate processes that span multiple aggregates.
 * They react to events and may issue commands to different aggregates.
 */
import type { CommandFunction } from "./command";
import type { EventEnvelope } from "./event";

/**
 * Result of a saga step, which can be either a command to execute
 * or nothing (undefined)
 */
export type SagaStepResult<C> = C | C[] | void;

/**
 * Saga handler function type
 */
export type SagaHandler<E extends EventEnvelope<string, any>, C> = (
  event: E,
  context: SagaContext
) => Promise<SagaStepResult<C>>;

/**
 * Context object for saga execution
 */
export interface SagaContext {
  /**
   * Get saga state by key
   */
  getState: <T>(key: string) => Promise<T | undefined>;

  /**
   * Set saga state by key
   */
  setState: <T>(key: string, value: T) => Promise<void>;

  /**
   * Clear saga state by key
   */
  clearState: (key: string) => Promise<void>;
}

/**
 * Saga configuration type
 */
export interface SagaConfig<E extends EventEnvelope<string, any>, C> {
  /**
   * The events this saga reacts to
   */
  events: readonly ((payload: any) => E)[];

  /**
   * The commands this saga can issue
   */
  commands: readonly C[];
}

/**
 * Saga function type
 */
export type SagaFunction<
  T extends string,
  E extends EventEnvelope<string, any>,
  C,
> = {
  /**
   * The name of the saga
   */
  readonly name: T;

  /**
   * The events this saga reacts to
   */
  readonly events: readonly ((payload: any) => E)[];

  /**
   * The commands this saga can issue
   */
  readonly commands: readonly C[];

  /**
   * The handler function for this saga
   */
  readonly handler: SagaHandler<E, C>;

  /**
   * Process an event
   */
  process: (event: E, context: SagaContext) => Promise<SagaStepResult<C>>;
};

/**
 * Saga creator function
 *
 * @param name The name of the saga
 * @param config The configuration for the saga
 * @param handler The saga handler function
 * @returns The saga function
 */
export function saga<
  T extends string,
  E extends EventEnvelope<string, any>,
  C extends CommandFunction<string, any, any, any>,
>(
  name: T,
  config: SagaConfig<E, C>,
  handler: SagaHandler<E, C>
): SagaFunction<T, E, C> {
  /**
   * Process an event
   *
   * @param event The event to process
   * @param context The saga context
   */
  const process = async (
    event: E,
    context: SagaContext
  ): Promise<SagaStepResult<C>> => {
    // Check if this saga should handle this event
    const shouldHandle = config.events.some((eventFactory) => {
      // Check if the event type matches any of the event types this saga handles
      return event.type === eventFactory({} as any).type;
    });

    if (shouldHandle) {
      // Handle the event
      return await handler(event, context);
    }
  };

  return {
    name,
    events: config.events,
    commands: config.commands,
    handler,
    process,
  };
}
