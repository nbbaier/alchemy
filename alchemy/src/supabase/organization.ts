import type { Context } from "../context.ts";
import {
  Resource,
  ResourceKind,
  ResourceID,
  ResourceFQN,
  ResourceScope,
  ResourceSeq,
} from "../resource.ts";
import { Scope } from "../scope.ts";
import {
  createSupabaseApi,
  type SupabaseApiOptions,
  type SupabaseApi,
} from "./api.ts";
import { handleApiError } from "./api-error.ts";

export interface OrganizationProps extends SupabaseApiOptions {
  name?: string;
  adopt?: boolean;
}

export interface OrganizationResource
  extends Resource<"supabase::Organization"> {
  id: string;
  name: string;
  plan?: string;
  optInTags?: string[];
  allowedReleaseChannels?: string[];
}

export function isOrganization(
  resource: Resource,
): resource is OrganizationResource {
  return resource[ResourceKind] === "supabase::Organization";
}

export const Organization = Resource(
  "supabase::Organization",
  async function (
    this: Context<OrganizationResource>,
    id: string,
    props: OrganizationProps,
  ): Promise<OrganizationResource> {
    const api = await createSupabaseApi(props);
    const name = props.name ?? id;

    if (this.phase === "delete") {
      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const org = await getOrganization(api, this.output.id);
      return this(org);
    }

    try {
      const { id: orgId } = await createOrganization(api, { name });
      const org = await getOrganization(api, orgId);
      return this(org);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingOrg = await findOrganizationByName(api, name);
        if (!existingOrg) {
          throw new Error(
            `Failed to find existing organization '${name}' for adoption`,
          );
        }
        return this(existingOrg);
      }
      throw error;
    }
  },
);

async function createOrganization(
  api: SupabaseApi,
  props: { name: string },
): Promise<{ id: string }> {
  const response = await api.post("/organizations", { name: props.name });
  if (!response.ok) {
    await handleApiError(response, "creating", "organization", props.name);
  }
  return await response.json();
}

async function getOrganization(
  api: SupabaseApi,
  slug: string,
): Promise<OrganizationResource> {
  const response = await api.get(`/organizations/${slug}`);
  if (!response.ok) {
    await handleApiError(response, "getting", "organization", slug);
  }
  const data = (await response.json()) as any;
  return {
    [ResourceKind]: "supabase::Organization",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::Organization::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    name: data.name,
    plan: data.plan,
    optInTags: data.opt_in_tags,
    allowedReleaseChannels: data.allowed_release_channels,
  };
}

async function findOrganizationByName(
  api: SupabaseApi,
  name: string,
): Promise<OrganizationResource | null> {
  const response = await api.get("/organizations");
  if (!response.ok) {
    await handleApiError(response, "listing", "organizations");
  }
  const orgs = (await response.json()) as any[];
  const match = orgs.find((org: any) => org.name === name);
  return match ? await getOrganization(api, match.id) : null;
}
