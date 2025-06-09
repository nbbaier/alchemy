import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
} from "./api.ts";

/**
 * Scaleway RDB instance engines
 */
export type ScalewayRdbEngine =
  | "PostgreSQL-11"
  | "PostgreSQL-12"
  | "PostgreSQL-13"
  | "PostgreSQL-14"
  | "PostgreSQL-15"
  | "PostgreSQL-16"
  | "MySQL-8"
  | "Redis-6.2"
  | "Redis-7.0";

/**
 * Scaleway RDB instance node types
 */
export type ScalewayRdbNodeType =
  | "db-dev-s" // Development 0.5 vCPU, 2GB RAM
  | "db-dev-m" // Development 1 vCPU, 4GB RAM
  | "db-dev-l" // Development 2 vCPU, 8GB RAM
  | "db-dev-xl" // Development 4 vCPU, 16GB RAM
  | "db-gp-xs" // General Purpose 1 vCPU, 4GB RAM
  | "db-gp-s" // General Purpose 2 vCPU, 8GB RAM
  | "db-gp-m" // General Purpose 4 vCPU, 16GB RAM
  | "db-gp-l" // General Purpose 8 vCPU, 32GB RAM
  | "db-gp-xl"; // General Purpose 16 vCPU, 64GB RAM

/**
 * Scaleway RDB instance states
 */
export type ScalewayRdbInstanceState =
  | "ready"
  | "provisioning"
  | "configuring"
  | "deleting"
  | "error"
  | "autohealing"
  | "locked"
  | "initializing"
  | "disk_full"
  | "restarting";

/**
 * Scaleway RDB backup schedule
 */
export interface ScalewayRdbBackupSchedule {
  /**
   * Frequency of automatic backups
   * @default 24 (hours)
   */
  frequency?: number;

  /**
   * Retention period for backups
   * @default 7 (days)
   */
  retention?: number;

  /**
   * Whether backups are disabled
   * @default false
   */
  disabled?: boolean;
}

/**
 * Properties for creating or updating a Scaleway RDB Instance
 */
export interface ScalewayRdbInstanceProps extends ScalewayApiOptions {
  /**
   * RDB instance name
   */
  name: string;

  /**
   * Region where the RDB instance will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Database engine and version
   * @default "PostgreSQL-15"
   */
  engine?: ScalewayRdbEngine;

  /**
   * Node type (CPU and RAM configuration)
   * @default "db-dev-s"
   */
  nodeType?: ScalewayRdbNodeType;

  /**
   * Username for the initial database user
   * @default "root"
   */
  userName?: string;

  /**
   * Password for the initial database user
   * If not provided, a random password will be generated
   */
  password?: string;

  /**
   * Whether the instance is a highly available cluster
   * @default false
   */
  isHaCluster?: boolean;

  /**
   * Volume size in GB
   * @default 20
   */
  volumeSize?: number;

  /**
   * Volume type
   * @default "lssd"
   */
  volumeType?: "lssd" | "bssd";

  /**
   * Backup schedule configuration
   */
  backupSchedule?: ScalewayRdbBackupSchedule;

  /**
   * Private network to attach the instance to
   */
  privateNetwork?: {
    /**
     * Private network ID
     */
    id: string;
    /**
     * IP address within the private network
     */
    serviceIp?: string;
  };

  /**
   * Tags for the RDB instance
   */
  tags?: Record<string, string>;

  /**
   * Settings for the database engine
   */
  settings?: Record<string, string>;
}

/**
 * API response structure for Scaleway RDB Instance
 */
interface ScalewayRdbInstanceApiResponse {
  id: string;
  name: string;
  engine: string;
  status: string;
  region: string;
  organization_id: string;
  project_id: string;
  endpoint?: {
    ip: string;
    port: number;
    private_network?: {
      private_network_id: string;
      service_ip: string;
    };
  };
  node_type: string;
  is_ha_cluster: boolean;
  volume?: {
    type: string;
    size: number;
  };
  backup_schedule?: {
    frequency: number;
    retention: number;
    disabled: boolean;
  };
  tags?: Record<string, string>;
  settings?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/**
 * A Scaleway RDB Instance
 */
export interface ScalewayRdbInstance extends Resource<"scaleway::RdbInstance"> {
  /**
   * RDB instance unique identifier
   */
  id: string;

