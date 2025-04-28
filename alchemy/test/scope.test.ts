import { describe, expect } from "bun:test";
import fs from "node:fs/promises";
import { alchemy } from "../src/alchemy";
import { destroy } from "../src/destroy";
import { File } from "../src/fs/file";
import { Scope } from "../src/scope";
import { BRANCH_PREFIX } from "./util";

import "../src/test/bun";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scope", () => {
  test("should maintain scope context and track resources", async (scope) => {
    try {
      await File("file", {
        path: "test.txt",
        content: "Hello World",
      });

      const content = await fs.readFile("test.txt", "utf-8");
      expect(content).toBe("Hello World");

      expect(Scope.current).toEqual(scope);
      expect(scope.resources.size).toBe(1);
      expect(scope).toBe(scope);
    } finally {
      await destroy(scope);
    }
  });

  test("multiple apps", async (scope) => {
    const app1 = await alchemy("app");
    const app2 = await alchemy("app");

    expect(app1.parent).toBeUndefined();
    expect(app2.parent).toBeUndefined();
  });

  test("chained scopes", async (scope) => {
    const app = await alchemy("app");

    await app.run("nested", async (scope) => {
      expect(scope.parent).toBeUndefined();
      expect(scope).toEqual(app);
    });
  });

  test("can't run a new scope inside a finalized scope", async (scope) => {
    await scope.finalize();
    expect(scope.run(async () => {})).rejects.toThrow();
    expect(scope.run("nested", async () => {})).rejects.toThrow();
    expect(scope.run("nested", {}, async () => {})).rejects.toThrow();
  });
});
