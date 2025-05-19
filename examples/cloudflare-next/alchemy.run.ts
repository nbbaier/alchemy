import alchemy from "../../alchemy/src/";
import { D1Database, Website, WranglerJson } from "../../alchemy/src/cloudflare";

const app = await alchemy("cloudflare-next", {
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
});

const database = await D1Database("my-database", {
  name: "my-database",
  adopt: true,
});

export const website = await Website("cloudflare-next", {
  command: "bun opennextjs-cloudflare build",
  main: ".open-next/worker.js",
  assets: ".open-next/assets",
  compatibilityDate: "2025-03-01",
  compatibilityFlags: ["nodejs_compat"],
  bundle: {
    platform: "node",
    target: "esnext",
  },
  url: true,
  bindings: {
    DATABASE: database,
  },
});

await WranglerJson("wrangler", {
  worker: website,
});

//await exec("wrangler types --env-interface CloudflareEnv cloudflare-env.d.ts");

//await exec("bun opennextjs-cloudflare build");

console.log(website.url);

await app.finalize();
