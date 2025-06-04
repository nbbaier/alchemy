# Neon Role

A Neon role is a PostgreSQL role (user) within a branch. Roles are used for authentication and authorization.

## Properties

- `project_id` (string, required): The ID of the Neon project
- `branch_id` (string, required): The ID of the branch where the role will be created
- `name` (string, required): The name of the role
- `adopt` (boolean, optional): Whether to adopt an existing role if it already exists. Default: false

## Dependencies

- Requires a Neon Project to exist
- Requires a Neon Branch to exist

## Example

```typescript
import { NeonProject, NeonBranch, NeonRole } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  region_id: "aws-us-east-1",
});

const branch = await NeonBranch("my-branch", {
  project_id: project.id,
  name: "main",
});

const role = await NeonRole("my-role", {
  project_id: project.id,
  branch_id: branch.id,
  name: "myapp_user",
});
```

## Outputs

- `branch_id`: The ID of the branch this role belongs to
- `name`: The name of the role
- `password`: The password for the role (if generated)
- `protected`: Whether the role is protected from deletion
- `created_at`: When the role was created
- `updated_at`: When the role was last updated

## Notes

- Roles are automatically assigned a password when created
- The password is returned as a Secret and can be used for database connections
- Protected roles cannot be deleted
