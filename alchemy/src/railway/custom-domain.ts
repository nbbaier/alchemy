import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface CustomDomainProps {
  domain: string;
  serviceId: string;
  environmentId: string;
  apiKey?: Secret;
}

/**
 * A Railway custom domain allows you to use your own domain name for a service deployment.
 *
 * @example
 * ```typescript
 * // Create a custom domain for production
 * const productionDomain = await CustomDomain("prod-domain", {
 *   domain: "api.mycompany.com",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a staging domain
 * const stagingDomain = await CustomDomain("staging-domain", {
 *   domain: "staging-api.mycompany.com",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a custom domain with specific authentication
 * const customDomain = await CustomDomain("custom-domain", {
 *   domain: "app.example.org",
 *   serviceId: service.id,
 *   environmentId: environment.id,
 *   apiKey: secret("domain-management-token"),
 * });
 * ```
 */

export interface CustomDomain
  extends Resource<"railway::CustomDomain">,
    CustomDomainProps {
  id: string;
  status: string;
  createdAt: string;
  updatedAt: string;
}

export const CustomDomain = Resource(
  "railway::CustomDomain",
  async function (
    this: Context<CustomDomain>,
    _id: string,
    props: CustomDomainProps,
  ): Promise<CustomDomain> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation CustomDomainDelete($id: String!) {
              customDomainDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "CustomDomain", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.query(
        `
        query CustomDomain($id: String!) {
          customDomain(id: $id) {
            id
            domain
            serviceId
            environmentId
            status
            createdAt
            updatedAt
          }
        }
        `,
        { id: this.output.id },
      );

      const customDomain = response.data?.customDomain;
      if (!customDomain) {
        throw new Error("Failed to fetch Railway custom domain");
      }

      return this({
        id: customDomain.id,
        domain: customDomain.domain,
        serviceId: customDomain.serviceId,
        environmentId: customDomain.environmentId,
        status: customDomain.status,
        createdAt: customDomain.createdAt,
        updatedAt: customDomain.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation CustomDomainCreate($input: CustomDomainCreateInput!) {
        customDomainCreate(input: $input) {
          id
          domain
          serviceId
          environmentId
          status
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

    const customDomain = response.data?.customDomainCreate;
    if (!customDomain) {
      throw new Error("Failed to create Railway custom domain");
    }

    return this({
      id: customDomain.id,
      domain: customDomain.domain,
      serviceId: customDomain.serviceId,
      environmentId: customDomain.environmentId,
      status: customDomain.status,
      createdAt: customDomain.createdAt,
      updatedAt: customDomain.updatedAt,
    });
  },
);
