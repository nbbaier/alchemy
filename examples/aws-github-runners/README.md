# AWS GitHub Actions Runners

This example demonstrates how to set up scalable GitHub Actions runners on AWS EC2 using Alchemy. It provides a cost-effective alternative to GitHub-hosted runners with the ability to use more powerful machines and custom configurations.

## Features

- **Custom AMI**: Pre-built with GitHub Actions runner, Docker, and common CI/CD tools
- **Auto Scaling**: Scales from 0 to 10 runners based on job queue length
- **Cost Optimized**: Uses spot instances and scales to zero when idle
- **Secure**: Minimal security groups, encrypted storage, IAM roles
- **Flexible**: Supports both organization and repository-level runners

## Prerequisites

1. **AWS Account**: Configured with appropriate permissions
2. **GitHub Token**: Personal access token or GitHub App token with runner management permissions
3. **Environment Variables**:
   ```bash
   export AWS_REGION="us-east-1"
   export GITHUB_TOKEN="ghp_your_token_here"
   export GITHUB_TARGET="your-org"  # or "your-org/your-repo"
   ```

## GitHub Token Permissions

Your GitHub token needs the following permissions:

### For Organization Runners:
- `admin:org` - Manage organization runners

### For Repository Runners:
- `repo` - Full repository access
- `admin:repo_hook` - Manage repository webhooks

## Quick Start

1. **Clone and setup**:
   ```bash
   git clone <repository>
   cd examples/aws-github-runners
   npm install
   ```

2. **Configure environment**:
   ```bash
   export AWS_REGION="us-east-1"
   export GITHUB_TOKEN="ghp_your_token_here"
   export GITHUB_TARGET="myorg"  # or "myorg/myrepo"
   ```

3. **Deploy infrastructure**:
   ```bash
   npm run deploy
   ```

4. **Verify deployment**:
   - Check AWS Console for EC2 instances and Auto Scaling Groups
   - Check GitHub Settings > Actions > Runners for new self-hosted runners

5. **Update your workflows**:
   ```yaml
   jobs:
     build:
       runs-on: [self-hosted, aws, linux, production]
       steps:
         - uses: actions/checkout@v4
         - name: Build and test
           run: |
             npm install
             npm test
   ```

## Configuration Options

### Instance Types
The example uses `t3.medium` and `t3.large` instances. You can customize this:

```typescript
instanceTypes: ["c5.large", "c5.xlarge", "m5.large"]
```

### Scaling Configuration
Adjust auto-scaling behavior:

```typescript
scaling: {
  minSize: 0,              // Scale to zero when idle
  maxSize: 20,             // Maximum runners
  desiredCapacity: 2,      // Start with 2 runners
  scaleUpThreshold: 10,    // Scale up when 10+ jobs queued
  scaleDownDelayMinutes: 5 // Scale down after 5 minutes idle
}
```

### Runner Labels
Customize runner labels for job targeting:

```typescript
labels: ["aws", "linux", "x64", "docker", "gpu", "large-memory"]
```

### Custom AMI
Modify the AMI build script to include additional tools:

```typescript
userData: `#!/bin/bash
# Your custom build script
apt-get install -y python3 python3-pip
pip3 install awscli boto3
# Install additional tools...
`
```

## Cost Optimization

- **Spot Instances**: Up to 90% cost savings compared to on-demand
- **Auto Scaling**: Scales to zero when no jobs are queued
- **Right-sizing**: Uses appropriate instance types for workloads
- **Shared Infrastructure**: VPC and security groups shared across runners

### Estimated Costs (us-east-1)
- **Idle cost**: $0/month (scales to zero)
- **Active cost**: ~$0.01-0.03/hour per runner (spot pricing)
- **Data transfer**: Minimal for most CI/CD workloads

## Security

- **Encrypted Storage**: EBS volumes encrypted at rest
- **Minimal Security Groups**: Only allows outbound HTTPS/HTTP
- **IAM Roles**: Least-privilege access to AWS services
- **VPC Isolation**: Runners run in private subnets (when configured)
- **Automatic Updates**: Security patches applied during AMI build

## Monitoring

- **CloudWatch**: Instance and Auto Scaling Group metrics
- **GitHub Actions**: Runner status and job assignment
- **AWS Cost Explorer**: Track running costs
- **VPC Flow Logs**: Network traffic analysis (optional)

## Troubleshooting

### Runners not appearing in GitHub
1. Check Auto Scaling Group for running instances
2. Verify GitHub token permissions
3. Check CloudWatch logs for runner registration errors
4. Ensure `GITHUB_TARGET` format is correct

### High costs
1. Verify auto-scaling is working (should scale to zero)
2. Check for stuck instances in AWS Console
3. Review job queue patterns - consider adjusting thresholds

### Runner capacity issues
1. Increase `maxSize` in scaling configuration
2. Add more instance types for better availability
3. Consider using multiple AZs

## Cleanup

To remove all infrastructure:

```bash
npm run destroy
```

This will:
- Terminate all runner instances
- Delete Auto Scaling Groups and Launch Templates
- Remove VPC, subnets, and security groups
- Clean up IAM roles and policies

## Advanced Usage

### Multi-Region Setup
Deploy runners in multiple regions for better availability:

```typescript
// us-east-1 runners
const usEastRunners = await GitHubRunner("us-east-runners", {
  region: "us-east-1",
  // ... configuration
});

// eu-west-1 runners  
const euWestRunners = await GitHubRunner("eu-west-runners", {
  region: "eu-west-1", 
  // ... configuration
});
```

### GPU Instances
For ML/AI workloads requiring GPU:

```typescript
instanceTypes: ["p3.2xlarge", "g4dn.xlarge"]
labels: ["gpu", "ml", "pytorch"]
```

### Windows Runners
Use Windows AMI for .NET applications:

```typescript
sourceAmiId: "ami-windows-2022-base"
userData: `# PowerShell script for Windows setup`
```

## Support

For issues and questions:
1. Check the [Alchemy documentation](../../README.md)
2. Review AWS CloudWatch logs
3. Check GitHub Actions runner logs
4. Open an issue in the repository