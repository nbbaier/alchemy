# Project

```typescript
import { Project } from "alchemy/railway";

// Basic project
const project = await Project("my-project", {
  name: "My Application",
  description: "A web application project",
});
```

```typescript
// Team project
const teamProject = await Project("team-project", {
  name: "Team Application",
  description: "A project for our development team",
  teamId: "team_abc123",
});
```

```typescript
// Public project
const publicProject = await Project("public-project", {
  name: "Open Source Library",
  description: "A public open source project",
  isPublic: true,
});
```