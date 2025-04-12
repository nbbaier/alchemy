/**
 * Generate a unique ID with an optional prefix
 *
 * @param prefix Optional prefix for the ID
 * @returns A unique ID string
 */
export function generateId(prefix?: string): string {
  // Generate a random ID
  const randomId = Math.random().toString(36).substring(2, 15);

  // Return with optional prefix
  return prefix ? `${prefix}-${randomId}` : randomId;
}
