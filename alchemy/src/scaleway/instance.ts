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
 * Scaleway instance states
 */
export type ScalewayInstanceState =
  | "running"
  | "stopped"
  | "stopping"
  | "starting"
  | "provisioning"
  | "locked";

/**
 * Scaleway instance boot types
 */
export type ScalewayInstanceBootType = "local" | "bootscript" | "rescue";

/**
 * Scaleway instance types (common ones)
 */
export type ScalewayInstanceType =
  | "DEV1-S" // Development 1 vCPU, 2GB RAM
  | "DEV1-M" // Development 2 vCPU, 4GB RAM
  | "DEV1-L" // Development 4 vCPU, 8GB RAM
  | "DEV1-XL" // Development 8 vCPU, 16GB RAM
  | "GP1-XS" // General Purpose 1 vCPU, 1GB RAM
  | "GP1-S" // General Purpose 2 vCPU, 4GB RAM
  | "GP1-M" // General Purpose 4 vCPU, 8GB RAM
  | "GP1-L" // General Purpose 8 vCPU, 16GB RAM
  | "GP1-XL"; // General Purpose 16 vCPU, 32GB RAM

/**
 * Properties for creating or updating a Scaleway instance
 */
export interface ScalewayInstanceProps extends ScalewayApiOptions {
  /**
   * Instance name
   */
  name: string;

  /**
   * Instance type (defines CPU/RAM configuration)
   * @default "DEV1-S"
   */
  type?: ScalewayInstanceType;

  /**
   * Zone where the instance will be created
   * @default "{region}-1"
   */
  zone?: ScalewayZone;

  /**
   * Image ID or name to use for the instance
   * @default "ubuntu_jammy" (Ubuntu 22.04 LTS)
   */
  image?: string;

  /**
   * Whether to enable instance dynamic IP
   * @default true
   */
  enable_dynamic_ip?: boolean;

  /**
   * Root volume size in GB
   * @default 20
   */
  root_volume_size?: number;

  /**
   * Root volume type
   * @default "l_ssd"
   */
  root_volume_type?: "l_ssd" | "b_ssd";

  /**
   * Tags for the instance
   */
  tags?: string[];

  /**
   * Security group IDs to attach to the instance
   */
  security_groups?: string[];

  /**
   * Boot type for the instance
   * @default "local"
   */
  boot_type?: ScalewayInstanceBootType;

  /**
   * Whether to start the instance after creation
   * @default true
   */
  start_on_create?: boolean;
}

/**
 * Scaleway instance IP information
 */
export interface ScalewayInstanceIp {
  id: string;
  address: string;
  type: "dynamic" | "static";
  state: string;
}

/**
 * Scaleway instance volume information
 */
export interface ScalewayInstanceVolume {
  id: string;
  name: string;
  size: number;
  volume_type: string;
  state: string;
}

/**
 * API response structure for Scaleway instances
 */
interface ScalewayInstanceApiResponse {
  server: {
    id: string;
    name: string;
    organization: string;
    project: string;
    commercial_type: string;
    zone: string;
    state: ScalewayInstanceState;
    boot_type: string;
    creation_date: string;
    modification_date: string;
    image: {
      id: string;
      name: string;
      arch: string;
    };
    public_ip?: {
      id: string;
      address: string;
      dynamic: boolean;
    };
    private_ip?: string;
    volumes: Record<
      string,
      {
        id: string;
        name: string;
        size: number;
        volume_type: string;
        state: string;
      }
    >;
    tags: string[];
    security_groups: Array<{
      id: string;
      name: string;
    }>;
  };
}

/**
 * A Scaleway compute instance
 */
export interface ScalewayInstance extends Resource<"scaleway::Instance"> {
  /**
   * Instance ID
   */
  id: string;

  /**
   * Instance name
   */
  name: string;

  /**
   * Instance type
   */
  type: ScalewayInstanceType;

  /**
   * Zone where the instance is located
   */
  zone: ScalewayZone;

