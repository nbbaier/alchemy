# Neon Database

A Neon database is a PostgreSQL database within a branch. Each branch can contain multiple databases.

## Properties

- `project_id` (string, required): The ID of the Neon project
- `branch_id` (string, required): The ID of the branch where the database will be created
- `name` (string, required): The name of the database
- `owner_name` (string, required): The name of the role that will own the database
- `adopt` (boolean, optional): Whether to adopt an existing database if it already exists. Default: false

## Dependencies

- Requires a Neon Project to exist
- Requires a Neon Branch to exist
- Requires a Neon Role to exist (specified as owner_name)

## Example

```typescript
import { NeonProject, NeonBranch, NeonDatabase } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  region_id: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project_id: project.id,
  name: "main",
});

const database = await NeonDatabase("my-database", {
  project_id: project.id,
  branch_id: branch.id,
  name: "myapp_db",
  owner_name: "myapp_user",
});
```

## Outputs

- `id`: The unique identifier of the database
- `branch_id`: The ID of the branch this database belongs to
- `name`: The name of the database
- `owner_name`: The name of the role that owns the database
- `created_at`: When the database was created
- `updated_at`: When the database was last updated
