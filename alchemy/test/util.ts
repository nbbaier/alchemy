import fs from "node:fs/promises";
import os from "node:os";

/**
 * Check if a file or directory exists
 * Uses fs.access which is available in all Node.js versions
 */
export async function exists(path: string): Promise<boolean> {
  try {
    await fs.access(path);
    return true;
  } catch {
    return false;
  }
}

/**
 * Sanitize a string to be safe for AWS resource names
 * Replaces any characters that aren't alphanumeric, hyphen, or underscore
 */
function sanitizeForAwsResourceName(str: string): string {
  // Replace any character that's not alphanumeric, hyphen, or underscore with a hyphen
  return str.replace(/[^a-zA-Z0-9\-_]/g, "-");
}

/**
 * Branch prefix for resource names to avoid naming conflicts in CI/CD
 *
 * Uses BRANCH_PREFIX environment variable in CI/CD environments
 * Falls back to current user's name in local development
 * Sanitizes to ensure only valid characters for AWS resource names
 */
export const BRANCH_PREFIX = sanitizeForAwsResourceName(
  process.env.BRANCH_PREFIX || os.userInfo().username,
);

/**
 * Test helper that runs the same test for both standard workers and Workers for Platform
 * 
 * @param platforms Array of platform boolean values to test (typically [false, true])
 * @param testName Base name for the test (will be suffixed with "-wfp" for platform tests)
 * @param testHandler Function that receives scope and platform boolean
 * @returns Array of test functions that can be called with vitest's test() function
 */
export function testBothPlatforms<T extends any[]>(
  platforms: boolean[],
  testName: string,
  testHandler: (scope: any, isWFP: boolean, ...args: T) => Promise<void>,
): Array<{ name: string; handler: (scope: any, ...args: T) => Promise<void> }> {
  return platforms.map((platform) => ({
    name: platform ? `${testName} (WFP)` : testName,
    handler: async (scope: any, ...args: T) => {
      return testHandler(scope, platform, ...args);
    },
  }));
}
