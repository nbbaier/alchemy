# Cloudflare SaaS Example with Better Auth & Drizzle

This example demonstrates a multi-tenant SaaS architecture using:

- **Cloudflare Workers** with **Hono** for the API
- **Better Auth** for social authentication (GitHub & Google)
- **Durable Objects** for per-user data isolation
- **Drizzle ORM** with SQLite for user-specific schemas
- **Vite + React** for the frontend

## Project Structure (Domain-Driven Design)

```
examples/cloudflare-saas/
├── src/
│   ├── index.ts              # Worker entry point
│   ├── main.tsx              # Client entry point
│   ├── App.tsx               # Root React component
│   ├── index.css             # Global styles
│   ├── auth/                 # Authentication domain
│   │   ├── auth.api.ts       # Auth API utilities
│   │   └── LoginPage.tsx     # Login component
│   ├── users/                # Users domain
│   │   ├── user.ts           # User types and interfaces
│   │   ├── users.object.ts   # Users Durable Object
│   │   └── Dashboard.tsx     # User dashboard component
│   ├── todos/                # Todos domain
│   │   └── todo.ts           # Todo types and schema
│   └── notes/                # Notes domain
│       └── note.ts           # Note types and schema
├── alchemy.run.ts            # Infrastructure as code
├── index.html                # Vite entry HTML
├── vite.config.ts            # Vite configuration
├── tsconfig.json             # TypeScript configuration
├── wrangler.toml             # Cloudflare Worker config
└── package.json              # Dependencies and scripts
```

## Architecture

1. **Main Worker**: Handles authentication and routes requests
2. **Durable Objects**: Each user gets their own isolated instance with:
   - Separate SQLite database
   - Per-user schema managed by Drizzle
   - Complete data isolation
3. **Frontend**: React app served by Vite with hot module replacement

## Domain Organization

The codebase follows Domain-Driven Design principles:

