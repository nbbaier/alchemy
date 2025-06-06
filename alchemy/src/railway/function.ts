import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { Bundle } from "../esbuild/bundle.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface FunctionProps {
  name: string;
  projectId: string;
  environmentId: string;
  runtime: "nodejs" | "python" | "go" | "rust";
  main: string;
  sourceRepo?: string;
  sourceRepoBranch?: string;
  entrypoint?: string;
  apiKey?: Secret;
}

/**
 * A Railway function represents a serverless function deployed within a project environment.
 *
 * @example
 * ```typescript
 * // Create a basic Node.js function from local file
 * const apiHandler = await Function("api-handler", {
 *   name: "webhook-processor",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   runtime: "nodejs",
 *   main: "./src/handlers/webhook.ts",
 *   entrypoint: "handler",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a Python function from GitHub repository
 * const dataProcessor = await Function("data-processor", {
 *   name: "analytics-function",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   runtime: "python",
 *   main: "./functions/analytics.py",
 *   sourceRepo: "https://github.com/myorg/analytics-functions",
 *   sourceRepoBranch: "main",
 *   entrypoint: "main.handler",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a Go function with custom authentication
 * const goFunction = await Function("go-worker", {
 *   name: "background-processor",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   runtime: "go",
 *   main: "./cmd/worker/main.go",
 *   sourceRepo: "https://github.com/myorg/go-functions",
 *   sourceRepoBranch: "production",
 *   entrypoint: "main",
 *   apiKey: secret("functions-railway-token"),
 * });
 * ```
 */

export interface Function extends Resource<"railway::Function">, FunctionProps {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

export const Function = Resource(
  "railway::Function",
  async function (
    this: Context<Function>,
    _id: string,
    props: FunctionProps,
  ): Promise<Function> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    let bundledCode: string | undefined;
    if (props.runtime === "nodejs" && !props.sourceRepo) {
      const bundle = await Bundle(`${_id}-bundle`, {
        entryPoint: props.main,
        format: "cjs",
        target: "node18",
        platform: "node",
        bundle: true,
        minify: true,
      });
      bundledCode = bundle.content;
    }

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation FunctionDelete($id: String!) {
              functionDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Function", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.mutate(
        `
        mutation FunctionUpdate($id: String!, $input: FunctionUpdateInput!) {
          functionUpdate(id: $id, input: $input) {
            id
            name
            projectId
            environmentId
            runtime
            sourceCode
            sourceRepo
            sourceRepoBranch
            entrypoint
            url
            createdAt
            updatedAt
          }
        }
        `,
        {
          id: this.output.id,
          input: {
            name: props.name,
            runtime: props.runtime,
            sourceCode: bundledCode,
            sourceRepo: props.sourceRepo,
            sourceRepoBranch: props.sourceRepoBranch,
            entrypoint: props.entrypoint,
          },
        },
      );

      const func = response.data?.functionUpdate;
      if (!func) {
        throw new Error("Failed to update Railway function");
      }

      return this({
        id: func.id,
        name: func.name,
        projectId: func.projectId,
        environmentId: func.environmentId,
        runtime: func.runtime,
        main: props.main,
        sourceRepo: func.sourceRepo,
        sourceRepoBranch: func.sourceRepoBranch,
        entrypoint: func.entrypoint,
        url: func.url,
        createdAt: func.createdAt,
        updatedAt: func.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation FunctionCreate($input: FunctionCreateInput!) {
        functionCreate(input: $input) {
          id
          name
          projectId
          environmentId
          runtime
          sourceCode
          sourceRepo
          sourceRepoBranch
          entrypoint
          url
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          name: props.name,
          projectId: props.projectId,
          environmentId: props.environmentId,
          runtime: props.runtime,
          sourceCode: bundledCode,
          sourceRepo: props.sourceRepo,
          sourceRepoBranch: props.sourceRepoBranch,
          entrypoint: props.entrypoint,
        },
      },
    );

    const func = response.data?.functionCreate;
    if (!func) {
      throw new Error("Failed to create Railway function");
    }

    return this({
      id: func.id,
      name: func.name,
      projectId: func.projectId,
      environmentId: func.environmentId,
      runtime: func.runtime,
      main: props.main,
      sourceRepo: func.sourceRepo,
      sourceRepoBranch: func.sourceRepoBranch,
      entrypoint: func.entrypoint,
      url: func.url,
      createdAt: func.createdAt,
      updatedAt: func.updatedAt,
    });
  },
);
