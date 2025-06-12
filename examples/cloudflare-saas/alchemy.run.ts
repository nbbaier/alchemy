/// <reference types="node" />

import alchemy from "alchemy";
import { DurableObjectNamespace, KvNamespace, Worker } from "alchemy/cloudflare";

const BRANCH_PREFIX = process.env.BRANCH_PREFIX ?? "";
const app = await alchemy("cloudflare-saas", {
  stage: BRANCH_PREFIX || undefined,
});

// Create secrets for auth providers
const githubClientSecret = alchemy.secret("GITHUB_CLIENT_SECRET");
const googleClientSecret = alchemy.secret("GOOGLE_CLIENT_SECRET");
const authSecret = alchemy.secret("AUTH_SECRET");

// Create KV namespace for Better Auth session storage
const authKv = await KvNamespace(`cloudflare-saas-auth${BRANCH_PREFIX}`, {
  title: "SaaS Auth Sessions",
  adopt: true,
});

// Create the worker with Durable Object configuration
const worker = await Worker(`cloudflare-saas${BRANCH_PREFIX}`, {
  entrypoint: "./src/index.ts",
  bindings: {
    // Environment variables for Better Auth
    GITHUB_CLIENT_ID: process.env.GITHUB_CLIENT_ID || "your-github-client-id",
    GITHUB_CLIENT_SECRET: githubClientSecret,
    GOOGLE_CLIENT_ID: process.env.GOOGLE_CLIENT_ID || "your-google-client-id", 
    GOOGLE_CLIENT_SECRET: googleClientSecret,
    AUTH_SECRET: authSecret,
    AUTH_URL: process.env.AUTH_URL || "http://localhost:8787",
    
    // KV namespace for auth sessions
    AUTH_KV: authKv,
    
    // Durable Object namespace
    USER_DO: new DurableObjectNamespace("UserDurableObject", {
      className: "UserDurableObject",
      sqlite: true,
    }),
  },
  url: true,
  bundle: {
    metafile: true,
    format: "esm",
    target: "es2020",
  },
  adopt: true,
});

await app.finalize();

export default worker;