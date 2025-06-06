import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface SubscriptionProps {
  customerId?: string;
  productId?: string;
  amount?: number;
  currency?: string;
  recurringInterval?: "month" | "year";
  status?:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  currentPeriodStart?: string;
  currentPeriodEnd?: string;
  cancelAtPeriodEnd?: boolean;
  startedAt?: string;
  endedAt?: string;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

export interface Subscription
  extends Resource<"polar::Subscription">,
    SubscriptionProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  customerId: string;
  productId: string;
  amount: number;
  currency: string;
  recurringInterval: "month" | "year";
  status:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  startedAt?: string;
  endedAt?: string;
}

export const Subscription = Resource(
  "polar::Subscription",
  async function (
    this: Context<Subscription>,
    _logicalId: string,
    props: SubscriptionProps,
  ): Promise<Subscription> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/subscriptions/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Subscription", this.output?.id);
      }
      return this.destroy();
    }

    let subscription: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.amount !== undefined) updateData.amount = props.amount;
      if (props.currency !== undefined) updateData.currency = props.currency;
      if (props.recurringInterval !== undefined)
        updateData.recurring_interval = props.recurringInterval;
      if (props.cancelAtPeriodEnd !== undefined)
        updateData.cancel_at_period_end = props.cancelAtPeriodEnd;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      subscription = await client.patch(
        `/subscriptions/${this.output.id}`,
        updateData,
      );
    } else {
      if (!props.customerId || !props.productId) {
        throw new Error(
          "customerId and productId are required for creating a subscription",
        );
      }

      const createData: any = {
        customer_id: props.customerId,
        product_id: props.productId,
      };
      if (props.amount !== undefined) createData.amount = props.amount;
      if (props.currency !== undefined) createData.currency = props.currency;
      if (props.recurringInterval !== undefined)
        createData.recurring_interval = props.recurringInterval;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        subscription = await client.post("/subscriptions", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Subscription adoption is not supported - subscriptions cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: subscription.id,
      customerId: subscription.customer_id,
      productId: subscription.product_id,
      amount: subscription.amount,
      currency: subscription.currency,
      recurringInterval: subscription.recurring_interval,
      status: subscription.status,
      currentPeriodStart: subscription.current_period_start,
      currentPeriodEnd: subscription.current_period_end,
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      startedAt: subscription.started_at,
      endedAt: subscription.ended_at,
      metadata: subscription.metadata || {},
      createdAt: subscription.created_at,
      modifiedAt: subscription.modified_at,
    });
  },
);
