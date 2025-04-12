# DDD Framework Implementation Guide

This guide provides strict conventions for implementing Domain-Driven Design components using the DDD framework.

## Exhaustive Type Checking with assertNever

Always use if-else chains with `assertNever` for handling discriminated unions (like events):

```typescript
import { assertNever } from "../ddd/assert-never";

if (event.type === "EventType1") {
  // Handle EventType1
} else if (event.type === "EventType2") {
  // Handle EventType2
} else {
  // This ensures all possible cases are handled at compile time
  return assertNever(event);
}
```

This pattern:
- Provides compile-time exhaustiveness checking
- Forces explicit handling of all possible event types
- Prevents unintentional fallthrough behavior
- Makes code more maintainable as new event types are added

NEVER use switch statements with default cases as they don't provide the same level of type safety.

## File Organization

Co-locate related entities using a suffix-based naming convention:

```
src/domains/{{boundedContext}}/
├── {{EntityName}}.event.ts      // Event definitions
├── {{EntityName}}.aggregate.ts  // Aggregate definitions
├── {{EntityName}}.command.ts    // Command definitions
├── {{EntityName}}.error.ts      // Error definitions
├── {{EntityName}}.policy.ts     // Policy definitions
├── {{EntityName}}.projection.ts // Projection definitions
├── {{EntityName}}.saga.ts       // Saga definitions
└── index.ts                     // Exports all components
```

This approach keeps related entities together rather than organizing by component type.

## Event File Template

Events must be defined in individual files following the naming pattern: `{{EventName}}.event.ts`

```typescript
// src/domains/{{boundedContext}}/{{EventName}}.event.ts
import { z } from "zod";
import { event } from "../../../ddd";

/**
 * {{EventDescription}}
 * 
 * @example
 * // Example of how this event is created and used:
 * const userCreated = {{EventName}}({
 *   userId: "user-123",
 *   username: "johndoe",
 *   createdAt: Date.now()
 * });
 */
export const {{EventName}} = event("{{EventName}}", z.object({
  /**
   * {{PropertyDescription}}
   */
  {{propertyName}}: {{zodType}},
  
  // Additional properties...
}));
```

## Aggregate File Template

Aggregates must be defined in individual files following the naming pattern: `{{AggregateName}}.aggregate.ts`

```typescript
// src/domains/{{boundedContext}}/{{AggregateName}}.aggregate.ts
import { z } from "zod";
import { aggregate } from "../../../ddd";
import { assertNever } from "../../../ddd/assert-never";
import { {{Event1}} } from "./{{Event1}}.event";
import { {{Event2}} } from "./{{Event2}}.event";
// Import additional events...

/**
 * {{AggregateDescription}}
 * 
 * @example
 * // Example of how this aggregate state is used:
 * const user = {
 *   userId: "user-123",
 *   username: "johndoe",
 *   createdAt: 1634567890000
 * };
 */
export const {{AggregateName}} = aggregate("{{AggregateName}}", {
  schema: z.object({
    /**
     * {{PropertyDescription}}
     */
    {{propertyName}}: {{zodType}},
    
    // Additional properties...
  }),
  events: [
    {{Event1}},
    {{Event2}},
    // Additional events...
  ]
}, (state, event) => {
  if (event.type === "{{Event1}}") {
    return {
      // Map event properties to state
      {{stateProperty1}}: event.payload.{{eventProperty1}},
      {{stateProperty2}}: event.payload.{{eventProperty2}},
      // Additional mappings...
    };
  } else if (event.type === "{{Event2}}") {
    if (!state) return state; // Handle non-existent state case
    
    return {
      ...state,
      // Update properties
      {{stateProperty1}}: event.payload.{{eventProperty1}} ?? state.{{stateProperty1}},
      // Additional updates...
    };
  } else {
    // TypeScript will error if all event types aren't handled
    return assertNever(event);
  }
});
```

## Error File Template

