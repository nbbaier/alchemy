<template>
  <section class="features-section">
    <div class="features-container">
      <h2 class="section-title">Why Developers Choose Alchemy</h2>
      
      <!-- Feature 1: TypeScript-first (description-left, code-right) -->
      <FeatureItem
        :reverse="false"
        title="TypeScript-first Infrastructure"
        description="Define your entire cloud infrastructure with type-safe TypeScript. Get autocomplete, refactoring, and error checking for your infrastructure code."
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

      <!-- Feature 2: Multi-cloud (code-left, description-right) -->
      <FeatureItem
        :reverse="true"
        title="Multi-cloud by Design"
        description="Deploy across Cloudflare, AWS, Stripe, and more with a unified API. Mix and match providers to build the perfect stack for your needs."
        ctaText="View Providers"
        ctaLink="/docs/guides/cloudflare-worker"
      >
        <template #code>
```typescript
import { Worker, D1Database } from "alchemy/cloudflare";
import { Bucket, Queue } from "alchemy/aws";
import { Product, Price } from "alchemy/stripe";

const storage = await Bucket("uploads", { 
  bucketName: "my-app-uploads" 
});

const database = await D1Database("main-db", {
  name: "production-database"
});

const subscription = await Product("pro-plan", {
  name: "Pro Plan",
  description: "Advanced features for power users"
});
```
        </template>
      </FeatureItem>

      <!-- Feature 3: Framework Integration (description-left, code-right) -->
      <FeatureItem
        :reverse="false"
        title="Framework Integration"
        description="First-class support for React, Vue, Astro, SvelteKit, and more. Deploy full-stack applications with just a few lines of code."
        ctaText="Try with Vite"
        ctaLink="/docs/guides/cloudflare-vitejs"
      >
        <template #code>
```typescript
import { Worker, Website } from "alchemy/cloudflare";

// Deploy your Vite React app
const frontend = await Website("my-app", {
  name: "my-react-app",
  buildCommand: "npm run build",
  buildOutput: "./dist"
});

// Add API endpoints
const api = await Worker("api", {
  name: "my-api",
  entrypoint: "./api/index.ts",
  routes: [{ pattern: "*/api/*" }]
});
```
        </template>
      </FeatureItem>

      <!-- Feature 4: Zero-downtime (code-left, description-right) -->
      <FeatureItem
        :reverse="true"
        title="Zero-downtime Deployments"
        description="Deploy changes instantly with atomic updates. Your infrastructure changes are applied safely with automatic rollback on failures."
        ctaText="Learn More"
        ctaLink="/docs/guides/cloudflare-worker"
      >
        <template #code>
```typescript
// Update your worker with zero downtime
const worker = await Worker("api", {
  name: "api-v2",
  entrypoint: "./src/api-v2.ts",
  bindings: {
    DATABASE: database,
    CACHE: kvStore
  }
});

// Alchemy handles:
// ✓ Gradual traffic shifting
// ✓ Health checks
// ✓ Automatic rollback
// ✓ Atomic deployments
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
  padding: 6rem 0 4rem;
  background: var(--vp-c-bg);
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