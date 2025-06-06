# Railway Function

A Railway function represents a serverless function deployed within a project environment.

## Example Usage

```typescript
import { Environment, Function, Project } from "alchemy/railway";

// Create project and environment first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

// Create a Node.js function with inline code
const helloWorld = await Function("hello-function", {
  name: "hello-world",
  projectId: project.id,
  environmentId: environment.id,
  runtime: "nodejs",
  sourceCode: `
    exports.handler = async (event) => {
      return {
        statusCode: 200,
        body: JSON.stringify({ message: 'Hello World!' })
      };
    };
  `,
  entrypoint: "index.handler",
});

// Create a Python function from a repository
const dataProcessor = await Function("data-processor", {
  name: "process-data",
  projectId: project.id,
  environmentId: environment.id,
  runtime: "python",
  sourceRepo: "https://github.com/myorg/data-functions",
  sourceRepoBranch: "main",
  entrypoint: "main.handler",
});

// Create a Go function
const apiGateway = await Function("api-gateway", {
  name: "gateway",
  projectId: project.id,
  environmentId: environment.id,
  runtime: "go",
  sourceRepo: "https://github.com/myorg/go-functions",
  sourceRepoBranch: "main",
  entrypoint: "main",
});
```

## Properties

### Required

- **name** (string): The name of the function.
- **projectId** (string): The ID of the project this function belongs to.
- **environmentId** (string): The ID of the environment this function belongs to.
- **runtime** ("nodejs" | "python" | "go" | "rust"): The runtime environment for the function.

### Optional

- **sourceCode** (string): Inline source code for the function. Use this for simple functions.
- **sourceRepo** (string): The URL of the source repository. Use this for more complex functions.
- **sourceRepoBranch** (string): The branch to deploy from when using a repository.
- **entrypoint** (string): The entry point for the function (e.g., "index.handler", "main.py").
- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the function.
- **url** (string): The public URL where the function can be invoked.
- **createdAt** (string): The timestamp when the function was created.
- **updatedAt** (string): The timestamp when the function was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const func = await Function("my-function", {
  name: "webhook-handler",
  projectId: "project_123",
  environmentId: "env_456",
  runtime: "nodejs",
  sourceCode: "exports.handler = async (event) => ({ statusCode: 200 });",
  entrypoint: "index.handler",
  apiKey: secret("your-railway-token"),
});
```

## Runtime Support

Railway Functions support multiple runtime environments:

- **nodejs**: Node.js runtime for JavaScript/TypeScript functions
- **python**: Python runtime for Python functions
- **go**: Go runtime for compiled Go functions
- **rust**: Rust runtime for compiled Rust functions

## Deployment Options

You can deploy functions in two ways:

1. **Inline Code**: Provide the `sourceCode` property for simple functions
2. **Repository**: Provide `sourceRepo` and optionally `sourceRepoBranch` for more complex functions stored in version control

The `entrypoint` property specifies how Railway should invoke your function and varies by runtime.
