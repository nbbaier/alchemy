# Alchemy

Alchemy is an Typescript-native Infrastructure-as-Code repository. Claude's job is to implement "Resource" providers for various cloud services by following a set up strict conventions and patterns.

Your job is to build and maintain resource providers following the following convention and structure:

## Provider Layout

```
alchemy/
  src/
    {provider}/
      README.md
      {resource}.ts
  test/
    {provider}/
      {resource}.test.ts
alchemy-web/
  guides/
    {provider}.md # guide on how to get started with the {provider}
  docs/
    providers/
      {provider}/
        index.md # overview of usage and link to all the resources for the provider
        {resource}.md # example-oriented reference docs for the resource
examples/
  {provider}-{qualifier?}/ # only add a qualifier if there are more than one example for this {provider}, e.g. {cloudflare}-{vitejs}
    package.json
    tsconfig.json
    alchemy.run.ts
    README.md #
    src/
      # source code
```

## Convention

> Each Resource ha one .ts file, one test suite and one documentation page

## README

Please provide a comprehensive document of all the Resources for this provider with relevant links to documentation. This is effectivel the design and internal documentation.

## Resource File

> [!NOTE]
> Follow rules and conventions laid out in thge [cursorrules](./.cursorrules).

```ts
// ./alchemy/src/{provider}/{resource}.ts
import { Context } from "../context.ts";

export interface {Resource}Props {
    // input props
}

export interface {Resource} extends Resource<"{provider}::{resource}"> {
    // output props
}

/**
 * {overview}
 *
 * @example
 * ## {Example Title}
 *
 * {concise description}
 *
 * {example snippet}
 *
 * @example
 * // .. repeated for all examples
 */
export const {Resource} = Resource(
  "{provider}::{resource}",
  async function (this: Context<>, id: string, props: {Resource}Props): Promise<{Resource}> {
    // Create, Update, Delete lifecycle
  }
);
```

> [!CAUTION]
> When designing input props, there is the common case of having a property that references another entity in the {provider} domain by Id, e.g. tableId, bucketArn, etc.
>
> In these cases, you should instead opt to represent this as `{resource}: string | {Resource}`, e.g. `table: string | Table`. This "lifts" the Resource into the alchemy abstraction without sacraficing support for referencing external entities by name.

## Test Suite

> [!NOTE]
> Follow rules and conventions laid out in thge [cursorrules](./.cursorrules).

```ts
// ./alchemy/test/{provider}/{resource}.test.ts
import { destroy } from "../src/destroy.ts"
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("{Provider}", () => {
  test("{test case}", async (scope) => {
    const resourceId = `${BRANCH_PREFIX}-{id}` // an ID that is: 1) deterministic (non-random), 2) unique across all tests and all test suites
    let resource: {Resource}
    try {
      // create
      resource = await {Resource}("{id}", {
        // {props}
      })

      expect(resource).toMatchObject({
        // {assertions}
      })

      // update
      resource = await {Resource}("{id}", {
        // {update props}
      })

      expect(resource).toMatchObject({
        // {updated assertions}
      })
    } finally {
      await destroy(scope);
      await assert{ResourceDoesNotExist}(resource)
    }
  })
});

async function assert{Resource}DoesNotExist(api: {Provider}Client, resource: {Resource}) {
    // {call api to check it does not exist, throw test error if it does}
}
```

## Provider Overivew Docs (index.md)

Each provider folder should have an `index.md` that indexes and summarizes the provider and links to each resource.

```md
# {Provider}

{overview of the provider}

{official links out to the provider website}

## Resources

- [{Resource}1](./{resource}1.md) - {brief description}
- [{Resource}2](./{resource}2.md) - {brief description}
- ..
- [{Resource}N](./{resource}n.md) - {brief description}

## Example Usage

\`\`\`ts
// {comprehensive end-to-end usage}
\`\`\`
```

## Example Project

An example project is effectiveley a whole NPM package that demon

```
examples/
  {provider}-{qualifier?}/
    package.json
    tsconfig.json # extends ../../tsconfig.base.json
    alchemy.run.ts
    README.md
    src/
      # code
tsconfig.json # is updated to reference examples/{provider}-{qualifer?}
```

## Guide

Each Provide has a getting started guide in ./alchemy-web/docs/guides/{provider}.md.

