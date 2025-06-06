# Railway TCP Proxy

A Railway TCP proxy allows you to expose TCP services (like databases, game servers, or other non-HTTP services) to the internet.

## Example Usage

```typescript
import { Environment, Project, Service, TcpProxy } from "alchemy/railway";

// Create project, environment, and service first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

const service = await Service("game-server", {
  name: "minecraft-server",
  projectId: project.id,
});

// Create a TCP proxy for a Minecraft server
const gameProxy = await TcpProxy("minecraft-proxy", {
  applicationPort: 25565,
  proxyPort: 25565,
  serviceId: service.id,
  environmentId: environment.id,
});

// Create a TCP proxy for a database
const dbProxy = await TcpProxy("db-proxy", {
  applicationPort: 5432,
  serviceId: service.id,
  environmentId: environment.id,
});

// Create a TCP proxy with automatic port assignment
const customProxy = await TcpProxy("custom-proxy", {
  applicationPort: 8080,
  serviceId: service.id,
  environmentId: environment.id,
});
```

## Properties

### Required

- **applicationPort** (number): The port your application listens on inside the container.
- **serviceId** (string): The ID of the service this proxy belongs to.
- **environmentId** (string): The ID of the environment this proxy belongs to.

### Optional

- **proxyPort** (number): The external port to expose. If not specified, Railway will assign one automatically.
- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the TCP proxy.
- **domain** (string): The domain where the TCP service can be accessed.
- **createdAt** (string): The timestamp when the proxy was created.
- **updatedAt** (string): The timestamp when the proxy was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const tcpProxy = await TcpProxy("my-proxy", {
  applicationPort: 3000,
  proxyPort: 8080,
  serviceId: "service_123",
  environmentId: "env_456",
  apiKey: secret("your-railway-token"),
});
```

## Use Cases

TCP proxies are useful for:

- **Game Servers**: Minecraft, CS:GO, or other game servers
- **Databases**: Direct database connections (though not recommended for production)
- **Custom Protocols**: Services using custom TCP protocols
- **Legacy Applications**: Applications that don't use HTTP

## Connection

Once created, you can connect to your TCP service using:

```
{domain}:{proxyPort}
```

For example, if your proxy domain is `tcp-proxy-123.railway.app` and proxy port is `25565`, you would connect to:

```
tcp-proxy-123.railway.app:25565
```

## Security Considerations

- TCP proxies expose your service directly to the internet
- Consider implementing authentication and encryption at the application level
- Use firewall rules or IP allowlists when possible
- Monitor connections and implement rate limiting if needed
