import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface ServiceProps {
  name: string;
  projectId: string;
  sourceRepo?: string;
  sourceRepoBranch?: string;
  rootDirectory?: string;
  configPath?: string;
  apiKey?: Secret;
}

/**
 * A Railway service represents an application or microservice deployed within a project environment.
 *
 * @example
 * ```typescript
 * // Create a basic service
 * const api = await Service("api-service", {
 *   name: "api",
 *   projectId: project.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a service from a GitHub repository
 * const webApp = await Service("web-app", {
 *   name: "frontend",
 *   projectId: project.id,
 *   sourceRepo: "https://github.com/myorg/web-app",
 *   sourceRepoBranch: "main",
 *   rootDirectory: "/",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a microservice with custom configuration
 * const worker = await Service("background-worker", {
 *   name: "worker",
 *   projectId: project.id,
 *   sourceRepo: "https://github.com/myorg/worker-service",
 *   sourceRepoBranch: "develop",
 *   rootDirectory: "/worker",
 *   configPath: "./railway.toml",
 * });
 * ```
 */

export interface Service extends Resource<"railway::Service">, ServiceProps {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const Service = Resource(
  "railway::Service",
  async function (
    this: Context<Service>,
    _id: string,
    props: ServiceProps,
  ): Promise<Service> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation ServiceDelete($id: String!) {
              serviceDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Service", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.mutate(
        `
        mutation ServiceUpdate($id: String!, $input: ServiceUpdateInput!) {
          serviceUpdate(id: $id, input: $input) {
            id
            name
            projectId
            sourceRepo
            sourceRepoBranch
            rootDirectory
            configPath
            createdAt
            updatedAt
          }
        }
        `,
        {
          id: this.output.id,
          input: {
            name: props.name,
            sourceRepo: props.sourceRepo,
            sourceRepoBranch: props.sourceRepoBranch,
            rootDirectory: props.rootDirectory,
            configPath: props.configPath,
          },
        },
      );

      const service = response.data?.serviceUpdate;
      if (!service) {
        throw new Error("Failed to update Railway service");
      }

      return this({
        id: service.id,
        name: service.name,
        projectId: service.projectId,
        sourceRepo: service.sourceRepo,
        sourceRepoBranch: service.sourceRepoBranch,
        rootDirectory: service.rootDirectory,
        configPath: service.configPath,
        createdAt: service.createdAt,
        updatedAt: service.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation ServiceCreate($input: ServiceCreateInput!) {
        serviceCreate(input: $input) {
          id
          name
          projectId
          sourceRepo
          sourceRepoBranch
          rootDirectory
          configPath
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          name: props.name,
          projectId: props.projectId,
          sourceRepo: props.sourceRepo,
          sourceRepoBranch: props.sourceRepoBranch,
          rootDirectory: props.rootDirectory,
          configPath: props.configPath,
        },
      },
    );

    const service = response.data?.serviceCreate;
    if (!service) {
      throw new Error("Failed to create Railway service");
    }

    return this({
      id: service.id,
      name: service.name,
      projectId: service.projectId,
      sourceRepo: service.sourceRepo,
      sourceRepoBranch: service.sourceRepoBranch,
      rootDirectory: service.rootDirectory,
      configPath: service.configPath,
      createdAt: service.createdAt,
      updatedAt: service.updatedAt,
    });
  },
);