Errors must be defined in individual files following the naming pattern: `{{ErrorName}}.error.ts`

```typescript
// src/domains/{{boundedContext}}/{{ErrorName}}.error.ts
import { z } from "zod";
import { error } from "../../../ddd";

/**
 * {{ErrorDescription}}
 * 
 * @example
 * // Example of how this error is thrown:
 * throw new {{ErrorName}}({ {{propertyName}}: "value" });
 */
export const {{ErrorName}} = error("{{ErrorName}}", z.object({
  /**
   * {{PropertyDescription}}
   */
  {{propertyName}}: {{zodType}},
  
  // Additional properties...
}));
```

## Command File Template

Commands must be defined in individual files following the naming pattern: `{{CommandName}}.command.ts`

```typescript
// src/domains/{{boundedContext}}/{{CommandName}}.command.ts
import { z } from "zod";
import { command } from "../../../ddd";
import { {{AggregateName}} } from "./{{AggregateName}}.aggregate";
import { {{EventName}} } from "./{{EventName}}.event";
import { {{ErrorName}} } from "./{{ErrorName}}.error";
import { generateId } from "../../shared/utils";

/**
 * {{CommandDescription}}
 * 
 * @example
 * // Example of how this command is executed:
 * await {{CommandName}}.execute("aggregateId", {
 *   {{inputProperty}}: "value"
 * });
 */
export const {{CommandName}} = command("{{CommandName}}", {
  aggregate: {{AggregateName}},
  input: z.object({
    /**
     * {{InputPropertyDescription}}
     */
    {{inputProperty}}: {{zodType}},
    
    // Additional input properties...
  })
}, async ({{aggregateInstance}}, input) => {
  // 1. Validate preconditions
  if ({{preconditionCheck}}) {
    throw new {{ErrorName}}({ {{errorProperty}}: {{errorValue}} });
  }
  
  // 2. Business logic
  // ...
  
  // 3. Return resulting event(s)
  return {{EventName}}({
    {{eventProperty1}}: {{eventValue1}},
    {{eventProperty2}}: {{eventValue2}},
    // Additional event properties...
  });
});
```

## Policy File Template

Policies must be defined in individual files following the naming pattern: `{{PolicyName}}.policy.ts`

```typescript
// src/domains/{{boundedContext}}/{{PolicyName}}.policy.ts
import { policy } from "../../../ddd";
import { {{EventName}} } from "./{{EventName}}.event";

/**
 * {{PolicyDescription}}
 * 
 * @example
 * // Example of how this policy reacts to events:
 * // When a {{EventName}} event occurs, this policy will...
 */
export const {{PolicyName}} = policy("{{PolicyName}}", {
  on: [{{EventName}}]
}, async (event) => {
  // Extract needed data from event payload
  const { {{eventProperty1}}, {{eventProperty2}} } = event.payload;
  
  // Execute side effects
  // For example:
  console.log(`Handling event for ${{{eventProperty1}}}`);
  
  // Additional business logic
  // ...
});
```

## Projection File Template

Projections must be defined in individual files following the naming pattern: `{{ProjectionName}}.projection.ts`

```typescript
// src/domains/{{boundedContext}}/{{ProjectionName}}.projection.ts
import { projection } from "../../../ddd";
import { {{EventName}} } from "./{{EventName}}.event";

/**
 * {{ProjectionDescription}}
 * 
 * @example
 * // Example of how this projection builds a read model:
 * // When a {{EventName}} event occurs, this projection will update the read model...
 */
export const {{ProjectionName}} = projection("{{ProjectionName}}", {
  events: [{{EventName}}]
}, async (event, repository) => {
  // Extract needed data from event payload
  const { {{eventProperty1}}, {{eventProperty2}} } = event.payload;
  
  switch (event.type) {
    case "{{EventName}}":
      // Update read model
      await repository.save(
        "{{collectionName}}",
        {{eventProperty1}}, // ID for the document
        {
          {{documentProperty1}}: {{eventProperty1}},
          {{documentProperty2}}: {{eventProperty2}},
          // Additional properties...
          updatedAt: Date.now()
        }
      );
      break;
    
    // Handle other event types...
  }
});
```

