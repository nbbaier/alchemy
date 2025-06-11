import { describe, expect } from "vitest";
import { alchemy } from "../src/alchemy";
import type { Context } from "../src/context";
import { Resource } from "../src/resource";
import "../src/test/vitest.ts";
import { BRANCH_PREFIX } from "./util";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

// Define a test resource that supports replacement
interface TestResourceProps {
  value: string;
  immutableProp?: string;
}

interface TestResource extends Resource<"test::Resource">, TestResourceProps {
  id: string;
  createdAt: number;
}

const TestResource = Resource(
  "test::Resource",
  async function (
    this: Context<TestResource>,
    id: string,
    props: TestResourceProps,
  ): Promise<TestResource> {
    if (this.phase === "delete") {
      return this.destroy();
    }

    // Check if immutableProp changed - if so, trigger replacement
    if (
      this.phase === "update" &&
      this.output &&
      this.props?.immutableProp !== props.immutableProp
    ) {
      // Resource needs to be replaced due to immutable property change
      this.replace();
    }

    return this({
      id,
      value: props.value,
      immutableProp: props.immutableProp,
      createdAt: Date.now(),
    });
  },
);

describe("Resource Replacement", () => {
  test("should delay finalization when replacement is triggered", async (scope) => {
    // Create initial resource
    const resource1 = await TestResource("test-resource", {
      value: "initial",
      immutableProp: "v1",
    });
    
    expect(resource1.value).toBe("initial");
    expect(resource1.immutableProp).toBe("v1");
    
    // Update with changed immutable property - should trigger replacement
    const resource2 = await TestResource("test-resource", {
      value: "updated",
      immutableProp: "v2", // Changed immutable property
    });
    
    expect(resource2.value).toBe("updated");
    expect(resource2.immutableProp).toBe("v2");
    
    // Check that the scope has delayed finalization enabled
    expect(scope.hasDelayedFinalization()).toBe(true);
    
    // The old resource should still exist in state but marked as replaced
    const state = await scope.state.get("test-resource");
    expect(state).toBeDefined();
    expect(state?.replaced).toBe(true);
  });

  test("replaced resources should be cleaned up during app finalization", async () => {
    const app = await alchemy(`${BRANCH_PREFIX}-replace-test`);
    
    try {
      // Create initial resource
      const resource1 = await TestResource("replace-me", {
        value: "initial",
        immutableProp: "v1",
      });
      
      // Update with changed immutable property - should trigger replacement
      const resource2 = await TestResource("replace-me", {
        value: "updated", 
        immutableProp: "v2",
      });
      
      // Get the state before finalization
      const stateBeforeFinalize = await app.state.get("replace-me");
      expect(stateBeforeFinalize?.replaced).toBe(true);
      
      // Finalize the app - this should clean up replaced resources
      await app.finalize();
      
      // After finalization, only the new resource should exist
      const stateAfterFinalize = await app.state.get("replace-me");
      // The state should be removed as part of cleanup
      expect(stateAfterFinalize).toBeUndefined();
    } catch (error) {
      await app.finalize();
      throw error;
    }
  });

  test("nested scopes should propagate delayed finalization", async () => {
    const app = await alchemy(`${BRANCH_PREFIX}-nested-replace-test`);
    
    try {
      await alchemy.run("parent", async (parentScope) => {
        await alchemy.run("child", async (childScope) => {
          // Create resource that triggers replacement
          await TestResource("nested-resource", {
            value: "initial",
            immutableProp: "v1",
          });
          
          await TestResource("nested-resource", {
            value: "updated",
            immutableProp: "v2",
          });
          
          // Both child and parent scopes should have delayed finalization
          expect(childScope.hasDelayedFinalization()).toBe(true);
          expect(parentScope.hasDelayedFinalization()).toBe(true);
          expect(app.hasDelayedFinalization()).toBe(true);
        });
      });
      
      await app.finalize();
    } catch (error) {
      await app.finalize();
      throw error;
    }
  });
});