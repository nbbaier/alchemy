# Domain-Driven Design (DDD) Framework

A convention-based approach to building event-driven systems for business problems inspired by Domain Driven Design, Event Storming, and Event Sourcing.

## Core Concepts

### 1. Aggregate

An Aggregate represents a business entity (like User, Order) that serves as a consistency boundary. Each Aggregate:
- Has a defined schema
- Is identified by a Primary Key
- Has associated events
- Includes a reducer function to compute state from events

```typescript
export const User = aggregate("User", {
  schema: {
    userId: "string",
    username: "string",
    createdAt: "integer",
    updatedAt: "integer | undefined",
  },
  events: [UserCreated, UserUpdated, UserDeleted]
}, (state, event) => {
  // Reduce logic to compute state from events
  switch (event.type) {
    case "UserCreated":
      return {
        userId: event.payload.userId,
        username: event.payload.username,
        createdAt: event.payload.createdAt,
        updatedAt: undefined
      };
    // Handle other events...
  }
  return state;
});
```

### 2. Command

A Command is an action that can be applied to an Aggregate. Each Command:
- Has a defined input schema
- Acts atomically on a single Aggregate record
- Produces one or more Events
- May throw typed Errors

```typescript
export const CreateUser = command("CreateUser", {
  aggregate: User,
  input: {
    username: "string"
  }
}, async (user, {username}) => {
  if (user !== undefined) {
    throw new UserAlreadyExists({username});
  }
  return UserCreated({
    userId: ulid(),
    username,
    createdAt: Date.now()
  });
});
```

### 3. Event

An Event represents something that happened in the system (past tense). Events:
- Have a defined schema
- Are immutable records of facts
- Are used to reconstruct Aggregate state

```typescript
const UserCreated = event("UserCreated", {
  userId: "string",
  username: "string",
  createdAt: "integer"
});
```

### 4. Error

Custom typed errors for domain-specific error cases:

```typescript
export const UserAlreadyExists = error("UserAlreadyExists", {
  username: "string"
});
```

### 5. Policy (Event Handler)

A Policy subscribes to one or more Events and performs simple side effects without maintaining state:
- Reacts to events with isolated actions (emails, notifications, logging)
- Does not issue commands to other aggregates
- Stateless (no memory between events)

```typescript
export const WelcomeNewUser = policy("WelcomeNewUser", {
  on: [UserCreated]
}, async (event) => {
  // Send welcome email, etc.
  console.log(`Welcome email sent to: ${event.payload.username}`);
});
```

### 6. Saga (Process Manager)

A Saga orchestrates complex processes spanning multiple aggregates:
- Maintains state between steps
- Listens for events and issues commands
- Coordinates multi-step workflows across aggregates

```typescript
export const UserOnboardingProcess = saga("UserOnboardingProcess", {
  events: [UserCreated, UserProfileCreated],
  commands: [CreateUserProfile, AddUserToDefaultGroup]
}, async (event, context) => {
  switch (event.type) {
    case "UserCreated":
      // Store state for later steps
      await context.setState("userId", event.payload.userId);
      
      // Issue command to create profile
      return CreateUserProfile.execute(event.payload.userId, {
        displayName: event.payload.username
      });
      
    case "UserProfileCreated":
      // Retrieve state from previous step
      const userId = await context.getState("userId");
      
      // Issue command to add user to group
      return AddUserToDefaultGroup.execute("default-group", { userId });
  }
});
```

### 7. Projection (Read Model)

A Projection creates optimized read models from events:
- Subscribes to events and updates read-optimized views
- Creates denormalized data for efficient querying
- Maintains eventually consistent views of aggregate data

```typescript
export const UserReadModel = projection("UserReadModel", {
  events: [UserCreated, UserUpdated]
}, async (event, repository) => {
  switch (event.type) {
    case "UserCreated":
      await repository.save("users", event.payload.userId, {
        userId: event.payload.userId,
        username: event.payload.username,
        createdAt: event.payload.createdAt
      });
      break;
      
    case "UserUpdated":
      await repository.update("users", event.payload.userId, {
        username: event.payload.username,
        updatedAt: event.payload.updatedAt
      });
      break;
  }
});
```

