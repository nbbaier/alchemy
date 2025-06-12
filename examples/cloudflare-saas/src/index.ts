import type { DurableObjectNamespace, KVNamespace } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { cloudflareKVAdapter } from "better-auth/adapters/kv";
import { Hono } from "hono";
import { cors } from "hono/cors";

export interface Env {
  // Auth environment
  GITHUB_CLIENT_ID: string;
  GITHUB_CLIENT_SECRET: string;
  GOOGLE_CLIENT_ID: string;
  GOOGLE_CLIENT_SECRET: string;
  AUTH_SECRET: string;
  AUTH_URL: string;
  
  // Storage bindings
  AUTH_KV: KVNamespace;
  USER_DO: DurableObjectNamespace;
}

const app = new Hono<{ Bindings: Env }>();

// Enable CORS
app.use("/*", cors());

// Initialize Better Auth
function initAuth(env: Env) {
  return betterAuth({
    database: cloudflareKVAdapter(env.AUTH_KV),
    secret: env.AUTH_SECRET,
    baseURL: env.AUTH_URL,
    socialProviders: {
      github: {
        clientId: env.GITHUB_CLIENT_ID,
        clientSecret: env.GITHUB_CLIENT_SECRET,
      },
      google: {
        clientId: env.GOOGLE_CLIENT_ID,
        clientSecret: env.GOOGLE_CLIENT_SECRET,
      },
    },
    emailAndPassword: {
      enabled: false, // Disable email/password, only use social auth
    },
  });
}

// Mount Better Auth routes
app.all("/auth/*", async (c) => {
  const auth = initAuth(c.env);
  return auth.handler(c.req.raw);
});

// Session endpoint for the frontend
app.get("/api/session", async (c) => {
  const auth = initAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });
  
  if (!session) {
    return c.json({ user: null });
  }
  
  return c.json({
    user: {
      id: session.user.id,
      email: session.user.email,
      name: session.user.name,
    }
  });
});

// Protected API route to get user data
app.get("/api/user/:userId/data", async (c) => {
  const auth = initAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");
  
  // Verify the user is accessing their own data
  if (session.user.id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Get or create the user's Durable Object
  const doId = c.env.USER_DO.idFromName(userId);
  const userDO = c.env.USER_DO.get(doId);

  // Forward the request to the Durable Object
  const url = new URL(c.req.url);
  url.pathname = "/data";
  
  return userDO.fetch(url.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });
});

// Protected API routes for todos and notes
app.all("/api/user/:userId/data/*", async (c) => {
  const auth = initAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.json({ error: "Unauthorized" }, 401);
  }

  const userId = c.req.param("userId");
  
  // Verify the user is accessing their own data
  if (session.user.id !== userId) {
    return c.json({ error: "Forbidden" }, 403);
  }

  // Get or create the user's Durable Object
  const doId = c.env.USER_DO.idFromName(userId);
  const userDO = c.env.USER_DO.get(doId);

  // Extract the path after /api/user/:userId
  const url = new URL(c.req.url);
  const pathMatch = url.pathname.match(/\/api\/user\/[^\/]+(\/.+)/);
  if (pathMatch) {
    url.pathname = pathMatch[1];
  }
  
  return userDO.fetch(url.toString(), {
    method: c.req.method,
    headers: c.req.raw.headers,
    body: c.req.raw.body,
  });
});

// Health check
app.get("/health", (c) => {
  return c.json({ status: "ok" });
});

// Export the Durable Object class
export { UserDurableObject } from "./durable-object";

export default app;