## Saga File Template

Sagas must be defined in individual files following the naming pattern: `{{SagaName}}.saga.ts`

```typescript
// src/domains/{{boundedContext}}/{{SagaName}}.saga.ts
import { saga } from "../../../ddd";
import { assertNever } from "../../../ddd/assert-never";
import { {{EventName}} } from "./{{EventName}}.event";
import { {{CommandName1}} } from "./{{CommandName1}}.command";
import { {{CommandName2}} } from "./{{CommandName2}}.command";

/**
 * {{SagaDescription}}
 * 
 * @example
 * // Example of how this saga orchestrates a process:
 * // When a {{EventName}} event occurs, this saga will...
 */
export const {{SagaName}} = saga("{{SagaName}}", {
  events: [{{EventName}}],
  commands: [{{CommandName1}}, {{CommandName2}}]
}, async (event, context) => {
  // Extract needed data from event payload
  const { {{eventProperty1}}, {{eventProperty2}} } = event.payload;
  
  if (event.type === "{{EventName}}") {
    // Store saga state if needed
    await context.setState("{{stateKey}}", {
      {{stateProperty1}}: {{eventProperty1}},
      startedAt: Date.now()
    });
    
    // Return command to execute
    return {{CommandName1}}.execute(
      {{aggregateId}},
      {
        {{commandProperty1}}: {{eventProperty1}},
        {{commandProperty2}}: {{eventProperty2}}
      }
    );
  } else {
    // TypeScript ensures all event types are handled
    return assertNever(event);
  }
});
```

## Bounded Context Index Template

The index file for each bounded context follows a standard pattern:

```typescript
// src/domains/{{boundedContext}}/index.ts

// Export all components
export * from "./{{EntityName1}}.aggregate";
export * from "./{{EntityName1}}.command";
export * from "./{{EntityName1}}.event";
export * from "./{{EntityName1}}.error";
export * from "./{{EntityName1}}.policy";
export * from "./{{EntityName1}}.projection";
export * from "./{{EntityName1}}.saga";

// Additional exports...
```

## Example: User Management Bounded Context

Here's a complete example following these conventions:

### Event: UserCreated.event.ts

```typescript
// src/domains/users/UserCreated.event.ts
import { z } from "zod";
import { event } from "../../../ddd";

/**
 * Emitted when a new user is created in the system
 * 
 * @example
 * const userCreated = UserCreated({
 *   userId: "user-123",
 *   username: "johndoe",
 *   email: "john@example.com",
 *   createdAt: Date.now()
 * });
 */
export const UserCreated = event("UserCreated", z.object({
  /**
   * Unique identifier for the user
   */
  userId: z.string(),
  
  /**
   * The user's chosen username
   */
  username: z.string(),
  
  /**
   * The user's email address
   */
  email: z.string().email(),
  
  /**
   * Timestamp when the user was created
   */
  createdAt: z.number()
}));
```

### Aggregate: User.aggregate.ts

