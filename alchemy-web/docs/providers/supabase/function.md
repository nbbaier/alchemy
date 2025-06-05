# Supabase Function Resource

The `Function` resource manages Supabase Edge Functions, which provide serverless compute capabilities at the edge.

## Usage

```typescript
import { Function } from "alchemy/supabase";

// Create a new Edge Function
const func = Function("hello-world", {
  project: "proj-123",
  main: "./hello-world.ts",
});

// Create function with import map and JWT verification
const func = Function("api-handler", {
  project: "proj-123",
  main: "./api-handler.ts",
  importMap: {
    "std/": "https://deno.land/std@0.168.0/"
  },
  verifyJwt: true,
});
```

## Properties

### Required Properties

- **`project`** (`string | Project`): Reference to the project where the function will be deployed

### Optional Properties

- **`name`** (`string`): The name of the function. Defaults to the resource ID if not provided.
- **`body`** (`string`): TypeScript/JavaScript code for the function
- **`importMap`** (`Record<string, string>`): Import map for resolving module imports
- **`entrypointUrl`** (`string`): Custom entrypoint URL for the function
- **`verifyJwt`** (`boolean`): Whether to verify JWT tokens in requests. Default: `false`.
- **`adopt`** (`boolean`): Whether to adopt an existing function if creation fails due to name conflict. Default: `false`.
- **`delete`** (`boolean`): Whether to delete the function when the resource is destroyed. Default: `true`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The function resource exposes the following properties:

- **`id`** (`string`): Unique identifier for the function
- **`slug`** (`string`): URL-friendly identifier for the function
- **`name`** (`string`): Function name
- **`status`** (`string`): Current function status (e.g., "ACTIVE", "INACTIVE")
- **`version`** (`number`): Current version number of the function
- **`createdAt`** (`string`): ISO timestamp when the function was created
- **`updatedAt`** (`string`): ISO timestamp when the function was last updated

## Examples

### Basic Function

```typescript
const helloFunction = Function("hello", {
  project: "my-project-ref",
  main: "./hello-function.ts",
});
```

### Function with JWT Verification

```typescript
const protectedFunction = Function("protected-api", {
  project: "my-project-ref",
  verifyJwt: true,
  main: "./protected-api.ts",
});
```

### Function with Import Map

```typescript
const advancedFunction = Function("advanced-api", {
  project: "my-project-ref",
  importMap: {
    "std/": "https://deno.land/std@0.168.0/",
    "supabase/": "https://esm.sh/@supabase/supabase-js@2"
  },
  main: "./advanced-api.ts",
});
```

### Function with Adoption

```typescript
// This will adopt an existing function if one with the same name already exists
const existingFunction = Function("existing-function", {
  project: "my-project-ref",
  adopt: true,
  main: "./existing-function.ts",
});
```

### Function that Won't be Deleted

```typescript
const persistentFunction = Function("persistent-function", {
  project: "my-project-ref",
  delete: false, // Function will not be deleted when resource is destroyed
  main: "./persistent-function.ts",
});
```
