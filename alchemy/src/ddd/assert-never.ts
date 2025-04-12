/**
 * Utility function for exhaustiveness checking
 *
 * This helps ensure at compile time that all variants of a discriminated union
 * are handled in conditional statements. When used in an else clause or at the end
 * of a series of if/else if statements, it will cause a TypeScript error if any
 * case is not handled.
 *
 * @example
 * if (event.type === "EventType1") {
 *   // handle EventType1
 * } else if (event.type === "EventType2") {
 *   // handle EventType2
 * } else {
 *   // TypeScript will error if there are other event types not handled
 *   assertNever(event);
 * }
 *
 * @param value A value that should be of type `never`
 * @returns Never returns, always throws an error
 */
export function assertNever(value: never): never {
  throw new Error(
    `Unhandled discriminated union member: ${JSON.stringify(value)}`
  );
}
