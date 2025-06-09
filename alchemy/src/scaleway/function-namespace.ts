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
 * Scaleway Function Namespace statuses
 */
export type ScalewayFunctionNamespaceStatus =
  | "ready"
  | "deleting"
  | "error"
  | "locked"
  | "creating";

/**
 * Properties for creating or updating a Scaleway Function Namespace
 */
export interface ScalewayFunctionNamespaceProps extends ScalewayApiOptions {
  /**
   * Function namespace name
   */
  name: string;

  /**
   * Region where the function namespace will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Description for the function namespace
   */
  description?: string;

  /**
   * Environment variables available to all functions in this namespace
   */
  environmentVariables?: Record<string, string>;

  /**
   * Secret environment variables available to all functions in this namespace
   */
  secretEnvironmentVariables?: Record<string, string>;
}

/**
 * API response structure for Scaleway Function Namespace
 */
interface ScalewayFunctionNamespaceApiResponse {
  id: string;
  name: string;
  environment_variables?: Record<string, string>;
  organization_id: string;
  project_id: string;
  status: string;
  registry_namespace_id?: string;
  registry_endpoint?: string;
  description?: string;
  domain_name: string;
  region: string;
  created_at: string;
  updated_at: string;
}

/**
 * A Scaleway Function Namespace
 */
export interface ScalewayFunctionNamespace
  extends Resource<"scaleway::FunctionNamespace"> {
  /**
   * Function namespace unique identifier
   */
  id: string;

  /**
   * Function namespace name
   */
  name: string;

  /**
   * Environment variables available to all functions in this namespace
   */
  environmentVariables?: Record<string, string>;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Current namespace status
   */
  status: ScalewayFunctionNamespaceStatus;

  /**
   * Registry namespace ID for container images
   */
  registryNamespaceId?: string;

  /**
   * Registry endpoint for container images
   */
  registryEndpoint?: string;

  /**
   * Description of the function namespace
   */
  description?: string;

  /**
   * Domain name for functions in this namespace
   */
  domainName: string;

  /**
   * Region where the namespace is located
   */
  region: ScalewayRegion;

  /**
   * Time at which the namespace was created
   */
  created_at: string;

  /**
   * Time at which the namespace was last updated
   */
  updated_at: string;
}

async function createNewFunctionNamespace(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayFunctionNamespaceProps,
  id: string,
): Promise<ScalewayFunctionNamespaceApiResponse> {
  const createData: any = {
    name: props.name,
    project_id: api.projectId,
  };

  if (props.description) createData.description = props.description;
  if (props.environmentVariables)
    createData.environment_variables = props.environmentVariables;
  if (props.secretEnvironmentVariables) {
    createData.secret_environment_variables = props.secretEnvironmentVariables;
  }

  const createResponse = await api.post(
    "/namespaces",
    createData,
    serviceBaseUrl,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "function namespace", id);
  }

  return await createResponse.json();
}

async function waitForFunctionNamespaceState(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  namespaceId: string,
  targetState: ScalewayFunctionNamespaceStatus,
  timeoutMs = 300000, // 5 minutes
): Promise<ScalewayFunctionNamespaceApiResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const getResponse = await api.get(
      `/namespaces/${namespaceId}`,
      serviceBaseUrl,
    );
    if (!getResponse.ok) {
      throw new Error(
        `Failed to check function namespace state: ${getResponse.status}`,
      );
    }

    const response: ScalewayFunctionNamespaceApiResponse =
      await getResponse.json();
    const currentState = response.status as ScalewayFunctionNamespaceStatus;

    if (currentState === targetState) {
      return response;
    }

    if (currentState === "error") {
      throw new Error(`Function namespace ${namespaceId} entered error state`);
    }

    // Wait 5 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }

  throw new Error(
    `Timeout waiting for function namespace ${namespaceId} to reach state ${targetState}`,
  );
}

