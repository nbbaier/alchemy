import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions, type NeonApi } from "./api.ts";

/**
 * Properties for creating or updating a Neon endpoint
 */
export interface NeonEndpointProps extends NeonApiOptions {
  /**
   * The ID of the project containing the branch
   */
  project_id: string;

  /**
   * The ID of the branch where the endpoint will be created
   */
  branch_id: string;

  /**
   * Type of endpoint (read-write or read-only)
   */
  type: "read_write" | "read_only";

  /**
   * Compute provisioner for the endpoint
   */
  compute_provisioner?: "k8s-pod" | "k8s-neonvm";

  /**
   * PostgreSQL settings for the endpoint
   */
  settings?: {
    pg_settings?: Record<string, string>;
  };

  /**
   * Whether connection pooling is enabled
   * @default false
   */
  pooler_enabled?: boolean;

  /**
   * Connection pooling mode
   * @default "transaction"
   */
  pooler_mode?: "session" | "transaction";

  /**
   * Whether the endpoint is disabled
   * @default false
   */
  disabled?: boolean;

  /**
   * Whether passwordless access is enabled
   * @default false
   */
  passwordless_access?: boolean;

  /**
   * Suspend timeout in seconds
   */
  suspend_timeout_seconds?: number;

  /**
   * Provisioner for the endpoint
   */
  provisioner?: "k8s-pod" | "k8s-neonvm";

  /**
   * Region ID for the endpoint
   */
  region_id?: string;

  /**
   * Whether to adopt an existing endpoint if it already exists
   * @default false
   */
  adopt?: boolean;
}

/**
 * Response structure for endpoint API operations
 */
export interface NeonEndpointType {
  /**
   * Hostname for connecting to the endpoint
   */
  host: string;

  /**
   * The endpoint ID
   */
  id: string;

  /**
   * The ID of the project containing this endpoint
   */
  project_id: string;

  /**
   * The ID of the branch containing this endpoint
   */
  branch_id: string;

  /**
   * Minimum autoscaling compute units
   */
  autoscaling_limit_min_cu: number;

  /**
   * Maximum autoscaling compute units
   */
  autoscaling_limit_max_cu: number;

  /**
   * Region ID where the endpoint is located
   */
  region_id: string;

  /**
   * Type of endpoint (read-write or read-only)
   */
  type: "read_write" | "read_only";

  /**
   * Current state of the endpoint
   */
  current_state: "init" | "active" | "idle";

  /**
   * Pending state of the endpoint during operations
   */
  pending_state?: "init" | "active" | "idle";

  /**
   * PostgreSQL settings for the endpoint
   */
  settings: {
    pg_settings?: Record<string, string>;
  };

  /**
   * Whether connection pooling is enabled
   */
  pooler_enabled: boolean;

  /**
   * Connection pooling mode
   */
  pooler_mode: "session" | "transaction";

  /**
   * Whether the endpoint is disabled
   */
  disabled: boolean;

  /**
   * Whether passwordless access is enabled
   */
  passwordless_access: boolean;

  /**
   * Last active timestamp
   */
  last_active?: string;

  /**
   * Source of endpoint creation
   */
  creation_source: string;

  /**
   * Time at which the endpoint was created
   */
  created_at: string;

  /**
   * Time at which the endpoint was last updated
   */
  updated_at: string;

  /**
   * Proxy hostname for the endpoint
   */
  proxy_host: string;

  /**
   * Suspend timeout in seconds
   */
  suspend_timeout_seconds?: number;

  /**
   * Provisioner for the endpoint
   */
  provisioner: "k8s-pod" | "k8s-neonvm";
}

/**
 * A Neon connection endpoint for database access
 */
