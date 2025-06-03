import { afterAll, describe, expect } from "bun:test";
import { alchemy } from "../../src/alchemy.js";
import { createCloudflareApi } from "../../src/cloudflare/api.js";

import {
  DOStateStore,
  getWorkerScriptMetadata,
} from "../../src/cloudflare/index.js";
import "../../src/test/bun.js";
import { BRANCH_PREFIX } from "../util.js";

describe("DOStateStore", async () => {
  const workerName = `${BRANCH_PREFIX}-alchemy-state`;
  const test = alchemy.test(import.meta, {
    stateStore: (scope) =>
      new DOStateStore(scope, {
        worker: {
          // Isolate the default state store bucket from other tests' stores
          name: workerName,
        },
      }),
  });
  const api = await createCloudflareApi();

  test("optimistically creates alchemy-state worker", async () => {
    const worker = await getWorkerScriptMetadata(api, workerName);

    expect(worker).toBeDefined();
    expect(worker?.id).toEqual(workerName);
  });

  afterAll(async () => {
    const res = await api.delete(
      `/accounts/${api.accountId}/workers/scripts/${workerName}`,
    );
    if (!res.ok) {
      throw new Error(
        `Failed to delete worker ${workerName}: ${res.status} ${res.statusText}`,
      );
    }
  });
});
