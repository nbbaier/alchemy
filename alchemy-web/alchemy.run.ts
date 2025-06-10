import alchemy from "alchemy";
import { Astro } from "alchemy/cloudflare";

const app = await alchemy("cloudflare-astro", {
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
});

export const website = await Astro("alchemy-docs-astro", {
  command: "bun run build",
});

console.log({
  url: website.url,
});

await app.finalize();
