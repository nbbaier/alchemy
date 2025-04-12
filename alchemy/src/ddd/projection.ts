/**
 * Projection module for DDD framework
 *
 * Projections create read models from events for optimized querying.
 */
import type { EventEnvelope } from "./event";

/**
 * Repository interface for a projection to interact with a database
 */
export interface ProjectionRepository {
  /**
   * Save data to a collection
   *
   * @param collection The collection name
   * @param id The document ID
   * @param data The data to save
   */
  save: (
    collection: string,
    id: string,
    data: Record<string, any>
  ) => Promise<void>;

  /**
   * Update existing data in a collection
   *
   * @param collection The collection name
   * @param id The document ID
   * @param data The data to update
   */
  update: (
    collection: string,
    id: string,
    data: Record<string, any>
  ) => Promise<void>;

  /**
   * Delete data from a collection
   *
   * @param collection The collection name
   * @param id The document ID
   */
  delete: (collection: string, id: string) => Promise<void>;

  /**
   * Get data from a collection
   *
   * @param collection The collection name
   * @param id The document ID
   */
  get: (collection: string, id: string) => Promise<Record<string, any> | null>;

  /**
   * Query data from a collection
   *
   * @param collection The collection name
   * @param query The query
   */
  query: (
    collection: string,
    query: Record<string, any>
  ) => Promise<Record<string, any>[]>;
}

/**
 * Projection handler function type
 */
export type ProjectionHandler<E extends EventEnvelope<string, any>> = (
  event: E,
  repository: ProjectionRepository
) => Promise<void>;

/**
 * Projection configuration type
 */
export interface ProjectionConfig<E extends EventEnvelope<string, any>> {
  /**
   * The events this projection handles
   */
  events: readonly ((payload: any) => E)[];
}

/**
 * Projection function type
 */
export type ProjectionFunction<
  T extends string,
  E extends EventEnvelope<string, any>,
> = {
  /**
   * The name of the projection
   */
  readonly name: T;

  /**
   * The events this projection handles
   */
  readonly events: readonly ((payload: any) => E)[];

  /**
   * The handler function for this projection
   */
  readonly handler: ProjectionHandler<E>;

  /**
   * Process an event
   */
  process: (event: E, repository: ProjectionRepository) => Promise<void>;
};

/**
 * Projection creator function
 *
 * @param name The name of the projection
 * @param config The configuration for the projection
 * @param handler The projection handler function
 * @returns The projection function
 */
export function projection<
  T extends string,
  E extends EventEnvelope<string, any>,
>(
  name: T,
  config: ProjectionConfig<E>,
  handler: ProjectionHandler<E>
): ProjectionFunction<T, E> {
  /**
   * Process an event
   *
   * @param event The event to process
   * @param repository The repository to use
   */
  const process = async (
    event: E,
    repository: ProjectionRepository
  ): Promise<void> => {
    // Check if this projection should handle this event
    const shouldHandle = config.events.some((eventFactory) => {
      // Check if the event type matches any of the event types this projection handles
      return event.type === eventFactory({} as any).type;
    });

    if (shouldHandle) {
      // Handle the event
      await handler(event, repository);
    }
  };

  return {
    name,
    events: config.events,
    handler,
    process,
  };
}