```md
---
order: { number to decide the position in the tree view }
title: { Provider }
description: { concise description of the tutorial }
---

# Getting Started {Provider}

{1 sentence overview of what this tutorial will set the user up with}

## Install

{any installation pre-requisties}

::: code-group

\`\`\`sh [bun]
bun ..
\`\`\`

\`\`\`sh [npm]
npm ...
\`\`\`

\`\`\`sh [pnpm]
pnpm ..
\`\`\`

\`\`\`sh [yarn]
yarn ..
\`\`\`

:::

## Credentials

{how to get credentials and store in .env}

## Create a {Provider} applicaiton

{code group with commands to run to init a new project}

## Create `alchemy.run.ts`

{one or more subsequent code snippets with explanations for using alchemy to provision this provider}

## Deploy

Run `alchemy.run.ts` script to deploy:

::: code-group

\`\`\`sh [bun]
bun ./alchemy.run
\`\`\`

\`\`\`sh [npm]
npx tsx ./alchemy.run
\`\`\`

\`\`\`sh [pnpm]
pnpm tsx ./alchemy.run
\`\`\`

\`\`\`sh [yarn]
yarn tsx ./alchemy.run
\`\`\`

:::

It should log out the ... {whatever information is relevant for interacting with the app deployed to this provider}
\`\`\`sh
{expected output}
\`\`\`

## Tear Down

That's it! You can now tear down the app (if you want to):

::: code-group

\`\`\`sh [bun]
bun ./alchemy.run --destroy
\`\`\`

\`\`\`sh [npm]
npx tsx ./alchemy.run --destroy
\`\`\`

\`\`\`sh [pnpm]
pnpm tsx ./alchemy.run --destroy
\`\`\`

\`\`\`sh [yarn]
yarn tsx ./alchemy.run --destroy
\`\`\`

:::
```

> [!NOTE]
> Claude, you should review all of the existing Cloudflare guides like [cloudflare-vitejs.md](./alchemy-web/docs/guides/cloudflare-vitejs.md) and follow the writing style and flow.

> [!TIP]
> If the Resource is mostly headless infrastructure like a database or some other service, you should use Cloudflare Workers as the runtime to "round off" the example package. E.g. for a Neon Provider, we would connect it into a Cloudlare Worker via Hyperdrive and provide a URL (via Worker) to hit that page. Ideally you'd also put ViteJS in front and hit that endpoint.

# Test Workflow

Before committing changes to Git and pushing Pull Requests, make sure to run the following commands to ensure the code is working:

```sh
bun biome check --fix
```

If that fails, consider running (but be careful):

```sh
bun biome check --fix --unsafe
```

Then run tests:

```sh
bun run test
```

> [!TIP] > `bun run test` will diff with `main` and only run the tests that have changed since main. You must be on a branch for this to work.

It is usually better to be targeted with the tests you run instead. That way you can iterate quickly:

```sh
bun vitest ./alchemy/test/.. -t "..."
```

# Advanced Provider Patterns

> [!NOTE]
> These advanced patterns emerged from building comprehensive provider implementations like Cloudflare. They should be followed for production-ready providers.

## API Error Handling

> [!IMPORTANT]
> All providers should implement consistent, centralized error handling patterns for better developer experience and debugging.

### Error Handler Pattern

Each provider should have a dedicated error handling module:

```ts
// ./alchemy/src/{provider}/api-error.ts
export class {Provider}ApiError extends Error {
  constructor(
    public status: number,
    public action: string,
    public resourceType: string,
    public resourceName: string | undefined,
    message: string,
  ) {
    super(`Error ${status} ${action} ${resourceType}${resourceName ? ` '${resourceName}'` : ""}: ${message}`);
  }
}

export async function handleApiError(
  response: Response,
  action: string,
  resourceType: string,
  resourceName?: string,
): Promise<never> {
  let errorMessage: string;
  try {
    const errorData = await response.json();
    errorMessage = errorData.message || errorData.error || "Unknown error";
  } catch {
    errorMessage = response.statusText || "Unknown error";
  }
  
  throw new {Provider}ApiError(
    response.status,
    action,
    resourceType,
    resourceName,
    errorMessage,
  );
}
```

### Usage in Resources

```ts
const response = await api.post(`/endpoint`, { /* data */ });
if (!response.ok) {
  await handleApiError(response, "creating", "Resource", resourceId);
}
```

## Standard Resource Props

> [!IMPORTANT]
> All resources should support these standard props for consistent behavior across providers.

### Authentication Extension

```ts
export interface {Resource}Props extends {Provider}ApiOptions {
  // resource-specific props
}
```

### Standard Props Pattern

