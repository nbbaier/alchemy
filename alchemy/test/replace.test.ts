import { describe, expect } from "bun:test";
import { alchemy } from "../src/alchemy.js";
import type { Context } from "../src/context.js";
import { Resource } from "../src/resource.js";
import { BRANCH_PREFIX } from "./util.js";

import { destroy } from "../src/destroy.js";
import "../src/test/bun.js";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

const deleted = new Set<string>();

const Replacable = Resource(
  "Replacable",
  async function (
    this: Context<any, any>,
    _id: string,
    props: {
      name: string;
    },
  ) {
    console.log("PHASE", this.phase);
    if (this.phase === "delete") {
      deleted.add(props.name);
      console.log(`deleted.add(${props.name})`);
      return this.destroy();
    } else if (this.phase === "update") {
      if (props.name !== this.output.name) {
        this.replace();
      }
    }
    return this({
      name: props.name,
    });
  },
);

describe("Replace", () => {
  test("replace should flush through to downstream resources", async (scope) => {
    try {
      let resource = await Replacable("replacable", {
        name: "foo",
      });
      expect(deleted.size).toBe(0);
      expect(resource.name).toBe("foo");
      resource = await Replacable("replacable", {
        name: "bar",
      });
      // the output should have changed
      expect(resource.name).toBe("bar");
      // but the resource should not have been deleted
      expect(deleted.size).toBe(0);
      // now, we finalize the scope
      await scope.finalize();
      // the delete of the replaced resource should have been flushed through
      expect(deleted.has("foo")).toBe(true);
    } finally {
      await destroy(scope);
    }
  });

  test("replace 2", async (scope) => {
    try {
      let resource = await alchemy.run("foo", () =>
        Replacable("replacable", {
          name: "foo-1",
        }),
      );
      expect(deleted.has("foo-1")).toBe(false);
      expect(resource.name).toBe("foo-1");
      resource = await alchemy.run("foo", () =>
        Replacable("replacable", {
          name: "bar-1",
        }),
      );
      // the output should have changed
      expect(resource.name).toBe("bar-1");
      // but the resource should not have been deleted
      expect(deleted.has("foo-1")).toBe(false);
      expect(deleted.has("bar-1")).toBe(false);
      // now, we finalize the scope
      await scope.finalize();
      // the delete of the replaced resource should have been flushed through
      expect(deleted.has("foo-1")).toBe(true);
      expect(deleted.has("bar-1")).toBe(false);
    } finally {
      await destroy(scope);
    }
  });
});