export interface NeonEndpoint
  extends Resource<"neon::Endpoint">,
    Omit<NeonEndpointProps, "apiKey"> {
  /**
   * Hostname for connecting to the endpoint
   */
  host: string;

  /**
   * The endpoint ID
   */
  id: string;

  /**
   * The ID of the project containing this endpoint
   */
  project_id: string;

  /**
   * The ID of the branch containing this endpoint
   */
  branch_id: string;

  /**
   * Minimum autoscaling compute units
   */
  autoscaling_limit_min_cu: number;

  /**
   * Maximum autoscaling compute units
   */
  autoscaling_limit_max_cu: number;

  /**
   * Region ID where the endpoint is located
   */
  region_id: string;

  /**
   * Type of endpoint (read-write or read-only)
   */
  type: "read_write" | "read_only";

  /**
   * Current state of the endpoint
   */
  current_state: "init" | "active" | "idle";

  /**
   * Pending state of the endpoint during operations
   */
  pending_state?: "init" | "active" | "idle";

  /**
   * PostgreSQL settings for the endpoint
   */
  settings: {
    pg_settings?: Record<string, string>;
  };

  /**
   * Whether connection pooling is enabled
   */
  pooler_enabled: boolean;

  /**
   * Connection pooling mode
   */
  pooler_mode: "session" | "transaction";

  /**
   * Whether the endpoint is disabled
   */
  disabled: boolean;

  /**
   * Whether passwordless access is enabled
   */
  passwordless_access: boolean;

  /**
   * Last active timestamp
   */
  last_active?: string;

  /**
   * Source of endpoint creation
   */
  creation_source: string;

  /**
   * Time at which the endpoint was created
   */
  created_at: string;

  /**
   * Time at which the endpoint was last updated
   */
  updated_at: string;

  /**
   * Proxy hostname for the endpoint
   */
  proxy_host: string;

  /**
   * Suspend timeout in seconds
   */
  suspend_timeout_seconds?: number;

  /**
   * Provisioner for the endpoint
   */
  provisioner: "k8s-pod" | "k8s-neonvm";
}

/**
 * Operation details for async endpoint operations
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
 * API response structure for endpoint operations
 */
interface NeonEndpointApiResponse {
  endpoint: NeonEndpointType;
  operations?: NeonOperation[];
}

/**
 * Payload structure for creating an endpoint
 */
interface CreateEndpointPayload {
  endpoint: {
    branch_id: string;
    type: "read_write" | "read_only";
    compute_provisioner?: "k8s-pod" | "k8s-neonvm";
    settings?: {
      pg_settings?: Record<string, string>;
    };
    pooler_enabled?: boolean;
    pooler_mode?: "session" | "transaction";
    disabled?: boolean;
    passwordless_access?: boolean;
    suspend_timeout_seconds?: number;
    provisioner?: "k8s-pod" | "k8s-neonvm";
    region_id?: string;
  };
}

/**
 * Payload structure for updating an endpoint
 */
interface UpdateEndpointPayload {
  endpoint: {
    branch_id?: string;
    settings?: {
      pg_settings?: Record<string, string>;
    };
    pooler_enabled?: boolean;
    pooler_mode?: "session" | "transaction";
    disabled?: boolean;
    passwordless_access?: boolean;
    suspend_timeout_seconds?: number;
  };
}

/**
 * API response structure for listing endpoints
 */
interface ListEndpointsResponse {
  endpoints?: NeonEndpointType[];
}

/**
 * Creates a Neon connection endpoint for database access.
 *
 * @example
 * // Create a basic read-write endpoint:
 * const endpoint = await NeonEndpoint("main-endpoint", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   type: "read_write"
 * });
 *
 * @example
 * // Create a read-only endpoint with connection pooling:
 * const endpoint = await NeonEndpoint("readonly-endpoint", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   type: "read_only",
 *   pooler_enabled: true,
 *   pooler_mode: "transaction"
 * });
 *
 * @example
 * // Create an endpoint with custom PostgreSQL settings:
 * const endpoint = await NeonEndpoint("custom-endpoint", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   type: "read_write",
 *   settings: {
 *     pg_settings: {
 *       "shared_preload_libraries": "pg_stat_statements",
 *       "log_statement": "all"
 *     }
 *   }
 * });
 *
 * @example
 * // Adopt an existing endpoint if it already exists:
 * const endpoint = await NeonEndpoint("existing-endpoint", {
 *   project_id: "proj_123",
 *   branch_id: "br_456",
 *   type: "read_write",
 *   adopt: true
 * });
 */
