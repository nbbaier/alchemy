import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayZone,
} from "./api.ts";

/**
 * Scaleway Load Balancer types
 */
export type ScalewayLoadBalancerType =
  | "LB-S" // Small: 200 Mbps, 2,500 connections
  | "LB-GP-M" // General Purpose Medium: 1 Gbps, 10,000 connections
  | "LB-GP-L" // General Purpose Large: 2 Gbps, 20,000 connections
  | "LB-GP-XL"; // General Purpose Extra Large: 4 Gbps, 40,000 connections

/**
 * Scaleway Load Balancer states
 */
export type ScalewayLoadBalancerState =
  | "ready"
  | "pending"
  | "stopped"
  | "error"
  | "locked"
  | "migrating";

/**
 * Properties for creating or updating a Scaleway Load Balancer
 */
export interface ScalewayLoadBalancerProps extends ScalewayApiOptions {
  /**
   * Load balancer name
   */
  name: string;

  /**
   * Zone where the load balancer will be created
   * @default "{region}-1"
   */
  zone?: ScalewayZone;

  /**
   * Load balancer type
   * @default "LB-S"
   */
  type?: ScalewayLoadBalancerType;

  /**
   * Description for the load balancer
   */
  description?: string;

  /**
   * Whether to assign a public IPv4 address
   * @default true
   */
  assignFlexibleIp?: boolean;

  /**
   * Whether to assign a public IPv6 address
   * @default false
   */
  assignFlexibleIpv6?: boolean;

  /**
   * Private networks to attach the load balancer to
   */
  privateNetworks?: Array<{
    /**
     * Private network ID
     */
    privateNetworkId: string;

    /**
     * Static IP configuration for the private network
     */
    staticConfig?: {
      ipAddress: string[];
    };

    /**
     * DHCP configuration for the private network
     */
    dhcpConfig?: boolean;

    /**
     * IPAM configuration for the private network
     */
    ipamConfig?: boolean;
  }>;

  /**
   * SSL compatibility level
   * @default "ssl_compatibility_level_modern"
   */
  sslCompatibilityLevel?:
    | "ssl_compatibility_level_unknown"
    | "ssl_compatibility_level_intermediate"
    | "ssl_compatibility_level_modern"
    | "ssl_compatibility_level_old";

  /**
   * Tags for the load balancer
   */
  tags?: Record<string, string>;
}

/**
 * API response structure for Scaleway Load Balancer
 */
interface ScalewayLoadBalancerApiResponse {
  id: string;
  name: string;
  description: string;
  status: string;
  instances: Array<{
    id: string;
    status: string;
    ip_address: string;
    ipv6_address?: string;
    region: string;
    zone: string;
  }>;
  organization_id: string;
  project_id: string;
  type: string;
  tags: Record<string, string>;
  frontend_count: number;
  backend_count: number;
  private_network_count: number;
  ip: Array<{
    id: string;
    ip_address: string;
    organization_id: string;
    project_id: string;
    lb_id: string;
    reverse: string;
    zone: string;
  }>;
  ipv6?: Array<{
    id: string;
    ip_address: string;
    organization_id: string;
    project_id: string;
    lb_id: string;
    reverse: string;
    zone: string;
  }>;
  region: string;
  ssl_compatibility_level: string;
  created_at: string;
  updated_at: string;
}

/**
 * A Scaleway Load Balancer
 */
