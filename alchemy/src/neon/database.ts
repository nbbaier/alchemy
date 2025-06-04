import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions } from "./api.ts";

export interface NeonDatabaseProps extends NeonApiOptions {
  project_id: string;
  branch_id: string;
  name: string;
  owner_name: string;
  adopt?: boolean;
}

export interface NeonDatabaseType {
  id: number;
  branch_id: string;
  name: string;
  owner_name: string;
  created_at: string;
  updated_at: string;
}

interface NeonDatabaseApiResponse {
  database: NeonDatabaseType;
}

export const NeonDatabase = Resource(
  "neon:database",
  async function (
    this: Context<any, any>,
    _id: string,
    props: NeonDatabaseProps,
  ) {
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
      } catch (error: any) {
        if (error.status === 404) {
          return this.destroy();
        }
        throw error;
      }

      return this.destroy();
    }

    let response: NeonDatabaseApiResponse;

    try {
      if (this.phase === "update" && databaseId) {
        const updatePayload: any = {
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

          const listData: any = await listResponse.json();
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

      return this(response.database);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(
          `Branch ${props.branch_id} not found in project ${props.project_id}`,
        );
      }
      throw error;
    }
  },
);

async function createNewDatabase(
  api: any,
  props: NeonDatabaseProps,
): Promise<NeonDatabaseApiResponse> {
  const createPayload = {
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
