import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Project", () => {
  test("should create a project", async (_scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
