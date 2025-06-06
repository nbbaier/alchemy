import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import type { Secret } from "../secret.ts";
import {
  createPolarClient,
  handlePolarDeleteError,
  isPolarConflictError,
} from "./client.ts";

export interface MeterProps {
  name: string;
  filter?: {
    conjunction: "and" | "or";
    clauses: Array<{
      property: string;
      operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
      value: string;
    }>;
  };
  aggregation?: {
    type: "count" | "sum" | "avg" | "max" | "min";
    property?: string;
  };
  metadata?: Record<string, string>;
  apiKey?: Secret;
  adopt?: boolean;
}

export interface Meter extends Resource<"polar::Meter">, MeterProps {
  id: string;
  createdAt: string;
  modifiedAt: string;
  name: string;
  filter?: {
    conjunction: "and" | "or";
    clauses: Array<{
      property: string;
      operator: "eq" | "ne" | "gt" | "gte" | "lt" | "lte";
      value: string;
    }>;
  };
  aggregation?: {
    type: "count" | "sum" | "avg" | "max" | "min";
    property?: string;
  };
}

export const Meter = Resource(
  "polar::Meter",
  async function (
    this: Context<Meter>,
    _logicalId: string,
    props: MeterProps,
  ): Promise<Meter> {
    const client = createPolarClient({ apiKey: props.apiKey });

    if (this.phase === "delete") {
      try {
        if (this.output?.id) {
          await client.delete(`/meters/${this.output.id}`);
        }
      } catch (error) {
        handlePolarDeleteError(error, "Meter", this.output?.id);
      }
      return this.destroy();
    }

    let meter: any;

    if (this.phase === "update" && this.output?.id) {
      const updateData: any = {};
      if (props.name !== undefined) updateData.name = props.name;
      if (props.filter !== undefined) updateData.filter = props.filter;
      if (props.aggregation !== undefined)
        updateData.aggregation = props.aggregation;
      if (props.metadata !== undefined) updateData.metadata = props.metadata;

      meter = await client.patch(`/meters/${this.output.id}`, updateData);
    } else {
      const createData: any = {
        name: props.name,
      };
      if (props.filter !== undefined) createData.filter = props.filter;
      if (props.aggregation !== undefined)
        createData.aggregation = props.aggregation;
      if (props.metadata !== undefined) createData.metadata = props.metadata;

      try {
        meter = await client.post("/meters", createData);
      } catch (error) {
        if (isPolarConflictError(error) && props.adopt) {
          throw new Error(
            "Meter adoption is not supported - meters cannot be uniquely identified for adoption",
          );
        } else {
          throw error;
        }
      }
    }

    return this({
      id: meter.id,
      name: meter.name,
      filter: meter.filter,
      aggregation: meter.aggregation,
      metadata: meter.metadata || {},
      createdAt: meter.created_at,
      modifiedAt: meter.modified_at,
    });
  },
);
