/// <reference types="@cloudflare/workers-types" />
import type { website } from "../alchemy.run.js";

export type WorkerEnv = typeof website.Env;

declare module "cloudflare:workers" {
  namespace Cloudflare {
    export interface Env extends WorkerEnv {}
  }
}