  /**
   * Current state of the instance
   */
  state: ScalewayInstanceState;

  /**
   * Time at which the instance was created
   */
  created_at: string;

  /**
   * Time at which the instance was last updated
   */
  updated_at: string;

  /**
   * Public IP address (if any)
   */
  public_ip?: ScalewayInstanceIp;

  /**
   * Private IP address
   */
  private_ip?: string;

  /**
   * Instance volumes
   */
  volumes: Record<string, ScalewayInstanceVolume>;

  /**
   * Instance tags
   */
  tags: string[];

  /**
   * Security groups attached to the instance
   */
  security_groups: Array<{
    id: string;
    name: string;
  }>;

  /**
   * Image information
   */
  image: {
    id: string;
    name: string;
    arch: string;
  };
}

/**
 * Creates a Scaleway compute instance.
 *
 * @example
 * ## Basic Instance
 *
 * Create a basic development instance with default settings:
 *
 * ```ts
 * const instance = await ScalewayInstance("web-server", {
 *   name: "My Web Server"
 * });
 * ```
 *
 * @example
 * ## Production Instance
 *
 * Create a production instance with specific configuration:
 *
 * ```ts
 * const prodInstance = await ScalewayInstance("prod-api", {
 *   name: "Production API Server",
 *   type: "GP1-L",
 *   zone: "fr-par-1",
 *   root_volume_size: 50,
 *   tags: ["production", "api"],
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Custom Image Instance
 *
 * Create an instance with a specific image:
 *
 * ```ts
 * const customInstance = await ScalewayInstance("custom-server", {
 *   name: "Custom Server",
 *   image: "ubuntu_focal",
 *   type: "DEV1-M",
 *   root_volume_type: "b_ssd"
 * });
 * ```
 */
export const ScalewayInstance = Resource(
  "scaleway::Instance",
  async function (
    this: Context<ScalewayInstance>,
    id: string,
    props: ScalewayInstanceProps,
  ): Promise<ScalewayInstance> {
    const api = createScalewayApi(props);
    const zone = props.zone || `${api.region}-1`;
    const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${zone}`;

    const instanceId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (instanceId) {
          // Stop the instance first if it's running
          const instanceResponse = await api.get(
            `/servers/${instanceId}`,
            serviceBaseUrl,
          );
          if (instanceResponse.ok) {
            const instanceData: ScalewayInstanceApiResponse =
              await instanceResponse.json();

            if (instanceData.server.state === "running") {
              const stopResponse = await api.post(
                `/servers/${instanceId}/action`,
                {
                  action: "poweroff",
                },
                serviceBaseUrl,
              );

              if (!stopResponse.ok) {
                logger.warn(
                  `Failed to stop instance ${instanceId} before deletion`,
                );
              } else {
                // Wait for instance to stop
                await waitForInstanceState(
                  api,
                  instanceId,
                  "stopped",
                  serviceBaseUrl,
                );
              }
            }
          }

          // Delete the instance
          const deleteResponse = await api.delete(
            `/servers/${instanceId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "instance", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway instance ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayInstanceApiResponse;

    try {
      if (this.phase === "update" && instanceId) {
        // Update existing instance (limited operations available)
        const updateData: any = {};

        if (props.name) updateData.name = props.name;
        if (props.tags !== undefined) updateData.tags = props.tags;

        const updateResponse = await api.patch(
          `/servers/${instanceId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "instance", id);
        }

        // Get updated instance data
        const getResponse = await api.get(
          `/servers/${instanceId}`,
          serviceBaseUrl,
        );
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "instance", id);
        }

        response = await getResponse.json();
      } else {
        // Check if instance already exists
        if (instanceId) {
          const getResponse = await api.get(
            `/servers/${instanceId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "instance", id);
            throw new Error("Failed to check if instance exists");
          } else {
            // Instance doesn't exist, create new
            response = await createNewInstance(
              api,
              props,
              zone,
              serviceBaseUrl,
            );
          }
        } else {
          // No output ID, create new instance
          response = await createNewInstance(api, props, zone, serviceBaseUrl);
        }
      }

      return this({
        id: response.server.id,
        name: response.server.name,
        type: response.server.commercial_type as ScalewayInstanceType,
        zone: response.server.zone as ScalewayZone,
        state: response.server.state,
        created_at: response.server.creation_date,
        updated_at: response.server.modification_date,
        public_ip: response.server.public_ip
          ? {
              id: response.server.public_ip.id,
              address: response.server.public_ip.address,
              type: response.server.public_ip.dynamic ? "dynamic" : "static",
              state: "available",
            }
          : undefined,
        private_ip: response.server.private_ip,
        volumes: Object.fromEntries(
          Object.entries(response.server.volumes).map(([key, vol]) => [
            key,
            {
              id: vol.id,
              name: vol.name,
              size: vol.size,
              volume_type: vol.volume_type,
              state: vol.state,
            },
          ]),
        ),
        tags: response.server.tags,
        security_groups: response.server.security_groups,
        image: response.server.image,
      });
    } catch (error) {
      logger.error(`Error ${this.phase} Scaleway instance '${id}':`, error);
      throw error;
    }
  },
);

