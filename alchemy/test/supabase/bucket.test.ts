import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Bucket", () => {
  test("should create a bucket", async (_scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
