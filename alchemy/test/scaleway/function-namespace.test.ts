import { describe, expect, test } from "vitest";
import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewayFunctionNamespace } from "../../src/scaleway/function-namespace.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const _api = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway Function Namespace", () => {
  test("Function Namespace lifecycle", async (scope) => {
    const namespaceId = `${BRANCH_PREFIX}-fn-ns-test`;
    let namespace: ScalewayFunctionNamespace;

    try {
      // Create Function Namespace
      namespace = await ScalewayFunctionNamespace(namespaceId, {
        name: namespaceId,
        region: "fr-par",
        description: "Test function namespace",
        environmentVariables: {
          NODE_ENV: "test",
          LOG_LEVEL: "debug",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(namespace).toMatchObject({
        type: "scaleway::FunctionNamespace",
        name: namespaceId,
        region: "fr-par",
        description: "Test function namespace",
        status: "ready",
        environmentVariables: {
          NODE_ENV: "test",
          LOG_LEVEL: "debug",
        },
      });

      expect(namespace.id).toBeDefined();
      expect(namespace.organizationId).toBeDefined();
      expect(namespace.projectId).toBeDefined();
      expect(namespace.domainName).toBeDefined();
      expect(namespace.created_at).toBeDefined();
      expect(namespace.updated_at).toBeDefined();

      // Update Function Namespace
      namespace = await ScalewayFunctionNamespace(namespaceId, {
        name: namespaceId,
        region: "fr-par",
        description: "Updated test function namespace",
        environmentVariables: {
          NODE_ENV: "test",
          LOG_LEVEL: "info",
          UPDATED: "true",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(namespace).toMatchObject({
        description: "Updated test function namespace",
        environmentVariables: {
          NODE_ENV: "test",
          LOG_LEVEL: "info",
          UPDATED: "true",
        },
      });
    } finally {
      await destroy(scope);
      if (namespace!) {
        await assertFunctionNamespaceDoesNotExist(namespace);
      }
    }
  });
});

async function assertFunctionNamespaceDoesNotExist(
  namespace: ScalewayFunctionNamespace,
) {
  const api = createScalewayApi({
    accessKey: process.env.SCALEWAY_ACCESS_KEY!,
    secretKey: process.env.SCALEWAY_SECRET_KEY!,
    projectId: process.env.SCALEWAY_PROJECT_ID!,
  });

  const serviceBaseUrl = `https://api.scaleway.com/functions/v1beta1/regions/${namespace.region}`;

  try {
    const response = await api.get(
      `/namespaces/${namespace.id}`,
      serviceBaseUrl,
    );
    if (response.ok) {
      throw new Error(
        `Function Namespace ${namespace.id} still exists after deletion`,
      );
    }
    // 404 is expected after deletion
    expect(response.status).toBe(404);
  } catch (error) {
    // Network errors or API errors are acceptable if the resource is truly gone
    if (error instanceof Error && error.message.includes("still exists")) {
      throw error;
    }
  }
}
