import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions } from "./api.ts";

export interface NeonBranchProps extends NeonApiOptions {
  project_id: string;
  name?: string;
  parent_id?: string;
  parent_lsn?: string;
  parent_timestamp?: string;
  adopt?: boolean;
}

export interface NeonBranchType {
  id: string;
  project_id: string;
  parent_id?: string;
  parent_lsn?: string;
  parent_timestamp?: string;
  name: string;
  current_state: "init" | "ready";
  pending_state?: "init" | "ready";
  logical_size?: number;
  physical_size?: number;
  created_at: string;
  updated_at: string;
  primary: boolean;
  default: boolean;
  protected: boolean;
  cpu_used_sec?: number;
  compute_time_seconds?: number;
  active_time_seconds?: number;
  written_data_bytes?: number;
  data_transfer_bytes?: number;
}

interface NeonBranchApiResponse {
  branch: NeonBranchType;
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

export const NeonBranch = Resource(
  "neon:branch",
  async function (
    this: Context<any, any>,
    _id: string,
    props: NeonBranchProps,
  ) {
    const api = createNeonApi(props);
    const branchId = this.output?.id;

    if (this.phase === "delete") {
      if (!branchId) {
        return this.destroy();
      }

      try {
        const deleteResponse = await api.delete(
          `/projects/${props.project_id}/branches/${branchId}`,
        );

        if (deleteResponse.status === 404) {
          return this.destroy();
        }

        if (!deleteResponse.ok) {
          await handleApiError(deleteResponse, "delete", "branch", branchId);
        }

        const deleteData: NeonBranchApiResponse = await deleteResponse.json();
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

    let response: NeonBranchApiResponse;

    try {
      if (this.phase === "update" && branchId) {
        const updatePayload: any = {};
        if (props.name !== undefined) {
          updatePayload.branch = { name: props.name };
        }

        if (Object.keys(updatePayload).length > 0) {
          const updateResponse = await api.patch(
            `/projects/${props.project_id}/branches/${branchId}`,
            updatePayload,
          );

          if (!updateResponse.ok) {
            await handleApiError(updateResponse, "update", "branch", branchId);
          }

          response = await updateResponse.json();
        } else {
          const getResponse = await api.get(
            `/projects/${props.project_id}/branches/${branchId}`,
          );
          if (!getResponse.ok) {
            await handleApiError(getResponse, "get", "branch", branchId);
          }
          response = await getResponse.json();
        }
      } else {
        if (props.adopt) {
          const listResponse = await api.get(
            `/projects/${props.project_id}/branches`,
          );
          if (!listResponse.ok) {
            await handleApiError(listResponse, "list", "branch");
          }

          const listData: any = await listResponse.json();
          const existingBranch = listData.branches?.find(
            (br: any) => br.name === props.name,
          );

          if (existingBranch) {
            response = { branch: existingBranch };
          } else {
            response = await createNewBranch(api, props);
          }
        } else {
          response = await createNewBranch(api, props);
        }
      }

      if (response.operations && response.operations.length > 0) {
        await waitForOperations(api, response.operations);
      }

      if (response.branch?.id) {
        const getResponse = await api.get(
          `/projects/${props.project_id}/branches/${response.branch.id}`,
        );
        if (!getResponse.ok) {
          await handleApiError(
            getResponse,
            "get",
            "branch",
            response.branch.id,
          );
        }
        response = await getResponse.json();
      }

      return this(response.branch);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Project ${props.project_id} not found`);
      }
      throw error;
    }
  },
);

async function createNewBranch(
  api: any,
  props: NeonBranchProps,
): Promise<NeonBranchApiResponse> {
  const createPayload: any = {
    branch: {},
  };

  if (props.name !== undefined) {
    createPayload.branch.name = props.name;
  }
  if (props.parent_id !== undefined) {
    createPayload.branch.parent_id = props.parent_id;
  }
  if (props.parent_lsn !== undefined) {
    createPayload.branch.parent_lsn = props.parent_lsn;
  }
  if (props.parent_timestamp !== undefined) {
    createPayload.branch.parent_timestamp = props.parent_timestamp;
  }

  const createResponse = await api.post(
    `/projects/${props.project_id}/branches`,
    createPayload,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "branch");
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
