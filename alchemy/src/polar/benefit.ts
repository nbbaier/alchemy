import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";
import type { Organization } from "./organization.ts";

/**
 * Properties for creating or updating a Polar Benefit.
 */
export interface BenefitProps {
  /** Type of benefit to create */
  type:
    | "custom"
    | "articles"
    | "discord"
    | "github_repository"
    | "downloadables"
    | "license_keys";
  /** Description of the benefit */
  description: string;
  /** Whether customers can select this benefit */
  selectable?: boolean;
  /** Whether this benefit can be deleted */
  deletable?: boolean;
  /** Organization ID or Organization resource */
  organization?: string | Organization;
  /** Type-specific configuration properties */
  properties?: Record<string, any>;
  /** Key-value pairs for storing additional information */
  metadata?: Record<string, string>;
  /** Polar API key (overrides environment variable) */
  apiKey?: Secret;
  /** If true, adopt existing resource if creation fails due to conflict */
  adopt?: boolean;
}

/**
 * Manages Polar Benefits that can be granted to customers.
 *
 * Benefits represent perks, access rights, or digital goods that customers
 * receive when they purchase products or subscribe to services. Different
 * benefit types provide various integrations and capabilities.
 *
 * @example
 * // Create a Discord access benefit
 * const discordBenefit = await Benefit("discord-access", {
 *   type: "discord",
 *   description: "Access to premium Discord server",
 *   selectable: true,
 *   properties: {
 *     guild_id: "123456789",
 *     role_id: "987654321"
 *   }
 * });
 *
 * @example
 * // Create a custom benefit
 * const customBenefit = await Benefit("custom-benefit", {
 *   type: "custom",
 *   description: "Priority customer support",
 *   selectable: false,
 *   metadata: {
 *     category: "support",
 *     priority: "high"
 *   }
 * });
 *
 * @example
 * // Create a GitHub repository access benefit
 * const githubBenefit = await Benefit("github-access", {
 *   type: "github_repository",
 *   description: "Access to private repository",
 *   properties: {
 *     repository_owner: "myorg",
 *     repository_name: "private-repo",
 *     permission: "pull"
 *   }
 * });
 *
 * @see https://docs.polar.sh/api-reference/benefits
 */
export interface Benefit extends Resource<"polar::Benefit">, BenefitProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  type:
    | "custom"
    | "articles"
    | "discord"
    | "github_repository"
    | "downloadables"
    | "license_keys";
  description: string;
  selectable: boolean;
  deletable: boolean;
  organization: string;
  properties?: Record<string, any>;
}

export const Benefit = Resource(
  "polar::Benefit",
  async function (
    this: Context<Benefit>,
    _logicalId: string,
    props: BenefitProps,
  ): Promise<Benefit> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/benefits/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Benefit", this.output?.id);
      }
      return this.destroy();
    }

    let benefit: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.description !== undefined)
        updateData.description = props.description;
      if (props.selectable !== undefined)
        updateData.selectable = props.selectable;
      if (props.deletable !== undefined) updateData.deletable = props.deletable;
      if (props.properties !== undefined)
        updateData.properties = props.properties;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      benefit = await client.patch(`/benefits/${this.output.id}`, updateData);
    } else {
      const createData: any = {
        type: props.type,
        description: props.description,
      };
      if (props.selectable !== undefined)
        createData.selectable = props.selectable;
      if (props.deletable !== undefined) createData.deletable = props.deletable;
      if (props.organization !== undefined) {
        createData.organization_id =
          typeof props.organization === "string"
            ? props.organization
            : props.organization.id;
      }
      if (props.properties !== undefined)
        createData.properties = props.properties;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        benefit = await client.post("/benefits", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Benefit adoption is not supported - benefits cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: benefit.id,
      type: benefit.type,
      description: benefit.description,
      selectable: benefit.selectable,
      deletable: benefit.deletable,
      organization: benefit.organization_id,
      properties: benefit.properties,
      metadata: benefit.metadata || {},
      createdAt: benefit.created_at,
      modifiedAt: benefit.modified_at,
    });
  },
);