```typescript
// src/domains/users/User.aggregate.ts
import { z } from "zod";
import { aggregate } from "../../../ddd";
import { assertNever } from "../../../ddd/assert-never";
import { UserCreated } from "./UserCreated.event";
import { UserProfileUpdated } from "./UserProfileUpdated.event";

/**
 * User aggregate represents a user in the system
 * 
 * @example
 * const user = {
 *   userId: "user-123",
 *   username: "johndoe",
 *   email: "john@example.com",
 *   createdAt: 1634567890000,
 *   updatedAt: undefined
 * };
 */
export const User = aggregate("User", {
  schema: z.object({
    /**
     * Unique identifier for the user
     */
    userId: z.string(),
    
    /**
     * The user's chosen username
     */
    username: z.string(),
    
    /**
     * The user's email address
     */
    email: z.string().email(),
    
    /**
     * Timestamp when the user was created
     */
    createdAt: z.number(),
    
    /**
     * Timestamp when the user was last updated
     */
    updatedAt: z.number().optional()
  }),
  events: [
    UserCreated,
    UserProfileUpdated
  ]
}, (state, event) => {
  if (event.type === "UserCreated") {
    return {
      userId: event.payload.userId,
      username: event.payload.username,
      email: event.payload.email,
      createdAt: event.payload.createdAt,
      updatedAt: undefined
    };
  } else if (event.type === "UserProfileUpdated") {
    if (!state) return state;
    
    return {
      ...state,
      username: event.payload.username ?? state.username,
      email: event.payload.email ?? state.email,
      updatedAt: event.payload.updatedAt
    };
  } else {
    return assertNever(event);
  }
});
```

### Error: UserAlreadyExists.error.ts

```typescript
// src/domains/users/UserAlreadyExists.error.ts
import { z } from "zod";
import { error } from "../../../ddd";

/**
 * Thrown when attempting to create a user with a username that already exists
 * 
 * @example
 * throw new UserAlreadyExists({ username: "johndoe" });
 */
export const UserAlreadyExists = error("UserAlreadyExists", z.object({
  /**
   * The duplicate username that caused the error
   */
  username: z.string()
}));
```

### Command: CreateUser.command.ts

```typescript
// src/domains/users/CreateUser.command.ts
import { z } from "zod";
import { command } from "../../../ddd";
import { User } from "./User.aggregate";
import { UserCreated } from "./UserCreated.event";
import { UserAlreadyExists } from "./UserAlreadyExists.error";
import { generateId } from "../../shared/utils";

/**
 * Command to create a new user in the system
 * 
 * @example
 * await CreateUser.execute("user-123", {
 *   username: "johndoe",
 *   email: "john@example.com"
 * });
 */
export const CreateUser = command("CreateUser", {
  aggregate: User,
  input: z.object({
    /**
     * The user's desired username
     */
    username: z.string(),
    
    /**
     * The user's email address
     */
    email: z.string().email()
  })
}, async (user, { username, email }) => {
  // Check if user already exists
  if (user !== undefined) {
    throw new UserAlreadyExists({ username });
  }
  
  // Create the user
  return UserCreated({
    userId: generateId(),
    username,
    email,
    createdAt: Date.now()
  });
});
```

### Policy: SendWelcomeEmail.policy.ts

```typescript
// src/domains/users/SendWelcomeEmail.policy.ts
import { policy } from "../../../ddd";
import { UserCreated } from "./UserCreated.event";

/**
 * Sends a welcome email to newly created users
 * 
 * @example
 * // When a UserCreated event occurs, this policy will send a welcome email
 */
export const SendWelcomeEmail = policy("SendWelcomeEmail", {
  on: [UserCreated]
}, async (event) => {
  // Extract user data from event payload
  const { username, email } = event.payload;
  
  // Send welcome email
  console.log(`Sending welcome email to ${username} (${email})`);
  
  // In a real implementation:
  // await emailService.send({
  //   to: email,
  //   subject: `Welcome, ${username}!`,
  //   body: `Thank you for joining our platform.`
  // });
});
```

### Projection: UserReadModel.projection.ts

