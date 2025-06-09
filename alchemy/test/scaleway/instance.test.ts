import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewayInstance } from "../../src/scaleway/instance.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway", () => {
  test("Instance lifecycle", async (scope) => {
    const instanceId = `${BRANCH_PREFIX}-instance-test`;
    let instance: ScalewayInstance;

    try {
      // Create instance
      instance = await ScalewayInstance(instanceId, {
        name: `${instanceId}-server`,
        type: "DEV1-S",
        zone: "fr-par-1",
        tags: ["test", "alchemy"],
        start_on_create: false, // Don't start to speed up tests
      });

      expect(instance).toMatchObject({
        name: `${instanceId}-server`,
        type: "DEV1-S",
        zone: "fr-par-1",
        tags: ["test", "alchemy"],
      });

      expect(instance.id).toBeTruthy();
      expect(instance.created_at).toBeTruthy();
      expect(instance.image).toBeTruthy();

      // Update instance
      instance = await ScalewayInstance(instanceId, {
        name: `${instanceId}-server-updated`,
        type: "DEV1-S",
        zone: "fr-par-1",
        tags: ["test", "alchemy", "updated"],
      });

      expect(instance).toMatchObject({
        name: `${instanceId}-server-updated`,
        tags: ["test", "alchemy", "updated"],
      });
    } finally {
      await destroy(scope);
      if (instance!) {
        await assertInstanceDoesNotExist(instance);
      }
    }
  });
});

async function assertInstanceDoesNotExist(instance: ScalewayInstance) {
  const api = createScalewayApi();
  const zone = instance.zone;
  const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${zone}`;

  const response = await api.get(`/servers/${instance.id}`, serviceBaseUrl);

  if (response.ok) {
    throw new Error(`Instance ${instance.id} still exists after deletion`);
  }

  if (response.status !== 404) {
    throw new Error(
      `Unexpected error checking instance ${instance.id}: HTTP ${response.status}`,
    );
  }
}
