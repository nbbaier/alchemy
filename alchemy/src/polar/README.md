# Polar Provider

This directory contains the Polar.sh provider implementation for Alchemy, enabling Infrastructure-as-Code management of Polar.sh SaaS billing and subscription resources.

## Architecture

The Polar provider follows Alchemy's standard provider patterns with these components:

- **`client.ts`** - Polar API client with authentication and error handling
- **Resource files** - Individual resource implementations (customer.ts, product.ts, etc.)
- **`index.ts`** - Provider exports

## Resources

| Resource | File | Description |
|----------|------|-------------|
| Customer | `customer.ts` | Customer account management |
| Product | `product.ts` | Product catalog with pricing |
| Subscription | `subscription.ts` | Recurring billing subscriptions |
| Order | `order.ts` | One-time purchase orders |
| Meter | `meter.ts` | Usage tracking and metering |
| Benefit | `benefit.ts` | Customer benefits (Discord, GitHub, etc.) |
| Discount | `discount.ts` | Promotional codes and discounts |
| Organization | `organization.ts` | Organization settings |

## API Client

The `PolarClient` class provides:

- **Authentication** - Bearer token authentication with Organization Access Tokens
- **Environment support** - Production (`https://api.polar.sh`) and sandbox (`https://sandbox-api.polar.sh`)
- **Error handling** - Comprehensive error handling with retry logic for rate limits
- **TypeScript types** - Full type safety for all API interactions

## Resource Implementation

All resources follow Alchemy's standard patterns:

```typescript
export function ResourceName(name: string, props: ResourceProps): ResourceInstance {
  return resource({
    type: "polar:ResourceName",
    name,
    props,
    create: async (properties) => {
      // Create resource via Polar API
    },
    update: async (id, properties) => {
      // Update resource via Polar API  
    },
    delete: async (id) => {
      // Delete resource via Polar API
    }
  });
}
```

## Authentication

Resources support multiple authentication methods:

1. **Environment variable** - `POLAR_API_KEY`
2. **Explicit Secret** - Pass `apiKey: Secret("KEY_NAME")` to any resource
3. **Organization-level** - Set API key at organization level

## Environment Configuration

Resources default to production environment but support sandbox:

```typescript
const resource = await Resource("name", {
  // ... other props
  environment: "sandbox" // or "production" (default)
});
```

## Error Handling

The client includes comprehensive error handling:

- **Rate limiting** - Automatic retry with exponential backoff
- **API errors** - Structured error responses with details
- **Network errors** - Retry logic for transient failures
- **Validation errors** - Clear error messages for invalid inputs

## Type Safety

All resources include comprehensive TypeScript types:

- **Input validation** - Props are validated at compile time
- **Output types** - Return values are fully typed
- **Union types** - Reference other resources by ID or object
- **Enums** - Shared enums for status values and types

## Testing

Tests are located in `../../test/polar/` and follow the pattern:

```typescript
describe("resource", () => {
  test("lifecycle", async () => {
    let resourceId: string | undefined;
    
    try {
      // Create resource
      const created = await createResource();
      resourceId = created.id;
      
      // Update resource
      await updateResource(resourceId);
      
      // Verify updates
      await verifyResource(resourceId);
      
    } finally {
      // Cleanup
      if (resourceId) {
        await deleteResource(resourceId);
      }
    }
  });
});
```

## Documentation

- **Source docs** - This README for implementation details
- **User docs** - `alchemy-web/docs/providers/polar/` for usage examples
- **API reference** - Individual resource docs in `alchemy-web/providers/polar/`

## Dependencies

- **Alchemy core** - `../resource.ts`, `../secret.ts`, etc.
- **HTTP client** - Uses Alchemy's built-in fetch utilities
- **TypeScript** - Full TypeScript implementation with strict types