/**
 * Helper function to create a new Scaleway instance
 */
async function createNewInstance(
  api: any,
  props: ScalewayInstanceProps,
  _zone: ScalewayZone,
  serviceBaseUrl: string,
): Promise<ScalewayInstanceApiResponse> {
  const createData = {
    name: props.name,
    commercial_type: props.type || "DEV1-S",
    image: props.image || "ubuntu_jammy",
    enable_ipv6: false,
    dynamic_ip_required: props.enable_dynamic_ip ?? true,
    volumes: {
      "0": {
        size: (props.root_volume_size || 20) * 1000000000, // Convert GB to bytes
        volume_type: props.root_volume_type || "l_ssd",
      },
    },
    tags: props.tags || [],
    security_groups: props.security_groups?.map((sg) => ({ id: sg })) || [],
    boot_type: props.boot_type || "local",
    project: api.projectId,
  };

  const createResponse = await api.post("/servers", createData, serviceBaseUrl);

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "instance");
  }

  const response: ScalewayInstanceApiResponse = await createResponse.json();

  // Start the instance if requested
  if (props.start_on_create !== false) {
    const startResponse = await api.post(
      `/servers/${response.server.id}/action`,
      {
        action: "poweron",
      },
      serviceBaseUrl,
    );

    if (!startResponse.ok) {
      logger.warn(
        `Failed to start instance ${response.server.id} after creation`,
      );
    } else {
      // Wait for instance to start
      await waitForInstanceState(
        api,
        response.server.id,
        "running",
        serviceBaseUrl,
      );

      // Get updated instance data after starting
      const updatedResponse = await api.get(
        `/servers/${response.server.id}`,
        serviceBaseUrl,
      );
      if (updatedResponse.ok) {
        return await updatedResponse.json();
      }
    }
  }

  return response;
}

/**
 * Wait for an instance to reach a specific state
 */
async function waitForInstanceState(
  api: any,
  instanceId: string,
  targetState: ScalewayInstanceState,
  serviceBaseUrl: string,
  maxWaitTime = 5 * 60 * 1000, // 5 minutes
): Promise<void> {
  const startTime = Date.now();
  let currentState: ScalewayInstanceState;

  do {
    await new Promise((resolve) => setTimeout(resolve, 2000)); // Wait 2 seconds

    const response = await api.get(`/servers/${instanceId}`, serviceBaseUrl);
    if (!response.ok) {
      throw new Error(
        `Failed to check instance state: HTTP ${response.status}`,
      );
    }

    const data: ScalewayInstanceApiResponse = await response.json();
    currentState = data.server.state;

    if (Date.now() - startTime > maxWaitTime) {
      throw new Error(
        `Timeout waiting for instance ${instanceId} to reach state ${targetState}`,
      );
    }
  } while (currentState !== targetState);
}
