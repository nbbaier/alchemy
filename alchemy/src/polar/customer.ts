import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

/**
 * Properties for creating or updating a Polar Customer.
 */
export interface CustomerProps {
  /** Customer's email address (required) */
  email: string;
  /** Customer's display name */
  name?: string;
  /** Key-value pairs for storing additional information */
  metadata?: Record<string, string>;
  /** Polar API key (overrides environment variable) */
  apiKey?: Secret;
  /** If true, adopt existing resource if creation fails due to conflict */
  adopt?: boolean;
}

/**
 * Manages Polar Customers for your organization.
 *
 * Customers represent individuals or entities that can purchase products,
 * subscribe to services, and receive benefits in your Polar organization.
 *
 * @example
 * // Create a basic customer
 * const customer = await Customer("john-doe", {
 *   email: "john@example.com",
 *   name: "John Doe"
 * });
 *
 * @example
 * // Create a customer with metadata
 * const customerWithMetadata = await Customer("premium-customer", {
 *   email: "premium@example.com",
 *   name: "Premium User",
 *   metadata: {
 *     source: "website",
 *     plan: "premium"
 *   }
 * });
 *
 * @see https://docs.polar.sh/api-reference/customers
 */
export interface Customer extends Resource<"polar::Customer">, CustomerProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  organization: string;
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
      organization: customer.organization_id,
    });
  },
);
