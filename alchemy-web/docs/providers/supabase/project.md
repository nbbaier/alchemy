# Supabase Project Resource

The `Project` resource manages Supabase projects, which are the main workspaces containing all Supabase services.

## Usage

```typescript
import { Project } from "alchemy/supabase";

// Create a new project
const project = Project("my-app", {
  organizationId: "org-123",
  region: "us-east-1", 
  dbPass: secret("secure-database-password"),
});

// Create project with custom instance size
const project = Project("large-app", {
  organizationId: "org-123",
  region: "us-west-2",
  dbPass: secret("secure-password"),
  desiredInstanceSize: "large",
});
```

## Properties

### Required Properties

- **`organizationId`** (`string`): ID of the organization that will own this project
- **`region`** (`string`): AWS region where the project will be deployed (e.g., "us-east-1", "eu-west-1")
- **`dbPass`** (`string`): Password for the project's PostgreSQL database

### Optional Properties

- **`name`** (`string`): The name of the project. Defaults to the resource ID if not provided.
- **`desiredInstanceSize`** (`string`): Desired compute instance size (e.g., "micro", "small", "medium", "large")
- **`templateUrl`** (`string`): URL to a template repository to initialize the project with
- **`adopt`** (`boolean`): Whether to adopt an existing project if creation fails due to name conflict. Default: `false`.
- **`delete`** (`boolean`): Whether to delete the project when the resource is destroyed. Default: `true`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The project resource exposes the following properties:

- **`id`** (`string`): Unique identifier for the project
- **`organizationId`** (`string`): ID of the owning organization
- **`name`** (`string`): Project name
- **`region`** (`string`): AWS region where the project is deployed
- **`createdAt`** (`string`): ISO timestamp when the project was created
- **`status`** (`string`): Current project status (e.g., "ACTIVE", "PAUSED", "INACTIVE")
- **`database`** (`object`, optional): Database configuration details including host, version, and engine

## Examples

### Basic Project

```typescript
const project = Project("my-app", {
  organizationId: "org-abc123",
  region: "us-east-1",
  dbPass: secret("super-secure-password-123"),
});
```

### Project with Template

```typescript
const project = Project("blog-app", {
  organizationId: "org-abc123", 
  region: "eu-west-1",
  dbPass: secret("secure-password"),
  templateUrl: "https://github.com/supabase/supabase/tree/master/examples/nextjs-blog",
  desiredInstanceSize: "small",
});
```

### Project with Adoption

```typescript
// This will adopt an existing project if one with the same name already exists
const project = Project("existing-app", {
  organizationId: "org-abc123",
  region: "us-west-2", 
  dbPass: secret("password"),
  adopt: true,
});
```

### Project that Won't be Deleted

```typescript
const project = Project("persistent-app", {
  organizationId: "org-abc123",
  region: "us-east-1",
  dbPass: secret("password"),
  delete: false, // Project will not be deleted when resource is destroyed
});
```