  /**
   * RDB instance name
   */
  name: string;

  /**
   * Database engine and version
   */
  engine: ScalewayRdbEngine;

  /**
   * Current instance status
   */
  status: ScalewayRdbInstanceState;

  /**
   * Region where the instance is located
   */
  region: ScalewayRegion;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Database connection endpoint
   */
  endpoint?: {
    ip: string;
    port: number;
    privateNetwork?: {
      privateNetworkId: string;
      serviceIp: string;
    };
  };

  /**
   * Node type configuration
   */
  nodeType: ScalewayRdbNodeType;

  /**
   * Whether this is a highly available cluster
   */
  isHaCluster: boolean;

  /**
   * Volume configuration
   */
  volume?: {
    type: string;
    size: number;
  };

  /**
   * Backup schedule configuration
   */
  backupSchedule?: {
    frequency: number;
    retention: number;
    disabled: boolean;
  };

  /**
   * Tags associated with the instance
   */
  tags?: Record<string, string>;

  /**
   * Engine-specific settings
   */
  settings?: Record<string, string>;

  /**
   * Time at which the instance was created
   */
  created_at: string;

  /**
   * Time at which the instance was last updated
   */
  updated_at: string;
}

async function createNewRdbInstance(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayRdbInstanceProps,
  id: string,
): Promise<ScalewayRdbInstanceApiResponse> {
  const createData: any = {
    name: props.name,
    engine: props.engine || "PostgreSQL-15",
    node_type: props.nodeType || "db-dev-s",
    user_name: props.userName || "root",
    project_id: api.projectId,
    is_ha_cluster: props.isHaCluster || false,
  };

  if (props.password) createData.password = props.password;

  if (props.volumeSize || props.volumeType) {
    createData.volume = {
      type: props.volumeType || "lssd",
      size: (props.volumeSize || 20) * 1024 * 1024 * 1024, // Convert GB to bytes
    };
  }

  if (props.backupSchedule) {
    createData.backup_schedule = {
      frequency: props.backupSchedule.frequency || 24,
      retention: props.backupSchedule.retention || 7,
      disabled: props.backupSchedule.disabled || false,
    };
  }

  if (props.privateNetwork) {
    createData.endpoint = {
      private_network: {
        private_network_id: props.privateNetwork.id,
        service_ip: props.privateNetwork.serviceIp,
      },
    };
  }

  if (props.tags) createData.tags = props.tags;
  if (props.settings) createData.settings = props.settings;

  const createResponse = await api.post(
    "/instances",
    createData,
    serviceBaseUrl,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "RDB instance", id);
  }

  return await createResponse.json();
}

async function waitForRdbInstanceState(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  instanceId: string,
  targetState: ScalewayRdbInstanceState,
  timeoutMs = 900000, // 15 minutes
): Promise<ScalewayRdbInstanceApiResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const getResponse = await api.get(
      `/instances/${instanceId}`,
      serviceBaseUrl,
    );
    if (!getResponse.ok) {
      throw new Error(
        `Failed to check RDB instance state: ${getResponse.status}`,
      );
    }

    const response: ScalewayRdbInstanceApiResponse = await getResponse.json();
    const currentState = response.status as ScalewayRdbInstanceState;

    if (currentState === targetState) {
      return response;
    }

    if (currentState === "error") {
      throw new Error(`RDB instance ${instanceId} entered error state`);
    }

    // Wait 10 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error(
    `Timeout waiting for RDB instance ${instanceId} to reach state ${targetState}`,
  );
}

