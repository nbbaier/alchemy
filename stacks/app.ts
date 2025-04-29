import alchemy, { type AlchemyOptions } from "../alchemy/src";
import { R2RestStateStore } from "../alchemy/src/cloudflare";

let select: string[] | undefined;
for (let i = 0; i < process.argv.length; i++) {
  if (process.argv[i] === "--select") {
    select ??= [];
    if (process.argv[i + 1] === undefined) {
      throw new Error("--select requires a value");
    }
    select.push(process.argv[i + 1]);
  }
}

export const app = await alchemy("alchemy", {
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
  // pass the password in (you can get it from anywhere, e.g. stdin)
  password: process.env.SECRET_PASSPHRASE,
  quiet: process.argv.includes("--quiet"),
  stateStore:
    process.env.ALCHEMY_STATE_STORE === "cloudflare"
      ? (scope) => new R2RestStateStore(scope)
      : undefined,
  select,
} satisfies AlchemyOptions);
