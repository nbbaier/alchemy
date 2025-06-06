import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface DiscountProps {
  type: "percentage" | "fixed";
  amount: number;
  currency?: string;
  name?: string;
  code?: string;
  startsAt?: string;
  endsAt?: string;
  maxRedemptions?: number;
  redemptionsCount?: number;
  organizationId?: string;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

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
  organizationId: string;
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
      if (props.organizationId !== undefined)
        createData.organization_id = props.organizationId;
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
      organizationId: discount.organization_id,
      metadata: discount.metadata || {},
      createdAt: discount.created_at,
      modifiedAt: discount.modified_at,
    });
  },
);
