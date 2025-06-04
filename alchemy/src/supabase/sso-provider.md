# Supabase SSO Provider Resource

The `SSOProvider` resource manages Single Sign-On (SSO) authentication providers for Supabase projects, enabling enterprise authentication integration.

## Usage

```typescript
import { SSOProvider } from "alchemy/supabase";

// Create a SAML SSO provider
const samlProvider = SSOProvider("company-saml", {
  projectRef: "proj-123",
  type: "saml",
  metadata: {
    entity_id: "https://company.com/saml",
    sso_url: "https://company.com/sso/login",
    certificate: "-----BEGIN CERTIFICATE-----\n...\n-----END CERTIFICATE-----",
  },
  domains: ["company.com", "subsidiary.company.com"],
});

// Create an OIDC SSO provider
const oidcProvider = SSOProvider("company-oidc", {
  projectRef: "proj-123",
  type: "oidc",
  metadata: {
    issuer: "https://company.okta.com",
    client_id: "your-client-id",
    client_secret: "your-client-secret",
  },
  domains: ["company.com"],
});
```

## Properties

### Required Properties

- **`projectRef`** (`string`): Reference ID of the project where the SSO provider will be configured
- **`type`** (`string`): Type of SSO provider ("saml", "oidc", etc.)

### Optional Properties

- **`metadata`** (`Record<string, any>`): Provider-specific configuration metadata
- **`domains`** (`string[]`): Array of email domains that should use this SSO provider
- **`adopt`** (`boolean`): Whether to adopt an existing provider if creation fails due to type conflict. Default: `false`.
- **`delete`** (`boolean`): Whether to delete the provider when the resource is destroyed. Default: `true`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The SSO provider resource exposes the following properties:

- **`id`** (`string`): Unique identifier for the SSO provider
- **`type`** (`string`): Type of SSO provider
- **`metadata`** (`Record<string, any>`): Provider configuration metadata
- **`domains`** (`string[]`): Array of associated email domains
- **`createdAt`** (`string`): ISO timestamp when the provider was created
- **`updatedAt`** (`string`): ISO timestamp when the provider was last updated

## Examples

### SAML Provider

```typescript
const samlProvider = SSOProvider("enterprise-saml", {
  projectRef: "my-project-ref",
  type: "saml",
  metadata: {
    entity_id: "https://enterprise.com/saml/metadata",
    sso_url: "https://enterprise.com/saml/sso",
    slo_url: "https://enterprise.com/saml/slo",
    certificate: `-----BEGIN CERTIFICATE-----
MIICXjCCAcegAwIBAgIJAKS0yiqVrJejMA0GCSqGSIb3DQEBCwUAMEUxCzAJBgNV
...
-----END CERTIFICATE-----`,
    attribute_mapping: {
      email: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress",
      name: "http://schemas.xmlsoap.org/ws/2005/05/identity/claims/name",
    },
  },
  domains: ["enterprise.com", "subsidiary.enterprise.com"],
});
```

### OIDC Provider (Okta)

```typescript
const oktaProvider = SSOProvider("okta-oidc", {
  projectRef: "my-project-ref",
  type: "oidc",
  metadata: {
    issuer: "https://company.okta.com/oauth2/default",
    client_id: "0oa1234567890abcdef",
    client_secret: "your-okta-client-secret",
    authorization_endpoint: "https://company.okta.com/oauth2/default/v1/authorize",
    token_endpoint: "https://company.okta.com/oauth2/default/v1/token",
    userinfo_endpoint: "https://company.okta.com/oauth2/default/v1/userinfo",
    jwks_uri: "https://company.okta.com/oauth2/default/v1/keys",
    scopes: ["openid", "email", "profile"],
  },
  domains: ["company.com"],
});
```

### Azure AD Provider

```typescript
const azureProvider = SSOProvider("azure-ad", {
  projectRef: "my-project-ref",
  type: "oidc",
  metadata: {
    issuer: "https://login.microsoftonline.com/tenant-id/v2.0",
    client_id: "your-azure-client-id",
    client_secret: "your-azure-client-secret",
    authorization_endpoint: "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/authorize",
    token_endpoint: "https://login.microsoftonline.com/tenant-id/oauth2/v2.0/token",
    userinfo_endpoint: "https://graph.microsoft.com/oidc/userinfo",
    jwks_uri: "https://login.microsoftonline.com/tenant-id/discovery/v2.0/keys",
    scopes: ["openid", "email", "profile"],
  },
  domains: ["company.com"],
});
```

### Google Workspace Provider

