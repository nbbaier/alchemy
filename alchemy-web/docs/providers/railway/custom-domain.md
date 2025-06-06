# Railway Custom Domain

A Railway custom domain allows you to use your own domain name for a service instead of the default Railway-provided domain.

## Example Usage

```typescript
import { CustomDomain, Environment, Project, Service } from "alchemy/railway";

// Create project, environment, and service first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

const service = await Service("web-service", {
  name: "web-app",
  projectId: project.id,
});

// Create a custom domain
const customDomain = await CustomDomain("my-domain", {
  domain: "api.mycompany.com",
  serviceId: service.id,
  environmentId: environment.id,
});

// Create a subdomain
const apiDomain = await CustomDomain("api-domain", {
  domain: "api.example.org",
  serviceId: service.id,
  environmentId: environment.id,
});
```

## Properties

### Required

- **domain** (string): The custom domain name to use.
- **serviceId** (string): The ID of the service this domain points to.
- **environmentId** (string): The ID of the environment this domain belongs to.

### Optional

- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the custom domain.
- **status** (string): The status of the domain (e.g., "pending", "active", "failed").
- **createdAt** (string): The timestamp when the domain was created.
- **updatedAt** (string): The timestamp when the domain was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const customDomain = await CustomDomain("my-domain", {
  domain: "api.myapp.com",
  serviceId: "service_123",
  environmentId: "env_456",
  apiKey: secret("your-railway-token"),
});
```

## DNS Configuration

After creating a custom domain, you'll need to configure your DNS settings:

1. Create a CNAME record pointing your domain to the Railway-provided target
2. Wait for DNS propagation (can take up to 48 hours)
3. Railway will automatically provision an SSL certificate once DNS is configured

## Domain Status

The `status` field indicates the current state of your custom domain:

- **pending**: Domain is being set up
- **active**: Domain is live and serving traffic
- **failed**: Domain setup failed (check DNS configuration)
