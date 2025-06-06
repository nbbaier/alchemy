import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";
import type { Customer } from "./customer.ts";
import type { Product } from "./product.ts";

/**
 * Properties for creating or updating a Polar Subscription.
 */
export interface SubscriptionProps {
  /** Customer ID or Customer resource */
  customer?: string | Customer;
  /** Product ID or Product resource */
  product?: string | Product;
  /** Subscription amount in cents */
  amount?: number;
  /** Currency code (e.g., 'usd', 'eur') */
  currency?: string;
  /** Billing interval for recurring subscriptions */
  recurringInterval?: "month" | "year";
  /** Current subscription status */
  status?:
    | "incomplete"
    | "incomplete_expired"
    | "trialing"
    | "active"
    | "past_due"
    | "canceled"
    | "unpaid";
  /** Start of current billing period */
  currentPeriodStart?: string;
  /** End of current billing period */
  currentPeriodEnd?: string;
  /** Whether to cancel at the end of the current period */
  cancelAtPeriodEnd?: boolean;
  /** When the subscription started */
  startedAt?: string;
  /** When the subscription ended */
  endedAt?: string;
  /** Key-value pairs for storing additional information */
  metadata?: Record<string, string>;
  /** Polar API key (overrides environment variable) */
  apiKey?: Secret;
  /** If true, adopt existing resource if creation fails due to conflict */
  adopt?: boolean;
}

/**
 * Manages Polar Subscriptions for recurring billing.
 *
 * Subscriptions represent ongoing billing relationships between customers
 * and recurring products. They handle automatic billing cycles, status
 * management, and lifecycle events.
 *
 * @example
 * // Create a monthly subscription
 * const monthlySubscription = await Subscription("monthly-premium", {
 *   customer: "cust_123",
 *   product: "prod_premium",
 *   amount: 2999,
 *   currency: "usd",
 *   recurringInterval: "month"
 * });
 *
 * @example
 * // Create a yearly subscription with trial
 * const yearlySubscription = await Subscription("yearly-pro", {
 *   customer: customerResource,
 *   product: productResource,
 *   amount: 29999,
 *   currency: "usd",
 *   recurringInterval: "year",
 *   status: "trialing",
 *   metadata: {
 *     trial_days: "14",
 *     source: "website"
 *   }
 * });
 *
 * @see https://docs.polar.sh/api-reference/subscriptions
 */
export interface Subscription
  extends Resource<"polar::Subscription">,
    SubscriptionProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  customer: string;
  product: string;
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
      if (!props.customer || !props.product) {
        throw new Error(
          "customer and product are required for creating a subscription",
        );
      }

      const customerId =
        typeof props.customer === "string" ? props.customer : props.customer.id;
      const productId =
        typeof props.product === "string" ? props.product : props.product.id;

      const createData: any = {
        customer_id: customerId,
        product_id: productId,
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
      customer: subscription.customer_id,
      product: subscription.product_id,
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
