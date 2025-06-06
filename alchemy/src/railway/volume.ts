import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface VolumeProps {
  name: string;
  projectId: string;
  environmentId: string;
  mountPath: string;
  size?: number;
  apiKey?: Secret;
}

/**
 * A Railway volume provides persistent storage that can be mounted to services within an environment.
 *
 * @example
 * ```typescript
 * // Create a basic volume for file storage
 * const dataVolume = await Volume("app-data", {
 *   name: "application-data",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   mountPath: "/app/data",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a large volume for media storage
 * const mediaVolume = await Volume("media-storage", {
 *   name: "user-uploads",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   mountPath: "/app/uploads",
 *   size: 50, // 50GB
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a database volume with custom authentication
 * const dbVolume = await Volume("database-volume", {
 *   name: "postgres-data",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   mountPath: "/var/lib/postgresql/data",
 *   size: 100, // 100GB
 *   apiKey: secret("production-railway-token"),
 * });
 * ```
 */

export interface Volume extends Resource<"railway::Volume">, VolumeProps {
  id: string;
  createdAt: string;
  updatedAt: string;
}

export const Volume = Resource(
  "railway::Volume",
  async function (
    this: Context<Volume>,
    _id: string,
    props: VolumeProps,
  ): Promise<Volume> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation VolumeDelete($id: String!) {
              volumeDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Volume", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.mutate(
        `
        mutation VolumeUpdate($id: String!, $input: VolumeUpdateInput!) {
          volumeUpdate(id: $id, input: $input) {
            id
            name
            projectId
            environmentId
            mountPath
            size
            createdAt
            updatedAt
          }
        }
        `,
        {
          id: this.output.id,
          input: {
            name: props.name,
            mountPath: props.mountPath,
            size: props.size,
          },
        },
      );

      const volume = response.data?.volumeUpdate;
      if (!volume) {
        throw new Error("Failed to update Railway volume");
      }

      return this({
        id: volume.id,
        name: volume.name,
        projectId: volume.projectId,
        environmentId: volume.environmentId,
        mountPath: volume.mountPath,
        size: volume.size,
        createdAt: volume.createdAt,
        updatedAt: volume.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation VolumeCreate($input: VolumeCreateInput!) {
        volumeCreate(input: $input) {
          id
          name
          projectId
          environmentId
          mountPath
          size
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
          mountPath: props.mountPath,
          size: props.size,
        },
      },
    );

    const volume = response.data?.volumeCreate;
    if (!volume) {
      throw new Error("Failed to create Railway volume");
    }

    return this({
      id: volume.id,
      name: volume.name,
      projectId: volume.projectId,
      environmentId: volume.environmentId,
      mountPath: volume.mountPath,
      size: volume.size,
      createdAt: volume.createdAt,
      updatedAt: volume.updatedAt,
    });
  },
);
