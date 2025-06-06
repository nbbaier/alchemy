# Railway Service

A Railway service represents an application or microservice deployed within a project environment.

## Example Usage

```typescript
import { Project, Service } from "alchemy/railway";

// Create a project first
const project = await Project("my-project", {
  name: "My Application",
});

// Create a basic service
const api = await Service("api-service", {
  name: "api",
  projectId: project.id,
});

// Create a service from a GitHub repository
const webApp = await Service("web-app", {
  name: "web-app",
  projectId: project.id,
  sourceRepo: "https://github.com/myorg/web-app",
  sourceRepoBranch: "main",
  rootDirectory: "/",
});

// Create a service with custom configuration
const worker = await Service("background-worker", {
  name: "worker",
  projectId: project.id,
  sourceRepo: "https://github.com/myorg/worker",
  sourceRepoBranch: "develop",
  rootDirectory: "/worker",
  configPath: "./railway.toml",
});
```

## Properties

### Required

- **name** (string): The name of the service.
- **projectId** (string): The ID of the project this service belongs to.

### Optional

- **sourceRepo** (string): The URL of the source repository.
- **sourceRepoBranch** (string): The branch to deploy from.
- **rootDirectory** (string): The root directory of the service in the repository.
- **configPath** (string): Path to the Railway configuration file.
- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the service.
- **createdAt** (string): The timestamp when the service was created.
- **updatedAt** (string): The timestamp when the service was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const service = await Service("my-service", {
  name: "api",
  projectId: "project_123",
  apiKey: secret("your-railway-token"),
});
```
