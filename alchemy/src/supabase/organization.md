# Supabase Organization Resource

The `Organization` resource manages Supabase organizations, which are top-level containers for projects and billing.

## Usage

```typescript
import { Organization } from "alchemy/supabase";

// Create a new organization
const org = Organization("my-org", {
  name: "My Organization",
});

// Adopt an existing organization
const existingOrg = Organization("existing-org", {
  name: "Existing Organization", 
  adopt: true,
});
```

## Properties

### Required Properties

None - all properties are optional.

### Optional Properties

- **`name`** (`string`): The name of the organization. Defaults to the resource ID if not provided.
- **`adopt`** (`boolean`): Whether to adopt an existing organization if creation fails due to name conflict. Default: `false`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The organization resource exposes the following properties:

- **`id`** (`string`): Unique identifier for the organization
- **`name`** (`string`): Organization name
- **`plan`** (`string`): Billing plan (e.g., "free", "pro", "enterprise")
- **`optInTags`** (`string[]`): Optional tags for the organization
- **`allowedReleaseChannels`** (`string[]`): Allowed release channels for projects

## Examples

### Basic Organization

```typescript
const org = Organization("acme-corp", {
  name: "ACME Corporation",
});
```

### Organization with Adoption

```typescript
// This will adopt an existing organization if one with the same name already exists
const org = Organization("existing-org", {
  name: "Existing Organization",
  adopt: true,
});
```

### Using Custom Access Token

```typescript
import { alchemy } from "alchemy";

const org = Organization("secure-org", {
  name: "Secure Organization",
  accessToken: alchemy.secret("my-supabase-token"),
});
```

## API Operations

### Create Organization
- **Endpoint**: `POST /organizations`
- **Body**: `{ name: string }`
- **Response**: Organization object with ID

### Get Organization
- **Endpoint**: `GET /organizations/{id}`
- **Response**: Full organization details

### List Organizations
- **Endpoint**: `GET /organizations`
- **Response**: Array of organization objects

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to find and adopt an existing organization with the same name
- **Rate Limiting**: Automatic exponential backoff for 429 responses
- **Server Errors**: Automatic retry for 5xx responses

## Limitations

- Organizations cannot be deleted via the Management API
- Organizations cannot be updated via the Management API
- Organization names must be unique within your account

## Dependencies

Organizations are root-level resources with no dependencies. Projects depend on organizations.
