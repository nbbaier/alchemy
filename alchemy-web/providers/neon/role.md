# Neon Role

A Neon role is a PostgreSQL role (user) within a branch. Roles are used for authentication and authorization.

## Example

```typescript
import { NeonProject, NeonBranch, NeonRole } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  regionId: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project: project,
  name: "main",
});

const role = await NeonRole("my-role", {
  project: project,
  branch: branch,
  name: "app_user",
});
```
