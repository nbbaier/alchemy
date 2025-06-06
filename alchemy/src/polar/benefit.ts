import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface BenefitProps {
  type:
    | "custom"
    | "articles"
    | "discord"
    | "github_repository"
    | "downloadables"
    | "license_keys";
  description: string;
  selectable?: boolean;
  deletable?: boolean;
  organizationId?: string;
  properties?: Record<string, any>;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

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
  organizationId: string;
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
      if (props.organizationId !== undefined)
        createData.organization_id = props.organizationId;
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
      organizationId: benefit.organization_id,
      properties: benefit.properties,
      metadata: benefit.metadata || {},
      createdAt: benefit.created_at,
      modifiedAt: benefit.modified_at,
    });
  },
);
