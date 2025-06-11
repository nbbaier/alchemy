---
order: 2
title: Scope
description: Learn how Alchemy uses hierarchical scopes to organize and manage infrastructure resources. Master application scopes, stage scopes, and resource scopes.
---

# Scope

Scopes in Alchemy are hierarchical containers that organize resources and other scopes, similar to a file system.

```typescript
// Scope hierarchy
app (Application Scope)
├── dev (Stage Scope)
│   ├── api (Nested Scope)
│   └── database (Resource)
└── prod (Stage Scope)
```

## Application Scope

The top-level scope created using the `alchemy()` function:

```typescript
import alchemy from "alchemy";

// Create root scope
const app = await alchemy("my-app");

// Create a resource in this scope
const file = await File("config", { path: "./config.json", content: "{}" });
```

State directory structure:

```
.alchemy/
  my-app/  # Application scope
    $USER/ # Default stage (username)
      config.json
```

## Stage Scope

A scope directly under the application scope for separating environments:

```typescript
// Create app with explicit stage
const app = await alchemy("my-app", {
  stage: "prod",
});

// Resource in prod stage
const database = await Database("main", {
  /* props */
});
```

```
.alchemy/
  my-app/
    prod/  ## Stage scope
      main.json
```

## Resource Scope

Each resource gets its own scope for managing child resources:

```typescript
export const WebApp = Resource("my::WebApp", async function (this, id, props) {
  // Child resources automatically scoped to this WebApp
  const database = await Database("db", {});
  const apiGateway = await ApiGateway("api", {});

  return this({
    id,
    url: apiGateway.url,
    dbConnectionString: database.connectionString,
  });
});

// Usage
const app = await WebApp("my-app", {});
```

```
.alchemy/
  my-app/
    dev/
      my-app.json
      my-app/  # Resource scope
        db.json
        api.json
```

## Nested Scope

Create custom nested scopes to organize related resources:

```typescript
// Create nested scopes
await alchemy.run("backend", async () => {
  await ApiGateway("api", {});
  await Function("handler", {});
});

await alchemy.run("frontend", async () => {
  await Bucket("assets", {});
});
```

```
.alchemy/
  my-app/
    dev/
      backend/
        api.json
        handler.json
      frontend/
        assets.json
```

## Scope Finalization

Scopes manage resource lifecycle and cleanup through finalization. The finalization behavior differs between root and child scopes:

### Root Scope Finalization

The application scope (root) must be manually finalized:

```typescript
const app = await alchemy("my-app");

await Bucket("assets", {});
// If a previously existing resource is removed from code,
// it will be deleted during finalization

await app.finalize(); // Manual finalization
```

### Child Scope Finalization

Child scopes (created via `alchemy.run()` or as resource scopes) **do not finalize immediately** when their execution completes. Instead, they wait for the root application scope to finalize them:

```typescript
const app = await alchemy("my-app");

await alchemy.run("backend", async () => {
  await ApiGateway("api", {});
  // This scope will NOT finalize here
});

// Child scopes only finalize when the root scope finalizes
await app.finalize(); // This finalizes all child scopes
```

This delayed finalization ensures:

- Resources marked for replacement aren't cleaned up prematurely
- All resources have a chance to complete their lifecycle
- Cleanup happens in the correct order (replaced resources first, then orphans)

### Finalization Order

When the root scope finalizes:

1. All child scopes are finalized recursively
2. Replaced resources are cleaned up first
3. Orphaned resources are cleaned up second
4. The root scope itself is finalized last

## Test Scope

Alchemy provides isolated test scopes that automatically clean up after tests:

```typescript
import { alchemy } from "../../src/alchemy";
import "../../src/test/bun";

// Create test scope from filename
const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

// Each test gets an isolated sub-scope
test("create resource", async (scope) => {
  const resource = await Resource("test-resource", {});
  expect(resource.id).toBeTruthy();
  // Resources auto-cleaned when test completes
});
```

Example from Cloudflare Worker tests:

```typescript
import { alchemy } from "../../src/alchemy";
import { Worker } from "../../src/cloudflare/worker";
import "../../src/test/bun";
import { BRANCH_PREFIX } from "../util";

const test = alchemy.test(import.meta, { prefix: BRANCH_PREFIX });

describe("Worker Resource", () => {
  test("create worker", async (scope) => {
    const worker = await Worker(`${BRANCH_PREFIX}-test-worker`, {
      script: "// Worker code",
      format: "esm",
    });

    expect(worker.id).toBeTruthy();
  });
});
```

For more details on testing with Alchemy, see [Testing in Alchemy](./testing.md).
