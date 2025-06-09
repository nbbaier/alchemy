import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
} from "./api.ts";
import type { ScalewayVpc } from "./vpc.ts";

/**
 * Properties for creating or updating a Scaleway VPC Private Network
 */
export interface ScalewayVpcPrivateNetworkProps extends ScalewayApiOptions {
  /**
   * Private network name
   */
  name: string;

  /**
   * VPC ID or VPC resource where the private network will be created
   */
  vpc: string | ScalewayVpc;

  /**
   * Region where the private network will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * IPv4 subnet for the private network (CIDR notation)
   * @example "192.168.1.0/24"
   */
  ipv4Subnet?: string;

  /**
   * IPv6 subnet for the private network (CIDR notation)
   * @example "fd00::/64"
   */
  ipv6Subnets?: string[];

  /**
   * Tags for the private network
   */
  tags?: Record<string, string>;
}

/**
 * API response structure for Scaleway VPC Private Network
 */
interface ScalewayVpcPrivateNetworkApiResponse {
  id: string;
  name: string;
  project_id: string;
  region: string;
  organization_id: string;
  vpc_id: string;
  ipv4_subnet?: {
    subnet: string;
    created_at: string;
  };
  ipv6_subnets?: Array<{
    subnet: string;
    created_at: string;
  }>;
  tags?: Record<string, string>;
  created_at: string;
  updated_at: string;
}

/**
 * A Scaleway VPC Private Network
 */
export interface ScalewayVpcPrivateNetwork
  extends Resource<"scaleway::VpcPrivateNetwork"> {
  /**
   * Private network unique identifier
   */
  id: string;

  /**
   * Private network name
   */
  name: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Region where the private network is located
   */
  region: ScalewayRegion;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * VPC ID where the private network is located
   */
  vpcId: string;

  /**
   * IPv4 subnet configuration
   */
  ipv4Subnet?: {
    subnet: string;
    created_at: string;
  };

  /**
   * IPv6 subnets configuration
   */
  ipv6Subnets?: Array<{
    subnet: string;
    created_at: string;
  }>;

  /**
   * Tags associated with the private network
   */
  tags?: Record<string, string>;

  /**
   * Time at which the private network was created
   */
  created_at: string;

  /**
   * Time at which the private network was last updated
   */
  updated_at: string;
}

async function createNewVpcPrivateNetwork(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayVpcPrivateNetworkProps,
  vpcId: string,
  id: string,
): Promise<ScalewayVpcPrivateNetworkApiResponse> {
  const createData: any = {
    name: props.name,
    project_id: api.projectId,
    vpc_id: vpcId,
  };

  if (props.ipv4Subnet) createData.ipv4_subnet = { subnet: props.ipv4Subnet };
  if (props.ipv6Subnets) {
    createData.ipv6_subnets = props.ipv6Subnets.map((subnet) => ({ subnet }));
  }
  if (props.tags) createData.tags = props.tags;

  const createResponse = await api.post(
    "/private-networks",
    createData,
    serviceBaseUrl,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "VPC private network", id);
  }

  return await createResponse.json();
}

/**
 * A Scaleway VPC Private Network provides isolated Layer 2 networking within a VPC.
 *
 * Private networks allow resources to communicate securely within the same network
 * using private IP addresses, without exposure to the public internet.
 *
 * @example
 * ## Basic Private Network
 *
 * Create a private network within a VPC:
 *
 * ```ts
 * const vpc = await ScalewayVpc("main-vpc", {
 *   name: "main-vpc",
 *   region: "fr-par",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 *
 * const privateNetwork = await ScalewayVpcPrivateNetwork("app-network", {
 *   name: "app-private-network",
 *   vpc: vpc,
 *   ipv4Subnet: "192.168.1.0/24",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Private Network with IPv6
 *
 * Create a private network with both IPv4 and IPv6 subnets:
 *
 * ```ts
 * const dualStackNetwork = await ScalewayVpcPrivateNetwork("dual-stack", {
 *   name: "dual-stack-network",
 *   vpc: "vpc-id-here",
 *   ipv4Subnet: "10.0.1.0/24",
 *   ipv6Subnets: ["fd00::/64"],
 *   tags: {
 *     environment: "production",
 *     stack: "dual"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayVpcPrivateNetwork = Resource(
  "scaleway::VpcPrivateNetwork",
  async function (
    this: Context<ScalewayVpcPrivateNetwork>,
    id: string,
    props: ScalewayVpcPrivateNetworkProps,
  ): Promise<ScalewayVpcPrivateNetwork> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/vpc/v1/regions/${region}`;

    // Extract VPC ID from vpc property
    const vpcId = typeof props.vpc === "string" ? props.vpc : props.vpc.id;
    const privateNetworkId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (privateNetworkId) {
          const deleteResponse = await api.delete(
            `/private-networks/${privateNetworkId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(
              deleteResponse,
              "delete",
              "VPC private network",
              id,
            );
          }
        }
      } catch (error) {
        logger.error(
          `Error deleting Scaleway VPC private network ${id}:`,
          error,
        );
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayVpcPrivateNetworkApiResponse;

    try {
      if (this.phase === "update" && privateNetworkId) {
        // Update existing private network
        const updateData: any = {};

        if (props.name !== undefined) updateData.name = props.name;
        if (props.tags !== undefined) updateData.tags = props.tags;
        // Note: VPC ID and subnets typically cannot be changed after creation

        const updateResponse = await api.patch(
          `/private-networks/${privateNetworkId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(
            updateResponse,
            "update",
            "VPC private network",
            id,
          );
        }

        // Get updated private network data
        const getResponse = await api.get(
          `/private-networks/${privateNetworkId}`,
          serviceBaseUrl,
        );
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "VPC private network", id);
        }

        response = await getResponse.json();
      } else {
        // Check if private network already exists
        if (privateNetworkId) {
          const getResponse = await api.get(
            `/private-networks/${privateNetworkId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "VPC private network", id);
            throw new Error("Failed to check if VPC private network exists");
          } else {
            // Private network doesn't exist, create new
            response = await createNewVpcPrivateNetwork(
              api,
              serviceBaseUrl,
              props,
              vpcId,
              id,
            );
          }
        } else {
          // Create new private network
          response = await createNewVpcPrivateNetwork(
            api,
            serviceBaseUrl,
            props,
            vpcId,
            id,
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway VPC private network ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::VpcPrivateNetwork",
      id: response.id,
      name: response.name,
      projectId: response.project_id,
      region: response.region as ScalewayRegion,
      organizationId: response.organization_id,
      vpcId: response.vpc_id,
      ipv4Subnet: response.ipv4_subnet,
      ipv6Subnets: response.ipv6_subnets,
      tags: response.tags,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },
);
