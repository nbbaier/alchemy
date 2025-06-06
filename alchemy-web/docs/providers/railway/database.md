# Railway Database

A Railway database represents a managed database instance within a project environment.

## Example Usage

```typescript
import { Database, Environment, Project } from "alchemy/railway";

// Create project and environment first
const project = await Project("my-project", {
  name: "My Application",
});

const environment = await Environment("prod-env", {
  name: "production",
  projectId: project.id,
});

// Create a PostgreSQL database
const postgres = await Database("postgres-db", {
  name: "main-database",
  projectId: project.id,
  environmentId: environment.id,
  type: "postgresql",
});

// Create a Redis cache
const redis = await Database("redis-cache", {
  name: "session-cache",
  projectId: project.id,
  environmentId: environment.id,
  type: "redis",
});

// Create a MySQL database
const mysql = await Database("mysql-db", {
  name: "legacy-database",
  projectId: project.id,
  environmentId: environment.id,
  type: "mysql",
});
```

## Properties

### Required

- **name** (string): The name of the database.
- **projectId** (string): The ID of the project this database belongs to.
- **environmentId** (string): The ID of the environment this database belongs to.
- **type** ("postgresql" | "mysql" | "redis" | "mongodb"): The type of database to create.

### Optional

- **apiKey** (Secret): Railway API token to use for authentication. Defaults to `RAILWAY_TOKEN` environment variable.

## Outputs

- **id** (string): The unique identifier of the database.
- **connectionString** (Secret): The connection string for the database.
- **host** (string): The hostname of the database.
- **port** (number): The port number of the database.
- **username** (string): The username for database access.
- **password** (Secret): The password for database access.
- **databaseName** (string): The name of the database.
- **createdAt** (string): The timestamp when the database was created.
- **updatedAt** (string): The timestamp when the database was last updated.

## Authentication

The Railway provider requires a Railway API token. You can provide this in two ways:

1. Set the `RAILWAY_TOKEN` environment variable
2. Pass an `apiKey` parameter using `alchemy.secret()`

```typescript
import { secret } from "alchemy";

const database = await Database("my-db", {
  name: "production-db",
  projectId: "project_123",
  environmentId: "env_456",
  type: "postgresql",
  apiKey: secret("your-railway-token"),
});
```

## Security

Database credentials (connection string and password) are automatically wrapped in Alchemy's `Secret` type to ensure they are encrypted when stored in state files. When accessing these values, use the `.unencrypted` property:

```typescript
console.log(database.connectionString.unencrypted); // Access the connection string
console.log(database.password.unencrypted); // Access the password
```
