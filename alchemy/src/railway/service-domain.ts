import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface ServiceDomainProps {
  /**
   * The subdomain name for the service
   */
  domain: string;

  /**
   * The ID of the service this domain belongs to
   */
  serviceId: string;

  /**
   * The ID of the environment this domain belongs to
   */
  environmentId: string;

  /**
   * Railway API token to use for authentication. Defaults to RAILWAY_TOKEN environment variable
   */
  apiKey?: Secret;
}

export interface ServiceDomain
  extends Resource<"railway::ServiceDomain">,
    ServiceDomainProps {
  /**
   * The unique identifier of the service domain
   */
  id: string;

  /**
   * The full URL of the service domain
   */
  url: string;

  /**
   * The timestamp when the service domain was created
   */
  createdAt: string;

  /**
   * The timestamp when the service domain was last updated
   */
  updatedAt: string;
}

/**
 * Create and manage Railway service domains
 *
 * @example
 * ```typescript
 * // Create a service domain for your API
 * const apiDomain = await ServiceDomain("api-domain", {
 *   domain: "my-api",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a service domain for frontend
 * const frontendDomain = await ServiceDomain("frontend-domain", {
 *   domain: "my-app-frontend",
 *   serviceId: webService.id,
 *   environmentId: production.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a service domain with custom authentication
 * const domain = await ServiceDomain("service-domain", {
 *   domain: "my-service",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 *   apiKey: secret("service-railway-token"),
 * });
 * ```
 */
export const ServiceDomain = Resource(
  "railway::ServiceDomain",
  async function (
    this: Context<ServiceDomain>,
    _id: string,
    props: ServiceDomainProps,
  ): Promise<ServiceDomain> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await deleteServiceDomain(api, this.output.id);
        }
      } catch (error) {
        handleRailwayDeleteError(error, "ServiceDomain", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const serviceDomain = await updateServiceDomain(
        api,
        this.output.id,
        props,
      );

      return this({
        id: serviceDomain.id,
        domain: serviceDomain.domain,
        serviceId: serviceDomain.serviceId,
        environmentId: serviceDomain.environmentId,
        url: serviceDomain.url,
        createdAt: serviceDomain.createdAt,
        updatedAt: serviceDomain.updatedAt,
      });
    }

    const serviceDomain = await createServiceDomain(api, props);

    return this({
      id: serviceDomain.id,
      domain: serviceDomain.domain,
      serviceId: serviceDomain.serviceId,
      environmentId: serviceDomain.environmentId,
      url: serviceDomain.url,
      createdAt: serviceDomain.createdAt,
      updatedAt: serviceDomain.updatedAt,
    });
  },
);

export async function createServiceDomain(api: any, props: ServiceDomainProps) {
  const response = await api.mutate(
    `
    mutation ServiceDomainCreate($input: ServiceDomainCreateInput!) {
      serviceDomainCreate(input: $input) {
        id
        domain
        serviceId
        environmentId
        url
        createdAt
        updatedAt
      }
    }
    `,
    {
      input: {
        domain: props.domain,
        serviceId: props.serviceId,
        environmentId: props.environmentId,
      },
    },
  );

  const serviceDomain = response.data?.serviceDomainCreate;
  if (!serviceDomain) {
    throw new Error("Failed to create Railway service domain");
  }

  return serviceDomain;
}

export async function updateServiceDomain(
  api: any,
  id: string,
  props: ServiceDomainProps,
) {
  const response = await api.mutate(
    `
    mutation ServiceDomainUpdate($id: String!, $input: ServiceDomainUpdateInput!) {
      serviceDomainUpdate(id: $id, input: $input) {
        id
        domain
        serviceId
        environmentId
        url
        createdAt
        updatedAt
      }
    }
    `,
    {
      id,
      input: {
        domain: props.domain,
      },
    },
  );

  const serviceDomain = response.data?.serviceDomainUpdate;
  if (!serviceDomain) {
    throw new Error("Failed to update Railway service domain");
  }

  return serviceDomain;
}

export async function getServiceDomain(api: any, id: string) {
  const response = await api.query(
    `
    query ServiceDomain($id: String!) {
      serviceDomain(id: $id) {
        id
        domain
        serviceId
        environmentId
        url
        createdAt
        updatedAt
      }
    }
    `,
    { id },
  );

  const serviceDomain = response.data?.serviceDomain;
  if (!serviceDomain) {
    throw new Error("Failed to fetch Railway service domain");
  }

  return serviceDomain;
}

export async function deleteServiceDomain(api: any, id: string) {
  await api.mutate(
    `
    mutation ServiceDomainDelete($id: String!) {
      serviceDomainDelete(id: $id)
    }
    `,
    { id },
  );
}
