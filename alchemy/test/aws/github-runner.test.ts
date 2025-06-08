import { describe, expect } from "vitest";
import { destroy } from "../../alchemy/src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { GitHubRunner } from "../../alchemy/src/aws/github-runner.ts";

import "../../alchemy/src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("AWS GitHub Runner", () => {
  test("creates organization-wide runner infrastructure", async (scope) => {
    const runnerId = `${BRANCH_PREFIX}-org-runner`;
    let runner: typeof GitHubRunner;
    
    try {
      // Create organization-wide runners
      runner = await GitHubRunner(runnerId, {
        name: "test-org-runners",
        githubTarget: "testorg",
        githubToken: "ghp_test_token_123",
        amiId: "ami-test123",
        vpc: {
          vpcId: "vpc-test123",
          subnetIds: ["subnet-test1", "subnet-test2"]
        },
        scaling: {
          minSize: 0,
          maxSize: 5,
          desiredCapacity: 2
        },
        labels: ["linux", "x64", "production"],
        useSpotInstances: true,
        tags: {
          Environment: "test",
          Team: "platform"
        }
      });

      expect(runner).toMatchObject({
        name: "test-org-runners",
        activeRunners: 2,
        registrationUrl: "https://github.com/testorg/settings/actions/runners"
      });

      expect(runner.autoScalingGroupArn).toBeDefined();
      expect(runner.launchTemplateArn).toBeDefined();
      expect(runner.securityGroupId).toBeDefined();
      expect(runner.roleArn).toBeDefined();

      // Update scaling configuration
      runner = await GitHubRunner(runnerId, {
        name: "test-org-runners",
        githubTarget: "testorg",
        githubToken: "ghp_test_token_123",
        amiId: "ami-test123",
        vpc: {
          vpcId: "vpc-test123",
          subnetIds: ["subnet-test1", "subnet-test2"]
        },
        scaling: {
          minSize: 1,
          maxSize: 10,
          desiredCapacity: 3
        },
        labels: ["linux", "x64", "production", "updated"],
        useSpotInstances: true,
        tags: {
          Environment: "test",
          Team: "platform",
          Version: "v2"
        }
      });

      expect(runner).toMatchObject({
        name: "test-org-runners",
        activeRunners: 3
      });

    } finally {
      await destroy(scope);
    }
  });

  test("creates repository-specific runner infrastructure", async (scope) => {
    const runnerId = `${BRANCH_PREFIX}-repo-runner`;
    let runner: typeof GitHubRunner;
    
    try {
      // Create repository-specific runners
      runner = await GitHubRunner(runnerId, {
        name: "test-repo-runners",
        githubTarget: "testorg/backend-service",
        githubToken: "ghp_test_token_456",
        amiId: "ami-test456",
        instanceTypes: ["c5.large", "c5.xlarge"],
        vpc: {
          vpcId: "vpc-test456",
          subnetIds: ["subnet-private1"]
        },
        scaling: {
          minSize: 1,
          maxSize: 3,
          desiredCapacity: 1,
          scaleUpThreshold: 3,
          scaleDownDelayMinutes: 15
        },
        labels: ["backend", "docker", "database"],
        securityGroupIds: ["sg-backend123"],
        tags: {
          Application: "backend-service",
          Environment: "production"
        }
      });

      expect(runner).toMatchObject({
        name: "test-repo-runners",
        activeRunners: 1,
        registrationUrl: "https://github.com/testorg/backend-service/settings/actions/runners"
      });

      expect(runner.autoScalingGroupArn).toBeDefined();
      expect(runner.launchTemplateArn).toBeDefined();
      expect(runner.securityGroupId).toBeDefined();
      expect(runner.roleArn).toBeDefined();

    } finally {
      await destroy(scope);
    }
  });

  test("creates minimal runner configuration", async (scope) => {
    const runnerId = `${BRANCH_PREFIX}-minimal-runner`;
    let runner: typeof GitHubRunner;
    
    try {
      // Create with minimal required configuration
      runner = await GitHubRunner(runnerId, {
        name: "test-minimal",
        githubTarget: "testuser",
        githubToken: "ghp_minimal_token",
        amiId: "ami-minimal123",
        vpc: {
          vpcId: "vpc-minimal",
          subnetIds: ["subnet-minimal"]
        }
      });

      expect(runner).toMatchObject({
        name: "test-minimal",
        activeRunners: 1, // default desired capacity
        registrationUrl: "https://github.com/testuser/settings/actions/runners"
      });

      expect(runner.autoScalingGroupArn).toBeDefined();
      expect(runner.launchTemplateArn).toBeDefined();
      expect(runner.securityGroupId).toBeDefined();
      expect(runner.roleArn).toBeDefined();

    } finally {
      await destroy(scope);
    }
  });

  test("handles multiple instance types for mixed instance policy", async (scope) => {
    const runnerId = `${BRANCH_PREFIX}-mixed-runner`;
    let runner: typeof GitHubRunner;
    
    try {
      // Create with multiple instance types
      runner = await GitHubRunner(runnerId, {
        name: "test-mixed-instances",
        githubTarget: "testorg/mixed-workloads",
        githubToken: "ghp_mixed_token",
        amiId: "ami-mixed123",
        instanceTypes: ["t3.medium", "t3.large", "c5.large"],
        vpc: {
          vpcId: "vpc-mixed",
          subnetIds: ["subnet-mixed1", "subnet-mixed2", "subnet-mixed3"]
        },
        scaling: {
          minSize: 0,
          maxSize: 8,
          desiredCapacity: 2
        },
        useSpotInstances: true,
        labels: ["mixed", "cost-optimized"]
      });

      expect(runner).toMatchObject({
        name: "test-mixed-instances",
        activeRunners: 2
      });

    } finally {
      await destroy(scope);
    }
  });
});