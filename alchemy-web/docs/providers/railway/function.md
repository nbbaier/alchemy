# Function

```typescript
import { Function } from "alchemy/railway";

// Basic TypeScript function
const helloWorld = await Function("hello-function", {
  name: "hello-world",
  project: project,
  environment: environment,
  runtime: "nodejs",
  main: "./src/handlers/hello.ts",
  entrypoint: "index.handler",
});
```

```typescript
// Repository-based function
const apiGateway = await Function("api-gateway", {
  name: "gateway",
  project: project,
  environment: environment,
  runtime: "go",
  sourceRepo: "https://github.com/myorg/go-functions",
  sourceRepoBranch: "main",
  entrypoint: "main",
});
```

```typescript
// Using string references
const func = await Function("my-function", {
  name: "webhook-handler",
  project: "project_abc123",
  environment: "env_xyz789",
  runtime: "nodejs",
  main: "./src/webhook.ts",
  entrypoint: "index.handler",
});
```