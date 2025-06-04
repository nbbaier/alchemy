import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { Organization } from "../../src/supabase/organization.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Organization", () => {
  test("should create an organization", async (scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
