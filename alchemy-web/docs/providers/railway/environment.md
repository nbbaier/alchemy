# Railway Environment

A Railway environment represents a deployment environment within a project (e.g., production, staging, development).

## Example Usage

```typescript
import { Environment, Project } from "alchemy/railway";

// Create a project first
const project = await Project("my-project", {
  name: "My Application",
});

// Create a staging environment
const staging = await Environment("staging-env", {
  name: "staging",
  projectId: project.id,
});

// Create a production environment
const production = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});
```

## Properties

### Required

- **name** (string): The name of the environment.
- **projectId** (string): The ID of the project this environment belongs to.

### Optional

- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the environment.
- **createdAt** (string): The timestamp when the environment was created.
- **updatedAt** (string): The timestamp when the environment was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const environment = await Environment("my-env", {
  name: "production",
  projectId: "project_123",
  apiKey: secret("your-railway-token"),
});
```
