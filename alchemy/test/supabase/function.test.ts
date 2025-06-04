import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { Function } from "../../src/supabase/function.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Function", () => {
  test("should create a function", async (scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
