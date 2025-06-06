# Railway Service Domain

A Railway service domain provides a Railway-managed subdomain for your service, typically in the format `service-name.railway.app`.

## Example Usage

```typescript
import { Environment, Project, Service, ServiceDomain } from "alchemy/railway";

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

// Create a service domain
const serviceDomain = await ServiceDomain("api-domain", {
  domain: "my-api.railway.app",
  serviceId: service.id,
  environmentId: environment.id,
});

// Create another service domain for a different service
const webDomain = await ServiceDomain("web-domain", {
  domain: "my-web-app.railway.app",
  serviceId: service.id,
  environmentId: environment.id,
});
```

## Properties

### Required

- **domain** (string): The Railway subdomain to use (e.g., "my-app.railway.app").
- **serviceId** (string): The ID of the service this domain points to.
- **environmentId** (string): The ID of the environment this domain belongs to.

### Optional

- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the service domain.
- **url** (string): The full URL where the service can be accessed.
- **createdAt** (string): The timestamp when the domain was created.
- **updatedAt** (string): The timestamp when the domain was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const serviceDomain = await ServiceDomain("my-domain", {
  domain: "my-service.railway.app",
  serviceId: "service_123",
  environmentId: "env_456",
  apiKey: secret("your-railway-token"),
});
```

## Usage Notes

- Service domains are automatically managed by Railway and include SSL certificates
- The domain must be available and follow Railway's naming conventions
- Service domains are environment-specific
- You can update the domain name, but the service and environment cannot be changed
