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

      <!-- Feature 2: AI-friendly (code-left, description-right) -->
      <FeatureItem
        :reverse="true"
        title="AI-friendly Architecture"
        description="Generate new cloud resource providers in minutes with Alchemy's llms.txt and vibe-rules. Built from the ground up to work seamlessly with AI assistants."
        ctaText="Learn More"
        ctaLink="/docs/getting-started"
      >
        <template #code>
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #676e95;">// llms.txt enables instant resource generation</span>
<span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Resource</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy"</span><span style="color: #89ddff;">;</span>

<span style="color: #c792ea;">export</span> <span style="color: #c792ea;">const</span> <span style="color: #82aaff;">CustomResource</span> <span style="color: #89ddff;">=</span> <span style="color: #82aaff;">Resource</span><span style="color: #89ddff;">(</span>
  <span style="color: #c3e88d;">"provider::resource"</span><span style="color: #89ddff;">,</span>
  <span style="color: #c792ea;">async</span> <span style="color: #c792ea;">function</span> <span style="color: #89ddff;">(</span><span style="color: #f07178;">id</span><span style="color: #89ddff;">,</span> <span style="color: #f07178;">props</span><span style="color: #89ddff;">)</span> <span style="color: #89ddff;">{</span>
    <span style="color: #676e95;">// AI generates this implementation</span>
    <span style="color: #c792ea;">const</span> <span style="color: #82aaff;">resource</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">createResource</span><span style="color: #89ddff;">(</span><span style="color: #f07178;">props</span><span style="color: #89ddff;">);</span>
    
    <span style="color: #c792ea;">return</span> <span style="color: #89ddff;">{</span>
      <span style="color: #f07178;">id</span><span style="color: #89ddff;">,</span>
      <span style="color: #f07178;">urn</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">`provider::resource::${id}`</span><span style="color: #89ddff;">,</span>
      <span style="color: #f07178;">resourceId</span><span style="color: #89ddff;">:</span> <span style="color: #82aaff;">resource</span><span style="color: #89ddff;">.</span><span style="color: #82aaff;">id</span>
    <span style="color: #89ddff;">};</span>
  <span style="color: #89ddff;">}</span>
<span style="color: #89ddff;">);</span></code></pre>
          </div>
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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #676e95;">// worker.ts - your runtime code</span>
<span style="color: #c792ea;">import</span> <span style="color: #c792ea;">type</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">worker</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"../alchemy.run.ts"</span><span style="color: #89ddff;">;</span>

<span style="color: #c792ea;">export</span> <span style="color: #c792ea;">default</span> <span style="color: #89ddff;">{</span>
  <span style="color: #c792ea;">async</span> <span style="color: #82aaff;">fetch</span><span style="color: #89ddff;">(</span>
    <span style="color: #f07178;">request</span><span style="color: #89ddff;">:</span> <span style="color: #f78c6c;">Request</span><span style="color: #89ddff;">,</span>
    <span style="color: #f07178;">env</span><span style="color: #89ddff;">:</span> <span style="color: #c792ea;">typeof</span> <span style="color: #82aaff;">worker</span><span style="color: #89ddff;">.</span><span style="color: #f78c6c;">Env</span>
  <span style="color: #89ddff;">)</span> <span style="color: #89ddff;">{</span>
    <span style="color: #676e95;">// Full type safety for all bindings</span>
    <span style="color: #c792ea;">const</span> <span style="color: #82aaff;">users</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">env</span><span style="color: #89ddff;">.</span><span style="color: #f78c6c;">DB</span><span style="color: #89ddff;">.</span><span style="color: #82aaff;">prepare</span><span style="color: #89ddff;">(</span>
      <span style="color: #c3e88d;">"SELECT * FROM users"</span>
    <span style="color: #89ddff;">).</span><span style="color: #82aaff;">all</span><span style="color: #89ddff;">();</span>
    
    <span style="color: #c792ea;">return</span> <span style="color: #82aaff;">Response</span><span style="color: #89ddff;">.</span><span style="color: #82aaff;">json</span><span style="color: #89ddff;">(</span><span style="color: #82aaff;">users</span><span style="color: #89ddff;">);</span>
  <span style="color: #89ddff;">}</span>
<span style="color: #89ddff;">};</span></code></pre>
          </div>
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
          <div class="language-typescript vp-adaptive-theme">
            <pre><code><span style="color: #c792ea;">import</span> <span style="color: #89ddff;">{</span> <span style="color: #f78c6c;">Website</span><span style="color: #89ddff;">,</span> <span style="color: #f78c6c;">Worker</span> <span style="color: #89ddff;">}</span> <span style="color: #c792ea;">from</span> <span style="color: #c3e88d;">"alchemy/cloudflare"</span><span style="color: #89ddff;">;</span>

<span style="color: #676e95;">// Deploy any web framework</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">app</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Website</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"my-app"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"react-router-app"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">buildCommand</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"npm run build"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">buildOutput</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./dist"</span>
<span style="color: #89ddff;">});</span>

<span style="color: #676e95;">// Works with: Vite, TanStack Start,</span>
<span style="color: #676e95;">// Redwood, Remix, SvelteKit, Astro</span>
<span style="color: #c792ea;">const</span> <span style="color: #82aaff;">api</span> <span style="color: #89ddff;">=</span> <span style="color: #c792ea;">await</span> <span style="color: #82aaff;">Worker</span><span style="color: #89ddff;">(</span><span style="color: #c3e88d;">"api"</span><span style="color: #89ddff;">,</span> <span style="color: #89ddff;">{</span>
  <span style="color: #f07178;">name</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"backend"</span><span style="color: #89ddff;">,</span>
  <span style="color: #f07178;">entrypoint</span><span style="color: #89ddff;">:</span> <span style="color: #c3e88d;">"./api/index.ts"</span>
<span style="color: #89ddff;">});</span></code></pre>
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
  padding: 3rem 0 4rem;
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