import { describe, expect } from "bun:test";
import { alchemy } from "../src/alchemy.js";
import type { Context } from "../src/context.js";
import { destroy } from "../src/destroy.js";
import { Resource } from "../src/resource.js";
import { BRANCH_PREFIX } from "./util.js";

import "../src/test/bun.js";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

let i = 0;
const deleted = new Set<number>();

const Replacable = Resource(
  "Replacable",
  async function (
    this: Context<any, any>,
    _id: string,
    props: {
      name: string;
    },
  ) {
    if (this.phase === "delete") {
      deleted.add(i);
      return this.destroy();
    } else if (this.phase === "update") {
      if (props.name !== this.output.name) {
        this.replace();
        return this({
          name: `${props.name}-${++i}`,
        });
      }
    }
    return this({
      name: `${props.name}-${i}`,
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
      expect(resource.name).toBe("foo-0");
      resource = await Replacable("replacable", {
        name: "bar",
      });
      // the output should have changed
      expect(resource.name).toBe("bar-1");
      // but the resource should not have been deleted
      expect(deleted.size).toBe(0);
      // now, we finalize the scope
      await scope.finalize();
      // the delete of the replaced resource should have been flushed through
      expect(deleted.has(0)).toBe(true);
    } finally {
      await destroy(scope);
    }
  });
});
