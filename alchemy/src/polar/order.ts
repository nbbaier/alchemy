import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface OrderProps {
  customerId?: string;
  productId?: string;
  amount?: number;
  currency?: string;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

export interface Order extends Resource<"polar::Order">, OrderProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  customerId: string;
  productId: string;
  amount: number;
  currency: string;
}

export const Order = Resource(
  "polar::Order",
  async function (
    this: Context<Order>,
    _logicalId: string,
    props: OrderProps,
  ): Promise<Order> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/orders/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Order", this.output?.id);
      }
      return this.destroy();
    }

    let order: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.amount !== undefined) updateData.amount = props.amount;
      if (props.currency !== undefined) updateData.currency = props.currency;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      order = await client.patch(`/orders/${this.output.id}`, updateData);
    } else {
      if (!props.customerId || !props.productId) {
        throw new Error(
          "customerId and productId are required for creating an order",
        );
      }

      const createData: any = {
        customer_id: props.customerId,
        product_id: props.productId,
      };
      if (props.amount !== undefined) createData.amount = props.amount;
      if (props.currency !== undefined) createData.currency = props.currency;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        order = await client.post("/orders", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Order adoption is not supported - orders cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: order.id,
      customerId: order.customer_id,
      productId: order.product_id,
      amount: order.amount,
      currency: order.currency,
      metadata: order.metadata || {},
      createdAt: order.created_at,
      modifiedAt: order.modified_at,
    });
  },
);
