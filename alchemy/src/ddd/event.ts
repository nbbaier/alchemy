/**
 * Event module for DDD framework
 *
 * Events represent facts that have occurred in the domain. They are immutable
 * and serve as the basis for event sourcing.
 */
import { z } from "zod";
import { generateId } from "./generate-id";

/**
 * Extract the event type from an EventDefinition
 */
export type DomainEvent<T extends EventDefinition<string, any>> =
  | EventEnvelope<T["type"], z.infer<T["schema"]>>
  | {
      type: never;
    };

/**
 * Base event interface
 */
export interface EventEnvelope<T extends string, P> {
  type: T;
  payload: P;
  timestamp: number;
  id: string;
}

/**
 * Event definition interface
 */
export interface EventDefinition<T extends string, S extends z.ZodType> {
  type: T;
  schema: S;
  (payload: z.infer<S>): EventEnvelope<T, z.infer<S>>;
  new (payload: z.infer<S>): EventEnvelope<T, z.infer<S>>;
}

/**
 * Event creator function
 *
 * @param type The event type name
 * @param schema The schema object defining the event payload structure
 * @returns An event definition object with schema and create function
 */
export function event<T extends string, S extends z.ZodType>(
  type: T,
  schema: S
): EventDefinition<T, S> {
  function create(payload: z.infer<S>) {
    return {
      type,
      payload,
      timestamp: Date.now(),
      id: generateId(),
    };
  }
  create.type = type;
  create.schema = schema;

  return create as EventDefinition<T, S>;
}