export const NeonEndpoint = Resource(
  "neon::Endpoint",
  async function (
    this: Context<NeonEndpoint>,
    _id: string,
    props: NeonEndpointProps,
  ): Promise<NeonEndpoint> {
    const api = createNeonApi(props);
    const endpointId = this.output?.id;

    if (this.phase === "delete") {
      if (!endpointId) {
        return this.destroy();
      }

      try {
        const deleteResponse = await api.delete(
          `/projects/${props.project_id}/endpoints/${endpointId}`,
        );

        if (deleteResponse.status === 404) {
          return this.destroy();
        }

        if (!deleteResponse.ok) {
          await handleApiError(
            deleteResponse,
            "delete",
            "endpoint",
            endpointId,
          );
        }

        const deleteData: NeonEndpointApiResponse = await deleteResponse.json();
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

    let response: NeonEndpointApiResponse;

    try {
      if (this.phase === "update" && endpointId) {
        const updatePayload: UpdateEndpointPayload = {
          endpoint: {},
        };

        if (props.branch_id !== undefined) {
          updatePayload.endpoint.branch_id = props.branch_id;
        }
        if (props.settings !== undefined) {
          updatePayload.endpoint.settings = props.settings;
        }
        if (props.pooler_enabled !== undefined) {
          updatePayload.endpoint.pooler_enabled = props.pooler_enabled;
        }
        if (props.pooler_mode !== undefined) {
          updatePayload.endpoint.pooler_mode = props.pooler_mode;
        }
        if (props.disabled !== undefined) {
          updatePayload.endpoint.disabled = props.disabled;
        }
        if (props.passwordless_access !== undefined) {
          updatePayload.endpoint.passwordless_access =
            props.passwordless_access;
        }
        if (props.suspend_timeout_seconds !== undefined) {
          updatePayload.endpoint.suspend_timeout_seconds =
            props.suspend_timeout_seconds;
        }

        if (Object.keys(updatePayload.endpoint).length > 0) {
          const updateResponse = await api.patch(
            `/projects/${props.project_id}/endpoints/${endpointId}`,
            updatePayload,
          );

          if (!updateResponse.ok) {
            await handleApiError(
              updateResponse,
              "update",
              "endpoint",
              endpointId,
            );
          }

          response = await updateResponse.json();
        } else {
          const getResponse = await api.get(
            `/projects/${props.project_id}/endpoints/${endpointId}`,
          );
          if (!getResponse.ok) {
            await handleApiError(getResponse, "get", "endpoint", endpointId);
          }
          response = await getResponse.json();
        }
      } else {
        if (props.adopt) {
          const listResponse = await api.get(
            `/projects/${props.project_id}/endpoints`,
          );
          if (!listResponse.ok) {
            await handleApiError(listResponse, "list", "endpoint");
          }

          const listData: ListEndpointsResponse = await listResponse.json();
          const existingEndpoint = listData.endpoints?.find(
            (ep: NeonEndpointType) =>
              ep.branch_id === props.branch_id && ep.type === props.type,
          );

          if (existingEndpoint) {
            response = { endpoint: existingEndpoint };
          } else {
            response = await createNewEndpoint(api, props);
          }
        } else {
          response = await createNewEndpoint(api, props);
        }
      }

      if (response.operations && response.operations.length > 0) {
        await waitForOperations(api, response.operations);
      }

      if (response.endpoint?.id) {
        const getResponse = await api.get(
          `/projects/${props.project_id}/endpoints/${response.endpoint.id}`,
        );
        if (!getResponse.ok) {
          await handleApiError(
            getResponse,
            "get",
            "endpoint",
            response.endpoint.id,
          );
        }
        response = await getResponse.json();
      }

      return this({
        ...response.endpoint,
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

async function createNewEndpoint(
  api: NeonApi,
  props: NeonEndpointProps,
): Promise<NeonEndpointApiResponse> {
  const createPayload: CreateEndpointPayload = {
    endpoint: {
      branch_id: props.branch_id,
      type: props.type,
    },
  };

  if (props.compute_provisioner !== undefined) {
    createPayload.endpoint.compute_provisioner = props.compute_provisioner;
  }
  if (props.settings !== undefined) {
    createPayload.endpoint.settings = props.settings;
  }
  if (props.pooler_enabled !== undefined) {
    createPayload.endpoint.pooler_enabled = props.pooler_enabled;
  }
  if (props.pooler_mode !== undefined) {
    createPayload.endpoint.pooler_mode = props.pooler_mode;
  }
  if (props.disabled !== undefined) {
    createPayload.endpoint.disabled = props.disabled;
  }
  if (props.passwordless_access !== undefined) {
    createPayload.endpoint.passwordless_access = props.passwordless_access;
  }
  if (props.suspend_timeout_seconds !== undefined) {
    createPayload.endpoint.suspend_timeout_seconds =
      props.suspend_timeout_seconds;
  }
  if (props.provisioner !== undefined) {
    createPayload.endpoint.provisioner = props.provisioner;
  }
  if (props.region_id !== undefined) {
    createPayload.endpoint.region_id = props.region_id;
  }

  const createResponse = await api.post(
    `/projects/${props.project_id}/endpoints`,
    createPayload,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "endpoint");
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