```typescript
// src/domains/users/UserReadModel.projection.ts
import { projection } from "../../../ddd";
import { UserCreated } from "./UserCreated.event";
import { UserProfileUpdated } from "./UserProfileUpdated.event";

/**
 * Maintains a denormalized read model of users for efficient querying
 * 
 * @example
 * // When a UserCreated event occurs, this projection will create a user document
 * // When a UserProfileUpdated event occurs, it will update the corresponding document
 */
export const UserReadModel = projection("UserReadModel", {
  events: [UserCreated, UserProfileUpdated]
}, async (event, repository) => {
  switch (event.type) {
    case "UserCreated":
      await repository.save(
        "users",
        event.payload.userId,
        {
          userId: event.payload.userId,
          username: event.payload.username,
          email: event.payload.email,
          createdAt: event.payload.createdAt,
          updatedAt: null
        }
      );
      break;
      
    case "UserProfileUpdated":
      await repository.update(
        "users",
        event.payload.userId,
        {
          username: event.payload.username,
          email: event.payload.email,
          updatedAt: event.payload.updatedAt
        }
      );
      break;
  }
});
```

### Saga: UserOnboardingProcess.saga.ts

```typescript
// src/domains/users/UserOnboardingProcess.saga.ts
import { saga } from "../../../ddd";
import { assertNever } from "../../../ddd/assert-never";
import { UserCreated } from "./UserCreated.event";
import { UserProfileCreated } from "./UserProfileCreated.event";
import { CreateUserProfile } from "./CreateUserProfile.command";
import { AddUserToDefaultGroup } from "./AddUserToDefaultGroup.command";

/**
 * Orchestrates the user onboarding process across multiple aggregates
 * 
 * @example
 * // When a UserCreated event occurs, this saga will:
 * // 1. Create a user profile
 * // 2. When the profile is created, add the user to default groups
 */
export const UserOnboardingProcess = saga("UserOnboardingProcess", {
  events: [UserCreated, UserProfileCreated],
  commands: [CreateUserProfile, AddUserToDefaultGroup]
}, async (event, context) => {
  if (event.type === "UserCreated") {
    // Store the user ID in saga state
    await context.setState("userId", event.payload.userId);
    
    // First step: Create user profile
    return CreateUserProfile.execute(
      event.payload.userId,
      {
        displayName: event.payload.username,
        bio: ""
      }
    );
  } else if (event.type === "UserProfileCreated") {
    // Get the user ID from saga state
    const userId = await context.getState("userId");
    
    // Second step: Add user to default group
    return AddUserToDefaultGroup.execute(
      "default-group",
      {
        userId
      }
    );
  } else {
    return assertNever(event);
  }
});
```

## Policies vs Sagas: When to Use Each

Policies and Sagas both handle events, but serve different purposes and use cases. Understanding when to use each is crucial for effective domain modeling.

### Key Differences

| Aspect | Policies | Sagas |
|--------|----------|-------|
| **Purpose** | React to events with side effects | Orchestrate multi-step processes across aggregates |
| **State** | Stateless (no memory between events) | Stateful (maintains state between steps) |
| **Scope** | Single responsibility | Complex workflows |
| **Commands** | Don't issue commands to aggregates | Issue commands to different aggregates |
| **Flow** | One-way reaction to events | Create event → command → event chains |

### When to Use Policies

Use policies when you need to:

1. **Perform isolated side effects** such as:
   - Sending emails/notifications
   - Updating analytics
   - Logging important events
   - Integrating with external systems

2. **Example scenarios**:
   - Send welcome email when user created
   - Notify shipping department when order placed
   - Update search index when product updated
   - Log compliance information when sensitive data accessed

### When to Use Sagas

Use sagas when you need to:

1. **Coordinate processes that span multiple aggregates**:
   - User registration → Profile creation → Team assignment
   - Order placement → Payment processing → Inventory reservation → Shipping

2. **Maintain state between steps**:
   - Store IDs or other information needed for later steps
   - Track which steps have completed in a process

3. **Make decisions based on multiple events**:
   - Only ship order after both payment confirmed and inventory reserved
   - Only activate account after email verified and terms accepted

### Example Comparison

