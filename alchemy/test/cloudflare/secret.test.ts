import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { createCloudflareApi } from "../../src/cloudflare/api.ts";
import { Secret } from "../../src/cloudflare/secret.ts";
import { SecretsStore } from "../../src/cloudflare/secrets-store.ts";
import { secret } from "../../src/secret.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Secret Resource", () => {
  test("create and delete secret in store", async (scope) => {
    // Use deterministic secret name unique to this test
    const secretName = `${BRANCH_PREFIX}-secret-basic`;
    let secretsStore: SecretsStore | undefined;
    let secretResource: Secret | undefined;

    try {
      // Adopt the default secrets store
      secretsStore = await SecretsStore("secret-store", {
        adopt: true,
        name: "default_secrets_store",
      });

      expect(secretsStore).toBeTruthy();

      // Create a secret in the store
      secretResource = await Secret(secretName, {
        store: secretsStore,
        value: secret("test-secret-value"),
      });

      expect(secretResource).toBeTruthy();
      expect(secretResource!.name).toEqual(secretName);
      expect(secretResource!.storeId).toEqual(secretsStore!.id);
      expect(secretResource!.value.unencrypted).toEqual("test-secret-value");

      // Verify the secret exists in the store
      await assertSecretExists(secretsStore!.id, secretName);
    } finally {
      await alchemy.destroy(scope);
      if (secretsStore && secretResource) {
        await assertSecretNotExists(secretsStore.id, secretName);
      }
    }
  });

  test("create secret with string value", async (scope) => {
    // Use deterministic secret name unique to this test
    const secretName = `${BRANCH_PREFIX}-secret-string`;
    let secretsStore: SecretsStore | undefined;
    let secretResource: Secret | undefined;

    try {
      // Adopt the default secrets store
      secretsStore = await SecretsStore("secret-store", {
        adopt: true,
        name: "default_secrets_store",
      });

      // Create a secret with string value (should be converted to Secret)
      secretResource = await Secret(secretName, {
        store: secretsStore,
        value: "plain-string-value",
      });

      expect(secretResource).toBeTruthy();
      expect(secretResource!.name).toEqual(secretName);
      expect(secretResource!.value.unencrypted).toEqual("plain-string-value");

      // Verify the secret exists in the store
      await assertSecretExists(secretsStore!.id, secretName);
    } finally {
      await alchemy.destroy(scope);
      if (secretsStore && secretResource) {
        await assertSecretNotExists(secretsStore.id, secretName);
      }
    }
  });

  test("update secret value", async (scope) => {
    // Use deterministic secret name unique to this test
    const secretName = `${BRANCH_PREFIX}-secret-update`;
    let secretsStore: SecretsStore | undefined;
    let secretResource: Secret | undefined;

    try {
      // Adopt the default secrets store
      secretsStore = await SecretsStore("secret-store", {
        adopt: true,
        name: "default_secrets_store",
      });

      // Create initial secret
      secretResource = await Secret(secretName, {
        store: secretsStore,
        value: secret("initial-value"),
      });

      expect(secretResource!.value.unencrypted).toEqual("initial-value");

      // Update the secret value
      secretResource = await Secret(secretName, {
        store: secretsStore,
        value: secret("updated-value"),
      });

      expect(secretResource!.value.unencrypted).toEqual("updated-value");

      // Verify the secret exists with updated value
      await assertSecretExists(secretsStore!.id, secretName);
    } finally {
      await alchemy.destroy(scope);
      if (secretsStore && secretResource) {
        await assertSecretNotExists(secretsStore.id, secretName);
      }
    }
  });

  test("create secret with delete false", async (scope) => {
    // Use deterministic secret name unique to this test
    const secretName = `${BRANCH_PREFIX}-secret-preserve`;
    let secretsStore: SecretsStore | undefined;
    let secretResource: Secret | undefined;

    try {
      // Adopt the default secrets store
      secretsStore = await SecretsStore("secret-store", {
        adopt: true,
        name: "default_secrets_store",
      });

      await alchemy.run("nested", async (scope) => {
        // Create a secret with delete: false
        secretResource = await Secret(secretName, {
          store: secretsStore!,
          value: secret("preserved-value"),
          delete: false,
        });

        expect(secretResource).toBeTruthy();
        await alchemy.destroy(scope);

        // Secret should still exist after destroying the scope
        await assertSecretExists(secretsStore!.id, secretName);
      });
    } finally {
      await alchemy.destroy(scope);
      if (secretsStore) {
        // Manually clean up the preserved secret
        const api = await createCloudflareApi();
        await api.delete(
          `/accounts/${api.accountId}/secrets_store/stores/${secretsStore.id}/secrets`,
          {
            body: JSON.stringify([secretName]),
            headers: {
              "Content-Type": "application/json",
            },
          },
        );
      }
    }
  });

  async function assertSecretExists(
    storeId: string,
    secretName: string,
  ): Promise<void> {
    const api = await createCloudflareApi();
    const response = await api.get(
      `/accounts/${api.accountId}/secrets_store/stores/${storeId}/secrets`,
    );

    expect(response.ok).toBe(true);
    const data: any = await response.json();
    const secret = data.result.find((s: any) => s.name === secretName);
    expect(secret).toBeTruthy();
  }

  async function assertSecretNotExists(
    storeId: string,
    secretName: string,
  ): Promise<void> {
    const api = await createCloudflareApi();
    const response = await api.get(
      `/accounts/${api.accountId}/secrets_store/stores/${storeId}/secrets`,
    );

    expect(response.ok).toBe(true);
    const data: any = await response.json();
    const secret = data.result.find((s: any) => s.name === secretName);
    expect(secret).toBeFalsy();
  }
});
