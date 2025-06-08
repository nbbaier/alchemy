import { AMIBuilder, GitHubRunner } from "alchemy/aws";
import AWS from "alchemy/aws/control";

// Environment variables required:
// - GITHUB_TOKEN: GitHub personal access token or App token
// - GITHUB_TARGET: GitHub organization or repository (e.g., "myorg" or "myorg/repo")
// - AWS_REGION: AWS region (e.g., "us-east-1")

const GITHUB_TOKEN = process.env.GITHUB_TOKEN;
const GITHUB_TARGET = process.env.GITHUB_TARGET;

if (!GITHUB_TOKEN || !GITHUB_TARGET) {
  throw new Error("GITHUB_TOKEN and GITHUB_TARGET environment variables are required");
}

// Create VPC for the runners (using AWS Control API directly)
const vpc = await AWS.EC2.VPC("github-runners-vpc", {
  CidrBlock: "10.0.0.0/16",
  EnableDnsHostnames: true,
  EnableDnsSupport: true,
  Tags: [
    { Key: "Name", Value: "github-runners-vpc" },
    { Key: "Purpose", Value: "GitHub Actions Runners" }
  ]
});

// Create internet gateway
const internetGateway = await AWS.EC2.InternetGateway("github-runners-igw", {
  Tags: [
    { Key: "Name", Value: "github-runners-igw" }
  ]
});

// Attach internet gateway to VPC
await AWS.EC2.VPCGatewayAttachment("github-runners-vpc-gw-attachment", {
  VpcId: vpc.vpcId,
  InternetGatewayId: internetGateway.internetGatewayId
});

// Create public subnet
const publicSubnet = await AWS.EC2.Subnet("github-runners-public-subnet", {
  VpcId: vpc.vpcId,
  CidrBlock: "10.0.1.0/24",
  AvailabilityZone: "us-east-1a",
  MapPublicIpOnLaunch: true,
  Tags: [
    { Key: "Name", Value: "github-runners-public-subnet" },
    { Key: "Type", Value: "Public" }
  ]
});

// Create route table for public subnet
const publicRouteTable = await AWS.EC2.RouteTable("github-runners-public-rt", {
  VpcId: vpc.vpcId,
  Tags: [
    { Key: "Name", Value: "github-runners-public-rt" }
  ]
});

// Create route to internet gateway
await AWS.EC2.Route("github-runners-public-route", {
  RouteTableId: publicRouteTable.routeTableId,
  DestinationCidrBlock: "0.0.0.0/0",
  GatewayId: internetGateway.internetGatewayId
});

// Associate route table with public subnet
await AWS.EC2.SubnetRouteTableAssociation("github-runners-public-rt-association", {
  SubnetId: publicSubnet.subnetId,
  RouteTableId: publicRouteTable.routeTableId
});

// Step 1: Create a custom AMI with GitHub Actions runner pre-installed
const runnerAmi = await AMIBuilder("github-runner-ami", {
  name: "github-actions-runner-2024",
  userData: `#!/bin/bash
set -e

# Update system
apt-get update && apt-get upgrade -y

# Install required packages
apt-get install -y \\
  curl \\
  wget \\
  git \\
  jq \\
  unzip \\
  apt-transport-https \\
  ca-certificates \\
  gnupg \\
  lsb-release \\
  docker.io \\
  docker-compose \\
  awscli \\
  nodejs \\
  npm

# Configure Docker
systemctl enable docker
systemctl start docker
usermod -aG docker ubuntu

# Install latest GitHub Actions runner
RUNNER_VERSION="2.311.0"
mkdir -p /opt/actions-runner
cd /opt/actions-runner
curl -o actions-runner-linux-x64-\${RUNNER_VERSION}.tar.gz -L \\
  https://github.com/actions/runner/releases/download/v\${RUNNER_VERSION}/actions-runner-linux-x64-\${RUNNER_VERSION}.tar.gz
tar xzf ./actions-runner-linux-x64-\${RUNNER_VERSION}.tar.gz
rm actions-runner-linux-x64-\${RUNNER_VERSION}.tar.gz
chown -R ubuntu:ubuntu /opt/actions-runner

# Install runner dependencies
cd /opt/actions-runner && ./bin/installdependencies.sh

# Install common CI/CD tools
npm install -g yarn pnpm
curl -fsSL https://get.docker.com -o get-docker.sh && sh get-docker.sh

# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
./aws/install
rm -rf aws awscliv2.zip

# Install CloudWatch agent
wget https://s3.amazonaws.com/amazoncloudwatch-agent/ubuntu/amd64/latest/amazon-cloudwatch-agent.deb
dpkg -i amazon-cloudwatch-agent.deb
rm amazon-cloudwatch-agent.deb

# Security hardening
systemctl disable snapd || true
systemctl stop snapd || true

# Clean up
apt-get autoremove -y
apt-get autoclean
rm -rf /var/lib/apt/lists/*

echo "GitHub Actions Runner AMI preparation complete"
`,
  tags: {
    Environment: "production",
    Purpose: "GitHub Actions Runner",
    Version: "2024-v1"
  }
});

