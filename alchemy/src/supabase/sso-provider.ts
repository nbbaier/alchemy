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

export interface SSOProviderProps extends SupabaseApiOptions {
  projectRef: string;
  type: string;
  metadata?: Record<string, any>;
  domains?: string[];
  adopt?: boolean;
  delete?: boolean;
}

export interface SSOProviderResource extends Resource<"supabase::SSOProvider"> {
  id: string;
  type: string;
  metadata: Record<string, any>;
  domains: string[];
  createdAt: string;
  updatedAt: string;
}

export function isSSOProvider(
  resource: Resource,
): resource is SSOProviderResource {
  return resource[ResourceKind] === "supabase::SSOProvider";
}

export const SSOProvider = Resource(
  "supabase::SSOProvider",
  async function (
    this: Context<SSOProviderResource>,
    _id: string,
    props: SSOProviderProps,
  ): Promise<SSOProviderResource> {
    const api = await createSupabaseApi(props);

    if (this.phase === "delete") {
      const providerId = this.output?.id;
      if (providerId && props.delete !== false) {
        await deleteSSOProvider(api, props.projectRef, providerId);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const provider = await getSSOProvider(
        api,
        props.projectRef,
        this.output.id,
      );
      return this(provider);
    }

    try {
      const provider = await createSSOProvider(api, props.projectRef, {
        type: props.type,
        metadata: props.metadata,
        domains: props.domains,
      });
      return this(provider);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingProvider = await findSSOProviderByType(
          api,
          props.projectRef,
          props.type,
        );
        if (!existingProvider) {
          throw new Error(
            `Failed to find existing SSO provider '${props.type}' for adoption`,
          );
        }
        return this(existingProvider);
      }
      throw error;
    }
  },
);

async function createSSOProvider(
  api: SupabaseApi,
  projectRef: string,
  params: any,
): Promise<SSOProviderResource> {
  const response = await api.post(
    `/projects/${projectRef}/config/auth/sso/providers`,
    params,
  );
  if (!response.ok) {
    await handleApiError(response, "creating", "SSO provider", params.type);
  }
  const data = await response.json();
  return mapSSOProviderResponse(data);
}

async function getSSOProvider(
  api: SupabaseApi,
  projectRef: string,
  providerId: string,
): Promise<SSOProviderResource> {
  const response = await api.get(
    `/projects/${projectRef}/config/auth/sso/providers/${providerId}`,
  );
  if (!response.ok) {
    await handleApiError(response, "getting", "SSO provider", providerId);
  }
  const data = await response.json();
  return mapSSOProviderResponse(data);
}

async function deleteSSOProvider(
  api: SupabaseApi,
  projectRef: string,
  providerId: string,
): Promise<void> {
  const response = await api.delete(
    `/projects/${projectRef}/config/auth/sso/providers/${providerId}`,
  );
  if (!response.ok && response.status !== 404) {
    await handleApiError(response, "deleting", "SSO provider", providerId);
  }
}

async function findSSOProviderByType(
  api: SupabaseApi,
  projectRef: string,
  type: string,
): Promise<SSOProviderResource | null> {
  const response = await api.get(
    `/projects/${projectRef}/config/auth/sso/providers`,
  );
  if (!response.ok) {
    await handleApiError(response, "listing", "SSO providers");
  }
  const providers = (await response.json()) as any[];
  const match = providers.find((provider: any) => provider.type === type);
  return match ? mapSSOProviderResponse(match) : null;
}

function mapSSOProviderResponse(data: any): SSOProviderResource {
  return {
    [ResourceKind]: "supabase::SSOProvider",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::SSOProvider::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    type: data.type,
    metadata: data.metadata || {},
    domains: data.domains || [],
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
