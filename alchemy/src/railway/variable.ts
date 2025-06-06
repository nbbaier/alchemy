import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { type Secret, secret } from "../secret.ts";
import { createRailwayApi, handleRailwayDeleteError } from "./api.ts";

export interface VariableProps {
  name: string;
  value: Secret | string;
  environmentId: string;
  serviceId: string;
  apiKey?: Secret;
}

/**
 * A Railway variable represents an environment variable for a service within a specific environment.
 *
 * @example
 * ```typescript
 * // Create a public configuration variable
 * const port = await Variable("port-var", {
 *   name: "PORT",
 *   value: "3000",
 *   environmentId: environment.id,
 *   serviceId: service.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a secret API key variable
 * const apiKey = await Variable("api-key-var", {
 *   name: "API_KEY",
 *   value: secret("super-secret-key-123"),
 *   environmentId: environment.id,
 *   serviceId: service.id,
 * });
 * ```
 *
 * @example
 * ```typescript
 * // Create a database connection string
 * const dbUrl = await Variable("db-url-var", {
 *   name: "DATABASE_URL",
 *   value: secret("postgresql://user:pass@host:5432/myapp"),
 *   environmentId: environment.id,
 *   serviceId: service.id,
 * });
 * ```
 */

export interface Variable
  extends Resource<"railway::Variable">,
    Omit<VariableProps, "value"> {
  id: string;
  value: Secret;
  createdAt: string;
  updatedAt: string;
}

export const Variable = Resource(
  "railway::Variable",
  async function (
    this: Context<Variable>,
    _id: string,
    props: VariableProps,
  ): Promise<Variable> {
    const api = createRailwayApi({ apiKey: props.apiKey });
    const valueSecret =
      typeof props.value === "string" ? secret(props.value) : props.value;

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await api.mutate(
            `
            mutation VariableDelete($id: String!) {
              variableDelete(id: $id)
            }
            `,
            { id: this.output.id },
          );
        }
      } catch (error) {
        handleRailwayDeleteError(error, "Variable", this.output?.id);
      }

      return this.destroy();
    }

    if (this.phase === "update" && this.output?.id) {
      const response = await api.mutate(
        `
        mutation VariableUpdate($id: String!, $input: VariableUpdateInput!) {
          variableUpdate(id: $id, input: $input) {
            id
            name
            value
            environmentId
            serviceId
            createdAt
            updatedAt
          }
        }
        `,
        {
          id: this.output.id,
          input: {
            name: props.name,
            value: valueSecret.unencrypted,
          },
        },
      );

      const variable = response.data?.variableUpdate;
      if (!variable) {
        throw new Error("Failed to update Railway variable");
      }

      return this({
        id: variable.id,
        name: variable.name,
        value: secret(variable.value),
        environmentId: variable.environmentId,
        serviceId: variable.serviceId,
        createdAt: variable.createdAt,
        updatedAt: variable.updatedAt,
      });
    }

    const response = await api.mutate(
      `
      mutation VariableCreate($input: VariableCreateInput!) {
        variableCreate(input: $input) {
          id
          name
          value
          environmentId
          serviceId
          createdAt
          updatedAt
        }
      }
      `,
      {
        input: {
          name: props.name,
          value: valueSecret.unencrypted,
          environmentId: props.environmentId,
          serviceId: props.serviceId,
        },
      },
    );

    const variable = response.data?.variableCreate;
    if (!variable) {
      throw new Error("Failed to create Railway variable");
    }

    return this({
      id: variable.id,
      name: variable.name,
      value: secret(variable.value),
      environmentId: variable.environmentId,
      serviceId: variable.serviceId,
      createdAt: variable.createdAt,
      updatedAt: variable.updatedAt,
    });
  },
);