export interface ScalewayLoadBalancer
  extends Resource<"scaleway::LoadBalancer"> {
  /**
   * Load balancer unique identifier
   */
  id: string;

  /**
   * Load balancer name
   */
  name: string;

  /**
   * Description of the load balancer
   */
  description: string;

  /**
   * Current load balancer status
   */
  status: ScalewayLoadBalancerState;

  /**
   * Load balancer instances
   */
  instances: Array<{
    id: string;
    status: string;
    ipAddress: string;
    ipv6Address?: string;
    region: string;
    zone: string;
  }>;

  /**
   * Organization ID
   */
  organizationId: string;

  /**
   * Project ID
   */
  projectId: string;

  /**
   * Load balancer type
   */
  lbType: ScalewayLoadBalancerType;

  /**
   * Tags associated with the load balancer
   */
  tags: Record<string, string>;

  /**
   * Number of frontends
   */
  frontendCount: number;

  /**
   * Number of backends
   */
  backendCount: number;

  /**
   * Number of private networks
   */
  privateNetworkCount: number;

  /**
   * IPv4 addresses assigned to the load balancer
   */
  ip: Array<{
    id: string;
    ipAddress: string;
    organizationId: string;
    projectId: string;
    lbId: string;
    reverse: string;
    zone: string;
  }>;

  /**
   * IPv6 addresses assigned to the load balancer
   */
  ipv6?: Array<{
    id: string;
    ipAddress: string;
    organizationId: string;
    projectId: string;
    lbId: string;
    reverse: string;
    zone: string;
  }>;

  /**
   * Region where the load balancer is located
   */
  region: string;

  /**
   * SSL compatibility level
   */
  sslCompatibilityLevel: string;

  /**
   * Time at which the load balancer was created
   */
  created_at: string;

  /**
   * Time at which the load balancer was last updated
   */
  updated_at: string;
}

async function createNewLoadBalancer(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  props: ScalewayLoadBalancerProps,
  id: string,
): Promise<ScalewayLoadBalancerApiResponse> {
  const createData: any = {
    name: props.name,
    type: props.type || "LB-S",
    project_id: api.projectId,
    assign_flexible_ip: props.assignFlexibleIp !== false,
    assign_flexible_ipv6: props.assignFlexibleIpv6 || false,
    ssl_compatibility_level:
      props.sslCompatibilityLevel || "ssl_compatibility_level_modern",
  };

  if (props.description) createData.description = props.description;
  if (props.tags) createData.tags = props.tags;

  const createResponse = await api.post("/lbs", createData, serviceBaseUrl);

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "load balancer", id);
  }

  return await createResponse.json();
}

async function waitForLoadBalancerState(
  api: ReturnType<typeof createScalewayApi>,
  serviceBaseUrl: string,
  lbId: string,
  targetState: ScalewayLoadBalancerState,
  timeoutMs = 600000, // 10 minutes
): Promise<ScalewayLoadBalancerApiResponse> {
  const startTime = Date.now();

  while (Date.now() - startTime < timeoutMs) {
    const getResponse = await api.get(`/lbs/${lbId}`, serviceBaseUrl);
    if (!getResponse.ok) {
      throw new Error(
        `Failed to check load balancer state: ${getResponse.status}`,
      );
    }

    const response: ScalewayLoadBalancerApiResponse = await getResponse.json();
    const currentState = response.status as ScalewayLoadBalancerState;

    if (currentState === targetState) {
      return response;
    }

    if (currentState === "error") {
      throw new Error(`Load balancer ${lbId} entered error state`);
    }

    // Wait 10 seconds before checking again
    await new Promise((resolve) => setTimeout(resolve, 10000));
  }

  throw new Error(
    `Timeout waiting for load balancer ${lbId} to reach state ${targetState}`,
  );
}

