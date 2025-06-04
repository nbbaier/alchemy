import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { handleApiError } from "./api-error.ts";
import { createNeonApi, type NeonApiOptions } from "./api.ts";

export interface NeonEndpointProps extends NeonApiOptions {
  project_id: string;
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
  adopt?: boolean;
}

export interface NeonEndpointType {
  host: string;
  id: string;
  project_id: string;
  branch_id: string;
  autoscaling_limit_min_cu: number;
  autoscaling_limit_max_cu: number;
  region_id: string;
  type: "read_write" | "read_only";
  current_state: "init" | "active" | "idle";
  pending_state?: "init" | "active" | "idle";
  settings: {
    pg_settings?: Record<string, string>;
  };
  pooler_enabled: boolean;
  pooler_mode: "session" | "transaction";
  disabled: boolean;
  passwordless_access: boolean;
  last_active?: string;
  creation_source: string;
  created_at: string;
  updated_at: string;
  proxy_host: string;
  suspend_timeout_seconds?: number;
  provisioner: "k8s-pod" | "k8s-neonvm";
}

interface NeonEndpointApiResponse {
  endpoint: NeonEndpointType;
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

export const NeonEndpoint = Resource(
  "neon:endpoint",
  async function (
    this: Context<any, any>,
    _id: string,
    props: NeonEndpointProps,
  ) {
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
      } catch (error: any) {
        if (error.status === 404) {
          return this.destroy();
        }
        throw error;
      }

      return this.destroy();
    }

    let response: NeonEndpointApiResponse;

    try {
      if (this.phase === "update" && endpointId) {
        const updatePayload: any = {
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

          const listData: any = await listResponse.json();
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

      return this(response.endpoint);
    } catch (error: any) {
      if (error.status === 404) {
        throw new Error(`Project ${props.project_id} not found`);
      }
      throw error;
    }
  },
);

async function createNewEndpoint(
  api: any,
  props: NeonEndpointProps,
): Promise<NeonEndpointApiResponse> {
  const createPayload: any = {
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
