# Railway Project

A Railway project is a container for your applications, databases, and other resources.

## Example Usage

```typescript
import { Project } from "alchemy/railway";

// Create a basic project
const myProject = await Project("my-project", {
  name: "My Application",
  description: "A web application project",
});

// Create a public project
const publicProject = await Project("public-project", {
  name: "Open Source Project",
  description: "A public open source project",
  isPublic: true,
});

// Create a team project
const teamProject = await Project("team-project", {
  name: "Team Application",
  description: "A project for our team",
  teamId: "team_123",
});
```

## Properties

### Required

- **name** (string): The name of the project.

### Optional

- **description** (string): A description of the project.
- **isPublic** (boolean): Whether the project is public. Defaults to `false`.
- **teamId** (string): The ID of the team that owns the project.
- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the project.
- **defaultEnvironment** (string): The ID of the default environment.
- **createdAt** (string): The timestamp when the project was created.
- **updatedAt** (string): The timestamp when the project was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const project = await Project("my-project", {
  name: "My Project",
  apiKey: secret("your-railway-token"),
});
```
