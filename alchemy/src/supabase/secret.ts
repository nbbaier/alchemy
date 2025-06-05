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
import type { ProjectResource } from "./project.ts";

/**
 * Properties for creating or updating Supabase Secrets
 */
export interface SecretProps extends SupabaseApiOptions {
  /**
   * Reference to the project (string ID or Project resource)
   */
  project: string | ProjectResource;
  
  /**
   * Key-value pairs of secrets to create/update
   */
  secrets: Record<string, string>;
  
  /**
   * Whether to adopt existing secrets instead of failing on conflict
   */
  adopt?: boolean;
}

/**
 * Supabase Secrets resource
 */
export interface SecretResource extends Resource<"supabase::Secret"> {
  /**
   * Reference to the project
   */
  projectRef: string;
  
  /**
   * Array of secret name-value pairs
   */
  secrets: Array<{
    /**
     * Name of the secret
     */
    name: string;
    
    /**
     * Value of the secret
     */
    value: string;
  }>;
}

export function isSecret(resource: Resource): resource is SecretResource {
  return resource[ResourceKind] === "supabase::Secret";
}

/**
 * Create and manage Supabase Secrets
 *
 * @example
 * // Create basic secrets:
 * const secrets = Secret("api-keys", {
 *   project: "proj-123",
 *   secrets: {
 *     "API_KEY": "secret-value",
 *     "DATABASE_URL": "postgres://..."
 *   }
 * });
 *
 * @example
 * // Create secrets with Project resource:
 * const secrets = Secret("config", {
 *   project: myProject,
 *   secrets: {
 *     "STRIPE_SECRET": "sk_test_...",
 *     "JWT_SECRET": "super-secret-key"
 *   }
 * });
 */
export const Secret = Resource(
  "supabase::Secret",
  async function (
    this: Context<SecretResource>,
    _id: string,
    props: SecretProps,
  ): Promise<SecretResource> {
    const api = await createSupabaseApi(props);
    const projectRef = typeof props.project === "string" ? props.project : props.project.id;

    if (this.phase === "delete") {
      const secretNames = this.output?.secrets.map((s) => s.name) || [];
      if (secretNames.length > 0) {
        await deleteSecrets(api, projectRef, secretNames);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output) {
      await createSecrets(api, projectRef, props.secrets);
      const secrets = await getSecrets(api, projectRef);
      const filteredSecrets = secrets.filter((s) =>
        Object.keys(props.secrets).includes(s.name),
      );
      return this({
        [ResourceKind]: "supabase::Secret",
        [ResourceID]: `${projectRef}-secrets`,
        [ResourceFQN]: `supabase::Secret::${projectRef}-secrets`,
        [ResourceScope]: Scope.current,
        [ResourceSeq]: 0,
        projectRef: projectRef,
        secrets: filteredSecrets,
      } as SecretResource);
    }

    try {
      await createSecrets(api, projectRef, props.secrets);
      const secrets = await getSecrets(api, projectRef);
      const filteredSecrets = secrets.filter((s) =>
        Object.keys(props.secrets).includes(s.name),
      );
      return this({
        [ResourceKind]: "supabase::Secret",
        [ResourceID]: `${projectRef}-secrets`,
        [ResourceFQN]: `supabase::Secret::${projectRef}-secrets`,
        [ResourceScope]: Scope.current,
        [ResourceSeq]: 0,
        projectRef: projectRef,
        secrets: filteredSecrets,
      } as SecretResource);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingSecrets = await getSecrets(api, projectRef);
        const matchingSecrets = existingSecrets.filter((s) =>
          Object.keys(props.secrets).includes(s.name),
        );
        return this({
          [ResourceKind]: "supabase::Secret",
          [ResourceID]: `${projectRef}-secrets`,
          [ResourceFQN]: `supabase::Secret::${projectRef}-secrets`,
          [ResourceScope]: Scope.current,
          [ResourceSeq]: 0,
          projectRef: projectRef,
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

  const response = await api.post(
    `/projects/${projectRef}/secrets`,
    secretsArray,
  );
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
