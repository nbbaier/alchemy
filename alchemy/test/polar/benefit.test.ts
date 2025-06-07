import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createPolarClient } from "../../src/polar/client.ts";
import {
  Benefit,
  type Benefit as BenefitOutput,
  type BenefitProps,
} from "../../src/polar/benefit.ts";
import "../../src/test/vitest.ts";
import { createPolarTestHelper } from "./test-helpers.ts";

const BRANCH_PREFIX = process.env.BRANCH_PREFIX || "local";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

const { testPolarResource } = createPolarTestHelper();

describe("Polar Benefit Resource", () => {
  const testRunSuffix = "test1";
  const baseLogicalId = `${BRANCH_PREFIX}-test-polar-benefit`;

  test.skipIf(!!process.env.CI)(
    "create, update, and delete benefit",
    async (scope) => {
      await testPolarResource(
        scope,
        {
          logicalId: `${baseLogicalId}-${testRunSuffix}`,
          resourceFn: Benefit,
          endpoint: "benefits",
          createProps: {
            type: "custom",
            description: "Test custom benefit",
            selectable: true,
            deletable: true,
            metadata: { test: "true" },
          } as BenefitProps,
          updateProps: {
            type: "custom",
            description: "Updated test benefit",
            selectable: true,
            deletable: true,
            metadata: { test: "true", updated: "yes" },
          } as BenefitProps,
          createAssertions: (output, fetched) => {
            expect(output.id).toBeTruthy();
            expect(output.type).toEqual("custom");
            expect(output.description).toEqual("Test custom benefit");
            expect(output.selectable).toEqual(true);
            expect(output.metadata?.test).toEqual("true");
            expect(fetched.id).toEqual(output.id);
            expect(fetched.description).toEqual("Test custom benefit");
          },
          updateAssertions: (output, fetchedCreate) => {
            expect(output.id).toEqual(fetchedCreate.id);
            expect(output.description).toEqual("Updated test benefit");
            expect(output.metadata?.updated).toEqual("yes");
          },
        },
      );
    },
  );

  test.skipIf(!!process.env.CI)("create discord benefit", async (scope) => {
    const discordSuffix = `discord-${testRunSuffix}`;
    await testPolarResource(
      scope,
      {
        logicalId: `${baseLogicalId}-${discordSuffix}`,
        resourceFn: Benefit,
        endpoint: "benefits",
        createProps: {
          type: "discord",
          description: "Discord server access",
          properties: {
            guild_id: "123456789",
            role_id: "987654321",
          },
        } as BenefitProps,
        createAssertions: (output, fetched) => {
          expect(output.id).toBeTruthy();
          expect(output.type).toEqual("discord");
          expect(output.description).toEqual("Discord server access");
          expect(output.properties?.guild_id).toEqual("123456789");
          expect(fetched.type).toEqual("discord");
        },
      },
    );
  });
});