/**
 * A Scaleway Load Balancer distributes incoming network traffic across multiple backend servers
 * to ensure high availability and reliability of applications.
 *
 * Load balancers provide Layer 4 (TCP/UDP) and Layer 7 (HTTP/HTTPS) load balancing
 * with SSL termination, health checks, and automatic failover.
 *
 * @example
 * ## Basic Load Balancer
 *
 * Create a simple load balancer:
 *
 * ```ts
 * const loadBalancer = await ScalewayLoadBalancer("app-lb", {
 *   name: "app-load-balancer",
 *   type: "LB-S",
 *   zone: "fr-par-1",
 *   description: "Load balancer for web application",
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## High-Performance Load Balancer
 *
 * Create a high-performance load balancer for production:
 *
 * ```ts
 * const prodLoadBalancer = await ScalewayLoadBalancer("prod-lb", {
 *   name: "production-load-balancer",
 *   type: "LB-GP-L",
 *   zone: "fr-par-1",
 *   description: "Production load balancer with high throughput",
 *   assignFlexibleIp: true,
 *   assignFlexibleIpv6: true,
 *   sslCompatibilityLevel: "ssl_compatibility_level_modern",
 *   tags: {
 *     environment: "production",
 *     team: "platform"
 *   },
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Private Network Load Balancer
 *
 * Create a load balancer with private network connectivity:
 *
 * ```ts
 * const privateLb = await ScalewayLoadBalancer("private-lb", {
 *   name: "internal-load-balancer",
 *   type: "LB-GP-M",
 *   zone: "fr-par-1",
 *   assignFlexibleIp: false, // Internal only
 *   privateNetworks: [{
 *     privateNetworkId: "private-network-id-here",
 *     staticConfig: {
 *       ipAddress: ["192.168.1.10"]
 *     }
 *   }],
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayLoadBalancer = Resource(
  "scaleway::LoadBalancer",
  async function (
    this: Context<ScalewayLoadBalancer>,
    id: string,
    props: ScalewayLoadBalancerProps,
  ): Promise<ScalewayLoadBalancer> {
    const api = createScalewayApi(props);
    const zone = props.zone || `${api.region}-1`;
    const serviceBaseUrl = `https://api.scaleway.com/lb/v1/zones/${zone}`;

    const lbId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (lbId) {
          const deleteResponse = await api.delete(
            `/lbs/${lbId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "load balancer", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway load balancer ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayLoadBalancerApiResponse;

    try {
      if (this.phase === "update" && lbId) {
        // Update existing load balancer
        const updateData: any = {};

        if (props.name !== undefined) updateData.name = props.name;
        if (props.description !== undefined)
          updateData.description = props.description;
        if (props.tags !== undefined) updateData.tags = props.tags;
        if (props.sslCompatibilityLevel !== undefined) {
          updateData.ssl_compatibility_level = props.sslCompatibilityLevel;
        }

        const updateResponse = await api.patch(
          `/lbs/${lbId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "load balancer", id);
        }

        // Wait for load balancer to be ready after update
        response = await waitForLoadBalancerState(
          api,
          serviceBaseUrl,
          lbId,
          "ready",
        );
      } else {
        // Check if load balancer already exists
        if (lbId) {
          const getResponse = await api.get(`/lbs/${lbId}`, serviceBaseUrl);
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "load balancer", id);
            throw new Error("Failed to check if load balancer exists");
          } else {
            // Load balancer doesn't exist, create new
            response = await createNewLoadBalancer(
              api,
              serviceBaseUrl,
              props,
              id,
            );
            // Wait for load balancer to be ready
            response = await waitForLoadBalancerState(
              api,
              serviceBaseUrl,
              response.id,
              "ready",
            );
          }
        } else {
          // Create new load balancer
          response = await createNewLoadBalancer(
            api,
            serviceBaseUrl,
            props,
            id,
          );
          // Wait for load balancer to be ready
          response = await waitForLoadBalancerState(
            api,
            serviceBaseUrl,
            response.id,
            "ready",
          );
        }
      }
    } catch (error) {
      logger.error(`Error managing Scaleway load balancer ${id}:`, error);
      throw error;
    }

    return {
      type: "scaleway::LoadBalancer",
      id: response.id,
      name: response.name,
      description: response.description,
      status: response.status as ScalewayLoadBalancerState,
      instances: response.instances.map((instance) => ({
        id: instance.id,
        status: instance.status,
        ipAddress: instance.ip_address,
        ipv6Address: instance.ipv6_address,
        region: instance.region,
        zone: instance.zone,
      })),
      organizationId: response.organization_id,
      projectId: response.project_id,
      lbType: response.type as ScalewayLoadBalancerType,
      tags: response.tags || {},
      frontendCount: response.frontend_count,
      backendCount: response.backend_count,
      privateNetworkCount: response.private_network_count,
      ip: response.ip.map((ip) => ({
        id: ip.id,
        ipAddress: ip.ip_address,
        organizationId: ip.organization_id,
        projectId: ip.project_id,
        lbId: ip.lb_id,
        reverse: ip.reverse,
        zone: ip.zone,
      })),
      ipv6: response.ipv6?.map((ipv6) => ({
        id: ipv6.id,
        ipAddress: ipv6.ip_address,
        organizationId: ipv6.organization_id,
        projectId: ipv6.project_id,
        lbId: ipv6.lb_id,
        reverse: ipv6.reverse,
        zone: ipv6.zone,
      })),
      region: response.region,
      sslCompatibilityLevel: response.ssl_compatibility_level,
      created_at: response.created_at,
      updated_at: response.updated_at,
    };
  },
);