/**
 * A Scaleway RDB Instance provides managed relational database services
 * including PostgreSQL, MySQL, and Redis.
 *
 * RDB instances are fully managed with automatic backups, high availability
 * options, and simplified database administration.
 *
 * @example
 * ## Basic PostgreSQL Instance
 *
 * Create a development PostgreSQL database:
 *
 * ```ts
 * const database = await ScalewayRdbInstance("app-db", {
 *   name: "app-database",
 *   engine: "PostgreSQL-15",
 *   nodeType: "db-dev-s",
 *   userName: "admin",
 *   password: alchemy.secret("secure-password"),
 *   volumeSize: 20,
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## High Availability MySQL Instance
 *
 * Create a production MySQL database with HA:
 *
 * ```ts
 * const prodDatabase = await ScalewayRdbInstance("prod-mysql", {
 *   name: "production-mysql",
 *   engine: "MySQL-8",
 *   nodeType: "db-gp-s",
 *   isHaCluster: true,
 *   volumeSize: 100,
 *   volumeType: "bssd",
 *   backupSchedule: {
 *     frequency: 12, // Every 12 hours
 *     retention: 30  // Keep for 30 days
 *   },
 *   tags: {
 *     environment: "production",
 *     service: "api"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Private Network Database
 *
 * Create a database accessible only from a private network:
 *
 * ```ts
 * const privateDb = await ScalewayRdbInstance("private-db", {
 *   name: "internal-database",
 *   engine: "PostgreSQL-15",
 *   nodeType: "db-gp-m",
 *   privateNetwork: {
 *     id: "private-network-id-here",
 *     serviceIp: "192.168.1.10"
 *   },
 *   settings: {
 *     "max_connections": "200",
 *     "shared_buffers": "256MB"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayRdbInstance = Resource(
  "scaleway::RdbInstance",
  async function (
    this: Context<ScalewayRdbInstance>,
    id: string,
    props: ScalewayRdbInstanceProps,
  ): Promise<ScalewayRdbInstance> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/rdb/v1/regions/${region}`;

    const instanceId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (instanceId) {
          const deleteResponse = await api.delete(
            `/instances/${instanceId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "RDB instance", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway RDB instance ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayRdbInstanceApiResponse;

    try {
      if (this.phase === "update" && instanceId) {
        // Update existing RDB instance
        const updateData: any = {};

        if (props.name !== undefined) updateData.name = props.name;
        if (props.tags !== undefined) updateData.tags = props.tags;
        if (props.settings !== undefined) updateData.settings = props.settings;

        // Some properties like node_type might require restart
        if (props.nodeType !== undefined) updateData.node_type = props.nodeType;

        if (props.backupSchedule !== undefined) {
          updateData.backup_schedule = {
            frequency: props.backupSchedule.frequency || 24,
            retention: props.backupSchedule.retention || 7,
            disabled: props.backupSchedule.disabled || false,
          };
        }

        const updateResponse = await api.patch(
          `/instances/${instanceId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "RDB instance", id);
        }

        // Wait for instance to be ready after update
        response = await waitForRdbInstanceState(
          api,
          serviceBaseUrl,
          instanceId,
          "ready",
        );
      } else {
        // Check if instance already exists
        if (instanceId) {
          const getResponse = await api.get(
            `/instances/${instanceId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "RDB instance", id);
            throw new Error("Failed to check if RDB instance exists");
          } else {
            // Instance doesn't exist, create new
            response = await createNewRdbInstance(
              api,
              serviceBaseUrl,
              props,
              id,
            );
            // Wait for instance to be ready
            response = await waitForRdbInstanceState(
              api,
              serviceBaseUrl,
              response.id,
              "ready",
            );
          }
        } else {
          // Create new instance
          response = await createNewRdbInstance(api, serviceBaseUrl, props, id);
          // Wait for instance to be ready
          response = await waitForRdbInstanceState(
            api,
            serviceBaseUrl,
            response.id,
            "ready",
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway RDB instance ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::RdbInstance",
      id: response.id,
      name: response.name,
      engine: response.engine as ScalewayRdbEngine,
      status: response.status as ScalewayRdbInstanceState,
      region: response.region as ScalewayRegion,
      organizationId: response.organization_id,
      projectId: response.project_id,
      endpoint: response.endpoint
        ? {
            ip: response.endpoint.ip,
            port: response.endpoint.port,
            privateNetwork: response.endpoint.private_network
              ? {
                  privateNetworkId:
                    response.endpoint.private_network.private_network_id,
                  serviceIp: response.endpoint.private_network.service_ip,
                }
              : undefined,
          }
        : undefined,
      nodeType: response.node_type as ScalewayRdbNodeType,
      isHaCluster: response.is_ha_cluster,
      volume: response.volume,
      backupSchedule: response.backup_schedule,
      tags: response.tags,
      settings: response.settings,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },
);
