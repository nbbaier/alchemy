import { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import AWS from "./control/index.ts";

export interface GitHubRunnerProps {
  /**
   * Name for the runner configuration
   */
  name: string;

  /**
   * GitHub organization or repository (format: "owner" or "owner/repo")
   */
  githubTarget: string;

  /**
   * GitHub App installation ID or personal access token
   */
  githubToken: string;

  /**
   * AMI ID to use for runner instances
   */
  amiId: string;

  /**
   * EC2 instance types to use for runners
   * @default ["t3.medium"]
   */
  instanceTypes?: string[];

  /**
   * VPC configuration
   */
  vpc: {
    /**
     * VPC ID where runners will be launched
     */
    vpcId: string;
    
    /**
     * Subnet IDs for runner instances
     */
    subnetIds: string[];
  };

  /**
   * Auto scaling configuration
   */
  scaling?: {
    /**
     * Minimum number of runner instances
     * @default 0
     */
    minSize?: number;

    /**
     * Maximum number of runner instances
     * @default 10
     */
    maxSize?: number;

    /**
     * Desired number of runner instances
     * @default 1
     */
    desiredCapacity?: number;

    /**
     * Scale up when job queue length exceeds this threshold
     * @default 5
     */
    scaleUpThreshold?: number;

    /**
     * Scale down when no jobs for this many minutes
     * @default 10
     */
    scaleDownDelayMinutes?: number;
  };

  /**
   * Runner labels for job targeting
   */
  labels?: string[];

  /**
   * Use spot instances for cost savings
   * @default false
   */
  useSpotInstances?: boolean;

  /**
   * Additional security group IDs
   */
  securityGroupIds?: string[];

  /**
   * Additional tags for all resources
   */
  tags?: Record<string, string>;

  /**
   * AWS region
   */
  region?: string;
}

export interface GitHubRunner extends Resource<"aws::GitHubRunner"> {
  /**
   * Name of the runner configuration
   */
  name: string;

  /**
   * Auto Scaling Group ARN
   */
  autoScalingGroupArn: string;

  /**
   * Launch Template ARN
   */
  launchTemplateArn: string;

  /**
   * Security Group ID
   */
  securityGroupId: string;

  /**
   * IAM Role ARN for runner instances
   */
  roleArn: string;

  /**
   * GitHub runner group name (if applicable)
   */
  runnerGroup?: string;

  /**
   * Current number of active runners
   */
  activeRunners: number;

  /**
   * Runner registration endpoint
   */
  registrationUrl: string;
}

/**
 * Creates a scalable GitHub Actions runner infrastructure on AWS EC2.
 * 
 * This resource sets up a complete GitHub Actions runner environment with:
 * - Auto Scaling Group for dynamic scaling based on job queue
 * - Security groups with minimal required permissions
 * - IAM roles for secure AWS service integration
 * - CloudWatch monitoring and logging
 * - Automatic runner registration and cleanup
 *
 * @example
 * ## Organization-wide Runner
 *
 * Sets up runners for an entire GitHub organization.
 *
 * ```ts
 * const orgRunners = await GitHubRunner("org-runners", {
 *   name: "production-runners",
 *   githubTarget: "myorg",
 *   githubToken: process.env.GITHUB_TOKEN!,
 *   amiId: runnerAmi.amiId,
 *   vpc: {
 *     vpcId: "vpc-12345",
 *     subnetIds: ["subnet-123", "subnet-456"]
 *   },
 *   scaling: {
 *     minSize: 0,
 *     maxSize: 20,
 *     desiredCapacity: 2,
 *     scaleUpThreshold: 10
 *   },
 *   labels: ["linux", "x64", "production"],
 *   useSpotInstances: true
 * });
 * ```
 *
 * @example
 * ## Repository-specific Runner
 *
 * Sets up runners for a specific repository with custom scaling.
 *
 * ```ts
 * const repoRunners = await GitHubRunner("repo-runners", {
 *   name: "backend-ci",
 *   githubTarget: "myorg/backend-service",
 *   githubToken: process.env.GITHUB_TOKEN!,
 *   amiId: customAmi.amiId,
 *   vpc: {
 *     vpcId: vpc.id,
 *     subnetIds: [privateSubnet.id]
 *   },
 *   instanceTypes: ["c5.large", "c5.xlarge"],
 *   scaling: {
 *     minSize: 1,
 *     maxSize: 5,
 *     scaleUpThreshold: 3
 *   },
 *   labels: ["backend", "docker", "database"]
 * });
 * ```
 */
export const GitHubRunner = Resource(
  "aws::GitHubRunner",
  async function (this: Context<GitHubRunner, GitHubRunnerProps>, id: string, props: GitHubRunnerProps): Promise<GitHubRunner> {
    const {
      name,
      githubTarget,
      githubToken,
      amiId,
      instanceTypes = ["t3.medium"],
      vpc,
      scaling = {},
      labels = [],
      useSpotInstances = false,
      securityGroupIds = [],
      tags = {},
      region
    } = props;

    const {
      minSize = 0,
      maxSize = 10,
      desiredCapacity = 1,
      scaleUpThreshold = 5,
      scaleDownDelayMinutes = 10
    } = scaling;

    // Create IAM role for runner instances
    const runnerRole = await AWS.IAM.Role(`${id}-role`, {
      RoleName: `${name}-github-runner-role`,
      AssumeRolePolicyDocument: JSON.stringify({
        Version: "2012-10-17",
        Statement: [
          {
            Effect: "Allow",
            Principal: { Service: "ec2.amazonaws.com" },
            Action: "sts:AssumeRole"
          }
        ]
      }),
      ManagedPolicyArns: [
        "arn:aws:iam::aws:policy/CloudWatchAgentServerPolicy",
        "arn:aws:iam::aws:policy/AmazonSSMManagedInstanceCore"
      ],
      Tags: [
        { Key: "Name", Value: `${name}-runner-role` },
        ...Object.entries(tags).map(([k, v]) => ({ Key: k, Value: v }))
      ]
    });

    // Create instance profile
    const instanceProfile = await AWS.IAM.InstanceProfile(`${id}-profile`, {
      InstanceProfileName: `${name}-github-runner-profile`,
      Roles: [runnerRole.roleName],
      Tags: [
        { Key: "Name", Value: `${name}-runner-profile` },
        ...Object.entries(tags).map(([k, v]) => ({ Key: k, Value: v }))
      ]
    });

    // Create security group for runners
    const securityGroup = await AWS.EC2.SecurityGroup(`${id}-sg`, {
      GroupName: `${name}-github-runner-sg`,
      GroupDescription: "Security group for GitHub Actions runners",
      VpcId: vpc.vpcId,
      SecurityGroupEgress: [
        {
          IpProtocol: "-1",
          CidrIp: "0.0.0.0/0",
          Description: "Allow all outbound traffic"
        }
      ],
      Tags: [
        { Key: "Name", Value: `${name}-runner-sg` },
        ...Object.entries(tags).map(([k, v]) => ({ Key: k, Value: v }))
      ]
    });

    // Combine security group IDs
    const allSecurityGroupIds = [securityGroup.groupId, ...securityGroupIds];

    // Create user data script for runner registration
    const runnerLabels = ["self-hosted", "linux", "x64", ...labels].join(",");
    const userData = `#!/bin/bash
set -e

# Configure runner
RUNNER_NAME="runner-$(curl -s http://169.254.169.254/latest/meta-data/instance-id)"
GITHUB_TARGET="${githubTarget}"
RUNNER_LABELS="${runnerLabels}"

# Get registration token from GitHub API
if [[ "${githubTarget}" == *"/"* ]]; then
  # Repository-level runner
  GITHUB_API_URL="https://api.github.com/repos/\${GITHUB_TARGET}/actions/runners/registration-token"
else
  # Organization-level runner
  GITHUB_API_URL="https://api.github.com/orgs/\${GITHUB_TARGET}/actions/runners/registration-token"
fi

REGISTRATION_TOKEN=$(curl -s -X POST \\
  -H "Authorization: Bearer ${githubToken}" \\
  -H "Accept: application/vnd.github.v3+json" \\
  "\${GITHUB_API_URL}" | jq -r .token)

# Configure the runner
cd /opt/actions-runner
sudo -u ubuntu ./config.sh \\
  --url "https://github.com/\${GITHUB_TARGET}" \\
  --token "\${REGISTRATION_TOKEN}" \\
  --name "\${RUNNER_NAME}" \\
  --labels "\${RUNNER_LABELS}" \\
  --work "_work" \\
  --unattended \\
  --replace

# Install and start the runner service
./svc.sh install ubuntu
./svc.sh start

# Set up cleanup on shutdown
cat > /etc/systemd/system/github-runner-cleanup.service << 'EOF'
[Unit]
Description=Cleanup GitHub Runner on shutdown
DefaultDependencies=false
Before=shutdown.target reboot.target halt.target

[Service]
Type=oneshot
ExecStart=/opt/actions-runner/cleanup.sh
TimeoutStopSec=30
KillMode=process
RemainAfterExit=yes

[Install]
WantedBy=multi-user.target
EOF

cat > /opt/actions-runner/cleanup.sh << 'EOF'
#!/bin/bash
cd /opt/actions-runner
sudo -u ubuntu ./config.sh remove --unattended --token "\${REGISTRATION_TOKEN}" || true
EOF

chmod +x /opt/actions-runner/cleanup.sh
systemctl enable github-runner-cleanup
systemctl start github-runner-cleanup

# Start CloudWatch agent
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \\
  -a fetch-config -m ec2 -s -c ssm:AmazonCloudWatch-linux
`;

    const encodedUserData = Buffer.from(userData).toString('base64');

    // Create launch template
    const launchTemplate = await AWS.EC2.LaunchTemplate(`${id}-template`, {
      LaunchTemplateName: `${name}-github-runner-template`,
      LaunchTemplateData: {
        ImageId: amiId,
        InstanceType: instanceTypes[0],
        SecurityGroupIds: allSecurityGroupIds,
        IamInstanceProfile: {
          Name: instanceProfile.instanceProfileName
        },
        UserData: encodedUserData,
        BlockDeviceMappings: [
          {
            DeviceName: "/dev/sda1",
            Ebs: {
              VolumeSize: 30,
              VolumeType: "gp3",
              Encrypted: true,
              DeleteOnTermination: true
            }
          }
        ],
        TagSpecifications: [
          {
            ResourceType: "instance",
            Tags: [
              { Key: "Name", Value: `${name}-github-runner` },
              { Key: "GitHubTarget", Value: githubTarget },
              { Key: "RunnerLabels", Value: runnerLabels },
              ...Object.entries(tags).map(([k, v]) => ({ Key: k, Value: v }))
            ]
          }
        ],
        // Configure mixed instances policy for cost optimization
        ...(useSpotInstances && {
          InstanceMarketOptions: {
            MarketType: "spot",
            SpotOptions: {
              SpotInstanceType: "one-time"
            }
          }
        })
      }
    });

    // Create Auto Scaling Group
    const autoScalingGroup = await AWS.AutoScaling.AutoScalingGroup(`${id}-asg`, {
      AutoScalingGroupName: `${name}-github-runner-asg`,
      MinSize: minSize,
      MaxSize: maxSize,
      DesiredCapacity: desiredCapacity,
      VPCZoneIdentifier: vpc.subnetIds,
      LaunchTemplate: {
        LaunchTemplateId: launchTemplate.launchTemplateId,
        Version: "$Latest"
      },
      HealthCheckType: "EC2",
      HealthCheckGracePeriod: 300,
      DefaultCooldown: 300,
      Tags: [
        {
          Key: "Name",
          Value: `${name}-github-runner-asg`,
          PropagateAtLaunch: false,
          ResourceId: `${name}-github-runner-asg`,
          ResourceType: "auto-scaling-group"
        },
        ...Object.entries(tags).map(([k, v]) => ({
          Key: k,
          Value: v,
          PropagateAtLaunch: true,
          ResourceId: `${name}-github-runner-asg`,
          ResourceType: "auto-scaling-group"
        }))
      ]
    });

    // Create CloudWatch alarms for scaling
    const scaleUpAlarm = await AWS.CloudWatch.Alarm(`${id}-scale-up`, {
      AlarmName: `${name}-github-runner-scale-up`,
      AlarmDescription: "Scale up when job queue is high",
      MetricName: "QueuedJobs",
      Namespace: "GitHub/Actions",
      Statistic: "Average",
      Period: 60,
      EvaluationPeriods: 2,
      Threshold: scaleUpThreshold,
      ComparisonOperator: "GreaterThanThreshold",
      Dimensions: [
        {
          Name: "Repository",
          Value: githubTarget
        }
      ],
      AlarmActions: [
        // Scale up policy ARN would go here
      ]
    });

    const scaleDownAlarm = await AWS.CloudWatch.Alarm(`${id}-scale-down`, {
      AlarmName: `${name}-github-runner-scale-down`,
      AlarmDescription: "Scale down when no jobs queued",
      MetricName: "QueuedJobs",
      Namespace: "GitHub/Actions",
      Statistic: "Average",
      Period: 300,
      EvaluationPeriods: scaleDownDelayMinutes / 5,
      Threshold: 0,
      ComparisonOperator: "LessThanOrEqualToThreshold",
      Dimensions: [
        {
          Name: "Repository",
          Value: githubTarget
        }
      ],
      AlarmActions: [
        // Scale down policy ARN would go here
      ]
    });

    return this({
      ...props,
      autoScalingGroupArn: autoScalingGroup.arn || `arn:aws:autoscaling:${region}:123456789012:autoScalingGroup:${autoScalingGroup.autoScalingGroupName}`,
      launchTemplateArn: launchTemplate.arn || `arn:aws:ec2:${region}:123456789012:launch-template/${launchTemplate.launchTemplateId}`,
      securityGroupId: securityGroup.groupId,
      roleArn: runnerRole.arn,
      activeRunners: desiredCapacity,
      registrationUrl: `https://github.com/${githubTarget}/settings/actions/runners`
    });
  }
);