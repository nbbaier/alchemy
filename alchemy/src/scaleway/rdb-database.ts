import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
} from "./api.ts";
import type { ScalewayRdbInstance } from "./rdb-instance.ts";

/**
 * Properties for creating or updating a Scaleway RDB Database
 */
export interface ScalewayRdbDatabaseProps extends ScalewayApiOptions {
  /**
   * Database name
   */
  name: string;

  /**
   * RDB instance ID or RDB instance resource where the database will be created
   */
  instance: string | ScalewayRdbInstance;

  /**
   * Region where the database will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Database owner (username)
   * If not specified, the instance's default user will be used
   */
  owner?: string;
}

/**
 * API response structure for Scaleway RDB Database
 */
interface ScalewayRdbDatabaseApiResponse {
  name: string;
  owner: string;
  managed: boolean;
  size: string;
}

/**
 * A Scaleway RDB Database
 */
export interface ScalewayRdbDatabase extends Resource<"scaleway::RdbDatabase"> {
  /**
   * Database name
   */
  name: string;

  /**
   * RDB instance ID where the database is located
   */
  instanceId: string;

  /**
   * Region where the database is located
   */
  region: ScalewayRegion;

  /**
   * Database owner (username)
   */
  owner: string;

  /**
   * Whether the database is managed by Scaleway
   */
  managed: boolean;

  /**
   * Database size
   */
  size: string;
}

async function createNewRdbDatabase(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  instanceId: string,
  props: ScalewayRdbDatabaseProps,
  id: string,
): Promise<ScalewayRdbDatabaseApiResponse> {
  const createData: any = {
    name: props.name,
  };

  if (props.owner) createData.owner = props.owner;

  const createResponse = await api.post(
    `/instances/${instanceId}/databases`,
    createData,
    serviceBaseUrl,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "RDB database", id);
  }

  return await createResponse.json();
}

/**
 * A Scaleway RDB Database represents a logical database within a Scaleway RDB instance.
 *
 * Databases are logical containers within database instances that organize
 * tables, schemas, and other database objects.
 *
 * @example
 * ## Basic Database
 *
 * Create a database within an existing RDB instance:
 *
 * ```ts
 * const rdbInstance = await ScalewayRdbInstance("app-db", {
 *   name: "app-database",
 *   engine: "PostgreSQL-15",
 *   nodeType: "db-dev-s",
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 *
 * const appDatabase = await ScalewayRdbDatabase("app-db", {
 *   name: "application",
 *   instance: rdbInstance,
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Database with Specific Owner
 *
 * Create a database with a specific owner user:
 *
 * ```ts
 * const userDatabase = await ScalewayRdbDatabase("user-db", {
 *   name: "userdata",
 *   instance: "instance-id-here",
 *   owner: "appuser",
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Multiple Databases for Microservices
 *
 * Create separate databases for different services:
 *
 * ```ts
 * const sharedInstance = await ScalewayRdbInstance("shared-db", {
 *   name: "shared-database",
 *   engine: "PostgreSQL-15",
 *   nodeType: "db-gp-m",
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 *
 * const userServiceDb = await ScalewayRdbDatabase("user-service-db", {
 *   name: "users",
 *   instance: sharedInstance,
 *   owner: "userservice",
 * });
 *
 * const orderServiceDb = await ScalewayRdbDatabase("order-service-db", {
 *   name: "orders",
 *   instance: sharedInstance,
 *   owner: "orderservice",
 * });
 * ```
 */
export const ScalewayRdbDatabase = Resource(
  "scaleway::RdbDatabase",
  async function (
    this: Context<ScalewayRdbDatabase>,
    id: string,
    props: ScalewayRdbDatabaseProps,
  ): Promise<ScalewayRdbDatabase> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/rdb/v1/regions/${region}`;

    // Extract instance ID from instance property
    const instanceId =
      typeof props.instance === "string" ? props.instance : props.instance.id;
    const databaseName = this.output?.name || props.name;

    if (this.phase === "delete") {
      try {
        if (databaseName && instanceId) {
          const deleteResponse = await api.delete(
            `/instances/${instanceId}/databases/${databaseName}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "RDB database", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway RDB database ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayRdbDatabaseApiResponse;

    try {
      if (this.phase === "update" && databaseName && instanceId) {
        // For databases, most properties cannot be updated after creation
        // Only check if database still exists and return current state
        const getResponse = await api.get(
          `/instances/${instanceId}/databases/${databaseName}`,
          serviceBaseUrl,
        );
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "RDB database", id);
        }

        response = await getResponse.json();
      } else {
        // Check if database already exists
        if (databaseName && instanceId) {
          const getResponse = await api.get(
            `/instances/${instanceId}/databases/${databaseName}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "RDB database", id);
            throw new Error("Failed to check if RDB database exists");
          } else {
            // Database doesn't exist, create new
            response = await createNewRdbDatabase(
              api,
              serviceBaseUrl,
              instanceId,
              props,
              id,
            );
          }
        } else {
          // Create new database
          response = await createNewRdbDatabase(
            api,
            serviceBaseUrl,
            instanceId,
            props,
            id,
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway RDB database ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::RdbDatabase",
      name: response.name,
      instanceId,
      region,
      owner: response.owner,
      managed: response.managed,
      size: response.size,
    };
  },
);
