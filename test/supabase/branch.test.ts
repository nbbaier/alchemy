import { describe, expect } from "vitest";
import { alchemy } from "../../alchemy/src/alchemy.ts";
import { BRANCH_PREFIX } from "../../alchemy/test/util.ts";

import "../../alchemy/src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Branch", () => {
  test("should create a branch", async (_scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
