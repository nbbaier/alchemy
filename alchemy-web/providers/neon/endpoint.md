# Neon Endpoint

A Neon endpoint is a compute instance that provides access to a database branch. Endpoints can be read-write or read-only.

## Properties

- `project_id` (string, required): The ID of the Neon project
- `branch_id` (string, required): The ID of the branch this endpoint will serve
- `type` ("read_write" | "read_only", required): The type of endpoint
- `compute_provisioner` ("k8s-pod" | "k8s-neonvm", optional): The compute provisioner to use
- `settings` (object, optional): PostgreSQL settings for the endpoint
- `pooler_enabled` (boolean, optional): Whether connection pooling is enabled
- `pooler_mode` ("session" | "transaction", optional): The connection pooling mode
- `disabled` (boolean, optional): Whether the endpoint is disabled
- `passwordless_access` (boolean, optional): Whether passwordless access is enabled
- `suspend_timeout_seconds` (number, optional): Timeout in seconds before the endpoint suspends
- `provisioner` ("k8s-pod" | "k8s-neonvm", optional): The provisioner type
- `region_id` (string, optional): The region where the endpoint should be created
- `adopt` (boolean, optional): Whether to adopt an existing endpoint if it already exists. Default: false

## Dependencies

- Requires a Neon Project to exist
- Requires a Neon Branch to exist

## Example

```typescript
import { NeonProject, NeonBranch, NeonEndpoint } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  region_id: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project_id: project.id,
  name: "main",
});

const readWriteEndpoint = await NeonEndpoint("rw-endpoint", {
  project_id: project.id,
  branch_id: branch.id,
  type: "read_write",
  pooler_enabled: true,
  pooler_mode: "transaction",
});

const readOnlyEndpoint = await NeonEndpoint("ro-endpoint", {
  project_id: project.id,
  branch_id: branch.id,
  type: "read_only",
  suspend_timeout_seconds: 300,
});
```

## Outputs

- `id`: The unique identifier of the endpoint
- `host`: The hostname for connecting to the endpoint
- `project_id`: The ID of the project this endpoint belongs to
- `branch_id`: The ID of the branch this endpoint serves
- `type`: The type of endpoint ("read_write" | "read_only")
- `current_state`: The current state of the endpoint ("init" | "active" | "idle")
- `region_id`: The region where the endpoint is located
- `pooler_enabled`: Whether connection pooling is enabled
- `pooler_mode`: The connection pooling mode
- `disabled`: Whether the endpoint is disabled
- `passwordless_access`: Whether passwordless access is enabled
- `proxy_host`: The proxy hostname for the endpoint
- `created_at`: When the endpoint was created
- `updated_at`: When the endpoint was last updated

## Notes

- Read-write endpoints provide full database access
- Read-only endpoints are useful for analytics and reporting workloads
- Endpoints automatically suspend when idle to save costs
- Connection pooling helps manage database connections efficiently
