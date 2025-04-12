/**
 * Error module for DDD framework
 *
 * Custom typed errors for domain-specific error cases.
 */
import { z } from "zod";

/**
 * Base domain error class
 */
export class DomainError<
  T extends string,
  P extends Record<string, any>,
> extends Error {
  /**
   * The error type
   */
  readonly type: T;

  /**
   * The error payload
   */
  readonly payload: P;

  /**
   * Constructor
   *
   * @param type The error type
   * @param payload The error payload
   */
  constructor(type: T, payload: P) {
    // Generate a descriptive message
    const message = `${type}: ${JSON.stringify(payload)}`;

    super(message);

    this.type = type;
    this.payload = payload;
    this.name = type;

    // Capture the stack trace
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, this.constructor);
    }
  }
}

/**
 * Error creator function
 *
 * @param type The error type name
 * @param schema The schema object defining the error payload structure
 * @returns An error factory class
 */
export function error<
  T extends string,
  S extends z.ZodType<Record<string, any>>,
>(
  errorType: T,
  schema: S
): new (payload: z.infer<S>) => DomainError<T, z.infer<S>> {
  // Return a class that extends DomainError
  return class extends DomainError<T, z.infer<S>> {
    constructor(payload: z.infer<S>) {
      // Validate the payload against the schema
      const validatedPayload = schema.parse(payload);

      // Call the parent constructor
      super(errorType, validatedPayload);
    }
  };
}
