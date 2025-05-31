import type { Context } from "../context.js";
import { Resource } from "../resource.js";
import { type CloudflareApiOptions, createCloudflareApi } from "./api.js";

/**
 * Properties for creating or updating a Dispatch Namespace
 */
export interface DispatchNamespaceProps extends CloudflareApiOptions {
  /**
   * Name of the dispatch namespace
   * @default id
   */
  namespace?: string;

  /**
   * Whether to adopt an existing namespace with the same name if it exists
   * If true and a namespace with the same name exists, it will be adopted rather than creating a new one
   *
   * @default false
   */
  adopt?: boolean;
}

/**
 * Output returned after DispatchNamespace creation/update
 */
export interface DispatchNamespace
  extends Resource<"cloudflare::DispatchNamespace">,
    DispatchNamespaceProps {
  /**
   * Resource type identifier
   */
  type: "dispatch_namespace";

  /**
   * The ID of the dispatch namespace
   */
  id: string;

  /**
   * The name of the dispatch namespace
   */
  namespace: string;

  /**
   * Time at which the namespace was created
   */
  createdAt: number;

  /**
   * Time at which the namespace was last updated
   */
  updatedAt: number;
}

/**
 * A Cloudflare Workers for Platforms Dispatch Namespace enables deploying user workers
 * that can be dynamically invoked through a dispatcher worker.
 *
 * @example
 * // Create a basic dispatch namespace for user workers:
 * const userNamespace = await DispatchNamespace("user-workers", {
 *   namespace: "user-workers"
 * });
 *
 * @example
 * // Create a dispatcher worker that can route to user workers:
 * const dispatcher = await Worker("dispatcher", {
 *   entrypoint: "./src/dispatcher.ts",
 *   bindings: {
 *     NAMESPACE: userNamespace
 *   }
 * });
 *
 * @example
 * // Deploy a user worker to the dispatch namespace:
 * const userWorker = await Worker("user-worker", {
 *   entrypoint: "./src/user-worker.ts",
 *   dispatchNamespace: userNamespace
 * });
 *
 * @see https://developers.cloudflare.com/cloudflare-for-platforms/workers-for-platforms/get-started/user-workers/
 */
export const DispatchNamespace = Resource(
  "cloudflare::DispatchNamespace",
  async function (
    this: Context<DispatchNamespace>,
    id: string,
    props: DispatchNamespaceProps = {},
  ): Promise<DispatchNamespace> {
    const api = await createCloudflareApi(props);
    const namespaceName = props.namespace ?? id;

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          const deleteResponse = await api.delete(
            `/accounts/${api.accountId}/workers/dispatch/namespaces/${this.output.namespace}`,
          );

          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            console.error(
              "Error deleting dispatch namespace:",
              deleteResponse.statusText,
            );
          }
        }
      } catch (error) {
        console.error("Error deleting dispatch namespace:", error);
      }

      return this.destroy();
    } else {
      try {
        let response;
        let namespaceData;

        if (this.phase === "update" && this.output?.namespace) {
          response = await api.get(
            `/accounts/${api.accountId}/workers/dispatch/namespaces/${this.output.namespace}`,
          );

          if (!response.ok) {
            throw new Error(
              `Failed to get dispatch namespace: ${response.statusText}`,
            );
          }

          const responseData = (await response.json()) as any;
          namespaceData = responseData.result || responseData;
        } else {
          if (props.adopt) {
            try {
              const existingResponse = await api.get(
                `/accounts/${api.accountId}/workers/dispatch/namespaces/${namespaceName}`,
              );

              if (existingResponse.ok) {
                const responseData = (await existingResponse.json()) as any;
                namespaceData = responseData.result || responseData;
              }
            } catch (_error) {}
          }

          if (!namespaceData) {
            response = await api.post(
              `/accounts/${api.accountId}/workers/dispatch/namespaces`,
              {
                name: namespaceName,
              },
            );

            if (!response.ok) {
              throw new Error(
                `Failed to create dispatch namespace: ${response.statusText}`,
              );
            }

            const responseData = (await response.json()) as any;
            namespaceData = responseData.result || responseData;
          }
        }

        return this({
          id: namespaceData.name || namespaceName,
          namespace: namespaceData.name || namespaceName,
          createdAt: namespaceData.created_on
            ? new Date(namespaceData.created_on).getTime()
            : Date.now(),
          updatedAt: namespaceData.modified_on
            ? new Date(namespaceData.modified_on).getTime()
            : Date.now(),
          type: "dispatch_namespace",
          ...props,
        });
      } catch (error) {
        console.error("Error creating/updating dispatch namespace:", error);
        throw error;
      }
    }
  },
);

export function isDispatchNamespace(
  resource: any,
): resource is DispatchNamespace {
  return (
    resource &&
    typeof resource === "object" &&
    resource.type === "dispatch_namespace"
  );
}
