import { beforeEach, describe, expect } from "vitest";
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
  destroyed?: boolean;
  destroyedWith?: {
    output: TestResource;
    props: TestResourceProps;
  };
}

// Track destroyed resources for testing
const destroyedResources = new Map<string, { output: TestResource; props: TestResourceProps }>();

const TestResource = Resource(
  "test::Resource",
  async function (
    this: Context<TestResource>,
    id: string,
    props: TestResourceProps,
  ): Promise<TestResource> {
    if (this.phase === "delete") {
      // Store information about what was destroyed
      if (this.output && this.props) {
        destroyedResources.set(id, {
          output: this.output,
          props: this.props as TestResourceProps,
        });
      }
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
  beforeEach(() => {
    // Clear destroyed resources before each test
    destroyedResources.clear();
  });

  test("should mark resource as replaced when replacement is triggered", async (scope) => {
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
    
    // The old resource should still exist in state with its complete information
    const state = await scope.state.get("test-resource");
    expect(state).toBeDefined();
    expect(state?.replacedResource).toBeDefined();
    if (state?.replacedResource) {
      const replacedOutput = state.replacedResource.output as TestResource;
      const replacedProps = state.replacedResource.props as TestResourceProps;
      expect(replacedOutput.value).toBe("initial");
      expect(replacedOutput.immutableProp).toBe("v1");
      expect(replacedProps.value).toBe("initial");
      expect(replacedProps.immutableProp).toBe("v1");
    }
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
      expect(stateBeforeFinalize?.replacedResource).toBeDefined();
      if (stateBeforeFinalize?.replacedResource) {
        const replacedOutput = stateBeforeFinalize.replacedResource.output as TestResource;
        expect(replacedOutput.value).toBe("initial");
      }
      
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

  test("child scopes should not finalize until root scope finalizes", async () => {
    const app = await alchemy(`${BRANCH_PREFIX}-nested-finalize-test`);
    let childFinalized = false;
    let parentFinalized = false;
    
    try {
      await alchemy.run("parent", async (parentScope) => {
        await alchemy.run("child", async (childScope) => {
          // Create a resource
          await TestResource("nested-resource", {
            value: "test",
            immutableProp: "v1",
          });
          
          // Override finalize to track when it's called
          const originalFinalize = childScope.finalize.bind(childScope);
          childScope.finalize = async () => {
            await originalFinalize();
            childFinalized = true;
          };
        });
        
        // Override parent finalize to track when it's called
        const originalFinalize = parentScope.finalize.bind(parentScope);
        parentScope.finalize = async () => {
          await originalFinalize();
          parentFinalized = true;
        };
      });
      
      // After alchemy.run completes, child scopes should not be finalized
      expect(childFinalized).toBe(false);
      expect(parentFinalized).toBe(false);
      
      // Finalize the app - this should finalize all scopes
      await app.finalize();
      
      // Now all scopes should be finalized
      expect(childFinalized).toBe(true);
      expect(parentFinalized).toBe(true);
    } catch (error) {
      await app.finalize();
      throw error;
    }
  });

  test("replaced resources should be destroyed with their original props and output", async () => {
    const app = await alchemy(`${BRANCH_PREFIX}-destroy-verification-test`);
    
    try {
      // Create initial resource
      const resource1 = await TestResource("verify-destroy", {
        value: "original-value",
        immutableProp: "v1",
      });
      const originalCreatedAt = resource1.createdAt;
      
      // Update with changed immutable property - should trigger replacement
      const resource2 = await TestResource("verify-destroy", {
        value: "new-value", 
        immutableProp: "v2",
      });
      
      // Verify the resource was replaced
      const state = await app.state.get("verify-destroy");
      expect(state?.replacedResource).toBeDefined();
      
      // Clear the map before finalization to ensure we only capture finalization destroys
      destroyedResources.clear();
      
      // Finalize the app - this should destroy the replaced resource with its original state
      await app.finalize();
      
      // Verify the replaced resource was destroyed with its original props and output
      const destroyedInfo = destroyedResources.get("verify-destroy");
      expect(destroyedInfo).toBeDefined();
      if (destroyedInfo) {
        // Should have been destroyed with the original output
        expect(destroyedInfo.output.value).toBe("original-value");
        expect(destroyedInfo.output.immutableProp).toBe("v1");
        expect(destroyedInfo.output.createdAt).toBe(originalCreatedAt);
        
        // Should have been destroyed with the original props
        expect(destroyedInfo.props.value).toBe("original-value");
        expect(destroyedInfo.props.immutableProp).toBe("v1");
      }
    } catch (error) {
      await app.finalize();
      throw error;
    }
  });
});