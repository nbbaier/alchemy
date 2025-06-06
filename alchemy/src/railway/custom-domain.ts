import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface CustomDomainProps {
  /**
   * The custom domain name to configure
   */
  domain: string;

  /**
   * The ID of the service this domain points to
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

export interface CustomDomain
  extends Resource<"railway::CustomDomain">,
    CustomDomainProps {
  /**
   * The unique identifier of the custom domain
   */
  id: string;

  /**
   * The status of the custom domain configuration
   */
  status: string;

  /**
   * The timestamp when the custom domain was created
   */
  createdAt: string;

  /**
   * The timestamp when the custom domain was last updated
   */
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
          await deleteCustomDomain(api, this.output.id);
        }
      } catch (error) {
        handleRailwayDeleteError(error, "CustomDomain", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const customDomain = await getCustomDomain(api, this.output.id);

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

    const customDomain = await createCustomDomain(api, props);

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

export async function createCustomDomain(api: any, props: CustomDomainProps) {
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

  return customDomain;
}

export async function getCustomDomain(api: any, id: string) {
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
    { id },
  );

  const customDomain = response.data?.customDomain;
  if (!customDomain) {
    throw new Error("Failed to fetch Railway custom domain");
  }

  return customDomain;
}

export async function deleteCustomDomain(api: any, id: string) {
  await api.mutate(
    `
    mutation CustomDomainDelete($id: String!) {
      customDomainDelete(id: $id)
    }
    `,
    { id },
  );
}
