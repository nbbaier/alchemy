import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface CustomerProps {
  email: string;
  name?: string;
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

export interface Customer extends Resource<"polar::Customer">, CustomerProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  organizationId: string;
}

export const Customer = Resource(
  "polar::Customer",
  async function (
    this: Context<Customer>,
    _logicalId: string,
    props: CustomerProps,
  ): Promise<Customer> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/customers/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Customer", this.output?.id);
      }
      return this.destroy();
    }

    let customer: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.name !== undefined) updateData.name = props.name;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      customer = await client.patch(`/customers/${this.output.id}`, updateData);
    } else {
      const createData: any = {
        email: props.email,
      };
      if (props.name !== undefined) createData.name = props.name;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        customer = await client.post("/customers", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          const existingCustomers = await client.get(
            `/customers?email=${encodeURIComponent(props.email)}`,
          );
          if (existingCustomers.items && existingCustomers.items.length > 0) {
            customer = existingCustomers.items[0];
          } else {
            throw error;
          }
        } else {
          throw error;
        }
      }
    }

    return this({
      id: customer.id,
      email: customer.email,
      name: customer.name,
      metadata: customer.metadata || {},
      createdAt: customer.created_at,
      modifiedAt: customer.modified_at,
      organizationId: customer.organization_id,
    });
  },
);
