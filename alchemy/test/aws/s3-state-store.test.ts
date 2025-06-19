import {
  CreateBucketCommand,
  DeleteBucketCommand,
  S3Client,
} from "@aws-sdk/client-s3";
import { describe, expect, test } from "vitest";
import { Scope } from "../../src/scope.ts";
import { S3StateStore } from "../../src/aws/s3-state-store.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const s3 = new S3Client({});

describe("AWS Resources", () => {
  describe("S3StateStore", () => {
    test("state store operations", async () => {
      // Create a simple scope for testing (not using alchemy.test to avoid cleanup issues)
      const scope = new Scope({ 
        appName: "test-app",
        scopeName: "test-scope",
        phase: "create" 
      });
      const bucketName =
        `${BRANCH_PREFIX}-alchemy-test-state-store`.toLowerCase();

      // Create test bucket for the state store
      try {
        await s3.send(new CreateBucketCommand({ Bucket: bucketName }));
      } catch (error: any) {
        // Bucket might already exist, continue
        if (!error.message?.includes("BucketAlreadyOwnedByYou") && 
            error.Code !== "BucketAlreadyOwnedByYou") {
          throw error;
        }
      }

      const stateStore = new S3StateStore(scope, {
        bucketName,
        prefix: "test-state/",
      });

      try {
        // Initialize the state store
        await stateStore.init();

        // Clean up any leftover objects from previous test runs
        const existingKeys = await stateStore.list();
        for (const key of existingKeys) {
          await stateStore.delete(key);
        }

        // Test list (should be empty now)
        let keys = await stateStore.list();
        expect(keys).toEqual([]);

        // Test count (should be 0 initially)
        let count = await stateStore.count();
        expect(count).toBe(0);

        // Test get non-existent key
        let state = await stateStore.get("non-existent");
        expect(state).toBeUndefined();

        // Create a test state (using a kind that won't trigger resource cleanup)
        const testState = {
          status: "created" as const,
          kind: "dummy-test-kind",
          id: "test-state-1",
          fqn: "test-state-1",
          seq: 1,
          data: { someData: "test" },
          props: { name: "test" },
          output: { name: "test", value: "test-value" },
        };

        // Test set
        await stateStore.set("test-resource-1", testState);

        // Test get
        state = await stateStore.get("test-resource-1");
        expect(state).toBeDefined();
        expect(state?.id).toBe("test-state-1");
        expect(state?.status).toBe("created");
        expect(state?.kind).toBe("dummy-test-kind");

        // Test list (should have one item now)
        keys = await stateStore.list();
        expect(keys).toEqual(["test-resource-1"]);

        // Test count (should be 1 now)
        count = await stateStore.count();
        expect(count).toBe(1);

        // Add another state
        const testState2 = {
          ...testState,
          id: "test-state-2",
          fqn: "test-state-2",
        };
        await stateStore.set("test-resource-2", testState2);

        // Test getBatch
        const batchResult = await stateStore.getBatch([
          "test-resource-1",
          "test-resource-2",
          "non-existent",
        ]);
        expect(Object.keys(batchResult)).toHaveLength(2);
        expect(batchResult["test-resource-1"]).toBeDefined();
        expect(batchResult["test-resource-2"]).toBeDefined();
        expect(batchResult["non-existent"]).toBeUndefined();

        // Test all
        const allStates = await stateStore.all();
        expect(Object.keys(allStates)).toHaveLength(2);
        expect(allStates["test-resource-1"]).toBeDefined();
        expect(allStates["test-resource-2"]).toBeDefined();

        // Test key conversion (with colons and slashes)
        const keyWithSlash = "test/nested/resource";
        await stateStore.set(keyWithSlash, {
          ...testState,
          id: keyWithSlash,
          fqn: keyWithSlash,
        });

        const retrievedState = await stateStore.get(keyWithSlash);
        expect(retrievedState).toBeDefined();
        expect(retrievedState?.id).toBe(keyWithSlash);

        // Test delete
        await stateStore.delete("test-resource-1");
        state = await stateStore.get("test-resource-1");
        expect(state).toBeUndefined();

        // Delete non-existent key (should not throw)
        await stateStore.delete("non-existent");

        // Verify final count
        count = await stateStore.count();
        expect(count).toBe(2); // test-resource-2 and test/nested/resource

        // Clean up all remaining state items manually
        const allKeys = await stateStore.list();
        for (const key of allKeys) {
          await stateStore.delete(key);
        }
      } finally {
        // Clean up the test bucket
        try {
          await s3.send(new DeleteBucketCommand({ Bucket: bucketName }));
        } catch (error) {
          // Bucket might have objects, ignore for now
          console.warn(`Failed to delete test bucket ${bucketName}:`, error);
        }
      }
    });

    test("initialization with non-existent bucket", async () => {
      const scope = new Scope({ 
        appName: "test-app-2",
        scopeName: "test-scope-2",
        phase: "create" 
      });
      const nonExistentBucket =
        `${BRANCH_PREFIX}-non-existent-bucket`.toLowerCase();

      const stateStore = new S3StateStore(scope, {
        bucketName: nonExistentBucket,
      });

      await expect(stateStore.init()).rejects.toThrow(/does not exist/);
    });
  });
});
