/**
 * Domain-Driven Design (DDD) Framework
 *
 * A convention-based approach to building event-driven systems for business problems
 * inspired by Domain Driven Design, Event Storming, and Event Sourcing.
 */

// Export all modules
export { aggregate } from "./aggregate";
export { command } from "./command";
export { error } from "./error";
export { event } from "./event";
export { policy } from "./policy";
export { projection } from "./projection";
export { saga } from "./saga";

// Export types
export type { AggregateConfig, AggregateFunction, Reducer } from "./aggregate";
export type { CommandConfig, CommandFunction, CommandHandler } from "./command";
export type { DomainError } from "./error";
export type { EventEnvelope as DomainEvent } from "./event";
export type { PolicyConfig, PolicyFunction, PolicyHandler } from "./policy";
export type {
  ProjectionConfig,
  ProjectionFunction,
  ProjectionHandler,
  ProjectionRepository,
} from "./projection";
export type {
  SagaConfig,
  SagaContext,
  SagaFunction,
  SagaHandler,
  SagaStepResult,
} from "./saga";
