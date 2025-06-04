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

export interface ProjectProps extends SupabaseApiOptions {
  name?: string;
  organizationId: string;
  region: string;
  dbPass: string;
  desiredInstanceSize?: string;
  templateUrl?: string;
  adopt?: boolean;
  delete?: boolean;
}

export interface ProjectResource extends Resource<"supabase::Project"> {
  id: string;
  organizationId: string;
  name: string;
  region: string;
  createdAt: string;
  status: string;
  database?: {
    host: string;
    version: string;
    postgresEngine: string;
    releaseChannel: string;
  };
}

export function isProject(resource: Resource): resource is ProjectResource {
  return resource[ResourceKind] === "supabase::Project";
}

export const Project = Resource(
  "supabase::Project",
  async function (
    this: Context<ProjectResource>,
    id: string,
    props: ProjectProps,
  ): Promise<ProjectResource> {
    const api = await createSupabaseApi(props);
    const name = props.name ?? id;

    if (this.phase === "delete") {
      const projectId = this.output?.id;
      if (projectId && props.delete !== false) {
        await deleteProject(api, projectId);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const project = await getProject(api, this.output.id);
      return this(project);
    }

    try {
      const project = await createProject(api, {
        name,
        organization_id: props.organizationId,
        region: props.region,
        db_pass: props.dbPass,
        desired_instance_size: props.desiredInstanceSize,
        template_url: props.templateUrl,
      });
      return this(project);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingProject = await findProjectByName(api, name);
        if (!existingProject) {
          throw new Error(
            `Failed to find existing project '${name}' for adoption`,
          );
        }
        return this(existingProject);
      }
      throw error;
    }
  },
);

async function createProject(
  api: SupabaseApi,
  params: any,
): Promise<ProjectResource> {
  const response = await api.post("/projects", params);
  if (!response.ok) {
    await handleApiError(response, "creating", "project", params.name);
  }
  const data = (await response.json()) as any;
  return {
    [ResourceKind]: "supabase::Project",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::Project::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    region: data.region,
    createdAt: data.created_at,
    status: data.status,
  };
}

async function getProject(
  api: SupabaseApi,
  ref: string,
): Promise<ProjectResource> {
  const response = await api.get(`/projects/${ref}`);
  if (!response.ok) {
    await handleApiError(response, "getting", "project", ref);
  }
  const data = (await response.json()) as any;
  return {
    [ResourceKind]: "supabase::Project",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::Project::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    organizationId: data.organization_id,
    name: data.name,
    region: data.region,
    createdAt: data.created_at,
    status: data.status,
    database: data.database,
  };
}

async function deleteProject(api: SupabaseApi, ref: string): Promise<void> {
  const response = await api.delete(`/projects/${ref}`);
  if (!response.ok && response.status !== 404) {
    await handleApiError(response, "deleting", "project", ref);
  }
}

async function findProjectByName(
  api: SupabaseApi,
  name: string,
): Promise<ProjectResource | null> {
  const response = await api.get("/projects");
  if (!response.ok) {
    await handleApiError(response, "listing", "projects");
  }
  const projects = (await response.json()) as any[];
  const match = projects.find((project: any) => project.name === name);
  return match ? await getProject(api, match.id) : null;
}
