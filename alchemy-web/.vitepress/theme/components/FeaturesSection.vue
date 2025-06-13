<template>
  <section class="features-section">
    <div class="features-container">
      <h2 class="section-title">Why Developers Choose Alchemy</h2>
      
      <!-- Feature 1: TypeScript-first (description-left, code-right) -->
      <FeatureItem
        :reverse="false"
        title="TypeScript-first Infrastructure"
        description="Write cloud infrastructure as simple async functions, not complicated graph abstractions. Get autocomplete, refactoring, and error checking with native TypeScript."
        ctaText="Get Started"
        ctaLink="/docs/getting-started"
      >
        <template #code>

```typescript
import { D1Database, Worker } from "alchemy/cloudflare";
import { Product, Customer } from "alchemy/stripe";

// Type-safe resource definitions
const database = await D1Database("app-db", {
  name: "my-application-database"
});

const api = await Worker("api-server", {
  name: "api",
  bindings: { DB: database },
  entrypoint: "./src/api.ts"
});
```

        </template>
      </FeatureItem>

      <!-- Feature 2: AI-friendly (code-left, description-right) -->
      <FeatureItem
        :reverse="true"
        title="AI-friendly Architecture"
        description="Generate new cloud resource providers in minutes with Alchemy's llms.txt and vibe-rules. Built from the ground up to work seamlessly with AI assistants."
        ctaText="Learn More"
        ctaLink="/docs/getting-started"
      >
        <template #code>

```typescript
// llms.txt enables instant resource generation
import { Resource } from "alchemy";

export const CustomResource = Resource(
  "provider::resource",
  async function (id, props) {
    // AI generates this implementation
    const resource = await createResource(props);
    
    return {
      id,
      urn: `provider::resource::${id}`,
      resourceId: resource.id
    };
  }
);
```

        </template>
      </FeatureItem>

      <!-- Feature 3: Cloudflare Support (description-left, code-right) -->
      <FeatureItem
        :reverse="false"
        title="First-class Cloudflare Support"
        description="Native Cloudflare integration without code generation. Get complete type safety between your infrastructure and runtime code."
        ctaText="Try Cloudflare"
        ctaLink="/docs/guides/cloudflare-worker"
      >
        <template #code>

```typescript
// worker.ts - your runtime code
import type { worker } from "../alchemy.run.ts";

export default {
  async fetch(
    request: Request,
    env: typeof worker.Env
  ) {
    // Full type safety for all bindings
    const users = await env.DB.prepare(
      "SELECT * FROM users"
    ).all();
    
    return Response.json(users);
  }
};
```

        </template>
      </FeatureItem>

      <!-- Feature 4: Web Framework Support (code-left, description-right) -->
      <FeatureItem
        :reverse="true"
        title="Deploy Any Web Framework"
        description="Deploy Vite, TanStack Start, Redwood, React Router, and more to Cloudflare with just a few lines. Full-stack apps made simple."
        ctaText="Try with Vite"
        ctaLink="/docs/guides/cloudflare-vitejs"
      >
        <template #code>

```typescript
import { Website, Worker } from "alchemy/cloudflare";

// Deploy any web framework
const app = await Website("my-app", {
  name: "react-router-app",
  buildCommand: "npm run build",
  buildOutput: "./dist"
});

// Works with: Vite, TanStack Start,
// Redwood, Remix, SvelteKit, Astro
const api = await Worker("api", {
  name: "backend",
  entrypoint: "./api/index.ts"
});
```

        </template>
      </FeatureItem>
    </div>
  </section>
</template>

<script setup lang="ts">
import FeatureItem from './FeatureItem.vue';
</script>

<style scoped>
.features-section {
  padding: 4.5rem 0 4rem;
  position: relative;
}

.features-container {
  margin: 0 auto;
  max-width: 90rem;
  padding: 0 1.5rem;
}

.section-title {
  text-align: center;
  font-size: 3rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  margin-bottom: 4rem;
  background: var(--vp-home-hero-name-background);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  line-height: 1.1;
  padding: 0.25rem 0;
}

@media (max-width: 768px) {
  .features-section {
    padding: 4rem 0 3rem;
  }
  
  .features-container {
    padding: 0 1rem;
  }
  
  .section-title {
    font-size: 2.5rem;
    margin-bottom: 3rem;
  }
}

@media (max-width: 480px) {
  .section-title {
    font-size: 2rem;
    margin-bottom: 2rem;
  }
}
</style>