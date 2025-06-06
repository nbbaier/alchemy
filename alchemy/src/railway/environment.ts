import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface EnvironmentProps {
  name: string;
  projectId: string;
  apiKey?: Secret;
}

/**
 * A Railway environment represents a deployment environment within a project (e.g., production, staging, development).
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

export interface Environment
  extends Resource<"railway::Environment">,
    EnvironmentProps {
  id: string;
  createdAt: string;
  updatedAt: string;
}

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
          await api.mutate(
            `
            mutation EnvironmentDelete($id: String!) {
              environmentDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Environment", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
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
          id: this.output.id,
          input: {
            name: props.name,
          },
        },
      );

      const environment = response.data?.environmentUpdate;
      if (!environment) {
        throw new Error("Failed to update Railway environment");
      }

      return this({
        id: environment.id,
        name: environment.name,
        projectId: environment.projectId,
        createdAt: environment.createdAt,
        updatedAt: environment.updatedAt,
      });
    }

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

    return this({
      id: environment.id,
      name: environment.name,
      projectId: environment.projectId,
      createdAt: environment.createdAt,
      updatedAt: environment.updatedAt,
    });
  },
);