```ts
export interface {Resource}Props extends {Provider}ApiOptions {
  name?: string; // defaults to resource id if not provided
  adopt?: boolean; // adopt existing resource instead of creating new
  delete?: boolean; // control whether resource is actually deleted on destroy (default: true)
  // ... other resource-specific props
}
```

### Resource Reference Pattern

> [!CAUTION]
> When a prop references another resource, use union types to support both direct resource references and string identifiers.

```ts
export interface {Resource}Props {
  // Instead of: bucketId: string
  bucket: string | BucketResource; // Allows both resource objects and string IDs
  
  // Instead of: tableArn: string  
  table: string | TableResource; // Enables type-safe resource composition
}
```

## Enhanced Testing Patterns

> [!IMPORTANT]
> Follow these enhanced testing patterns for reliable, maintainable tests.

### Test Structure with Cleanup

```ts
// ./alchemy/test/{provider}/{resource}.test.ts
import { destroy } from "../src/destroy.ts"
import { BRANCH_PREFIX } from "../util.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("{Provider}", () => {
  test("{test case}", async (scope) => {
    const resourceId = `${BRANCH_PREFIX}-descriptive-name`; // deterministic, unique ID
    let resource: {Resource} | undefined;
    
    try {
      // create
      resource = await {Resource}(resourceId, {
        // props
      });

      expect(resource).toMatchObject({
        // assertions
      });

      // update (if applicable)
      resource = await {Resource}(resourceId, {
        // updated props
      });

      expect(resource).toMatchObject({
        // updated assertions
      });
    } finally {
      await destroy(scope);
      if (resource) {
        await assert{Resource}DoesNotExist(resource);
      }
    }
  });
});

async function assert{Resource}DoesNotExist(resource: {Resource}) {
  // Provider-specific logic to verify resource deletion
  // Should throw descriptive error if resource still exists
}
```

### Testing Guidelines

- **Deterministic Naming**: Use `${BRANCH_PREFIX}-descriptive-name` format
- **Always Cleanup**: Use try-finally blocks to ensure resource cleanup
- **Assertion Helpers**: Create dedicated functions to verify resource deletion
- **Test Isolation**: Each test should be independent and not rely on other tests

## Resource Lifecycle Management

> [!IMPORTANT]
> Implement proper lifecycle management in all resources to handle create, update, and delete operations correctly.

### Phase-Based Implementation

```ts
export const {Resource} = Resource(
  "{provider}::{resource}",
  async function (this: Context<>, id: string, props: {Resource}Props): Promise<{Resource}> {
    const api = await create{Provider}Api(props);
    
    if (this.phase === "delete") {
      return await delete{Resource}(api, id, props);
    }
    
    const existing = await find{Resource}(api, props.name || id);
    
    if (existing && props.adopt) {
      return existing; // Adopt existing resource
    }
    
    if (existing && this.phase === "create") {
      throw new Error(`{Resource} '${props.name || id}' already exists. Use adopt: true to adopt it.`);
    }
    
    if (!existing && this.phase === "update") {
      // Resource was deleted externally, recreate it
      return await create{Resource}(api, id, props);
    }
    
    if (existing) {
      return await update{Resource}(api, existing, props);
    } else {
      return await create{Resource}(api, id, props);
    }
  }
);
```

### Delete Operation Pattern

```ts
async function delete{Resource}(api: {Provider}Api, id: string, props: {Resource}Props) {
  if (props.delete === false) {
    // Skip actual deletion but return placeholder
    return { id, type: "{provider}::{resource}" } as {Resource};
  }
  
  try {
    await api.delete(`/resources/${id}`);
  } catch (error) {
    if (error.status === 404) {
      // Resource already deleted, this is fine
      return { id, type: "{provider}::{resource}" } as {Resource};
    }
    throw error;
  }
  
  return { id, type: "{provider}::{resource}" } as {Resource};
}
```

## Property Validation

> [!IMPORTANT]
> Implement proper validation for resource properties, especially immutable ones.

### Immutability Checks

```ts
async function update{Resource}(api: {Provider}Api, existing: {Resource}, props: {Resource}Props): Promise<{Resource}> {
  // Check immutable properties
  if (props.immutableProp && props.immutableProp !== existing.immutableProp) {
    throw new Error(
      `Cannot change immutableProp from '${existing.immutableProp}' to '${props.immutableProp}'. ` +
      `This property is immutable after resource creation.`
    );
  }
  
  // Continue with update...
}
```

### Validation Guidelines

- **Clear Error Messages**: Explain what cannot be changed and why
- **Early Validation**: Check constraints before making API calls
- **Helpful Suggestions**: When possible, suggest alternatives or workarounds
