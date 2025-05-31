import { describe, expect } from "bun:test";
import { alchemy } from "../../src/alchemy.js";
import { createCloudflareApi } from "../../src/cloudflare/api.js";
import { SecretsStore } from "../../src/cloudflare/secrets-store.js";
import { BRANCH_PREFIX } from "../util.js";

import "../../src/test/bun.js";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("SecretsStore Resource", () => {
  const testId = `${BRANCH_PREFIX}-test-secrets-store`;

  test("create, update, and delete secrets store", async (scope) => {
    let secretsStore: SecretsStore | undefined;
    try {
      secretsStore = await SecretsStore(testId, {
        name: `${BRANCH_PREFIX}-test-store`,
      });

      expect(secretsStore.id).toBeTruthy();
      expect(secretsStore.name).toEqual(`${BRANCH_PREFIX}-test-store`);

      await assertSecretsStoreExists(secretsStore.id);

      secretsStore = await SecretsStore(testId, {
        name: `${BRANCH_PREFIX}-test-store`,
      });

      expect(secretsStore.id).toEqual(secretsStore.id);
      expect(secretsStore.name).toEqual(`${BRANCH_PREFIX}-test-store`);

      await assertSecretsStoreExists(secretsStore.id);
    } finally {
      await alchemy.destroy(scope);
      if (secretsStore) {
        await assertSecretsStoreNotExists(secretsStore.id);
      }
    }
  });

  test("adopt existing store", async (scope) => {
    let secretsStore: SecretsStore | undefined;
    try {
      secretsStore = await SecretsStore("store", {
        name: `${BRANCH_PREFIX}-adopt-store`,
      });

      await alchemy.run("nested", async () => {
        const adoptedStore = await SecretsStore("store", {
          name: `${BRANCH_PREFIX}-adopt-store`,
          adopt: true,
        });

        expect(adoptedStore.id).toEqual(secretsStore!.id);
      });
    } finally {
      await alchemy.destroy(scope);
      await assertSecretsStoreNotExists(secretsStore!.id);
    }
  });

  test("adopt existing store with delete false", async (scope) => {
    let secretsStore: SecretsStore | undefined;
    try {
      secretsStore = await SecretsStore("store", {
        name: `${BRANCH_PREFIX}-adopt-delete-false`,
      });

      await alchemy.run("nested", async (scope) => {
        const adoptedStore = await SecretsStore("store", {
          name: `${BRANCH_PREFIX}-adopt-delete-false`,
          adopt: true,
          delete: false,
        });

        expect(adoptedStore.id).toEqual(secretsStore!.id);
        await alchemy.destroy(scope);
        await assertSecretsStoreExists(adoptedStore.id);
      });
    } finally {
      await alchemy.destroy(scope);
      await assertSecretsStoreNotExists(secretsStore!.id);
    }
  });

  async function assertSecretsStoreExists(storeId: string): Promise<void> {
    const api = await createCloudflareApi();
    const response = await api.get(
      `/accounts/${api.accountId}/secrets_store/stores`,
    );

    expect(response.ok).toBe(true);
    const data: any = await response.json();
    const store = data.result.find((s: any) => s.id === storeId);
    expect(store).toBeTruthy();
  }

  async function assertSecretsStoreNotExists(storeId: string): Promise<void> {
    const api = await createCloudflareApi();
    const response = await api.get(
      `/accounts/${api.accountId}/secrets_store/stores`,
    );

    expect(response.ok).toBe(true);
    const data: any = await response.json();
    const store = data.result.find((s: any) => s.id === storeId);
    expect(store).toBeFalsy();
  }
});
