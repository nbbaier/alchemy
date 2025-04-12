/**
 * Aggregate module for DDD framework
 *
 * An Aggregate is a consistency boundary modeled as a database schema.
 * It has a primary key (record ID) that uniquely identifies it.
 */
import { z } from "zod";
import type { DomainEvent, EventDefinition } from "./event";

/**
 * Reducer function type
 */
export type Reducer<S, E> = (state: S | undefined, event: E) => S;

/**
 * Aggregate configuration type
 */
export interface AggregateConfig<
  S extends z.ZodType,
  E extends readonly EventDefinition<string, any>[],
> {
  /**
   * The schema definition for the aggregate
   */
  schema: S;

  /**
   * The list of event types handled by this aggregate
   */
  events: E;
}

/**
 * Aggregate function type
 */
export type AggregateFunction<T extends string, S extends z.ZodType, E> = {
  /**
   * The name of the aggregate
   */
  readonly name: T;

  /**
   * The schema of the aggregate
   */
  readonly schema: S;

  /**
   * The events handled by this aggregate
   */
  readonly events: E;

  /**
   * The reducer function for this aggregate
   */
  readonly reducer: Reducer<z.infer<S>, E>;
};

/**
 * Aggregate creator function
 *
 * @param name The name of the aggregate
 * @param config The configuration for the aggregate
 * @param reducer The reducer function for the aggregate
 * @returns The aggregate function
 */
export function aggregate<
  T extends string,
  S extends z.ZodType,
  E extends readonly EventDefinition<string, any>[],
>(
  name: T,
  config: AggregateConfig<S, E>,
  reducer: Reducer<z.infer<S>, DomainEvent<E[number]>>
): AggregateFunction<T, S, E> {
  return {
    name,
    schema: config.schema,
    events: config.events,
    reducer,
  };
}