#### Policy Example:
```typescript
// SendWelcomeEmail.policy.ts
// Simple, stateless side effect when a user is created
export const SendWelcomeEmail = policy("SendWelcomeEmail", {
  on: [UserCreated]
}, async (event) => {
  const { username, email } = event.payload;
  
  await emailService.send({
    to: email,
    subject: `Welcome, ${username}!`,
    body: `Thank you for joining our platform.`
  });
  
  // No state maintained, no commands issued
});
```

#### Saga Example:
```typescript
// OrderProcessing.saga.ts
// Complex, stateful process orchestrating multiple aggregates
export const OrderProcessing = saga("OrderProcessing", {
  events: [OrderPlaced, PaymentProcessed, InventoryReserved],
  commands: [ProcessPayment, ReserveInventory, ArrangeShipping]
}, async (event, context) => {
  switch (event.type) {
    case "OrderPlaced":
      // Store order info for later steps
      await context.setState("orderData", {
        orderId: event.payload.orderId,
        items: event.payload.items,
        total: event.payload.total
      });
      
      // Trigger next step in the process by issuing a command
      return ProcessPayment.execute(
        event.payload.paymentId, 
        { amount: event.payload.total }
      );
      
    case "PaymentProcessed":
      // Retrieve state from previous step
      const orderData = await context.getState("orderData");
      
      // Continue the process with another command
      return ReserveInventory.execute(
        orderData.orderId, 
        { items: orderData.items }
      );
      
    case "InventoryReserved":
      // Final step uses data from previous steps
      const orderInfo = await context.getState("orderData");
      
      return ArrangeShipping.execute(
        orderInfo.orderId,
        { 
          items: orderInfo.items,
          shippingAddress: event.payload.address 
        }
      );
  }
});
```

### Decision Flowchart

When deciding between a Policy and a Saga, ask these questions:

1. Does the event handler need to **maintain state** between multiple events?
   - Yes → Use a Saga
   - No → Consider a Policy

2. Does the event handler need to **issue commands** to other aggregates?
   - Yes → Use a Saga
   - No → Consider a Policy

3. Is the handler responsible for **orchestrating a multi-step process**?
   - Yes → Use a Saga
   - No → Consider a Policy

4. Is the handler performing a **simple side effect** with no domain state changes?
   - Yes → Use a Policy
   - No → Consider a Saga

The key distinction is that policies handle simple reactions to events, while sagas coordinate complex multi-step processes where each step might depend on the results of previous steps.

## Naming Conventions

Following strict naming conventions is critical:

1. **Bounded Contexts**: Lower camel case (`userManagement`, `orderProcessing`)
2. **File Naming**: EntityName + component type suffix (`.event.ts`, `.command.ts`, etc.)
3. **Aggregates**: Pascal case singular nouns (`User`, `Order`, `Product`)
4. **Events**: Pascal case past tense verbs (`UserCreated`, `OrderPlaced`, `PaymentProcessed`)
5. **Commands**: Pascal case imperative verbs (`CreateUser`, `PlaceOrder`, `ProcessPayment`)
6. **Policies**: Pascal case describing the action (`SendWelcomeEmail`, `UpdateInventory`)
7. **Errors**: Pascal case describing what went wrong (`UserAlreadyExists`, `OrderNotFound`)
8. **Projections**: Pascal case describing the read model (`UserReadModel`, `OrderSummary`)
9. **Sagas**: Pascal case describing the process (`UserOnboardingProcess`, `OrderFulfillmentProcess`)

## Implementation Checklist

When implementing a bounded context, ensure you've created:

- [ ] Events as `{{EventName}}.event.ts`
- [ ] Aggregates as `{{AggregateName}}.aggregate.ts`
- [ ] Errors as `{{ErrorName}}.error.ts`
- [ ] Commands as `{{CommandName}}.command.ts`
- [ ] Policies as `{{PolicyName}}.policy.ts`
- [ ] Projections as `{{ProjectionName}}.projection.ts`
- [ ] Sagas as `{{SagaName}}.saga.ts`
- [ ] An index.ts file that exports all components