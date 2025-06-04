import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { Bucket } from "../../src/supabase/bucket.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Bucket", () => {
  test("should create a bucket", async (scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
