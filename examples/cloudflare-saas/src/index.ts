import type { DurableObjectNamespace, KVNamespace } from "@cloudflare/workers-types";
import { betterAuth } from "better-auth";
import { cloudflareKVAdapter } from "better-auth/adapters/kv";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { demoPageHtml } from "./demo-page";

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

// Session endpoint for the demo page
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

// Serve demo page for authenticated users
app.get("/demo", async (c) => {
  const auth = initAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  if (!session) {
    return c.redirect("/");
  }

  return c.html(demoPageHtml);
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

// Home route
app.get("/", async (c) => {
  const auth = initAuth(c.env);
  const session = await auth.api.getSession({
    headers: c.req.raw.headers,
  });

  // If user is already logged in, redirect to demo
  if (session) {
    return c.redirect("/demo");
  }

  return c.html(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>Cloudflare SaaS Example</title>
        <style>
          body {
            font-family: system-ui, -apple-system, sans-serif;
            max-width: 600px;
            margin: 50px auto;
            padding: 20px;
          }
          .auth-buttons {
            display: flex;
            gap: 10px;
            margin-top: 20px;
          }
          .auth-button {
            padding: 10px 20px;
            border: none;
            border-radius: 5px;
            background: #333;
            color: white;
            text-decoration: none;
            cursor: pointer;
          }
          .auth-button:hover {
            background: #555;
          }
          .github { background: #24292e; }
          .google { background: #4285f4; }
        </style>
      </head>
      <body>
        <h1>Cloudflare SaaS Example</h1>
        <p>This example demonstrates Better Auth with Durable Objects for per-user data isolation.</p>
        
        <div class="auth-buttons">
          <a href="/auth/sign-in/social?provider=github" class="auth-button github">
            Login with GitHub
          </a>
          <a href="/auth/sign-in/social?provider=google" class="auth-button google">
            Login with Google
          </a>
        </div>
        
        <p style="margin-top: 30px;">
          After logging in, you'll have access to your isolated data stored in a Durable Object.
        </p>
      </body>
    </html>
  `);
});

// Export the Durable Object class
export { UserDurableObject } from "./durable-object";

export default app;