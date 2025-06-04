import type { Context } from "../context.ts";
import { Resource, ResourceKind, ResourceID, ResourceFQN, ResourceScope, ResourceSeq } from "../resource.ts";
import { Scope } from "../scope.ts";
import { createSupabaseApi, type SupabaseApiOptions, type SupabaseApi } from "./api.ts";
import { handleApiError } from "./api-error.ts";

export interface SecretProps extends SupabaseApiOptions {
  projectRef: string;
  secrets: Record<string, string>;
  adopt?: boolean;
}

export interface SecretResource extends Resource<"supabase::Secret"> {
  projectRef: string;
  secrets: Array<{
    name: string;
    value: string;
  }>;
}

export function isSecret(resource: Resource): resource is SecretResource {
  return resource[ResourceKind] === "supabase::Secret";
}

export const Secret = Resource(
  "supabase::Secret",
  async function (
    this: Context<SecretResource>,
    id: string,
    props: SecretProps,
  ): Promise<SecretResource> {
    const api = await createSupabaseApi(props);

    if (this.phase === "delete") {
      const secretNames = this.output?.secrets.map(s => s.name) || [];
      if (secretNames.length > 0) {
        await deleteSecrets(api, props.projectRef, secretNames);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output) {
      await createSecrets(api, props.projectRef, props.secrets);
      const secrets = await getSecrets(api, props.projectRef);
      const filteredSecrets = secrets.filter(s => Object.keys(props.secrets).includes(s.name));
      return this({
        [ResourceKind]: "supabase::Secret",
        [ResourceID]: `${props.projectRef}-secrets`,
        [ResourceFQN]: `supabase::Secret::${props.projectRef}-secrets`,
        [ResourceScope]: Scope.current,
        [ResourceSeq]: 0,
        projectRef: props.projectRef,
        secrets: filteredSecrets,
      } as SecretResource);
    }

    try {
      await createSecrets(api, props.projectRef, props.secrets);
      const secrets = await getSecrets(api, props.projectRef);
      const filteredSecrets = secrets.filter(s => Object.keys(props.secrets).includes(s.name));
      return this({
        [ResourceKind]: "supabase::Secret",
        [ResourceID]: `${props.projectRef}-secrets`,
        [ResourceFQN]: `supabase::Secret::${props.projectRef}-secrets`,
        [ResourceScope]: Scope.current,
        [ResourceSeq]: 0,
        projectRef: props.projectRef,
        secrets: filteredSecrets,
      } as SecretResource);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingSecrets = await getSecrets(api, props.projectRef);
        const matchingSecrets = existingSecrets.filter(s => 
          Object.keys(props.secrets).includes(s.name)
        );
        return this({
          [ResourceKind]: "supabase::Secret",
          [ResourceID]: `${props.projectRef}-secrets`,
          [ResourceFQN]: `supabase::Secret::${props.projectRef}-secrets`,
          [ResourceScope]: Scope.current,
          [ResourceSeq]: 0,
          projectRef: props.projectRef,
          secrets: matchingSecrets,
        } as SecretResource);
      }
      throw error;
    }
  },
);

async function createSecrets(
  api: SupabaseApi,
  projectRef: string,
  secrets: Record<string, string>,
): Promise<void> {
  const secretsArray = Object.entries(secrets).map(([name, value]) => ({
    name,
    value,
  }));

  const response = await api.post(`/projects/${projectRef}/secrets`, secretsArray);
  if (!response.ok) {
    await handleApiError(response, "creating", "secrets");
  }
}

async function getSecrets(
  api: SupabaseApi,
  projectRef: string,
): Promise<Array<{ name: string; value: string }>> {
  const response = await api.get(`/projects/${projectRef}/secrets`);
  if (!response.ok) {
    await handleApiError(response, "getting", "secrets");
  }
  return await response.json();
}

async function deleteSecrets(
  api: SupabaseApi,
  projectRef: string,
  secretNames: string[],
): Promise<void> {
  const response = await api.delete(`/projects/${projectRef}/secrets`, {
    body: JSON.stringify(secretNames),
  });
  if (!response.ok && response.status !== 404) {
    await handleApiError(response, "deleting", "secrets");
  }
}
