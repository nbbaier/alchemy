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
 * Properties for creating or updating a Polar Discount.
 */
export interface DiscountProps {
  /** Type of discount (percentage or fixed amount) */
  type: "percentage" | "fixed";
  /** Discount amount (percentage or cents) */
  amount: number;
  /** Currency for fixed amount discounts */
  currency?: string;
  /** Display name for the discount */
  name?: string;
  /** Discount code customers can use */
  code?: string;
  /** When the discount becomes active */
  startsAt?: string;
  /** When the discount expires */
  endsAt?: string;
  /** Maximum number of times this discount can be used */
  maxRedemptions?: number;
  /** Current number of redemptions */
  redemptionsCount?: number;
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
 * Manages Polar Discounts for promotional pricing.
 *
 * Discounts allow you to create promotional codes that customers can use
 * to receive percentage or fixed-amount reductions on their purchases.
 * Discounts can be time-limited and have usage restrictions.
 *
 * @example
 * // Create a percentage discount
 * const percentageDiscount = await Discount("summer-sale", {
 *   type: "percentage",
 *   amount: 25,
 *   name: "Summer Sale",
 *   code: "SUMMER25",
 *   maxRedemptions: 100,
 *   startsAt: "2024-06-01T00:00:00Z",
 *   endsAt: "2024-08-31T23:59:59Z"
 * });
 *
 * @example
 * // Create a fixed amount discount
 * const fixedDiscount = await Discount("new-customer", {
 *   type: "fixed",
 *   amount: 500,
 *   currency: "usd",
 *   name: "New Customer Discount",
 *   code: "WELCOME5",
 *   maxRedemptions: 1000,
 *   metadata: {
 *     campaign: "new_customer_acquisition",
 *     source: "email"
 *   }
 * });
 *
 * @see https://docs.polar.sh/api-reference/discounts
 */
export interface Discount extends Resource<"polar::Discount">, DiscountProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  type: "percentage" | "fixed";
  amount: number;
  currency?: string;
  name?: string;
  code?: string;
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  redemptionsCount: number;
  organization: string;
}

export const Discount = Resource(
  "polar::Discount",
  async function (
    this: Context<Discount>,
    _logicalId: string,
    props: DiscountProps,
  ): Promise<Discount> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/discounts/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Discount", this.output?.id);
      }
      return this.destroy();
    }

    let discount: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.amount !== undefined) updateData.amount = props.amount;
      if (props.currency !== undefined) updateData.currency = props.currency;
      if (props.name !== undefined) updateData.name = props.name;
      if (props.code !== undefined) updateData.code = props.code;
      if (props.startsAt !== undefined) updateData.starts_at = props.startsAt;
      if (props.endsAt !== undefined) updateData.ends_at = props.endsAt;
      if (props.maxRedemptions !== undefined)
        updateData.max_redemptions = props.maxRedemptions;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      discount = await client.patch(`/discounts/${this.output.id}`, updateData);
    } else {
      const createData: any = {
        type: props.type,
        amount: props.amount,
      };
      if (props.currency !== undefined) createData.currency = props.currency;
      if (props.name !== undefined) createData.name = props.name;
      if (props.code !== undefined) createData.code = props.code;
      if (props.startsAt !== undefined) createData.starts_at = props.startsAt;
      if (props.endsAt !== undefined) createData.ends_at = props.endsAt;
      if (props.maxRedemptions !== undefined)
        createData.max_redemptions = props.maxRedemptions;
      if (props.organization !== undefined) {
        createData.organization_id =
          typeof props.organization === "string"
            ? props.organization
            : props.organization.id;
      }
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        discount = await client.post("/discounts", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Discount adoption is not supported - discounts cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: discount.id,
      type: discount.type,
      amount: discount.amount,
      currency: discount.currency,
      name: discount.name,
      code: discount.code,
      startsAt: discount.starts_at,
      endsAt: discount.ends_at,
      maxRedemptions: discount.max_redemptions,
      redemptionsCount: discount.redemptions_count,
      organization: discount.organization_id,
      metadata: discount.metadata || {},
      createdAt: discount.created_at,
      modifiedAt: discount.modified_at,
    });
  },
);
