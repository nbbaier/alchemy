import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface ProductProps {
  name: string;
  description?: string;
  isRecurring?: boolean;
  isArchived?: boolean;
  organizationId?: string;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

export interface Product extends Resource<"polar::Product">, ProductProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  organizationId: string;
  prices?: any[];
}

export const Product = Resource(
  "polar::Product",
  async function (
    this: Context<Product>,
    _logicalId: string,
    props: ProductProps,
  ): Promise<Product> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.patch(`/products/${this.output.id}`, {
            is_archived: true,
          });
        }
      } catch (error) {
        handlePolarDeleteError(error, "Product", this.output?.id);
      }
      return this.destroy();
    }

    let product: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.name !== undefined) updateData.name = props.name;
      if (props.description !== undefined)
        updateData.description = props.description;
      if (props.isRecurring !== undefined)
        updateData.is_recurring = props.isRecurring;
      if (props.isArchived !== undefined)
        updateData.is_archived = props.isArchived;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      product = await client.patch(`/products/${this.output.id}`, updateData);
    } else {
      const createData: any = {
        name: props.name,
      };
      if (props.description !== undefined)
        createData.description = props.description;
      if (props.isRecurring !== undefined)
        createData.is_recurring = props.isRecurring;
      if (props.organizationId !== undefined)
        createData.organization_id = props.organizationId;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        product = await client.post("/products", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Product adoption is not supported - products cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: product.id,
      name: product.name,
      description: product.description,
      isRecurring: product.is_recurring,
      isArchived: product.is_archived,
      organizationId: product.organization_id,
      metadata: product.metadata || {},
      createdAt: product.created_at,
      modifiedAt: product.modified_at,
      prices: product.prices,
    });
  },
);