- **auth/**: Contains authentication logic, API utilities, and login UI
- **users/**: User-related logic including the Durable Object and dashboard
- **todos/**: Todo entity definition and database schema
- **notes/**: Note entity definition and database schema

Each domain is self-contained with its own types, schemas, and components.

## Setup

### 1. Install Dependencies

```bash
cd examples/cloudflare-saas
bun install
```

### 2. Configure OAuth Providers

#### GitHub OAuth App

1. Go to https://github.com/settings/developers
2. Create a new OAuth App
3. Set Authorization callback URL to: `http://localhost:8787/auth/callback/github`
4. Note your Client ID and Client Secret

#### Google OAuth App

1. Go to https://console.cloud.google.com/
2. Create a new project or select existing
3. Enable Google+ API
4. Create OAuth 2.0 credentials
5. Add authorized redirect URI: `http://localhost:8787/auth/callback/google`
6. Note your Client ID and Client Secret

### 3. Set Environment Variables

Create `.dev.vars` file:

```bash
GITHUB_CLIENT_SECRET=your-github-client-secret
GOOGLE_CLIENT_SECRET=your-google-client-secret
AUTH_SECRET=your-random-secret-key-at-least-32-chars
```

Update `alchemy.run.ts` with your OAuth client IDs:

```typescript
GITHUB_CLIENT_ID: "your-actual-github-client-id",
GOOGLE_CLIENT_ID: "your-actual-google-client-id",
```

### 4. Deploy with Alchemy

```bash
# Deploy all resources
npm run alchemy

# Or with a branch prefix for testing
BRANCH_PREFIX=feature-123 npm run alchemy
```

### 5. Local Development

Start both the Worker and Vite dev server:

```bash
# Terminal 1 - Start the Worker
npm run dev:worker

# Terminal 2 - Start Vite (React frontend)
npm run dev
```

Visit http://localhost:3000 to see the app. The Vite dev server proxies API requests to the Worker.

## API Endpoints

### Authentication

- `GET /auth/sign-in/social?provider=github` - GitHub login
- `GET /auth/sign-in/social?provider=google` - Google login
- `GET /auth/*` - Better Auth routes
- `GET /api/session` - Get current session

### User Data (Protected)

All routes require authentication and users can only access their own data:

- `GET /api/user/:userId/data` - Get all user data
- `POST /api/user/:userId/data/todos` - Create a todo
- `PUT /api/user/:userId/data/todos/:id` - Update a todo
- `DELETE /api/user/:userId/data/todos/:id` - Delete a todo
- `POST /api/user/:userId/data/notes` - Create a note
- `PUT /api/user/:userId/data/notes/:id` - Update a note
- `DELETE /api/user/:userId/data/notes/:id` - Delete a note
- `GET /api/user/:userId/data/stats` - Get user statistics

## Example Usage

After logging in, you can interact with the API:

```bash
# Get user data (replace userId and cookie with actual values)
curl http://localhost:8787/api/user/user_123/data \
  -H "Cookie: better-auth.session=..."

# Create a todo
curl -X POST http://localhost:8787/api/user/user_123/data/todos \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session=..." \
  -d '{"title": "Build SaaS app", "description": "Using Cloudflare Workers"}'

# Create a note
curl -X POST http://localhost:8787/api/user/user_123/data/notes \
  -H "Content-Type: application/json" \
  -H "Cookie: better-auth.session=..." \
  -d '{"title": "Meeting Notes", "content": "Discussed architecture..."}'
```

## How It Works

1. **Authentication Flow**:

   - User clicks "Login with GitHub/Google"
   - Better Auth handles OAuth flow
   - Session stored in KV namespace
   - User redirected back to app

2. **Data Isolation**:

   - Each authenticated user gets a Durable Object instance
   - Instance ID is derived from user ID
   - Drizzle initializes schema on first access
   - All data is completely isolated between users

3. **Request Flow**:
   - Worker validates session with Better Auth
   - Checks user can only access their own data
   - Routes request to user's Durable Object
   - Durable Object handles data operations

## Implementation Details

### Better Auth Configuration

Better Auth is configured with:

- **KV Adapter**: Sessions are stored in Cloudflare KV for persistence
- **Social Providers**: GitHub and Google OAuth configured
- **Session Management**: Automatic session handling with cookies

### Durable Object Design

Each user's Durable Object:

- Has its own SQLite database instance
- Uses `blockConcurrencyWhile` to initialize schema safely
- Prevents race conditions during first request
- Uses Drizzle ORM for type-safe database operations
- Implements a Hono API for handling data operations

### Database Schema

The schema is organized by domain:

- **todos/todo.ts**: Todo table schema and types
- **notes/note.ts**: Note table schema and types

Both tables include automatic timestamps (createdAt, updatedAt).

### Frontend Stack

- **Vite**: Fast build tool with hot module replacement
- **React**: UI framework with TypeScript
- **Proxy Configuration**: Vite proxies `/auth` and `/api` to the Worker

## Security Features

- Session-based authentication
- User data isolation via Durable Objects
- Authorization checks on every request
- CORS enabled for API access
- Secrets managed by Alchemy
- XSS protection in the React UI

## Building for Production

```bash
# Build the frontend
npm run build

# Deploy everything
npm run deploy
```

## Extending the Example

### Adding New Domains

1. Create a new domain folder (e.g., `src/projects/`)
2. Define types and schema in `projects/project.ts`
3. Add schema initialization in `users/users.object.ts`
4. Implement CRUD routes in the Durable Object
5. Create UI components in the domain folder

### Adding New Auth Providers

1. Configure provider in Better Auth setup
2. Add OAuth app credentials
3. Add login button to `auth/LoginPage.tsx`

### Custom Business Logic

1. Add validation in Durable Object routes
2. Implement business rules before database operations
3. Add computed fields or aggregations

## Troubleshooting

### "Unauthorized" errors

- Check session cookie is being sent
- Verify AUTH_SECRET matches between deploys
- Check OAuth app configuration

### "Forbidden" errors

- User is trying to access another user's data
- Verify userId in URL matches authenticated user

### Database errors

- Schema initialization happens on first access
- Check Durable Object logs in Cloudflare dashboard

### OAuth callback errors

- Verify callback URLs match exactly
- Check OAuth app is not in test/development mode
- Ensure secrets are correctly set

### Vite proxy issues

- Ensure Worker is running on port 8787
- Check proxy configuration in `vite.config.ts`
- Verify CORS is enabled in the Worker
