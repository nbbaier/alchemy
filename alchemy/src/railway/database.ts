import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { type Secret, secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface DatabaseProps {
  name: string;
  projectId: string;
  environmentId: string;
  type: "postgresql" | "mysql" | "redis" | "mongodb";
  apiKey?: Secret;
}

/**
 * A Railway database represents a managed database instance within a project environment.
 *
 * @example
 * ```typescript
 * // Create a PostgreSQL database for your application
 * const postgres = await Database("main-db", {
 *   name: "production-database",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   type: "postgresql",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a Redis cache for session storage
 * const redis = await Database("session-cache", {
 *   name: "user-sessions",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   type: "redis",
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a MongoDB database for document storage
 * const mongo = await Database("document-store", {
 *   name: "content-database",
 *   projectId: project.id,
 *   environmentId: environment.id,
 *   type: "mongodb",
 * });
 * ```
 */

export interface Database extends Resource<"railway::Database">, DatabaseProps {
  id: string;
  connectionString: Secret;
  host: string;
  port: number;
  username: string;
  password: Secret;
  databaseName: string;
  createdAt: string;
  updatedAt: string;
}

export const Database = Resource(
  "railway::Database",
  async function (
    this: Context<Database>,
    _id: string,
    props: DatabaseProps,
  ): Promise<Database> {
    const api = createRailwayApi({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation DatabaseDelete($id: String!) {
              databaseDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Database", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.query(
        `
        query Database($id: String!) {
          database(id: $id) {
            id
            name
            projectId
            environmentId
            type
            connectionString
            host
            port
            username
            password
            databaseName
            createdAt
            updatedAt
          }
        }
        `,
        { id: this.output.id },
      );

      const database = response.data?.database;
      if (!database) {
        throw new Error("Failed to fetch Railway database");
      }

      return this({
        id: database.id,
        name: database.name,
        projectId: database.projectId,
        environmentId: database.environmentId,
        type: database.type,
        connectionString: secret(database.connectionString),
        host: database.host,
        port: database.port,
        username: database.username,
        password: secret(database.password),
        databaseName: database.databaseName,
        createdAt: database.createdAt,
        updatedAt: database.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation DatabaseCreate($input: DatabaseCreateInput!) {
        databaseCreate(input: $input) {
          id
          name
          projectId
          environmentId
          type
          connectionString
          host
          port
          username
          password
          databaseName
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          name: props.name,
          projectId: props.projectId,
          environmentId: props.environmentId,
          type: props.type,
        },
      },
    );

    const database = response.data?.databaseCreate;
    if (!database) {
      throw new Error("Failed to create Railway database");
    }

    return this({
      id: database.id,
      name: database.name,
      projectId: database.projectId,
      environmentId: database.environmentId,
      type: database.type,
      connectionString: secret(database.connectionString),
      host: database.host,
      port: database.port,
      username: database.username,
      password: secret(database.password),
      databaseName: database.databaseName,
      createdAt: database.createdAt,
      updatedAt: database.updatedAt,
    });
  },
);
