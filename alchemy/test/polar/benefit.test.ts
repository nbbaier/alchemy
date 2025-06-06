import { beforeAll, describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { destroy } from "../../src/destroy.ts";
import { createPolarClient } from "../../src/polar/client.ts";
import {
  Benefit,
  type Benefit as BenefitOutput,
  type BenefitProps,
} from "../../src/polar/benefit.ts";
import "../../src/test/vitest.ts";

const BRANCH_PREFIX = process.env.BRANCH_PREFIX || "local";

let polarClient: any;

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Polar Benefit Resource", () => {
  const testRunSuffix = "test1";
  const baseLogicalId = `${BRANCH_PREFIX}-test-polar-benefit`;

  beforeAll(() => {
    const apiKey = process.env.POLAR_API_KEY;
    if (!apiKey) {
      throw new Error(
        "POLAR_API_KEY environment variable is required for Polar integration tests.",
      );
    }
    polarClient = createPolarClient({ apiKey });
  });

  test("create, update, and delete benefit", async (scope) => {
    const logicalId = `${baseLogicalId}-${testRunSuffix}`;
    let benefitOutput: BenefitOutput | undefined;

    try {
      const createProps: BenefitProps = {
        type: "custom",
        description: "Test custom benefit",
        selectable: true,
        deletable: true,
        metadata: { test: "true" },
      };
      benefitOutput = await Benefit(logicalId, createProps);

      expect(benefitOutput.id).toBeTruthy();
      expect(benefitOutput.type).toEqual("custom");
      expect(benefitOutput.description).toEqual("Test custom benefit");
      expect(benefitOutput.selectable).toEqual(true);
      expect(benefitOutput.metadata?.test).toEqual("true");

      const fetchedBenefitCreate = await polarClient.get(
        `/benefits/${benefitOutput.id}`,
      );
      expect(fetchedBenefitCreate.id).toEqual(benefitOutput.id);
      expect(fetchedBenefitCreate.description).toEqual("Test custom benefit");

      const updateProps: BenefitProps = {
        ...createProps,
        description: "Updated test benefit",
        metadata: { test: "true", updated: "yes" },
      };
      benefitOutput = await Benefit(logicalId, updateProps);

      expect(benefitOutput.id).toEqual(fetchedBenefitCreate.id);
      expect(benefitOutput.description).toEqual("Updated test benefit");
      expect(benefitOutput.metadata?.updated).toEqual("yes");

      const fetchedBenefitUpdated = await polarClient.get(
        `/benefits/${benefitOutput.id}`,
      );
      expect(fetchedBenefitUpdated.description).toEqual("Updated test benefit");
    } finally {
      await destroy(scope);
      if (benefitOutput?.id) {
        try {
          await polarClient.get(`/benefits/${benefitOutput.id}`);
          throw new Error(
            `Benefit ${benefitOutput.id} was not deleted after destroy.`,
          );
        } catch (error: any) {
          if (error.status === 404) {
            console.log("Benefit successfully deleted");
          } else {
            throw error;
          }
        }
      }
    }
  });

  test("create discord benefit", async (scope) => {
    const discordSuffix = `discord-${testRunSuffix}`;
    const logicalId = `${baseLogicalId}-${discordSuffix}`;
    let benefitOutput: BenefitOutput | undefined;

    try {
      const createProps: BenefitProps = {
        type: "discord",
        description: "Discord server access",
        properties: {
          guild_id: "123456789",
          role_id: "987654321",
        },
      };
      benefitOutput = await Benefit(logicalId, createProps);

      expect(benefitOutput.id).toBeTruthy();
      expect(benefitOutput.type).toEqual("discord");
      expect(benefitOutput.description).toEqual("Discord server access");
      expect(benefitOutput.properties?.guild_id).toEqual("123456789");

      const fetchedBenefit = await polarClient.get(
        `/benefits/${benefitOutput.id}`,
      );
      expect(fetchedBenefit.type).toEqual("discord");
    } finally {
      await destroy(scope);
      if (benefitOutput?.id) {
        try {
          await polarClient.get(`/benefits/${benefitOutput.id}`);
          throw new Error(
            `Benefit ${benefitOutput.id} was not deleted after destroy.`,
          );
        } catch (error: any) {
          if (error.status === 404) {
            console.log("Benefit successfully deleted");
          } else {
            throw error;
          }
        }
      }
    }
  });
});