/**
 * A Scaleway Function Namespace provides an organizational unit for managing
 * serverless functions within a specific region.
 *
 * Namespaces group related functions together and provide shared configuration
 * such as environment variables, secrets, and access control.
 *
 * @example
 * ## Basic Function Namespace
 *
 * Create a function namespace for a web application:
 *
 * ```ts
 * const functionNamespace = await ScalewayFunctionNamespace("app-functions", {
 *   name: "web-app-functions",
 *   region: "fr-par",
 *   description: "Serverless functions for web application",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Namespace with Environment Variables
 *
 * Create a namespace with shared environment variables:
 *
 * ```ts
 * const apiNamespace = await ScalewayFunctionNamespace("api-functions", {
 *   name: "api-functions",
 *   region: "fr-par",
 *   description: "API functions with shared configuration",
 *   environmentVariables: {
 *     "NODE_ENV": "production",
 *     "API_VERSION": "v1",
 *     "LOG_LEVEL": "info"
 *   },
 *   secretEnvironmentVariables: {
 *     "DATABASE_URL": alchemy.secret("postgres://..."),
 *     "JWT_SECRET": alchemy.secret("your-jwt-secret")
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Microservices Namespaces
 *
 * Create separate namespaces for different microservices:
 *
 * ```ts
 * const userServiceNamespace = await ScalewayFunctionNamespace("user-service", {
 *   name: "user-service-functions",
 *   region: "fr-par",
 *   description: "User management functions",
 *   environmentVariables: {
 *     "SERVICE_NAME": "user-service"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 *
 * const orderServiceNamespace = await ScalewayFunctionNamespace("order-service", {
 *   name: "order-service-functions",
 *   region: "fr-par",
 *   description: "Order processing functions",
 *   environmentVariables: {
 *     "SERVICE_NAME": "order-service"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayFunctionNamespace = Resource(
  "scaleway::FunctionNamespace",
  async function (
    this: Context<ScalewayFunctionNamespace>,
    id: string,
    props: ScalewayFunctionNamespaceProps,
  ): Promise<ScalewayFunctionNamespace> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/functions/v1beta1/regions/${region}`;

    const namespaceId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (namespaceId) {
          const deleteResponse = await api.delete(
            `/namespaces/${namespaceId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(
              deleteResponse,
              "delete",
              "function namespace",
              id,
            );
          }
        }
      } catch (error) {
        logger.error(
          `Error deleting Scaleway function namespace ${id}:`,
          error,
        );
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayFunctionNamespaceApiResponse;

    try {
      if (this.phase === "update" && namespaceId) {
        // Update existing function namespace
        const updateData: any = {};

        if (props.description !== undefined)
          updateData.description = props.description;
        if (props.environmentVariables !== undefined) {
          updateData.environment_variables = props.environmentVariables;
        }
        if (props.secretEnvironmentVariables !== undefined) {
          updateData.secret_environment_variables =
            props.secretEnvironmentVariables;
        }

        const updateResponse = await api.patch(
          `/namespaces/${namespaceId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(
            updateResponse,
            "update",
            "function namespace",
            id,
          );
        }

        // Wait for namespace to be ready after update
        response = await waitForFunctionNamespaceState(
          api,
          serviceBaseUrl,
          namespaceId,
          "ready",
        );
      } else {
        // Check if namespace already exists
        if (namespaceId) {
          const getResponse = await api.get(
            `/namespaces/${namespaceId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "function namespace", id);
            throw new Error("Failed to check if function namespace exists");
          } else {
            // Namespace doesn't exist, create new
            response = await createNewFunctionNamespace(
              api,
              serviceBaseUrl,
              props,
              id,
            );
            // Wait for namespace to be ready
            response = await waitForFunctionNamespaceState(
              api,
              serviceBaseUrl,
              response.id,
              "ready",
            );
          }
        } else {
          // Create new namespace
          response = await createNewFunctionNamespace(
            api,
            serviceBaseUrl,
            props,
            id,
          );
          // Wait for namespace to be ready
          response = await waitForFunctionNamespaceState(
            api,
            serviceBaseUrl,
            response.id,
            "ready",
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway function namespace ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::FunctionNamespace",
      id: response.id,
      name: response.name,
      environmentVariables: response.environment_variables,
      organizationId: response.organization_id,
      projectId: response.project_id,
      status: response.status as ScalewayFunctionNamespaceStatus,
      registryNamespaceId: response.registry_namespace_id,
      registryEndpoint: response.registry_endpoint,
      description: response.description,
      domainName: response.domain_name,
      region: response.region as ScalewayRegion,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },
);
