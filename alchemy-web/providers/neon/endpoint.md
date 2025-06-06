# Neon Endpoint

A Neon endpoint is a compute instance that provides access to a database branch. Endpoints can be read-write or read-only.

## Example

```typescript
import { NeonProject, NeonBranch, NeonEndpoint } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  regionId: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project: project,
  name: "main",
});

const readWriteEndpoint = await NeonEndpoint("rw-endpoint", {
  project: project,
  branch: branch,
  type: "read_write",
  poolerEnabled: true,
  poolerMode: "transaction",
});

const readOnlyEndpoint = await NeonEndpoint("ro-endpoint", {
  project: project,
  branch: branch,
  type: "read_only",
  suspendTimeoutSeconds: 300,
});
```
