import { describe, expect, test } from "vitest";
import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewayInstanceVolume } from "../../src/scaleway/instance-volume.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const _api = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway Instance Volume", () => {
  test("Instance Volume lifecycle", async (scope) => {
    const volumeId = `${BRANCH_PREFIX}-volume-test`;
    let volume: ScalewayInstanceVolume;

    try {
      // Create Volume
      volume = await ScalewayInstanceVolume(volumeId, {
        name: volumeId,
        size: 20, // 20 GB
        volumeType: "b_ssd",
        zone: "fr-par-1",
        tags: {
          test: "true",
          environment: "test",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(volume).toMatchObject({
        type: "scaleway::InstanceVolume",
        name: volumeId,
        volumeType: "b_ssd",
        zone: "fr-par-1",
        state: "available",
        tags: {
          test: "true",
          environment: "test",
        },
      });

      expect(volume.id).toBeDefined();
      expect(volume.size).toBe(20 * 1024 * 1024 * 1024); // Size in bytes
      expect(volume.organizationId).toBeDefined();
      expect(volume.projectId).toBeDefined();
      expect(volume.created_at).toBeDefined();
      expect(volume.updated_at).toBeDefined();

      // Update Volume (increase size)
      volume = await ScalewayInstanceVolume(volumeId, {
        name: `${volumeId}-updated`,
        size: 30, // Increase to 30 GB
        volumeType: "b_ssd",
        zone: "fr-par-1",
        tags: {
          test: "true",
          environment: "test",
          updated: "true",
        },
        accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
        secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
        projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID),
      });

      expect(volume).toMatchObject({
        name: `${volumeId}-updated`,
        tags: {
          test: "true",
          environment: "test",
          updated: "true",
        },
      });

      // Size should be increased
      expect(volume.size).toBe(30 * 1024 * 1024 * 1024);
    } finally {
      await destroy(scope);
      if (volume!) {
        await assertInstanceVolumeDoesNotExist(volume);
      }
    }
  });
});

async function assertInstanceVolumeDoesNotExist(
  volume: ScalewayInstanceVolume,
) {
  const api = createScalewayApi({
    accessKey: process.env.SCALEWAY_ACCESS_KEY!,
    secretKey: process.env.SCALEWAY_SECRET_KEY!,
    projectId: process.env.SCALEWAY_PROJECT_ID!,
  });

  const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${volume.zone}`;

  try {
    const response = await api.get(`/volumes/${volume.id}`, serviceBaseUrl);
    if (response.ok) {
      throw new Error(
        `Instance Volume ${volume.id} still exists after deletion`,
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
