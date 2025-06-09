import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewaySecurityGroup } from "../../src/scaleway/security-group.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway", () => {
  test("SecurityGroup lifecycle", async (scope) => {
    const sgId = `${BRANCH_PREFIX}-sg-test`;
    let securityGroup: ScalewaySecurityGroup;

    try {
      // Create security group
      securityGroup = await ScalewaySecurityGroup(sgId, {
        name: `${sgId}-web`,
        description: "Test security group for web servers",
        zone: "fr-par-1",
        stateful: true,
        inbound_default_policy: "drop",
        outbound_default_policy: "accept",
        rules: [
          {
            direction: "inbound",
            action: "accept",
            protocol: "TCP",
            dest_port_from: 22,
            dest_port_to: 22,
            ip_range: "0.0.0.0/0",
          },
          {
            direction: "inbound",
            action: "accept",
            protocol: "TCP",
            dest_port_from: 80,
            dest_port_to: 80,
            ip_range: "0.0.0.0/0",
          },
        ],
        tags: ["test", "web"],
      });

      expect(securityGroup).toMatchObject({
        name: `${sgId}-web`,
        description: "Test security group for web servers",
        zone: "fr-par-1",
        stateful: true,
        inbound_default_policy: "drop",
        outbound_default_policy: "accept",
        tags: ["test", "web"],
      });

      expect(securityGroup.id).toBeTruthy();
      expect(securityGroup.created_at).toBeTruthy();
      expect(securityGroup.rules).toHaveLength(2);

      // Check first rule
      const sshRule = securityGroup.rules.find((r) => r.dest_port_from === 22);
      expect(sshRule).toMatchObject({
        direction: "inbound",
        action: "accept",
        protocol: "TCP",
        dest_port_from: 22,
        dest_port_to: 22,
        ip_range: "0.0.0.0/0",
      });

      // Update security group
      securityGroup = await ScalewaySecurityGroup(sgId, {
        name: `${sgId}-web-updated`,
        description: "Updated test security group",
        zone: "fr-par-1",
        stateful: true,
        inbound_default_policy: "drop",
        outbound_default_policy: "accept",
        rules: [
          {
            direction: "inbound",
            action: "accept",
            protocol: "TCP",
            dest_port_from: 22,
            dest_port_to: 22,
            ip_range: "0.0.0.0/0",
          },
          {
            direction: "inbound",
            action: "accept",
            protocol: "TCP",
            dest_port_from: 443,
            dest_port_to: 443,
            ip_range: "0.0.0.0/0",
          },
        ],
        tags: ["test", "web", "updated"],
      });

      expect(securityGroup).toMatchObject({
        name: `${sgId}-web-updated`,
        description: "Updated test security group",
        tags: ["test", "web", "updated"],
      });

      expect(securityGroup.rules).toHaveLength(2);

      // Check updated rule (should be HTTPS instead of HTTP)
      const httpsRule = securityGroup.rules.find(
        (r) => r.dest_port_from === 443,
      );
      expect(httpsRule).toMatchObject({
        direction: "inbound",
        action: "accept",
        protocol: "TCP",
        dest_port_from: 443,
        dest_port_to: 443,
      });
    } finally {
      await destroy(scope);
      if (securityGroup!) {
        await assertSecurityGroupDoesNotExist(securityGroup);
      }
    }
  });
});

async function assertSecurityGroupDoesNotExist(
  securityGroup: ScalewaySecurityGroup,
) {
  const api = createScalewayApi();
  const zone = securityGroup.zone;
  const serviceBaseUrl = `https://api.scaleway.com/instance/v1/zones/${zone}`;

  const response = await api.get(
    `/security_groups/${securityGroup.id}`,
    serviceBaseUrl,
  );

  if (response.ok) {
    throw new Error(
      `Security group ${securityGroup.id} still exists after deletion`,
    );
  }

  if (response.status !== 404) {
    throw new Error(
      `Unexpected error checking security group ${securityGroup.id}: HTTP ${response.status}`,
    );
  }
}
