/**
 * Command module for DDD framework
 *
 * Commands are actions that can be applied to an Aggregate. Each Command:
 * - Has a defined input schema
 * - Acts atomically on a single Aggregate record
 * - Produces one or more Events
 */
import { z } from "zod";
import type { AggregateFunction } from "./aggregate";
import type { DomainEvent, EventEnvelope } from "./event";

/**
 * Command handler function type
 */
export type CommandHandler<A, I, E> = (
  state: A | undefined,
  input: I
) => Promise<E | E[]>;

/**
 * Command configuration type
 */
export interface CommandConfig<
  A,
  S extends z.ZodType,
  E extends EventEnvelope<string, any>,
> {
  /**
   * The aggregate this command acts on
   */
  aggregate: AggregateFunction<string, z.ZodType, E>;

  /**
   * The input schema for the command
   */
  input: S;
}

/**
 * Command function type
 */
export type CommandFunction<
  T extends string,
  A,
  I,
  E extends EventEnvelope<string, any>,
> = {
  /**
   * The name of the command
   */
  readonly name: T;

  /**
   * The aggregate this command acts on
   */
  readonly aggregate: AggregateFunction<string, z.ZodType, E>;

  /**
   * The input schema for the command
   */
  readonly inputSchema: z.ZodType<I>;

  /**
   * Execute the command
   */
  execute: (aggregateId: string, input: I) => Promise<E | E[]>;
};

/**
 * Command creator function
 *
 * @param name The name of the command
 * @param config The configuration for the command
 * @param handler The command handler function
 * @returns The command function
 */
export function command<
  T extends string,
  S extends z.ZodType,
  A extends AggregateFunction<string, z.ZodType, DomainEvent<E>>,
  E extends EventEnvelope<string, any>,
>(
  name: T,
  config: CommandConfig<z.infer<A["schema"]>, S, E>,
  handler: CommandHandler<z.infer<A["schema"]>, z.infer<S>, E>
): CommandFunction<T, z.infer<A["schema"]>, z.infer<S>, E> {
  const inputSchema = config.input;
  const aggregate = config.aggregate;

  /**
   * Command execution function
   *
   * @param aggregateId The ID of the aggregate to act on
   * @param input The input for the command
   * @returns The event(s) resulting from the command
   */
  const execute = async (
    aggregateId: string,
    input: z.infer<S>
  ): Promise<E | E[]> => {
    // Validate the input
    const validatedInput = inputSchema.parse(input);

    // Here in a real implementation, we would:
    // 1. Load the current state of the aggregate (if it exists)
    // 2. Call the handler with the aggregate state and input
    // 3. Validate and store the resulting event(s)
    // 4. Return the event(s)

    // Get the current state of the aggregate (mock implementation)
    // In a real scenario, this would query a database/event store
    const currentState = undefined; // For example purposes; would be loaded from storage

    // Call the handler
    const events = await handler(currentState, validatedInput);

    // Return the events
    return events;
  };

  return {
    name,
    aggregate,
    inputSchema,
    execute,
  };
}
