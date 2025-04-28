import alchemy, { type AlchemyOptions } from "../alchemy/src";
import { R2RestStateStore } from "../alchemy/src/cloudflare";

export const app = await alchemy("alchemy", {
  stage: "prod",
  phase: process.argv.includes("--destroy") ? "destroy" : "up",
  // pass the password in (you can get it from anywhere, e.g. stdin)
  password: process.env.SECRET_PASSPHRASE,
  quiet: process.argv.includes("--quiet"),
  stateStore:
    process.env.ALCHEMY_STATE_STORE === "cloudflare"
      ? (scope) => new R2RestStateStore(scope)
      : undefined,
} satisfies AlchemyOptions);
