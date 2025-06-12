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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">D1Database</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Worker</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/cloudflare"</span><span style="color: #89ddff;">;</span>
<span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Product</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Customer</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/stripe"</span><span style="color: #89ddff;">;</span>

<span style="color: #676e95;">// Type-safe resource definitions</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">database</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">D1Database</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"app-db"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"my-application-database"</span>
<span style="color: #89ddff;">});</span>

<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">api</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Worker</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"api-server"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"api"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">bindings</span><span style="color: #89ddff;">:</span> <span style="color: #89ddff;">{</span> <span style="color: #f07178;">DB</span><span style="color: #89ddff;">:</span> <span style="color: #82aaff;">database</span> <span style="color: #89ddff;">},</span>
  <span style="color: #f07178;">entrypoint</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./src/api.ts"</span>
<span style="color: #89ddff;">});</span></code></pre>
          </div>
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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Worker</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">D1Database</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/cloudflare"</span><span style="color: #89ddff;">;</span>
<span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Bucket</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Queue</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/aws"</span><span style="color: #89ddff;">;</span>
<span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Product</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Price</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/stripe"</span><span style="color: #89ddff;">;</span>

<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">storage</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Bucket</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"uploads"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span> 
  <span style="color: #f07178;">bucketName</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"my-app-uploads"</span> 
<span style="color: #89ddff;">});</span>

<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">database</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">D1Database</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"main-db"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"production-database"</span>
<span style="color: #89ddff;">});</span>

<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">subscription</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Product</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"pro-plan"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"Pro Plan"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">description</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"Advanced features for power users"</span>
<span style="color: #89ddff;">});</span></code></pre>
          </div>
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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Worker</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Website</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/cloudflare"</span><span style="color: #89ddff;">;</span>

<span style="color: #676e95;">// Deploy your Vite React app</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">frontend</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Website</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"my-app"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"my-react-app"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">buildCommand</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"npm run build"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">buildOutput</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./dist"</span>
<span style="color: #89ddff;">});</span>

<span style="color: #676e95;">// Add API endpoints</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">api</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Worker</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"api"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"my-api"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">entrypoint</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./api/index.ts"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">routes</span><span style="color: #89ddff;">:</span> <span style="color: #89ddff;">[{</span> <span style="color: #f07178;">pattern</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"*/api/*"</span> <span style="color: #89ddff;">}]</span>
<span style="color: #89ddff;">});</span></code></pre>
          </div>
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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #676e95;">// Update your worker with zero downtime</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">worker</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Worker</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"api"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"api-v2"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">entrypoint</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./src/api-v2.ts"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">bindings</span><span style="color: #89ddff;">:</span> <span style="color: #89ddff;">{</span>
    <span style="color: #f07178;">DATABASE</span><span style="color: #89ddff;">:</span> <span style="color: #82aaff;">database</span><span style="color: #89ddff;">,</span>
    <span style="color: #f07178;">CACHE</span><span style="color: #89ddff;">:</span> <span style="color: #82aaff;">kvStore</span>
  <span style="color: #89ddff;">}</span>
<span style="color: #89ddff;">});</span>

<span style="color: #676e95;">// Alchemy handles:</span>
<span style="color: #676e95;">// ✓ Gradual traffic shifting</span>
<span style="color: #676e95;">// ✓ Health checks</span>
<span style="color: #676e95;">// ✓ Automatic rollback</span>
<span style="color: #676e95;">// ✓ Atomic deployments</span></code></pre>
          </div>
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