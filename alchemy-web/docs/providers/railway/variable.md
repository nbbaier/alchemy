# Railway Variable

A Railway variable represents an environment variable for a service within a specific environment.

## Example Usage

```typescript
import { Environment, Project, Service, Variable } from "alchemy/railway";
import { secret } from "alchemy";

// Create project, environment, and service first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

const service = await Service("api-service", {
  name: "api",
  projectId: project.id,
});

// Create a public variable
const port = await Variable("port-var", {
  name: "PORT",
  value: "3000",
  environmentId: environment.id,
  serviceId: service.id,
});

// Create a secret variable
const apiKey = await Variable("api-key-var", {
  name: "API_KEY",
  value: secret("super-secret-key-123"),
  environmentId: environment.id,
  serviceId: service.id,
});

// Create a database URL variable
const dbUrl = await Variable("db-url-var", {
  name: "DATABASE_URL",
  value: secret("postgresql://user:pass@host:5432/db"),
  environmentId: environment.id,
  serviceId: service.id,
});
```

## Properties

### Required

- **name** (string): The name of the environment variable.
- **value** (Secret | string): The value of the variable. Sensitive values should use `secret()`.
- **environmentId** (string): The ID of the environment this variable belongs to.
- **serviceId** (string): The ID of the service this variable belongs to.

### Optional

- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the variable.
- **value** (Secret): The value of the variable (always wrapped as a Secret).
- **createdAt** (string): The timestamp when the variable was created.
- **updatedAt** (string): The timestamp when the variable was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const variable = await Variable("my-var", {
  name: "SECRET_KEY",
  value: secret("my-secret-value"),
  environmentId: "env_123",
  serviceId: "service_456",
  apiKey: secret("your-railway-token"),
});
```

## Security

Variable values are automatically wrapped in Alchemy's `Secret` type to ensure they are encrypted when stored in state files. When accessing the value, use the `.unencrypted` property:

```typescript
console.log(variable.value.unencrypted); // Access the actual value
```