// Step 2: Set up GitHub Actions runners using the custom AMI
const runners = await GitHubRunner("production-runners", {
  name: "production-github-runners",
  githubTarget: GITHUB_TARGET,
  githubToken: GITHUB_TOKEN,
  amiId: runnerAmi.amiId,
  
  // Instance configuration
  instanceTypes: ["t3.medium", "t3.large"],
  useSpotInstances: true, // Use spot instances for cost savings
  
  // Network configuration
  vpc: {
    vpcId: vpc.vpcId,
    subnetIds: [publicSubnet.subnetId]
  },
  
  // Auto-scaling configuration
  scaling: {
    minSize: 0,        // Scale to zero when no jobs
    maxSize: 10,       // Maximum 10 runners
    desiredCapacity: 1, // Start with 1 runner
    scaleUpThreshold: 5, // Scale up when 5+ jobs queued
    scaleDownDelayMinutes: 10 // Wait 10 minutes before scaling down
  },
  
  // Runner labels for job targeting
  labels: [
    "aws",
    "linux",
    "x64",
    "docker",
    "production"
  ],
  
  tags: {
    Environment: "production",
    Team: "platform",
    CostCenter: "engineering"
  }
});

// Output important information
console.log("🚀 GitHub Actions Runner Infrastructure Deployed!");
console.log("====================================================");
console.log();
console.log("📋 Infrastructure Details:");
console.log(\`VPC ID: \${vpc.vpcId}\`);
console.log(\`Subnet ID: \${publicSubnet.subnetId}\`);
console.log(\`AMI ID: \${runnerAmi.amiId}\`);
console.log();
console.log("🏃 Runner Configuration:");
console.log(\`Auto Scaling Group: \${runners.autoScalingGroupArn}\`);
console.log(\`Security Group: \${runners.securityGroupId}\`);
console.log(\`IAM Role: \${runners.roleArn}\`);
console.log(\`Active Runners: \${runners.activeRunners}\`);
console.log();
console.log("🔗 GitHub Integration:");
console.log(\`Target: \${GITHUB_TARGET}\`);
console.log(\`Registration URL: \${runners.registrationUrl}\`);
console.log();
console.log("💡 Next Steps:");
console.log("1. Go to your GitHub repository/organization settings");
console.log("2. Navigate to Actions > Runners");
console.log("3. You should see your self-hosted runners appear shortly");
console.log("4. Update your workflow files to use: runs-on: [self-hosted, aws, linux]");
console.log();
console.log("🏷️  Workflow Example:");
console.log(\`
jobs:
  build:
    runs-on: [self-hosted, aws, linux, production]
    steps:
      - uses: actions/checkout@v4
      - name: Run tests
        run: |
          # Your build/test commands here
          npm install
          npm test
\`);
console.log();
console.log("💰 Cost Optimization:");
console.log("- Using spot instances for cost savings");
console.log("- Auto-scaling to zero when no jobs are queued");
console.log("- Shared runners across your organization/repository");
console.log();
console.log("🔍 Monitoring:");
console.log("- Check AWS Auto Scaling Groups for scaling activity");
console.log("- Monitor CloudWatch for runner metrics");
console.log("- GitHub Actions tab shows runner status and job assignments");