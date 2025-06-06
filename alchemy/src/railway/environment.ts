import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface EnvironmentProps {
  /**
   * The name of the environment
   */
  name: string;

  /**
   * The ID of the project this environment belongs to
   */
  projectId: string;

  /**
   * Railway API token to use for authentication. Defaults to RAILWAY_TOKEN environment variable
   */
  apiKey?: Secret;
}

export interface Environment
  extends Resource<"railway::Environment">,
    EnvironmentProps {
  /**
   * The unique identifier of the environment
   */
  id: string;

  /**
   * The timestamp when the environment was created
   */
  createdAt: string;

  /**
   * The timestamp when the environment was last updated
   */
  updatedAt: string;
}

/**
 * Create and manage Railway environments
 *
 * @example
 * ```typescript
 * // Create a staging environment
 * const staging = await Environment("staging-env", {
 *   name: "staging",
 *   projectId: project.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a production environment
 * const production = await Environment("prod-env", {
 *   name: "production",
 *   projectId: project.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a development environment with custom auth
 * const development = await Environment("dev-env", {
 *   name: "development",
 *   projectId: project.id,
 *   apiKey: secret("dev-railway-token"),
 * });
 * ```
 */
export const Environment = Resource(
  "railway::Environment",
  async function (
    this: Context<Environment>,
    _id: string,
    props: EnvironmentProps,
  ): Promise<Environment> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await deleteEnvironment(api, this.output.id);
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Environment", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const environment = await updateEnvironment(api, this.output.id, props);

      return this({
        id: environment.id,
        name: environment.name,
        projectId: environment.projectId,
        createdAt: environment.createdAt,
        updatedAt: environment.updatedAt,
      });
    }

    const environment = await createEnvironment(api, props);

    return this({
      id: environment.id,
      name: environment.name,
      projectId: environment.projectId,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    });
  },
);

export async function createEnvironment(api: any, props: EnvironmentProps) {
  const response = await api.mutate(
    `
    mutation EnvironmentCreate($input: EnvironmentCreateInput!) {
      environmentCreate(input: $input) {
        id
        name
        projectId
        createdAt
        updatedAt
      }
    }
    `,
    {
      input: {
        name: props.name,
        projectId: props.projectId,
      },
    },
  );

  const environment = response.data?.environmentCreate;
  if (!environment) {
    throw new Error("Failed to create Railway environment");
  }

  return environment;
}

export async function updateEnvironment(
  api: any,
  id: string,
  props: EnvironmentProps,
) {
  const response = await api.mutate(
    `
    mutation EnvironmentUpdate($id: String!, $input: EnvironmentUpdateInput!) {
      environmentUpdate(id: $id, input: $input) {
        id
        name
        projectId
        createdAt
        updatedAt
      }
    }
    `,
    {
      id,
      input: {
        name: props.name,
      },
    },
  );

  const environment = response.data?.environmentUpdate;
  if (!environment) {
    throw new Error("Failed to update Railway environment");
  }

  return environment;
}

export async function deleteEnvironment(api: any, id: string) {
  await api.mutate(
    `
    mutation EnvironmentDelete($id: String!) {
      environmentDelete(id: $id)
    }
    `,
    { id },
  );
}