### 8. Reducer

Each Aggregate has a Reducer function that:
- Takes the current state and an event
- Returns the new state
- Uses if-else statements with assertNever for exhaustive type checking

```typescript
// Example of a reducer using if-else with assertNever
import { assertNever } from "../ddd/assert-never";

(state, event) => {
  if (event.type === "UserCreated") {
    return {
      userId: event.payload.userId,
      username: event.payload.username,
      createdAt: event.payload.createdAt,
      updatedAt: undefined
    };
  } else if (event.type === "UserUpdated") {
    return {
      ...state!,
      username: event.payload.username,
      updatedAt: event.payload.updatedAt
    };
  } else {
    // This ensures compile-time exhaustiveness checking
    return assertNever(event);
  }
}
```

### 9. Bounded Context

A logical grouping of related Aggregates, Commands, Events, Policies, Sagas, and Projections.

## Policies vs Sagas: When to Use Each

| Aspect | Policies | Sagas |
|--------|----------|-------|
| **Purpose** | React to events with side effects | Orchestrate multi-step processes |
| **State** | Stateless | Stateful (maintains context) |
| **Scope** | Single responsibility | Complex workflows |
| **Commands** | Don't issue commands | Issue commands to different aggregates |
| **Flow** | One-way reaction | Event → command → event chains |

**Use Policies for**:
- Simple side effects (emails, notifications, logging)
- Single, isolated reactions to events

**Use Sagas for**:
- Processes spanning multiple aggregates
- Workflows requiring state between steps
- Coordinating multiple commands in sequence

## Usage Examples

### Complete User Aggregate Example

```typescript
import { aggregate, command, event, error, policy } from "../ddd";
import { assertNever } from "../ddd/assert-never";
import { ulid } from "ulid";

// Events
const UserCreated = event("UserCreated", {
  userId: "string",
  username: "string",
  createdAt: "integer"
});

const UserUpdated = event("UserUpdated", {
  userId: "string",
  username: "string",
  updatedAt: "integer"
});

// Aggregate
export const User = aggregate("User", {
  schema: {
    userId: "string",
    username: "string",
    createdAt: "integer",
    updatedAt: "integer | undefined",
  },
  events: [UserCreated, UserUpdated]
}, (state, event) => {
  if (event.type === "UserCreated") {
    return {
      userId: event.payload.userId,
      username: event.payload.username,
      createdAt: event.payload.createdAt,
      updatedAt: undefined
    };
  } else if (event.type === "UserUpdated") {
    return {
      ...state!,
      username: event.payload.username,
      updatedAt: event.payload.updatedAt
    };
  } else {
    return assertNever(event);
  }
});

// Errors
export const UserAlreadyExists = error("UserAlreadyExists", {
  username: "string"
});

export const UserNotFound = error("UserNotFound", {
  userId: "string"
});

// Commands
export const CreateUser = command("CreateUser", {
  aggregate: User,
  input: {
    username: "string"
  }
}, async (user, {username}) => {
  if (user !== undefined) {
    throw new UserAlreadyExists({username});
  }
  return UserCreated({
    userId: ulid(),
    username,
    createdAt: Date.now()
  });
});

export const UpdateUser = command("UpdateUser", {
  aggregate: User,
  input: {
    username: "string"
  }
}, async (user, {username}) => {
  if (user === undefined) {
    throw new UserNotFound({userId: "unknown"});
  }
  return UserUpdated({
    userId: user.userId,
    username,
    updatedAt: Date.now()
  });
});

// Policies
export const WelcomeNewUser = policy("WelcomeNewUser", {
  on: [UserCreated]
}, async (event) => {
  console.log(`Welcome email sent to: ${event.payload.username}`);
});
```

## Benefits

1. **Type Safety** - Full TypeScript support with inference
2. **Consistency** - Enforced conventions for event-driven design
3. **Traceability** - Complete history of all state changes
4. **Testability** - Easy to test commands and reducers in isolation
5. **Scalability** - Natural fit for distributed and event-driven systems
6. **Separation of Concerns** - Clear separation between write models (commands) and read models (projections) 