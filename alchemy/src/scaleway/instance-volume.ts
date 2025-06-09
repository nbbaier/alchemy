import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayZone,
} from "./api.ts";

/**
 * Scaleway volume types
 */
export type ScalewayVolumeType =
  | "l_ssd" // Local SSD (high performance, locally attached)
  | "b_ssd" // Block SSD (network attached, can be detached/attached)
  | "unified"; // Unified block storage

/**
 * Scaleway volume states
 */
export type ScalewayVolumeState =
  | "available"
  | "snapshotting"
  | "error"
  | "fetching"
  | "resizing"
  | "saving"
  | "hotsyncing";

/**
 * Properties for creating or updating a Scaleway Instance Volume
 */
export interface ScalewayInstanceVolumeProps extends ScalewayApiOptions {
  /**
   * Volume name
   */
  name: string;

  /**
   * Zone where the volume will be created
   * @default "{region}-1"
   */
  zone?: ScalewayZone;

  /**
   * Volume type
   * @default "b_ssd"
   */
  volumeType?: ScalewayVolumeType;

  /**
   * Volume size in GB
   * Minimum: 1 GB for b_ssd, 10 GB for l_ssd
   * Maximum: 10,000 GB
   */
  size: number;

  /**
   * Base volume or snapshot ID to create the volume from
   */
  baseVolume?: string;

  /**
   * Snapshot ID to create the volume from
   */
  baseSnapshot?: string;

  /**
   * Tags for the volume
   */
  tags?: Record<string, string>;
}

/**
 * API response structure for Scaleway Instance Volume
 */
interface ScalewayInstanceVolumeApiResponse {
  volume: {
    id: string;
    name: string;
    export_uri?: string;
    size: number;
    volume_type: string;
    creation_date: string;
    modification_date: string;
    organization: string;
    project: string;
    tags: Record<string, string>;
    state: string;
    zone: string;
    server?: {
      id: string;
      name: string;
    };
  };
}

/**
 * A Scaleway Instance Volume
 */
export interface ScalewayInstanceVolume
  extends Resource<"scaleway::InstanceVolume"> {
  /**
   * Volume unique identifier
   */
  id: string;

  /**
   * Volume name
   */
  name: string;

  /**
   * Export URI for network attached volumes
   */
  exportUri?: string;

  /**
   * Volume size in bytes
   */
  size: number;

  /**
   * Volume type
   */
  volumeType: ScalewayVolumeType;

  /**
   * Time at which the volume was created
   */
  created_at: string;

  /**
   * Time at which the volume was last modified
   */
  updated_at: string;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Tags associated with the volume
   */
  tags: Record<string, string>;

  /**
   * Current volume state
   */
  state: ScalewayVolumeState;

  /**
   * Zone where the volume is located
   */
  zone: ScalewayZone;

  /**
   * Server the volume is attached to (if any)
   */
  server?: {
    id: string;
    name: string;
  };
}

async function createNewInstanceVolume(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayInstanceVolumeProps,
  id: string,
): Promise<ScalewayInstanceVolumeApiResponse> {
  const createData: any = {
    name: props.name,
    volume_type: props.volumeType || "b_ssd",
    size: props.size * 1024 * 1024 * 1024, // Convert GB to bytes
    project: api.projectId,
  };

  if (props.baseVolume) createData.base_volume = props.baseVolume;
  if (props.baseSnapshot) createData.base_snapshot = props.baseSnapshot;
  if (props.tags) createData.tags = props.tags;

  const createResponse = await api.post("/volumes", createData, serviceBaseUrl);

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "instance volume", id);
  }

  return await createResponse.json();
}

async function waitForVolumeState(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  volumeId: string,
  targetState: ScalewayVolumeState,
  timeoutMs = 300000, // 5 minutes
): Promise<ScalewayInstanceVolumeApiResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const getResponse = await api.get(`/volumes/${volumeId}`, serviceBaseUrl);
    if (!getResponse.ok) {
      throw new Error(`Failed to check volume state: ${getResponse.status}`);
    }

    const response: ScalewayInstanceVolumeApiResponse =
      await getResponse.json();
    const currentState = response.volume.state as ScalewayVolumeState;

    if (currentState === targetState) {
      return response;
    }

    if (currentState === "error") {
      throw new Error(`Volume ${volumeId} entered error state`);
    }

    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(
    `Timeout waiting for volume ${volumeId} to reach state ${targetState}`,
  );
}

