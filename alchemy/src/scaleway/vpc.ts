import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
} from "./api.ts";

/**
 * Properties for creating or updating a Scaleway VPC
 */
export interface ScalewayVpcProps extends ScalewayApiOptions {
  /**
   * VPC name
   */
  name: string;

  /**
   * Region where the VPC will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Tags for the VPC
   */
  tags?: Record<string, string>;
}

/**
 * API response structure for Scaleway VPC
 */
interface ScalewayVpcApiResponse {
  id: string;
  name: string;
  project_id: string;
  region: string;
  organization_id: string;
  tags?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/**
 * A Scaleway Virtual Private Cloud (VPC)
 */
export interface ScalewayVpc extends Resource<"scaleway::Vpc"> {
  /**
   * VPC unique identifier
   */
  id: string;

  /**
   * VPC name
   */
  name: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Region where the VPC is located
   */
  region: ScalewayRegion;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Tags associated with the VPC
   */
  tags?: Record<string, string>;

  /**
   * Time at which the VPC was created
   */
  created_at: string;

  /**
   * Time at which the VPC was last updated
   */
  updated_at: string;
}

async function createNewVpc(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayVpcProps,
  id: string,
): Promise<ScalewayVpcApiResponse> {
  const createData: any = {
    name: props.name,
    project_id: api.projectId,
  };

  if (props.tags) createData.tags = props.tags;

  const createResponse = await api.post("/vpcs", createData, serviceBaseUrl);

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "VPC", id);
  }

  return await createResponse.json();
}

/**
 * A Scaleway Virtual Private Cloud (VPC) provides an isolated network environment
 * for your Scaleway resources within a specific region.
 *
 * VPCs enable you to create private networks with custom IP addressing and
 * provide network isolation between different environments or applications.
 *
 * @example
 * ## Basic VPC
 *
 * Create a simple VPC:
 *
 * ```ts
 * const vpc = await ScalewayVpc("main-vpc", {
 *   name: "main-vpc",
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## VPC with Tags
 *
 * Create a VPC with custom tags:
 *
 * ```ts
 * const productionVpc = await ScalewayVpc("production-vpc", {
 *   name: "production-network",
 *   region: "fr-par",
 *   tags: {
 *     environment: "production",
 *     team: "platform"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayVpc = Resource(
  "scaleway::Vpc",
  async function (
    this: Context<ScalewayVpc>,
    id: string,
    props: ScalewayVpcProps,
  ): Promise<ScalewayVpc> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/vpc/v1/regions/${region}`;

    const vpcId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (vpcId) {
          const deleteResponse = await api.delete(
            `/vpcs/${vpcId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "VPC", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway VPC ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayVpcApiResponse;

    try {
      if (this.phase === "update" && vpcId) {
        // Update existing VPC
        const updateData: any = {};

        if (props.name !== undefined) updateData.name = props.name;
        if (props.tags !== undefined) updateData.tags = props.tags;

        const updateResponse = await api.patch(
          `/vpcs/${vpcId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "VPC", id);
        }

        // Get updated VPC data
        const getResponse = await api.get(`/vpcs/${vpcId}`, serviceBaseUrl);
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "VPC", id);
        }

        response = await getResponse.json();
      } else {
        // Check if VPC already exists by name (for idempotency)
        if (vpcId) {
          const getResponse = await api.get(`/vpcs/${vpcId}`, serviceBaseUrl);
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "VPC", id);
            throw new Error("Failed to check if VPC exists");
          } else {
            // VPC doesn't exist, create new
            response = await createNewVpc(api, serviceBaseUrl, props, id);
          }
        } else {
          // Create new VPC
          response = await createNewVpc(api, serviceBaseUrl, props, id);
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway VPC ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::Vpc",
      id: response.id,
      name: response.name,
      projectId: response.project_id,
      region: response.region as ScalewayRegion,
      organizationId: response.organization_id,
      tags: response.tags,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },
);
