# Alchemy Application

# Tools

We use `bun` (Bun JavaScript runtime) to install dependencies, run the application etc.

Vite for our React frontend, all implemented in TypeScript.

DrizzleKit ORM for SQL ORM.

Hono for the REST API TypeScript implementation.

First, generate a design in ./designs/backend.md, with each of the API routes.

Then, generate a design in ./designs/frontend.md, with the React frontend components.

# Requirements

We are building a simple TODO application.
It has a single webpage that lists all TODOs.
It has a text input to add a new TODO.
It has an 'X' button next to each TODO to delete it.
The application has no auth.
We use a sqlite in memory database, managed with Drizzle ORM.

# Dependencies

1. Bun
2. Vite
3. React
4. React-dom
5. Tailwind CSS
6. Shadcn UI
7. @tsconfig/node22

We need jsx: "react". Keep it standard @tsconfig/node22 beyond that.
