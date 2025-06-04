import { describe, expect } from "vitest";
import { alchemy } from "../../src/alchemy.ts";
import { Project } from "../../src/supabase/project.ts";
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Project", () => {
  test("should create a project", async (scope) => {
    expect(true).toBe(true); // Placeholder test
  });
});
