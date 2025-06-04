# Supabase Secret Resource

The `Secret` resource manages environment variables and secrets for Supabase projects, providing secure configuration management.

## Usage

```typescript
import { Secret } from "alchemy/supabase";

// Create project secrets
const secrets = Secret("app-config", {
  projectRef: "proj-123",
  secrets: {
    API_KEY: "your-api-key-here",
    DATABASE_URL: "postgresql://...",
    JWT_SECRET: "your-jwt-secret",
    STRIPE_SECRET_KEY: "sk_test_...",
  },
});

// Single secret
const dbSecret = Secret("database-config", {
  projectRef: "proj-123",
  secrets: {
    DATABASE_PASSWORD: "super-secure-password",
  },
});
```

## Properties

### Required Properties

- **`projectRef`** (`string`): Reference ID of the project where secrets will be stored
- **`secrets`** (`Record<string, string>`): Key-value pairs of secret names and values

### Optional Properties

- **`adopt`** (`boolean`): Whether to adopt existing secrets if creation fails due to conflicts. Default: `false`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The secret resource exposes the following properties:

- **`projectRef`** (`string`): Reference ID of the project
- **`secrets`** (`Array<{name: string, value: string}>`): Array of secret name-value pairs

## Examples

### Application Configuration

```typescript
const appSecrets = Secret("app-config", {
  projectRef: "my-project-ref",
  secrets: {
    NODE_ENV: "production",
    API_BASE_URL: "https://api.example.com",
    REDIS_URL: "redis://localhost:6379",
    SESSION_SECRET: "your-session-secret-here",
  },
});
```

### Database Configuration

```typescript
const dbSecrets = Secret("database-config", {
  projectRef: "my-project-ref", 
  secrets: {
    DB_HOST: "localhost",
    DB_PORT: "5432",
    DB_NAME: "myapp",
    DB_USER: "myuser",
    DB_PASSWORD: "secure-password-123",
  },
});
```

### Third-Party API Keys

```typescript
const apiKeys = Secret("api-keys", {
  projectRef: "my-project-ref",
  secrets: {
    STRIPE_PUBLISHABLE_KEY: "pk_test_...",
    STRIPE_SECRET_KEY: "sk_test_...",
    SENDGRID_API_KEY: "SG.xxx...",
    GOOGLE_CLIENT_ID: "xxx.apps.googleusercontent.com",
    GOOGLE_CLIENT_SECRET: "GOCSPX-xxx...",
  },
});
```

### Secrets with Adoption

```typescript
// This will adopt existing secrets if they already exist
const existingSecrets = Secret("existing-config", {
  projectRef: "my-project-ref",
  adopt: true,
  secrets: {
    EXISTING_SECRET: "new-value",
    NEW_SECRET: "another-value",
  },
});
```

### Environment-Specific Secrets

```typescript
const prodSecrets = Secret("production-config", {
  projectRef: "prod-project-ref",
  secrets: {
    NODE_ENV: "production",
    LOG_LEVEL: "error",
    CACHE_TTL: "3600",
  },
});

const devSecrets = Secret("development-config", {
  projectRef: "dev-project-ref",
  secrets: {
    NODE_ENV: "development", 
    LOG_LEVEL: "debug",
    CACHE_TTL: "60",
  },
});
```

## API Operations

### Create Secrets (Bulk)
- **Endpoint**: `POST /projects/{projectRef}/secrets`
- **Body**: Array of secret objects with name and value
- **Response**: 200 on successful creation

### List Secrets
- **Endpoint**: `GET /projects/{projectRef}/secrets`
- **Response**: Array of secret objects (values may be masked)

### Delete Secrets (Bulk)
- **Endpoint**: `DELETE /projects/{projectRef}/secrets`
- **Body**: Array of secret names to delete
- **Response**: 200 on successful deletion

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to adopt existing secrets with matching names
- **Rate Limiting**: Automatic exponential backoff for 429 responses
- **Server Errors**: Automatic retry for 5xx responses
- **404 on Delete**: Ignored (secrets already deleted)

## Lifecycle Management

- **Creation**: Secrets are created in bulk for the specified project
- **Updates**: All secrets are recreated when the resource is updated
- **Deletion**: All managed secrets are deleted when the resource is destroyed

## Dependencies

Secrets depend on:
- **Project**: Must specify a valid `projectRef`

## Usage in Edge Functions

Secrets are automatically available as environment variables in Edge Functions:

```typescript
// In your Edge Function code
export default function handler(req: Request) {
  const apiKey = Deno.env.get('API_KEY');
  const dbUrl = Deno.env.get('DATABASE_URL');
  
  // Use secrets in your function logic
  return new Response(`Using API key: ${apiKey ? 'present' : 'missing'}`);
}
```

## Security Considerations

- **Sensitive Data**: Never log or expose secret values in your code
- **Access Control**: Secrets are only accessible within the project they're created in
- **Rotation**: Regularly rotate sensitive secrets like API keys and passwords
- **Principle of Least Privilege**: Only include secrets that are actually needed

## Best Practices

- **Naming**: Use descriptive, uppercase names with underscores (e.g., `DATABASE_URL`, `API_KEY`)
- **Organization**: Group related secrets together in a single resource
- **Documentation**: Document what each secret is used for
- **Validation**: Validate secret formats and requirements before setting them
- **Backup**: Keep secure backups of critical secrets outside of Supabase

## Common Secret Types

### Database Connections
```typescript
{
  DATABASE_URL: "postgresql://user:pass@host:port/db",
  REDIS_URL: "redis://host:port",
  MONGODB_URI: "mongodb://host:port/db"
}
```

### API Keys
```typescript
{
  STRIPE_SECRET_KEY: "sk_test_...",
  SENDGRID_API_KEY: "SG.xxx...",
  AWS_ACCESS_KEY_ID: "AKIA...",
  AWS_SECRET_ACCESS_KEY: "xxx..."
}
```

### Authentication
```typescript
{
  JWT_SECRET: "your-jwt-signing-secret",
  SESSION_SECRET: "your-session-secret",
  OAUTH_CLIENT_SECRET: "oauth-client-secret"
}
```

### Application Configuration
```typescript
{
  NODE_ENV: "production",
  LOG_LEVEL: "info",
  CACHE_TTL: "3600",
  MAX_UPLOAD_SIZE: "10485760"
}
```
