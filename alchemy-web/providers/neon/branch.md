# Neon Branch

A Neon branch is a copy-on-write clone of the database. Branches allow you to create isolated environments for development, testing, and experimentation without affecting your main database.

## Example

```typescript
import { NeonProject, NeonBranch } from "alchemy/neon";

const project = await NeonProject("my-project", {
  name: "My Database Project",
  regionId: "aws-us-east-1",
});

const devBranch = await NeonBranch("dev-branch", {
  project: project,
  name: "development",
});

const featureBranch = await NeonBranch("feature-branch", {
  project: project,
  name: "feature-xyz",
  parent: devBranch,
});
```
