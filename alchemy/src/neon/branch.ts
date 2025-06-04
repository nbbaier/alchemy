import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions, type NeonApi } from "./api.ts";

/**
 * Properties for creating or updating a Neon branch
 */
export interface NeonBranchProps extends NeonApiOptions {
  /**
   * The ID of the project where the branch will be created
   */
  project_id: string;

  /**
   * Name of the branch
   */
  name?: string;

  /**
   * ID of the parent branch to create this branch from
   */
  parent_id?: string;

  /**
   * Log Sequence Number (LSN) of the parent branch to branch from
   */
  parent_lsn?: string;

  /**
   * Timestamp of the parent branch to branch from
   */
  parent_timestamp?: string;

  /**
   * Whether to adopt an existing branch if it already exists
   * @default false
   */
  adopt?: boolean;
}

/**
 * Response structure for branch API operations
 */
export interface NeonBranchType {
  /**
   * The branch ID
   */
  id: string;

  /**
   * The ID of the project containing this branch
   */
  project_id: string;

  /**
   * ID of the parent branch
   */
  parent_id?: string;

  /**
   * Log Sequence Number (LSN) of the parent branch
   */
  parent_lsn?: string;

  /**
   * Timestamp of the parent branch
   */
  parent_timestamp?: string;

  /**
   * Name of the branch
   */
  name: string;

  /**
   * Current state of the branch
   */
  current_state: "init" | "ready";

  /**
   * Pending state of the branch during operations
   */
  pending_state?: "init" | "ready";

  /**
   * Logical size of the branch in bytes
   */
  logical_size?: number;

  /**
   * Physical size of the branch in bytes
   */
  physical_size?: number;

  /**
   * Time at which the branch was created
   */
  created_at: string;

  /**
   * Time at which the branch was last updated
   */
  updated_at: string;

  /**
   * Whether this is the primary branch
   */
  primary: boolean;

  /**
   * Whether this is the default branch
   */
  default: boolean;

  /**
   * Whether this branch is protected from deletion
   */
  protected: boolean;

  /**
   * CPU usage in seconds
   */
  cpu_used_sec?: number;

  /**
   * Compute time in seconds
   */
  compute_time_seconds?: number;

  /**
   * Active time in seconds
   */
  active_time_seconds?: number;

  /**
   * Written data in bytes
   */
  written_data_bytes?: number;

  /**
   * Data transfer in bytes
   */
  data_transfer_bytes?: number;
}

/**
 * A Neon branch for copy-on-write database clones
 */
export interface NeonBranch
  extends Resource<"neon::Branch">,
    Omit<NeonBranchProps, "apiKey"> {
  /**
   * The branch ID
   */
  id: string;

  /**
   * The ID of the project containing this branch
   */
  project_id: string;

  /**
   * ID of the parent branch
   */
  parent_id?: string;

  /**
   * Log Sequence Number (LSN) of the parent branch
   */
  parent_lsn?: string;

  /**
   * Timestamp of the parent branch
   */
  parent_timestamp?: string;

  /**
   * Name of the branch
   */
  name: string;

  /**
   * Current state of the branch
   */
  current_state: "init" | "ready";

  /**
   * Pending state of the branch during operations
   */
  pending_state?: "init" | "ready";

  /**
   * Logical size of the branch in bytes
   */
  logical_size?: number;

  /**
   * Physical size of the branch in bytes
   */
  physical_size?: number;

  /**
   * Time at which the branch was created
   */
  created_at: string;

  /**
   * Time at which the branch was last updated
   */
  updated_at: string;

  /**
   * Whether this is the primary branch
   */
  primary: boolean;

  /**
   * Whether this is the default branch
   */
  default: boolean;

  /**
   * Whether this branch is protected from deletion
   */
  protected: boolean;

  /**
   * CPU usage in seconds
   */
  cpu_used_sec?: number;

  /**
   * Compute time in seconds
   */
  compute_time_seconds?: number;

  /**
   * Active time in seconds
   */
  active_time_seconds?: number;

  /**
   * Written data in bytes
   */
  written_data_bytes?: number;

  /**
   * Data transfer in bytes
   */
  data_transfer_bytes?: number;
}

/**
 * Operation details for async branch operations
 */
interface NeonOperation {
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
}

/**
 * API response structure for branch operations
 */
interface NeonBranchApiResponse {
  branch: NeonBranchType;
  operations?: NeonOperation[];
}

/**
 * Payload structure for creating a branch
 */
interface CreateBranchPayload {
  branch: {
    name?: string;
    parent_id?: string;
    parent_lsn?: string;
    parent_timestamp?: string;
  };
}

/**
 * Payload structure for updating a branch
 */
interface UpdateBranchPayload {
  branch: {
    name?: string;
  };
}

/**
 * API response structure for listing branches
 */
interface ListBranchesResponse {
  branches?: NeonBranchType[];
}

/**
 * Creates a Neon branch for copy-on-write database clones.
 *
 * @example
 * // Create a basic branch from the main branch:
 * const branch = await NeonBranch("feature-branch", {
 *   project_id: "proj_123",
 *   name: "feature/new-feature"
 * });
 *
 * @example
 * // Create a branch from a specific parent branch:
 * const branch = await NeonBranch("dev-branch", {
 *   project_id: "proj_123",
 *   name: "development",
 *   parent_id: "br_main_456"
 * });
 *
 * @example
 * // Create a branch from a specific point in time:
 * const branch = await NeonBranch("restore-branch", {
 *   project_id: "proj_123",
 *   name: "restore-point",
 *   parent_timestamp: "2023-12-01T10:00:00Z"
 * });
 *
 * @example
 * // Adopt an existing branch if it already exists:
 * const branch = await NeonBranch("existing-branch", {
 *   project_id: "proj_123",
 *   name: "staging",
 *   adopt: true
 * });
 */
export const NeonBranch = Resource(
  "neon::Branch",
  async function (
    this: Context<NeonBranch>,
    _id: string,
    props: NeonBranchProps,
  ): Promise<NeonBranch> {
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
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 404) {
          return this.destroy();
        }
        throw error;
      }

      return this.destroy();
    }

    let response: NeonBranchApiResponse;

    try {
      if (this.phase === "update" && branchId) {
        const updatePayload: UpdateBranchPayload = { branch: {} };
        if (props.name !== undefined) {
          updatePayload.branch.name = props.name;
        }

        if (Object.keys(updatePayload.branch).length > 0) {
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

          const listData: ListBranchesResponse = await listResponse.json();
          const existingBranch = listData.branches?.find(
            (br: NeonBranchType) => br.name === props.name,
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

      return this({
        ...response.branch,
        baseUrl: props.baseUrl,
      });
    } catch (error: unknown) {
      if ((error as { status?: number }).status === 404) {
        throw new Error(`Project ${props.project_id} not found`);
      }
      throw error;
    }
  },
);

async function createNewBranch(
  api: NeonApi,
  props: NeonBranchProps,
): Promise<NeonBranchApiResponse> {
  const createPayload: CreateBranchPayload = {
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
  api: NeonApi,
  operations: NeonOperation[],
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

      const opData: { operation: NeonOperation } = await opResponse.json();
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
