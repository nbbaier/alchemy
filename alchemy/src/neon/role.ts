import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions, type NeonApi } from "./api.ts";

/**
 * Properties for creating or updating a Neon role
 */
export interface NeonRoleProps extends NeonApiOptions {
  /**
   * The ID of the project containing the branch
   */
  project_id: string;

  /**
   * The ID of the branch where the role will be created
   */
  branch_id: string;

  /**
   * Name of the role
   */
  name: string;

  /**
   * Whether to adopt an existing role if it already exists
   * @default false
   */
  adopt?: boolean;
}

/**
 * Response structure for role API operations
 */
export interface NeonRoleType {
  /**
   * The ID of the branch containing this role
   */
  branch_id: string;

  /**
   * Name of the role
   */
  name: string;

  /**
   * Password for the role (if available)
   */
  password?: Secret;

  /**
   * Whether this role is protected from deletion
   */
  protected: boolean;

  /**
   * Time at which the role was created
   */
  created_at: string;

  /**
   * Time at which the role was last updated
   */
  updated_at: string;
}

/**
 * A Neon database role with permissions
 */
export interface NeonRole
  extends Resource<"neon::Role">,
    Omit<NeonRoleProps, "apiKey"> {
  /**
   * The ID of the branch containing this role
   */
  branch_id: string;

  /**
   * Name of the role
   */
  name: string;

  /**
   * Password for the role (if available)
   */
  password?: Secret;

  /**
   * Whether this role is protected from deletion
   */
  protected: boolean;

  /**
   * Time at which the role was created
   */
  created_at: string;

  /**
   * Time at which the role was last updated
   */
  updated_at: string;
}

/**
 * Operation details for async role operations
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
 * API response structure for role operations
 */
interface NeonRoleApiResponse {
  role: NeonRoleType;
  operations?: NeonOperation[];
}

/**
 * Payload structure for creating a role
 */
interface CreateRolePayload {
  role: {
    name: string;
  };
}

/**
 * Creates a Neon database role with permissions.
 *
 * @example
 * // Create a basic role for application access:
 * const role = await NeonRole("app-user", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "app_user"
 * });
 *
 * @example
 * // Create a role for read-only access:
 * const role = await NeonRole("readonly-user", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "readonly_user"
 * });
 *
 * @example
 * // Adopt an existing role if it already exists:
 * const role = await NeonRole("existing-role", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   name: "legacy_user",
 *   adopt: true
 * });
 */
export const NeonRole = Resource(
  "neon::Role",
  async function (
    this: Context<NeonRole>,
    _id: string,
    props: NeonRoleProps,
  ): Promise<NeonRole> {
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
      } catch (error: unknown) {
        if ((error as { status?: number }).status === 404) {
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

      return this({
        ...response.role,
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

async function createNewRole(
  api: NeonApi,
  props: NeonRoleProps,
): Promise<NeonRoleApiResponse> {
  const createPayload: CreateRolePayload = {
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
