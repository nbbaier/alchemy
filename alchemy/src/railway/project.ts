import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface ProjectProps {
  name: string;
  description?: string;
  isPublic?: boolean;
  teamId?: string;
  apiKey?: Secret;
}

/**
 * A Railway project is a container for your applications, databases, and other resources.
 *
 * @example
 * ```typescript
 * // Create a basic project
 * const myProject = await Project("my-project", {
 *   name: "My Web Application",
 *   description: "A full-stack web application",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a public open source project
 * const openSourceProject = await Project("oss-project", {
 *   name: "Open Source Library",
 *   description: "A public TypeScript library for developers",
 *   isPublic: true,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a team project with custom authentication
 * const teamProject = await Project("team-app", {
 *   name: "Team Dashboard",
 *   description: "Internal team management application",
 *   teamId: "team_abc123",
 *   apiKey: secret("custom-railway-token"),
 * });
 * ```
 */

export interface Project extends Resource<"railway::Project">, ProjectProps {
  id: string;
  defaultEnvironment: string;
  createdAt: string;
  updatedAt: string;
}

export const Project = Resource(
  "railway::Project",
  async function (
    this: Context<Project>,
    _id: string,
    props: ProjectProps,
  ): Promise<Project> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation ProjectDelete($id: String!) {
              projectDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Project", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.mutate(
        `
        mutation ProjectUpdate($id: String!, $input: ProjectUpdateInput!) {
          projectUpdate(id: $id, input: $input) {
            id
            name
            description
            isPublic
            teamId
            defaultEnvironment {
              id
            }
            createdAt
            updatedAt
          }
        }
        `,
        {
          id: this.output.id,
          input: {
            name: props.name,
            description: props.description,
            isPublic: props.isPublic,
          },
        },
      );

      const project = response.data?.projectUpdate;
      if (!project) {
        throw new Error("Failed to update Railway project");
      }

      return this({
        id: project.id,
        name: project.name,
        description: project.description,
        isPublic: project.isPublic,
        teamId: project.teamId,
        defaultEnvironment: project.defaultEnvironment.id,
        createdAt: project.createdAt,
        updatedAt: project.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation ProjectCreate($input: ProjectCreateInput!) {
        projectCreate(input: $input) {
          id
          name
          description
          isPublic
          teamId
          defaultEnvironment {
            id
          }
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          name: props.name,
          description: props.description,
          isPublic: props.isPublic,
          teamId: props.teamId,
        },
      },
    );

    const project = response.data?.projectCreate;
    if (!project) {
      throw new Error("Failed to create Railway project");
    }

    return this({
      id: project.id,
      name: project.name,
      description: project.description,
      isPublic: project.isPublic,
      teamId: project.teamId,
      defaultEnvironment: project.defaultEnvironment.id,
      createdAt: project.createdAt,
      updatedAt: project.updatedAt,
    });
  },
);
