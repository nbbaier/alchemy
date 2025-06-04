import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions } from "./api.ts";

export interface NeonRoleProps extends NeonApiOptions {
  project_id: string;
  branch_id: string;
  name: string;
  adopt?: boolean;
}

export interface NeonRoleType {
  branch_id: string;
  name: string;
  password?: Secret;
  protected: boolean;
  created_at: string;
  updated_at: string;
}

interface NeonRoleApiResponse {
  role: NeonRoleType;
  operations?: Array<{
    id: string;
    project_id: string;
    branch_id?: string;
    endpoint_id?: string;
    action: string;
    status: "running" | "finished" | "failed" | "scheduling";
    error?: string;
    failures_count: number;
    created_at: string;
    updated_at: string;
  }>;
}

export const NeonRole = Resource(
  "neon:role",
  async function (this: Context<any, any>, _id: string, props: NeonRoleProps) {
    const api = createNeonApi(props);
    const roleName = this.output?.name;

    if (this.phase === "delete") {
      if (!roleName) {
        return this.destroy();
      }

      try {
        const deleteResponse = await api.delete(
          `/projects/${props.project_id}/branches/${props.branch_id}/roles/${props.name}`,
        );

        if (deleteResponse.status === 404) {
          return this.destroy();
        }

        if (!deleteResponse.ok) {
          await handleApiError(deleteResponse, "delete", "role", props.name);
        }

        const deleteData: NeonRoleApiResponse = await deleteResponse.json();
        if (deleteData.operations && deleteData.operations.length > 0) {
          await waitForOperations(api, deleteData.operations);
        }
      } catch (error: any) {
        if (error.status === 404) {
          return this.destroy();
        }
        throw error;
      }

      return this.destroy();
    }

    let response: NeonRoleApiResponse;

    try {
      if (this.phase === "update" && roleName) {
        const getResponse = await api.get(
          `/projects/${props.project_id}/branches/${props.branch_id}/roles/${props.name}`,
        );
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "role", props.name);
        }
        response = await getResponse.json();
      } else {
        if (props.adopt) {
          const getResponse = await api.get(
            `/projects/${props.project_id}/branches/${props.branch_id}/roles/${props.name}`,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status === 404) {
            response = await createNewRole(api, props);
          } else {
            await handleApiError(getResponse, "get", "role", props.name);
            throw new Error("Unreachable");
          }
        } else {
          response = await createNewRole(api, props);
        }
      }

      if (response.operations && response.operations.length > 0) {
        await waitForOperations(api, response.operations);
      }

      return this(response.role);
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

async function createNewRole(
  api: any,
  props: NeonRoleProps,
): Promise<NeonRoleApiResponse> {
  const createPayload = {
    role: {
      name: props.name,
    },
  };

  const createResponse = await api.post(
    `/projects/${props.project_id}/branches/${props.branch_id}/roles`,
    createPayload,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "role");
  }

  return await createResponse.json();
}

async function waitForOperations(
  api: any,
  operations: Array<{
    id: string;
    project_id: string;
    status: string;
    action: string;
  }>,
): Promise<void> {
  const maxWaitTime = 300000;
  const pollInterval = 2000;

  for (const operation of operations) {
    let totalWaitTime = 0;

    while (totalWaitTime < maxWaitTime) {
      const opResponse = await api.get(
        `/projects/${operation.project_id}/operations/${operation.id}`,
      );

      if (!opResponse.ok) {
        await handleApiError(opResponse, "get", "operation", operation.id);
      }

      const opData = await opResponse.json();
      const currentOp = opData.operation;

      if (currentOp.status === "finished") {
        break;
      }

      if (currentOp.status === "failed") {
        throw new Error(
          `Operation ${operation.id} (${operation.action}) failed: ${currentOp.error || "Unknown error"}`,
        );
      }

      await new Promise((resolve) => setTimeout(resolve, pollInterval));
      totalWaitTime += pollInterval;
    }

    if (totalWaitTime >= maxWaitTime) {
      throw new Error(
        `Timeout waiting for operation ${operation.id} (${operation.action}) to complete`,
      );
    }
  }

  return;
}
