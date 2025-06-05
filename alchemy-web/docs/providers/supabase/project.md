# Supabase Project Resource

The `Project` resource manages Supabase projects, which are the main workspaces containing all Supabase services.

## Usage

```typescript
import { Project } from "alchemy/supabase";

// Create a new project
const project = Project("my-app", {
  organizationId: "org-123",
  region: "us-east-1", 
  dbPass: "secure-database-password",
});

// Create project with custom instance size
const project = Project("large-app", {
  organizationId: "org-123",
  region: "us-west-2",
  dbPass: "secure-password",
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
  dbPass: "super-secure-password-123",
});
```

### Project with Template

```typescript
const project = Project("blog-app", {
  organizationId: "org-abc123", 
  region: "eu-west-1",
  dbPass: "secure-password",
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
  dbPass: "password",
  adopt: true,
});
```

### Project that Won't be Deleted

```typescript
const project = Project("persistent-app", {
  organizationId: "org-abc123",
  region: "us-east-1",
  dbPass: "password",
  delete: false, // Project will not be deleted when resource is destroyed
});
```

## API Operations

### Create Project
- **Endpoint**: `POST /projects`
- **Body**: Project configuration including name, organization_id, region, db_pass, etc.
- **Response**: Project object with ID and initial status

### Get Project
- **Endpoint**: `GET /projects/{ref}`
- **Response**: Full project details including database configuration

### Delete Project
- **Endpoint**: `DELETE /projects/{ref}`
- **Response**: 200 on successful deletion

### List Projects
- **Endpoint**: `GET /projects`
- **Response**: Array of project objects

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to find and adopt an existing project with the same name
- **Rate Limiting**: Automatic exponential backoff for 429 responses  
- **Server Errors**: Automatic retry for 5xx responses
- **404 on Delete**: Ignored (project already deleted)

## Lifecycle Management

- **Creation**: Projects are created with the specified configuration and initial status
- **Updates**: Projects can be refreshed to get current status and configuration
- **Deletion**: Projects can be deleted unless `delete: false` is specified

## Dependencies

Projects depend on:
- **Organization**: Must specify a valid `organizationId`

Projects are dependencies for:
- **Functions**: Edge Functions are deployed within projects
- **Buckets**: Storage buckets belong to projects  
- **Secrets**: Environment variables are scoped to projects
- **SSO Providers**: Authentication providers are configured per project

## Security Considerations

- **Database Password**: The `dbPass` should be a strong, unique password
- **Access Tokens**: Use Alchemy secrets for access tokens, never hardcode them
- **Region Selection**: Choose regions close to your users for better performance
