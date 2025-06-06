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
 * Properties for creating or updating a Polar Product.
 */
export interface ProductProps {
  /** Product name (required) */
  name: string;
  /** Product description */
  description?: string;
  /** Whether this is a recurring subscription product */
  isRecurring?: boolean;
  /** Whether the product is archived */
  isArchived?: boolean;
  /** Organization ID or Organization resource */
  organization?: string | Organization;
  /** Key-value pairs for storing additional information */
  metadata?: Record<string, string>;
  /** Polar API key (overrides environment variable) */
  apiKey?: Secret;
  /** If true, adopt existing resource if creation fails due to conflict */
  adopt?: boolean;
}

/**
 * Manages Polar Products for your organization.
 *
 * Products represent items that customers can purchase, either as one-time
 * purchases or recurring subscriptions. Products can have multiple pricing
 * tiers and can be configured with various benefits.
 *
 * @example
 * // Create a basic one-time product
 * const ebook = await Product("programming-ebook", {
 *   name: "Advanced Programming Guide",
 *   description: "Comprehensive guide to advanced programming concepts",
 *   isRecurring: false
 * });
 *
 * @example
 * // Create a recurring subscription product
 * const subscription = await Product("premium-plan", {
 *   name: "Premium Plan",
 *   description: "Access to premium features and content",
 *   isRecurring: true,
 *   metadata: {
 *     tier: "premium",
 *     features: "advanced_analytics,priority_support"
 *   }
 * });
 *
 * @see https://docs.polar.sh/api-reference/products
 */
export interface Product extends Resource<"polar::Product">, ProductProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  organization: string;
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
      if (props.organization !== undefined) {
        createData.organization_id =
          typeof props.organization === "string"
            ? props.organization
            : props.organization.id;
      }
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
      organization: product.organization_id,
      metadata: product.metadata || {},
      createdAt: product.created_at,
      modifiedAt: product.modified_at,
      prices: product.prices,
    });
  },
);
