import { describe, expect } from "vitest";
import { destroy } from "../../alchemy/src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { AMIBuilder } from "../../alchemy/src/aws/ami-builder.ts";

import "../../alchemy/src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("AWS AMI Builder", () => {
  test("creates custom AMI for GitHub runners", async (scope) => {
    const amiId = `${BRANCH_PREFIX}-github-runner-ami`;
    let ami: typeof AMIBuilder;
    
    try {
      // Create AMI with custom user data
      ami = await AMIBuilder(amiId, {
        name: "test-github-runner",
        userData: `#!/bin/bash
# Install test packages
apt-get update
apt-get install -y git curl docker.io
echo "AMI build complete" > /opt/build-complete.txt`,
        tags: {
          Environment: "test",
          Purpose: "github-runner"
        }
      });

      expect(ami).toMatchObject({
        name: "test-github-runner",
        state: "pending",
        tags: {
          Environment: "test",
          Purpose: "github-runner"
        }
      });

      expect(ami.amiId).toBeDefined();
      expect(ami.arn).toBeDefined();

      // Update with different configuration
      ami = await AMIBuilder(amiId, {
        name: "test-github-runner-v2",
        instanceType: "t3.large",
        userData: `#!/bin/bash
# Updated build script
apt-get update
apt-get install -y git curl docker.io nodejs npm
echo "AMI build v2 complete" > /opt/build-complete.txt`,
        tags: {
          Environment: "test",
          Purpose: "github-runner",
          Version: "v2"
        }
      });

      expect(ami).toMatchObject({
        name: "test-github-runner-v2",
        tags: {
          Environment: "test",
          Purpose: "github-runner",
          Version: "v2"
        }
      });

    } finally {
      await destroy(scope);
      // Note: In a real implementation, we would verify the AMI was properly cleaned up
      // For now, we assume the destroy operation handles the cleanup
    }
  });

  test("creates AMI with default configuration", async (scope) => {
    const amiId = `${BRANCH_PREFIX}-default-ami`;
    let ami: typeof AMIBuilder;
    
    try {
      // Create with minimal configuration
      ami = await AMIBuilder(amiId, {
        name: "test-default-ami"
      });

      expect(ami).toMatchObject({
        name: "test-default-ami",
        state: "pending"
      });

      expect(ami.amiId).toBeDefined();
      expect(ami.arn).toBeDefined();

    } finally {
      await destroy(scope);
    }
  });

  test("creates AMI with network configuration", async (scope) => {
    const amiId = `${BRANCH_PREFIX}-network-ami`;
    let ami: typeof AMIBuilder;
    
    try {
      // Create with VPC and security group configuration
      ami = await AMIBuilder(amiId, {
        name: "test-network-ami",
        subnetId: "subnet-test123",
        securityGroupIds: ["sg-test123", "sg-test456"],
        instanceProfile: "test-build-profile",
        tags: {
          Network: "test-vpc"
        }
      });

      expect(ami).toMatchObject({
        name: "test-network-ami",
        state: "pending",
        tags: {
          Network: "test-vpc"
        }
      });

    } finally {
      await destroy(scope);
    }
  });
});