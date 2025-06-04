import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions, type NeonApi } from "./api.ts";

/**
 * Properties for creating or updating a Neon database
 */
export interface NeonDatabaseProps extends NeonApiOptions {
  /**
   * The ID of the project containing the branch
   */
  project_id: string;

  /**
   * The ID of the branch where the database will be created
   */
  branch_id: string;

  /**
   * Name of the database
   */
  name: string;

  /**
   * Name of the role that will own the database
   */
  owner_name: string;

  /**
   * Whether to adopt an existing database if it already exists
   * @default false
   */
  adopt?: boolean;
}

/**
 * Response structure for database API operations
 */
export interface NeonDatabaseType {
  /**
   * The database ID
   */
  id: number;

  /**
   * The ID of the branch containing this database
   */
  branch_id: string;

  /**
   * Name of the database
   */
  name: string;

  /**
   * Name of the role that owns the database
   */
  owner_name: string;

  /**
   * Time at which the database was created
   */
  created_at: string;

  /**
   * Time at which the database was last updated
   */
  updated_at: string;
}

/**
 * A Neon database within a branch
 */
export interface NeonDatabase
  extends Resource<"neon::Database">,
    Omit<NeonDatabaseProps, "apiKey"> {
  /**
   * The database ID
   */
  id: number;

  /**
   * The ID of the branch containing this database
   */
  branch_id: string;

  /**
   * Name of the database
   */
  name: string;

  /**
   * Name of the role that owns the database
   */
  owner_name: string;

  /**
   * Time at which the database was created
   */
  created_at: string;

  /**
   * Time at which the database was last updated
   */
  updated_at: string;
}

/**
 * API response structure for database operations
 */
interface NeonDatabaseApiResponse {
  database: NeonDatabaseType;
}

/**
 * Payload structure for creating a database
 */
interface CreateDatabasePayload {
  database: {
    name: string;
    owner_name: string;
  };
}

/**
 * Payload structure for updating a database
 */
interface UpdateDatabasePayload {
  database: {
    name: string;
    owner_name: string;
  };
}

/**
 * API response structure for listing databases
 */
interface ListDatabasesResponse {
  databases?: NeonDatabaseType[];
}

/**
 * Creates a Neon database within a branch.
 *
 * @example
 * // Create a basic database with default owner:
 * const database = await NeonDatabase("my-database", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "myapp_db",
 *   owner_name: "neondb_owner"
 * });
 *
 * @example
 * // Create a database with a custom owner role:
 * const database = await NeonDatabase("custom-db", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "analytics_db",
 *   owner_name: "analytics_user"
 * });
 *
 * @example
 * // Adopt an existing database if it already exists:
 * const database = await NeonDatabase("existing-db", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "legacy_db",
 *   owner_name: "neondb_owner",
 *   adopt: true
 * });
 */
export const NeonDatabase = Resource(
  "neon::Database",
  async function (
    this: Context<NeonDatabase>,
    _id: string,
    props: NeonDatabaseProps,
  ): Promise<NeonDatabase> {
    const api = createNeonApi(props);
    const databaseId = this.output?.id;

    if (this.phase === "delete") {
      if (!databaseId) {
        return this.destroy();
      }

      try {
        const deleteResponse = await api.delete(
          `/projects/${props.project_id}/branches/${props.branch_id}/databases/${props.name}`,
        );

        if (deleteResponse.status === 404) {
          return this.destroy();
        }

        if (!deleteResponse.ok) {
          await handleApiError(
            deleteResponse,
            "delete",
            "database",
            props.name,
          );
        }
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 404) {
          return this.destroy();
        }
        throw error;
      }

      return this.destroy();
    }

    let response: NeonDatabaseApiResponse;

    try {
      if (this.phase === "update" && databaseId) {
        const updatePayload: UpdateDatabasePayload = {
          database: {
            name: props.name,
            owner_name: props.owner_name,
          },
        };

        const updateResponse = await api.patch(
          `/projects/${props.project_id}/branches/${props.branch_id}/databases/${props.name}`,
          updatePayload,
        );

        if (!updateResponse.ok) {
          await handleApiError(
            updateResponse,
            "update",
            "database",
            props.name,
          );
        }

        response = await updateResponse.json();
      } else {
        if (props.adopt) {
          const listResponse = await api.get(
            `/projects/${props.project_id}/branches/${props.branch_id}/databases`,
          );
          if (!listResponse.ok) {
            await handleApiError(listResponse, "list", "database");
          }

          const listData: ListDatabasesResponse = await listResponse.json();
          const existingDatabase = listData.databases?.find(
            (db: NeonDatabaseType) => db.name === props.name,
          );

          if (existingDatabase) {
            response = { database: existingDatabase };
          } else {
            response = await createNewDatabase(api, props);
          }
        } else {
          response = await createNewDatabase(api, props);
        }
      }

      return this({
        ...response.database,
        project_id: props.project_id,
        baseUrl: props.baseUrl,
      });
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new Error(
          `Branch ${props.branch_id} not found in project ${props.project_id}`,
        );
      }
      throw error;
    }
  },
);

async function createNewDatabase(
  api: NeonApi,
  props: NeonDatabaseProps,
): Promise<NeonDatabaseApiResponse> {
  const createPayload: CreateDatabasePayload = {
    database: {
      name: props.name,
      owner_name: props.owner_name,
    },
  };

  const createResponse = await api.post(
    `/projects/${props.project_id}/branches/${props.branch_id}/databases`,
    createPayload,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "database");
  }

  return await createResponse.json();
}
