# Railway Volume

A Railway volume represents persistent storage that can be mounted to services within a project environment.

## Example Usage

```typescript
import { Environment, Project, Volume } from "alchemy/railway";

// Create project and environment first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

// Create a data volume
const dataVolume = await Volume("data-volume", {
  name: "app-data",
  projectId: project.id,
  environmentId: environment.id,
  mountPath: "/data",
  size: 1024, // 1GB
});

// Create a larger volume for file storage
const fileStorage = await Volume("file-storage", {
  name: "user-uploads",
  projectId: project.id,
  environmentId: environment.id,
  mountPath: "/app/uploads",
  size: 10240, // 10GB
});

// Create a logs volume
const logsVolume = await Volume("logs-volume", {
  name: "application-logs",
  projectId: project.id,
  environmentId: environment.id,
  mountPath: "/var/log/app",
  size: 2048, // 2GB
});
```

## Properties

### Required

- **name** (string): The name of the volume.
- **projectId** (string): The ID of the project this volume belongs to.
- **environmentId** (string): The ID of the environment this volume belongs to.
- **mountPath** (string): The path where the volume will be mounted in the container.

### Optional

- **size** (number): The size of the volume in MB. Defaults to Railway's default size.
- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the volume.
- **createdAt** (string): The timestamp when the volume was created.
- **updatedAt** (string): The timestamp when the volume was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const volume = await Volume("my-volume", {
  name: "persistent-data",
  projectId: "project_123",
  environmentId: "env_456",
  mountPath: "/data",
  size: 5120, // 5GB
  apiKey: secret("your-railway-token"),
});
```

## Usage Notes

- Volumes provide persistent storage that survives service restarts and redeployments
- The mount path should be an absolute path within the container
- Volume size is specified in megabytes (MB)
- Volumes are environment-specific and cannot be shared across environments
