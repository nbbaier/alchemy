# Supabase Function Resource

The `Function` resource manages Supabase Edge Functions, which provide serverless compute capabilities at the edge.

## Usage

```typescript
import { Function } from "alchemy/supabase";

// Create a new Edge Function
const func = Function("hello-world", {
  projectRef: "proj-123",
  body: `
    export default function handler(req: Request) {
      return new Response("Hello World!");
    }
  `,
});

// Create function with import map and JWT verification
const func = Function("api-handler", {
  projectRef: "proj-123",
  body: `
    import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
    
    serve((req) => {
      return new Response("API Response");
    });
  `,
  importMap: {
    "std/": "https://deno.land/std@0.168.0/"
  },
  verifyJwt: true,
});
```

## Properties

### Required Properties

- **`projectRef`** (`string`): Reference ID of the project where the function will be deployed

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
  projectRef: "my-project-ref",
  body: `
    export default function handler(req: Request) {
      const { name } = await req.json();
      return new Response(\`Hello \${name || 'World'}!\`);
    }
  `,
});
```

### Function with JWT Verification

```typescript
const protectedFunction = Function("protected-api", {
  projectRef: "my-project-ref",
  verifyJwt: true,
  body: `
    export default function handler(req: Request) {
      // JWT is automatically verified by Supabase
      const authHeader = req.headers.get('Authorization');
      return new Response('Authenticated request processed');
    }
  `,
});
```

### Function with Import Map

```typescript
const advancedFunction = Function("advanced-api", {
  projectRef: "my-project-ref",
  importMap: {
    "std/": "https://deno.land/std@0.168.0/",
    "supabase/": "https://esm.sh/@supabase/supabase-js@2"
  },
  body: `
    import { serve } from "std/http/server.ts";
    import { createClient } from "supabase/mod.ts";
    
    serve(async (req) => {
      const supabase = createClient(
        Deno.env.get('SUPABASE_URL')!,
        Deno.env.get('SUPABASE_ANON_KEY')!
      );
      
      const { data } = await supabase.from('users').select('*');
      return new Response(JSON.stringify(data));
    });
  `,
});
```

### Function with Adoption

```typescript
// This will adopt an existing function if one with the same name already exists
const existingFunction = Function("existing-function", {
  projectRef: "my-project-ref",
  adopt: true,
  body: `
    export default function handler(req: Request) {
      return new Response("Updated function");
    }
  `,
});
```

### Function that Won't be Deleted

```typescript
const persistentFunction = Function("persistent-function", {
  projectRef: "my-project-ref",
  delete: false, // Function will not be deleted when resource is destroyed
  body: `
    export default function handler(req: Request) {
      return new Response("This function persists");
    }
  `,
});
```

## API Operations

### Create Function
- **Endpoint**: `POST /projects/{projectRef}/functions`
- **Body**: Function configuration including slug, name, body, import_map, etc.
- **Response**: Function object with ID and initial status

### Get Function
- **Endpoint**: `GET /projects/{projectRef}/functions/{slug}`
- **Response**: Full function details including current version

### Deploy Function
- **Endpoint**: `POST /projects/{projectRef}/functions/{slug}/deploy`
- **Body**: Updated function code and configuration
- **Response**: 200 on successful deployment

### Delete Function
- **Endpoint**: `DELETE /projects/{projectRef}/functions/{slug}`
- **Response**: 200 on successful deletion

### List Functions
- **Endpoint**: `GET /projects/{projectRef}/functions`
- **Response**: Array of function objects

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to find and adopt an existing function with the same name
- **Rate Limiting**: Automatic exponential backoff for 429 responses
- **Server Errors**: Automatic retry for 5xx responses
- **404 on Delete**: Ignored (function already deleted)

## Lifecycle Management

- **Creation**: Functions are created with the specified code and configuration
- **Updates**: When function body is provided during updates, the function is automatically deployed with the new code
- **Deletion**: Functions can be deleted unless `delete: false` is specified

## Dependencies

Functions depend on:
- **Project**: Must specify a valid `projectRef`

## Runtime Environment

Edge Functions run in a Deno runtime with the following characteristics:

- **Runtime**: Deno with Web APIs
- **Timeout**: 150 seconds maximum execution time
- **Memory**: 512MB maximum memory usage
- **Cold Start**: Functions may experience cold starts after periods of inactivity
- **Environment Variables**: Access to project environment variables via `Deno.env.get()`

## Security Considerations

- **JWT Verification**: Enable `verifyJwt: true` for functions that require authentication
- **Environment Variables**: Use project secrets for sensitive configuration
- **CORS**: Configure CORS headers in your function code as needed
- **Input Validation**: Always validate and sanitize request inputs

## Best Practices

- **Error Handling**: Implement proper error handling and return appropriate HTTP status codes
- **Logging**: Use `console.log()` for debugging (logs are available in the Supabase dashboard)
- **Performance**: Minimize cold start time by keeping function code lightweight
- **Dependencies**: Use import maps to manage external dependencies efficiently
