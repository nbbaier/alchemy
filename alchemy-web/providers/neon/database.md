# Neon Database

A Neon database is a PostgreSQL database within a branch. Each branch can contain multiple databases.

## Example

```typescript
import { NeonProject, NeonBranch, NeonDatabase } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  regionId: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project: project,
  name: "main",
});

const database = await NeonDatabase("my-database", {
  project: project,
  branch: branch,
  name: "myapp_db",
  ownerName: "myapp_user",
});
```
