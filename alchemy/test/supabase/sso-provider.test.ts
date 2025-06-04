import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { SSOProvider } from "../../src/supabase/sso-provider.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("SSOProvider", () => {
  test("should create an SSO provider", async (scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
