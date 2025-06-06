# Supabase Function Resource

The `Function` resource manages Supabase Edge Functions, which provide serverless compute capabilities at the edge.

## Usage

```typescript
import { Function } from "alchemy/supabase";

// Create a function with file-based entrypoint (recommended)
const func = Function("api-handler", {
  project: "proj-123",
  main: "./src/api-handler.ts"
});

// Create function with bundle configuration
const func = Function("optimized-api", {
  project: "proj-123",
  main: "./src/api.ts",
  bundle: {
    minify: true,
    target: "es2020"
  }
});

// Create function with inline script
const func = Function("simple-function", {
  project: "proj-123",
  script: `export default async function handler(req) {
    return new Response("Hello World");
  }`
});
```

## Properties

### Required Properties

- **`project`** (`string | Project`): Reference to the project where the function will be deployed

### Optional Properties

- **`name`** (`string`): The name of the function. Defaults to the resource ID if not provided.
- **`main`** (`string`): Path to the main entry file for bundled functions (recommended approach)
- **`script`** (`string`): Inline TypeScript/JavaScript code for the function
- **`body`** (`string`): *(Deprecated)* Use `script` instead for consistency
- **`bundle`** (`BundleProps`): Bundle configuration options when using `main`
- **`format`** (`"esm" | "cjs"`): Module format for the function script. Default: `"esm"`
- **`projectRoot`** (`string`): The root directory of the project for bundling
- **`noBundle`** (`boolean`): Whether to disable bundling. Default: `false`
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

### File-based Function (Recommended)

```typescript
const apiFunction = Function("api-handler", {
  project: "my-project-ref",
  main: "./src/api-handler.ts",
});
```

### Function with Bundle Configuration

```typescript
const optimizedFunction = Function("optimized-api", {
  project: "my-project-ref",
  main: "./src/api.ts",
  bundle: {
    minify: true,
    target: "es2020",
    sourcemap: true
  },
  format: "esm"
});
```

### Function with No Bundling

```typescript
const rawFunction = Function("raw-function", {
  project: "my-project-ref",
  main: "./src/simple.ts",
  noBundle: true // Deploy file as-is without bundling
});
```

### Inline Script Function

```typescript
const inlineFunction = Function("inline-api", {
  project: "my-project-ref",
  script: `
    export default async function handler(req: Request): Promise<Response> {
      const url = new URL(req.url);
      return new Response(JSON.stringify({ 
        path: url.pathname,
        method: req.method 
      }), {
        headers: { "Content-Type": "application/json" }
      });
    }
  `
});
```

### Function with JWT Verification

```typescript
const protectedFunction = Function("protected-api", {
  project: "my-project-ref",
  main: "./src/protected-api.ts",
  verifyJwt: true,
});
```

### Function with Import Map

```typescript
const advancedFunction = Function("advanced-api", {
  project: "my-project-ref",
  main: "./src/advanced-api.ts",
  importMap: {
    "std/": "https://deno.land/std@0.168.0/",
    "supabase/": "https://esm.sh/@supabase/supabase-js@2"
  }
});
```

### Function with Adoption

```typescript
// This will adopt an existing function if one with the same name already exists
const existingFunction = Function("existing-function", {
  project: "my-project-ref",
  adopt: true,
  main: "./src/existing-function.ts",
});
```

### Function that Won't be Deleted

```typescript
const persistentFunction = Function("persistent-function", {
  project: "my-project-ref",
  delete: false, // Function will not be deleted when resource is destroyed
  main: "./src/persistent-function.ts",
});
```

## Bundling

The Supabase Function resource uses esbuild for bundling when the `main` property is provided:

- **Automatic bundling**: TypeScript files are automatically compiled and bundled
- **Dependency resolution**: npm packages and local imports are resolved
- **Deno compatibility**: Bundle is optimized for Deno runtime environment
- **Custom configuration**: Use the `bundle` property to customize esbuild options

### Bundle Configuration Options

```typescript
const func = Function("my-function", {
  project: "my-project",
  main: "./src/handler.ts",
  bundle: {
    minify: true,           // Minify the output
    target: "es2020",       // Target ECMAScript version
    sourcemap: true,        // Generate source maps
    external: ["some-lib"], // Mark dependencies as external
    define: {               // Define compile-time constants
      "process.env.NODE_ENV": '"production"'
    }
  }
});
```
