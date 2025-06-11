# Environment

```typescript
import { Environment } from "alchemy/railway";

// Basic environment
const environment = await Environment("staging-env", {
  name: "staging",
  project: project,
});
```

```typescript
// Multiple environments for deployment pipeline
const development = await Environment("dev-env", {
  name: "development",
  project: project,
});

const staging = await Environment("staging-env", {
  name: "staging",
  project: project,
});

const production = await Environment("prod-env", {
  name: "production",
  project: project,
});
```

```typescript
// Using string references
const environment = await Environment("my-env", {
  name: "production",
  project: "project_abc123",
});
```