```typescript
const googleProvider = SSOProvider("google-workspace", {
  projectRef: "my-project-ref",
  type: "oidc",
  metadata: {
    issuer: "https://accounts.google.com",
    client_id: "your-google-client-id.apps.googleusercontent.com",
    client_secret: "your-google-client-secret",
    authorization_endpoint: "https://accounts.google.com/o/oauth2/v2/auth",
    token_endpoint: "https://oauth2.googleapis.com/token",
    userinfo_endpoint: "https://openidconnect.googleapis.com/v1/userinfo",
    jwks_uri: "https://www.googleapis.com/oauth2/v3/certs",
    scopes: ["openid", "email", "profile"],
    hd: "company.com", // Hosted domain restriction
  },
  domains: ["company.com"],
});
```

### Provider with Adoption

```typescript
// This will adopt an existing provider if one with the same type already exists
const existingProvider = SSOProvider("existing-saml", {
  projectRef: "my-project-ref",
  type: "saml",
  adopt: true,
  metadata: {
    entity_id: "https://updated.com/saml",
    sso_url: "https://updated.com/sso",
  },
  domains: ["updated.com"],
});
```

## API Operations

### Create SSO Provider
- **Endpoint**: `POST /projects/{projectRef}/config/auth/sso/providers`
- **Body**: Provider configuration including type, metadata, and domains
- **Response**: Provider object with ID and configuration

### Get SSO Provider
- **Endpoint**: `GET /projects/{projectRef}/config/auth/sso/providers/{id}`
- **Response**: Full provider details

### List SSO Providers
- **Endpoint**: `GET /projects/{projectRef}/config/auth/sso/providers`
- **Response**: Array of provider objects

### Delete SSO Provider
- **Endpoint**: `DELETE /projects/{projectRef}/config/auth/sso/providers/{id}`
- **Response**: 200 on successful deletion

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to find and adopt an existing provider with the same type
- **Rate Limiting**: Automatic exponential backoff for 429 responses
- **Server Errors**: Automatic retry for 5xx responses
- **404 on Delete**: Ignored (provider already deleted)

## Lifecycle Management

- **Creation**: Providers are created with the specified type and configuration
- **Updates**: Provider configuration can be refreshed to get current state
- **Deletion**: Providers can be deleted unless `delete: false` is specified

## Dependencies

SSO Providers depend on:
- **Project**: Must specify a valid `projectRef`

## Authentication Flow

Once configured, users from the specified domains will be redirected to the SSO provider for authentication:

1. User enters email address on Supabase login page
2. If email domain matches a configured provider, user is redirected to SSO
3. User authenticates with the SSO provider
4. Provider redirects back to Supabase with authentication assertion
5. Supabase validates the assertion and creates/updates the user account

## Configuration Requirements

### SAML Providers
- **entity_id**: Unique identifier for your SAML entity
- **sso_url**: Single Sign-On URL where users are redirected
- **certificate**: X.509 certificate for validating SAML assertions
- **slo_url** (optional): Single Logout URL
- **attribute_mapping** (optional): Map SAML attributes to user fields

### OIDC Providers
- **issuer**: OIDC issuer URL
- **client_id**: OAuth2 client identifier
- **client_secret**: OAuth2 client secret
- **authorization_endpoint**: OAuth2 authorization URL
- **token_endpoint**: OAuth2 token exchange URL
- **userinfo_endpoint**: OIDC userinfo URL
- **jwks_uri**: JSON Web Key Set URL for token validation

## Security Considerations

- **Certificate Validation**: Ensure SAML certificates are valid and properly configured
- **Client Secrets**: Store OIDC client secrets securely
- **Domain Restrictions**: Only configure domains you control
- **Token Validation**: Verify that token endpoints use HTTPS
- **Attribute Mapping**: Validate that user attributes are correctly mapped

## Best Practices

- **Testing**: Test SSO configuration in a development environment first
- **Monitoring**: Monitor SSO login success/failure rates
- **Documentation**: Document the SSO setup process for your team
- **Backup**: Keep backup configurations for critical SSO providers
- **Updates**: Regularly update certificates and secrets before expiration

## Troubleshooting

### Common Issues
- **Certificate Errors**: Ensure SAML certificates are properly formatted
- **Domain Mismatches**: Verify that user email domains match configured domains
- **Endpoint Errors**: Check that all URLs are accessible and use HTTPS
- **Attribute Mapping**: Ensure required user attributes are provided by the SSO provider

### Testing SSO
```typescript
// Test SSO configuration by attempting login
// Check Supabase Auth logs for detailed error messages
// Verify that user attributes are correctly mapped
```
