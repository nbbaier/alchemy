import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface ServiceDomainProps {
  domain: string;
  serviceId: string;
  environmentId: string;
  apiKey?: Secret;
}

/**
 * A Railway service domain provides a Railway-managed subdomain for accessing your service.
 *
 * @example
 * ```typescript
 * // Create a service domain for your API
 * const apiDomain = await ServiceDomain("api-domain", {
 *   domain: "my-api-service",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a service domain for a web application
 * const webDomain = await ServiceDomain("web-domain", {
 *   domain: "my-web-app",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a service domain with custom authentication
 * const serviceDomain = await ServiceDomain("service-domain", {
 *   domain: "worker-service",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 *   apiKey: secret("service-railway-token"),
 * });
 * ```
 */

export interface ServiceDomain
  extends Resource<"railway::ServiceDomain">,
    ServiceDomainProps {
  id: string;
  url: string;
  createdAt: string;
  updatedAt: string;
}

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
          await api.mutate(
            `
            mutation ServiceDomainDelete($id: String!) {
              serviceDomainDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "ServiceDomain", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
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
          id: this.output.id,
          input: {
            domain: props.domain,
          },
        },
      );

      const serviceDomain = response.data?.serviceDomainUpdate;
      if (!serviceDomain) {
        throw new Error("Failed to update Railway service domain");
      }

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
