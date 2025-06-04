# Neon Branch

A Neon branch is a copy-on-write clone of the database. Branches allow you to create isolated environments for development, testing, and experimentation without affecting your main database.

## Properties

- `project_id` (string, required): The ID of the Neon project
- `name` (string, optional): The name of the branch. If not provided, Neon will generate a name
- `parent_id` (string, optional): The ID of the parent branch. If not provided, the branch will be created from the main branch
- `parent_lsn` (string, optional): The Log Sequence Number (LSN) of the parent branch to branch from
- `parent_timestamp` (string, optional): The timestamp to branch from in the parent branch
- `adopt` (boolean, optional): Whether to adopt an existing branch if it already exists. Default: false

## Dependencies

- Requires a Neon Project to exist

## Example

```typescript
import { NeonProject, NeonBranch } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  region_id: "aws-us-east-1",
});

const devBranch = await NeonBranch("dev-branch", {
  project_id: project.id,
  name: "development",
});

const featureBranch = await NeonBranch("feature-branch", {
  project_id: project.id,
  name: "feature-xyz",
  parent_id: devBranch.id,
});
```

## Outputs

- `id`: The unique identifier of the branch
- `project_id`: The ID of the project this branch belongs to
- `name`: The name of the branch
- `current_state`: The current state of the branch ("init" | "ready")
- `created_at`: When the branch was created
- `updated_at`: When the branch was last updated
- `primary`: Whether this is the primary branch
- `default`: Whether this is the default branch
- `protected`: Whether the branch is protected from deletion
