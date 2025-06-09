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
 * Scaleway security group rule direction
 */
export type ScalewaySecurityGroupRuleDirection = "inbound" | "outbound";

/**
 * Scaleway security group rule action
 */
export type ScalewaySecurityGroupRuleAction = "accept" | "drop";

/**
 * Scaleway security group rule protocol
 */
export type ScalewaySecurityGroupRuleProtocol = "TCP" | "UDP" | "ICMP" | "ANY";

/**
 * Scaleway security group rule
 */
export interface ScalewaySecurityGroupRule {
  /**
   * Rule ID
   */
  id?: string;

  /**
   * Rule direction
   */
  direction: ScalewaySecurityGroupRuleDirection;

  /**
   * Rule action
   */
  action: ScalewaySecurityGroupRuleAction;

  /**
   * IP range (CIDR notation)
   * @default "0.0.0.0/0"
   */
  ip_range?: string;

  /**
   * Protocol
   * @default "TCP"
   */
  protocol?: ScalewaySecurityGroupRuleProtocol;

  /**
   * Destination port (for TCP/UDP)
   */
  dest_port_from?: number;

  /**
   * Destination port range end (for TCP/UDP)
   */
  dest_port_to?: number;

  /**
   * Position of the rule in the list
   */
  position?: number;
}

/**
 * Properties for creating or updating a Scaleway security group
 */
export interface ScalewaySecurityGroupProps extends ScalewayApiOptions {
  /**
   * Security group name
   */
  name: string;

  /**
   * Security group description
   */
  description?: string;

  /**
   * Zone where the security group will be created
   * @default "{region}-1"
   */
  zone?: ScalewayZone;

  /**
   * Whether to enable stateful connections
   * @default true
   */
  stateful?: boolean;

  /**
   * Default inbound policy
   * @default "drop"
   */
  inbound_default_policy?: ScalewaySecurityGroupRuleAction;

  /**
   * Default outbound policy
   * @default "accept"
   */
  outbound_default_policy?: ScalewaySecurityGroupRuleAction;

  /**
   * Security group rules
   */
  rules?: ScalewaySecurityGroupRule[];

  /**
   * Tags for the security group
   */
  tags?: string[];
}

/**
 * API response structure for Scaleway security groups
 */
interface ScalewaySecurityGroupApiResponse {
  security_group: {
    id: string;
    name: string;
    description: string;
    organization: string;
    project: string;
    zone: string;
    stateful: boolean;
    inbound_default_policy: string;
    outbound_default_policy: string;
    organization_default: boolean;
    project_default: boolean;
    tags: string[];
    creation_date: string;
    modification_date: string;
    servers: Array<{
      id: string;
      name: string;
    }>;
  };
  rules?: Array<{
    id: string;
    direction: string;
    action: string;
    ip_range: string;
    protocol: string;
    dest_port_from?: number;
    dest_port_to?: number;
    position: number;
  }>;
}

/**
 * A Scaleway security group
 */
export interface ScalewaySecurityGroup
  extends Resource<"scaleway::SecurityGroup"> {
  /**
   * Security group ID
   */
  id: string;

  /**
   * Security group name
   */
  name: string;

  /**
   * Security group description
   */
  description: string;

  /**
   * Zone where the security group is located
   */
  zone: ScalewayZone;

  /**
   * Whether stateful connections are enabled
   */
  stateful: boolean;

  /**
   * Default inbound policy
   */
  inbound_default_policy: ScalewaySecurityGroupRuleAction;

  /**
   * Default outbound policy
   */
  outbound_default_policy: ScalewaySecurityGroupRuleAction;

  /**
   * Whether this is the organization default security group
   */
  organization_default: boolean;

  /**
   * Whether this is the project default security group
   */
  project_default: boolean;

  /**
   * Security group tags
   */
  tags: string[];

  /**
   * Time at which the security group was created
   */
  created_at: string;

  /**
   * Time at which the security group was last updated
   */
  updated_at: string;

  /**
   * Servers attached to this security group
   */
  servers: Array<{
    id: string;
    name: string;
  }>;

  /**
   * Security group rules
   */
  rules: ScalewaySecurityGroupRule[];
}

