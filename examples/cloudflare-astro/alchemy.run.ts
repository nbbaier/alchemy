/// <reference types="node" />

import alchemy from "alchemy";
import { Astro, DOStateStore, KVNamespace, R2Bucket } from "alchemy/cloudflare";

const BRANCH_PREFIX = process.env.BRANCH_PREFIX ?? "";
const app = await alchemy("cloudflare-astro", {
  stage: process.env.USER ?? "dev",
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
  quiet: !process.argv.includes("--verbose"),
  password: process.env.ALCHEMY_PASSWORD,
  stateStore:
    process.env.ALCHEMY_STATE_STORE === "cloudflare"
      ? (scope) => new DOStateStore(scope)
      : undefined,
});

export const [storage, cache] = await Promise.all([
  R2Bucket(`cloudflare-astro-storage${BRANCH_PREFIX}`, {
    allowPublicAccess: false,
    // so that CI is idempotent
    adopt: true,
  }),
  KVNamespace("CACHE", {
    title: `cloudflare-astro-cache${BRANCH_PREFIX}`,
    adopt: true,
  }),
]);

export const website = await Astro(`cloudflare-astro-website${BRANCH_PREFIX}`, {
  command: "bun run build",
  bindings: {
    STORAGE: storage,
    CACHE: cache,
  },
});

console.log({
  url: website.url,
});

await app.finalize();