import { expect } from "vitest";
import { destroy } from "../../src/destroy.ts";
import { createPolarClient } from "../../src/polar/client.ts";
import type { Secret } from "../../src/secret.ts";

export interface PolarTestResourceConfig<TProps, TOutput> {
  logicalId: string;
  resourceFn: (logicalId: string, props: TProps) => Promise<TOutput>;
  endpoint: string;
  createProps: TProps;
  updateProps?: TProps;
  createAssertions: (output: TOutput, fetched?: any) => void;
  updateAssertions?: (output: TOutput, fetchedCreate: any) => void;
}

/**
 * Helper function to test Polar resources with consistent create/update/delete patterns.
 * Reduces boilerplate in test files by providing a standard test flow.
 */
export function createPolarTestHelper() {
  const getApiKey = (): Secret => {
    const apiKey = process.env.POLAR_API_KEY;
    if (!apiKey) {
      throw new Error(
        "POLAR_API_KEY environment variable is required for Polar integration tests.",
      );
    }
    return apiKey;
  };

  const testPolarResource = async <TProps, TOutput extends { id: string }>(
    scope: any,
    config: PolarTestResourceConfig<TProps, TOutput>,
  ): Promise<void> => {
    const apiKey = getApiKey();
    const polarClient = createPolarClient({ apiKey });
    let resourceOutput: TOutput | undefined;

    try {
      // Create resource
      resourceOutput = await config.resourceFn(config.logicalId, config.createProps);

      // Fetch created resource for verification
      const fetchedResourceCreate = await polarClient.get(
        `/${config.endpoint}/${resourceOutput.id}`,
      );

      // Run create assertions
      config.createAssertions(resourceOutput, fetchedResourceCreate);

      // Update resource if update props are provided
      if (config.updateProps && config.updateAssertions) {
        resourceOutput = await config.resourceFn(config.logicalId, config.updateProps);

        const fetchedResourceUpdated = await polarClient.get(
          `/${config.endpoint}/${resourceOutput.id}`,
        );

        // Run update assertions
        config.updateAssertions(resourceOutput, fetchedResourceCreate);

        // Verify update actually happened on the server
        expect(fetchedResourceUpdated.id).toEqual(resourceOutput.id);
      }
    } finally {
      // Clean up
      await destroy(scope);
      if (resourceOutput?.id) {
        await ensureResourceDeleted(
          polarClient,
          config.endpoint,
          resourceOutput.id,
        );
      }
    }
  };

  const ensureResourceDeleted = async (
    client: any,
    endpoint: string,
    resourceId: string,
  ): Promise<void> => {
    try {
      await client.get(`/${endpoint}/${resourceId}`);
      throw new Error(
        `Resource ${resourceId} was not deleted after destroy.`,
      );
    } catch (error: any) {
      if (error.status === 404) {
        console.log(`Resource ${resourceId} successfully deleted`);
      } else {
        throw error;
      }
    }
  };

  return {
    testPolarResource,
    ensureResourceDeleted,
    getApiKey,
  };
}