/**
 * Creates a Scaleway security group with firewall rules.
 *
 * @example
 * ## Basic Security Group
 *
 * Create a security group with SSH and HTTP access:
 *
 * ```ts
 * const webSg = await ScalewaySecurityGroup("web-sg", {
 *   name: "web-servers",
 *   description: "Security group for web servers",
 *   rules: [
 *     {
 *       direction: "inbound",
 *       action: "accept",
 *       protocol: "TCP",
 *       dest_port_from: 22,
 *       dest_port_to: 22,
 *       ip_range: "0.0.0.0/0"
 *     },
 *     {
 *       direction: "inbound",
 *       action: "accept",
 *       protocol: "TCP",
 *       dest_port_from: 80,
 *       dest_port_to: 80,
 *       ip_range: "0.0.0.0/0"
 *     },
 *     {
 *       direction: "inbound",
 *       action: "accept",
 *       protocol: "TCP",
 *       dest_port_from: 443,
 *       dest_port_to: 443,
 *       ip_range: "0.0.0.0/0"
 *     }
 *   ]
 * });
 * ```
 *
 * @example
 * ## Database Security Group
 *
 * Create a security group for database servers with restricted access:
 *
 * ```ts
 * const dbSg = await ScalewaySecurityGroup("db-sg", {
 *   name: "database-servers",
 *   description: "Security group for database servers",
 *   inbound_default_policy: "drop",
 *   outbound_default_policy: "accept",
 *   rules: [
 *     {
 *       direction: "inbound",
 *       action: "accept",
 *       protocol: "TCP",
 *       dest_port_from: 5432,
 *       dest_port_to: 5432,
 *       ip_range: "10.0.0.0/8"
 *     }
 *   ],
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 *
 * @example
 * ## Custom Zone Security Group
 *
 * Create a security group in a specific zone:
 *
 * ```ts
 * const customSg = await ScalewaySecurityGroup("custom-sg", {
 *   name: "custom-zone-sg",
 *   zone: "nl-ams-1",
 *   tags: ["custom", "amsterdam"]
 * });
 * ```
 */
export const ScalewaySecurityGroup = Resource(
  "scaleway::SecurityGroup",
  async function (
    this: Context<ScalewaySecurityGroup>,
    id: string,
    props: ScalewaySecurityGroupProps,
  ): Promise<ScalewaySecurityGroup> {
    const api = createScalewayApi(props);
    const zone = props.zone || `${api.region}-1`;
    const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${zone}`;

    const securityGroupId = this.output?.id;

    if (this.phase === "delete") {
      try {
        if (securityGroupId) {
          const deleteResponse = await api.delete(
            `/security_groups/${securityGroupId}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(
              deleteResponse,
              "delete",
              "security group",
              id,
            );
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway security group ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewaySecurityGroupApiResponse;

    try {
      if (this.phase === "update" && securityGroupId) {
        // Update existing security group
        const updateData: any = {};

        if (props.name) updateData.name = props.name;
        if (props.description !== undefined)
          updateData.description = props.description;
        if (props.stateful !== undefined) updateData.stateful = props.stateful;
        if (props.inbound_default_policy !== undefined)
          updateData.inbound_default_policy = props.inbound_default_policy;
        if (props.outbound_default_policy !== undefined)
          updateData.outbound_default_policy = props.outbound_default_policy;
        if (props.tags !== undefined) updateData.tags = props.tags;

        const updateResponse = await api.patch(
          `/security_groups/${securityGroupId}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "security group", id);
        }

        // Update rules if provided
        if (props.rules) {
          await updateSecurityGroupRules(
            api,
            securityGroupId,
            props.rules,
            serviceBaseUrl,
          );
        }

        // Get updated security group data with rules
        response = await getSecurityGroupWithRules(
          api,
          securityGroupId,
          serviceBaseUrl,
        );
      } else {
        // Check if security group already exists
        if (securityGroupId) {
          const getResponse = await api.get(
            `/security_groups/${securityGroupId}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getSecurityGroupWithRules(
              api,
              securityGroupId,
              serviceBaseUrl,
            );
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "security group", id);
            throw new Error("Failed to check if security group exists");
          } else {
            // Security group doesn't exist, create new
            response = await createNewSecurityGroup(
              api,
              props,
              zone,
              serviceBaseUrl,
            );
          }
        } else {
          // No output ID, create new security group
          response = await createNewSecurityGroup(
            api,
            props,
            zone,
            serviceBaseUrl,
          );
        }
      }

      return this({
        id: response.security_group.id,
        name: response.security_group.name,
        description: response.security_group.description,
        zone: response.security_group.zone as ScalewayZone,
        stateful: response.security_group.stateful,
        inbound_default_policy: response.security_group
          .inbound_default_policy as ScalewaySecurityGroupRuleAction,
        outbound_default_policy: response.security_group
          .outbound_default_policy as ScalewaySecurityGroupRuleAction,
        organization_default: response.security_group.organization_default,
        project_default: response.security_group.project_default,
        tags: response.security_group.tags,
        created_at: response.security_group.creation_date,
        updated_at: response.security_group.modification_date,
        servers: response.security_group.servers,
        rules:
          response.rules?.map((rule) => ({
            id: rule.id,
            direction: rule.direction as ScalewaySecurityGroupRuleDirection,
            action: rule.action as ScalewaySecurityGroupRuleAction,
            ip_range: rule.ip_range,
            protocol: rule.protocol as ScalewaySecurityGroupRuleProtocol,
            dest_port_from: rule.dest_port_from,
            dest_port_to: rule.dest_port_to,
            position: rule.position,
          })) || [],
      });
    } catch (error) {
      logger.error(
        `Error ${this.phase} Scaleway security group '${id}':`,
        error,
      );
      throw error;
    }
  },
);