/**
 * A Scaleway Instance Volume provides persistent block storage for Scaleway instances.
 *
 * Volumes can be attached to instances for additional storage capacity and can be
 * detached and reattached to different instances (for b_ssd volumes).
 *
 * @example
 * ## Basic Block SSD Volume
 *
 * Create a network-attached SSD volume:
 *
 * ```ts
 * const dataVolume = await ScalewayInstanceVolume("data-volume", {
 *   name: "app-data",
 *   size: 100, // 100 GB
 *   volumeType: "b_ssd",
 *   zone: "fr-par-1",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## High-Performance Local SSD
 *
 * Create a high-performance local SSD volume:
 *
 * ```ts
 * const fastVolume = await ScalewayInstanceVolume("fast-volume", {
 *   name: "database-storage",
 *   size: 50, // 50 GB
 *   volumeType: "l_ssd",
 *   zone: "fr-par-1",
 *   tags: {
 *     purpose: "database",
 *     performance: "high"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Volume from Snapshot
 *
 * Create a volume from an existing snapshot:
 *
 * ```ts
 * const restoredVolume = await ScalewayInstanceVolume("restored-volume", {
 *   name: "restored-from-backup",
 *   size: 100,
 *   volumeType: "b_ssd",
 *   baseSnapshot: "snapshot-id-here",
 *   zone: "fr-par-1",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayInstanceVolume = Resource(
  "scaleway::InstanceVolume",
  async function (
    this: Context<ScalewayInstanceVolume>,
    id: string,
    props: ScalewayInstanceVolumeProps,
  ): Promise<ScalewayInstanceVolume> {
    const api = createScalewayApi(props);
    const zone = props.zone || `${api.region}-1`;
    const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${zone}`;

    const volumeId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (volumeId) {
          // Wait for volume to be available before deletion
          try {
            await waitForVolumeState(
              api,
              serviceBaseUrl,
              volumeId,
              "available",
              120000,
            );
          } catch (error) {
            logger.warn(
              `Volume ${id} may not be in available state for deletion:`,
              error,
            );
          }

          const deleteResponse = await api.delete(
            `/volumes/${volumeId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(
              deleteResponse,
              "delete",
              "instance volume",
              id,
            );
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway instance volume ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayInstanceVolumeApiResponse;

    try {
      if (this.phase === "update" && volumeId) {
        // Update existing volume (limited operations available)
        const updateData: any = {};

        if (props.name !== undefined) updateData.name = props.name;
        if (props.tags !== undefined) updateData.tags = props.tags;

        // Size can only be increased, not decreased
        if (props.size !== undefined) {
          const currentResponse = await api.get(
            `/volumes/${volumeId}`,
            serviceBaseUrl,
          );
          if (currentResponse.ok) {
            const currentVolume: ScalewayInstanceVolumeApiResponse =
              await currentResponse.json();
            const currentSizeGB =
              currentVolume.volume.size / (1024 * 1024 * 1024);
            if (props.size > currentSizeGB) {
              updateData.size = props.size * 1024 * 1024 * 1024; // Convert GB to bytes
            }
          }
        }

        const updateResponse = await api.patch(
          `/volumes/${volumeId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "instance volume", id);
        }

        // Wait for volume to be available after update
        response = await waitForVolumeState(
          api,
          serviceBaseUrl,
          volumeId,
          "available",
        );
      } else {
        // Check if volume already exists
        if (volumeId) {
          const getResponse = await api.get(
            `/volumes/${volumeId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "instance volume", id);
            throw new Error("Failed to check if instance volume exists");
          } else {
            // Volume doesn't exist, create new
            response = await createNewInstanceVolume(
              api,
              serviceBaseUrl,
              props,
              id,
            );
            // Wait for volume to be available
            response = await waitForVolumeState(
              api,
              serviceBaseUrl,
              response.volume.id,
              "available",
            );
          }
        } else {
          // Create new volume
          response = await createNewInstanceVolume(
            api,
            serviceBaseUrl,
            props,
            id,
          );
          // Wait for volume to be available
          response = await waitForVolumeState(
            api,
            serviceBaseUrl,
            response.volume.id,
            "available",
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway instance volume ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::InstanceVolume",
      id: response.volume.id,
      name: response.volume.name,
      exportUri: response.volume.export_uri,
      size: response.volume.size,
      volumeType: response.volume.volume_type as ScalewayVolumeType,
      created_at: response.volume.creation_date,
      updated_at: response.volume.modification_date,
      organizationId: response.volume.organization,
      projectId: response.volume.project,
      tags: response.volume.tags || {},
      state: response.volume.state as ScalewayVolumeState,
      zone: response.volume.zone as ScalewayZone,
      server: response.volume.server,
    };
  },
);
