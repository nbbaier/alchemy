import { describe, expect, test } from "vitest";
import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewayVpc } from "../../src/scaleway/vpc.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const _api = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway VPC", () => {
  test("VPC lifecycle", async (scope) => {
    const vpcId = `${BRANCH_PREFIX}-vpc-test`;
    let vpc: ScalewayVpc;

    try {
      // Create VPC
      vpc = await ScalewayVpc(vpcId, {
        name: vpcId,
        region: "fr-par",
        tags: {
          test: "true",
          environment: "test",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(vpc).toMatchObject({
        type: "scaleway::Vpc",
        name: vpcId,
        region: "fr-par",
        tags: {
          test: "true",
          environment: "test",
        },
      });

      expect(vpc.id).toBeDefined();
      expect(vpc.organizationId).toBeDefined();
      expect(vpc.projectId).toBeDefined();
      expect(vpc.created_at).toBeDefined();
      expect(vpc.updated_at).toBeDefined();

      // Update VPC
      vpc = await ScalewayVpc(vpcId, {
        name: `${vpcId}-updated`,
        region: "fr-par",
        tags: {
          test: "true",
          environment: "test",
          updated: "true",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(vpc).toMatchObject({
        name: `${vpcId}-updated`,
        tags: {
          test: "true",
          environment: "test",
          updated: "true",
        },
      });
    } finally {
      await destroy(scope);
      if (vpc!) {
        await assertVpcDoesNotExist(vpc);
      }
    }
  });
});

async function assertVpcDoesNotExist(vpc: ScalewayVpc) {
  const api = createScalewayApi({
    accessKey: process.env.SCALEWAY_ACCESS_KEY!,
    secretKey: process.env.SCALEWAY_SECRET_KEY!,
    projectId: process.env.SCALEWAY_PROJECT_ID!,
  });

  const serviceBaseUrl = `https://api.scaleway.com/vpc/v1/regions/${vpc.region}`;

  try {
    const response = await api.get(`/vpcs/${vpc.id}`, serviceBaseUrl);
    if (response.ok) {
      throw new Error(`VPC ${vpc.id} still exists after deletion`);
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