/**
 * Helper function to create a new Scaleway security group
 */
async function createNewSecurityGroup(
  api: any,
  props: ScalewaySecurityGroupProps,
  _zone: ScalewayZone,
  serviceBaseUrl: string,
): Promise<ScalewaySecurityGroupApiResponse> {
  const createData = {
    name: props.name,
    description: props.description || "",
    stateful: props.stateful ?? true,
    inbound_default_policy: props.inbound_default_policy || "drop",
    outbound_default_policy: props.outbound_default_policy || "accept",
    project: api.projectId,
    tags: props.tags || [],
  };

  const createResponse = await api.post(
    "/security_groups",
    createData,
    serviceBaseUrl,
  );

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "security group");
  }

  const response: ScalewaySecurityGroupApiResponse =
    await createResponse.json();

  // Add rules if provided
  if (props.rules && props.rules.length > 0) {
    await updateSecurityGroupRules(
      api,
      response.security_group.id,
      props.rules,
      serviceBaseUrl,
    );
    // Get updated data with rules
    return await getSecurityGroupWithRules(
      api,
      response.security_group.id,
      serviceBaseUrl,
    );
  }

  return response;
}

/**
 * Helper function to update security group rules
 */
async function updateSecurityGroupRules(
  api: any,
  securityGroupId: string,
  rules: ScalewaySecurityGroupRule[],
  serviceBaseUrl: string,
): Promise<void> {
  // Get existing rules
  const rulesResponse = await api.get(
    `/security_groups/${securityGroupId}/rules`,
    serviceBaseUrl,
  );
  if (!rulesResponse.ok) {
    throw new Error(
      `Failed to get existing rules: HTTP ${rulesResponse.status}`,
    );
  }

  const existingRulesData = await rulesResponse.json();
  const existingRules = existingRulesData.rules || [];

  // Delete existing rules
  for (const rule of existingRules) {
    const deleteResponse = await api.delete(
      `/security_groups/${securityGroupId}/rules/${rule.id}`,
      serviceBaseUrl,
    );
    if (!deleteResponse.ok) {
      logger.warn(`Failed to delete existing rule ${rule.id}`);
    }
  }

  // Add new rules
  for (let i = 0; i < rules.length; i++) {
    const rule = rules[i];
    const ruleData = {
      direction: rule.direction,
      action: rule.action,
      ip_range: rule.ip_range || "0.0.0.0/0",
      protocol: rule.protocol || "TCP",
      dest_port_from: rule.dest_port_from,
      dest_port_to: rule.dest_port_to || rule.dest_port_from,
      position: rule.position || i + 1,
    };

    const createRuleResponse = await api.post(
      `/security_groups/${securityGroupId}/rules`,
      ruleData,
      serviceBaseUrl,
    );

    if (!createRuleResponse.ok) {
      logger.warn(
        `Failed to create rule ${i + 1}: HTTP ${createRuleResponse.status}`,
      );
    }
  }
}

/**
 * Helper function to get security group with rules
 */
async function getSecurityGroupWithRules(
  api: any,
  securityGroupId: string,
  serviceBaseUrl: string,
): Promise<ScalewaySecurityGroupApiResponse> {
  // Get security group
  const sgResponse = await api.get(
    `/security_groups/${securityGroupId}`,
    serviceBaseUrl,
  );
  if (!sgResponse.ok) {
    throw new Error(`Failed to get security group: HTTP ${sgResponse.status}`);
  }

  // Get rules
  const rulesResponse = await api.get(
    `/security_groups/${securityGroupId}/rules`,
    serviceBaseUrl,
  );
  if (!rulesResponse.ok) {
    throw new Error(
      `Failed to get security group rules: HTTP ${rulesResponse.status}`,
    );
  }

  const sgData = await sgResponse.json();
  const rulesData = await rulesResponse.json();

  return {
    security_group: sgData.security_group,
    rules: rulesData.rules || [],
  };
}
