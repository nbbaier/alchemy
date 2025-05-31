---
title: Managing Cloudflare Workers for Platforms Dispatch Namespaces with Alchemy
description: Learn how to create and manage Cloudflare Workers for Platforms Dispatch Namespaces using Alchemy for user worker deployment.
---

# DispatchNamespace

A [Cloudflare Workers for Platforms Dispatch Namespace](https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/user-workers/) enables deploying user workers that can be dynamically invoked through a dispatcher worker.

## Minimal Example

Create a basic dispatch namespace for user workers:

```ts
import { DispatchNamespace } from "alchemy/cloudflare";

const userNamespace = await DispatchNamespace("user-workers", {
  namespace: "user-workers"
});
```

## Create Dispatcher Worker

Create a dispatcher worker that can route to user workers:

```ts
import { Worker, DispatchNamespace } from "alchemy/cloudflare";

const userNamespace = await DispatchNamespace("user-workers", {
  namespace: "user-workers"
});

const dispatcher = await Worker("dispatcher", {
  entrypoint: "./src/dispatcher.ts",
  bindings: {
    NAMESPACE: userNamespace
  }
});
```

## Deploy User Worker to Namespace

Deploy a user worker to the dispatch namespace:

```ts
import { Worker, DispatchNamespace } from "alchemy/cloudflare";

const userNamespace = await DispatchNamespace("user-workers", {
  namespace: "user-workers"
});

const userWorker = await Worker("user-worker", {
  entrypoint: "./src/user-worker.ts",
  dispatchNamespace: userNamespace
});
```

## Adopt Existing Namespace

Adopt an existing dispatch namespace instead of creating a new one:

```ts
import { DispatchNamespace } from "alchemy/cloudflare";

const existingNamespace = await DispatchNamespace("existing-namespace", {
  namespace: "my-existing-namespace",
  adopt: true
});
```

## Complete Example

Full example with dispatcher and user workers:

```ts
import { Worker, DispatchNamespace } from "alchemy/cloudflare";

// Create dispatch namespace
const userNamespace = await DispatchNamespace("user-workers", {
  namespace: "user-workers"
});

// Create dispatcher worker that routes requests
const dispatcher = await Worker("dispatcher", {
  script: `
    export default {
      async fetch(request, env) {
        const url = new URL(request.url);
        const userWorkerName = url.pathname.split('/')[1];
        
        if (userWorkerName && env.NAMESPACE) {
          return env.NAMESPACE.get(userWorkerName).fetch(request);
        }
        
        return new Response('Dispatcher worker running', { status: 200 });
      }
    }
  `,
  bindings: {
    NAMESPACE: userNamespace
  }
});

// Deploy user worker to the dispatch namespace
const userWorker = await Worker("user-worker", {
  script: `
    export default {
      async fetch(request) {
        return new Response('Hello from user worker!', { 
          status: 200,
          headers: { 'Content-Type': 'text/plain' }
        });
      }
    }
  `,
  dispatchNamespace: userNamespace
});
```
