---
order: 200
title: Scaleway
description: Deploy infrastructure to Scaleway's European cloud platform with Alchemy
---

# Getting Started with Scaleway

This tutorial will set you up with a complete Scaleway infrastructure including a web server, object storage, and security configurations using Alchemy.

## Install

First, install Alchemy and the Scaleway SDK:

::: code-group

```sh [bun]
bun add alchemy @scaleway/sdk
```

```sh [npm]
npm install alchemy @scaleway/sdk
```

```sh [pnpm]
pnpm add alchemy @scaleway/sdk
```

```sh [yarn]
yarn add alchemy @scaleway/sdk
```

:::

## Credentials

You'll need Scaleway API credentials to manage resources:

1. **Sign up** for a [Scaleway account](https://console.scaleway.com/register)

2. **Create API Keys**:
   - Go to the [Scaleway Console](https://console.scaleway.com/)
   - Navigate to **Credentials** → **API Keys**
   - Click **Generate new API key**
   - Copy the **Access Key** and **Secret Key**

3. **Get Project ID**:
   - In the Scaleway Console, go to **Project settings**
   - Copy your **Project ID**

4. **Set environment variables** in your `.env` file:

```env
SCALEWAY_ACCESS_KEY=your-access-key
SCALEWAY_SECRET_KEY=your-secret-key
SCALEWAY_PROJECT_ID=your-project-id
```

## Create a Scaleway Application

Let's create a simple web application infrastructure:

::: code-group

```sh [bun]
mkdir my-scaleway-app && cd my-scaleway-app
bun init -y
bun add alchemy @scaleway/sdk
```

```sh [npm] 
mkdir my-scaleway-app && cd my-scaleway-app
npm init -y
npm install alchemy @scaleway/sdk
```

```sh [pnpm]
mkdir my-scaleway-app && cd my-scaleway-app
pnpm init -y
pnpm add alchemy @scaleway/sdk
```

```sh [yarn]
mkdir my-scaleway-app && cd my-scaleway-app
yarn init -y
yarn add alchemy @scaleway/sdk
```

:::

## Create `alchemy.run.ts`

Create an Alchemy script to provision your Scaleway infrastructure:

```ts
#!/usr/bin/env -S npx tsx
import { ScalewayInstance, ScalewayBucket, ScalewaySecurityGroup } from "alchemy/scaleway";

// Create a security group for web servers
const webSg = await ScalewaySecurityGroup("web-security-group", {
  name: "web-servers",
  description: "Security group for web servers",
  zone: "fr-par-1",
  rules: [
    {
      // SSH access
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "0.0.0.0/0"
    },
    {
      // HTTP access
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 80,
      dest_port_to: 80,
      ip_range: "0.0.0.0/0"
    },
    {
      // HTTPS access
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 443,
      dest_port_to: 443,
      ip_range: "0.0.0.0/0"
    }
  ],
  tags: ["web", "production"]
});

console.log(`Security Group created: ${webSg.name} (${webSg.id})`);

// Create a web server instance
const webServer = await ScalewayInstance("web-server", {
  name: "my-web-server",
  type: "DEV1-S", // 1 vCPU, 2GB RAM
  zone: "fr-par-1",
  image: "ubuntu_jammy", // Ubuntu 22.04 LTS
  root_volume_size: 20, // 20GB SSD
  security_groups: [webSg.id],
  tags: ["web", "production"]
});

console.log(`Web server created: ${webServer.name}`);
console.log(`Public IP: ${webServer.public_ip?.address}`);
console.log(`Private IP: ${webServer.private_ip}`);

// Create an object storage bucket for static assets
const staticBucket = await ScalewayBucket("static-assets", {
  name: `my-app-static-${Date.now()}`, // Must be globally unique
  region: "fr-par",
  visibility: "public-read",
  tags: {
    purpose: "static-hosting",
    environment: "production"
  }
});

console.log(`Static bucket created: ${staticBucket.name}`);
console.log(`Bucket endpoint: ${staticBucket.endpoint}`);

// Create a private bucket for application data
const dataBucket = await ScalewayBucket("app-data", {
  name: `my-app-data-${Date.now()}`, // Must be globally unique
  region: "fr-par",
  visibility: "private",
  versioning: true,
  tags: {
    purpose: "application-data",
    environment: "production"
  }
});

console.log(`Data bucket created: ${dataBucket.name}`);

// Output summary
console.log("\n🎉 Scaleway infrastructure deployed successfully!");
console.log("\nNext steps:");
console.log(`1. SSH to your server: ssh root@${webServer.public_ip?.address}`);
console.log(`2. Upload static files to: ${staticBucket.endpoint}`);
console.log(`3. Access files at: https://${staticBucket.name}.s3.fr-par.scw.cloud/`);
```

This script creates:
1. **Security Group**: Firewall rules allowing SSH, HTTP, and HTTPS access
2. **Web Server**: Ubuntu instance with public IP and security group attached
3. **Static Bucket**: Public bucket for hosting static website assets
4. **Data Bucket**: Private bucket with versioning for application data

## Deploy

Run the `alchemy.run.ts` script to deploy your infrastructure:

::: code-group

```sh [bun]
bun ./alchemy.run.ts
```

```sh [npm]
npx tsx ./alchemy.run.ts
```

```sh [pnpm]
pnpm tsx ./alchemy.run.ts
```

```sh [yarn]
yarn tsx ./alchemy.run.ts
```

:::

You should see output similar to this:

```sh
Security Group created: web-servers (11111111-1111-1111-1111-111111111111)
Web server created: my-web-server
Public IP: 51.159.123.45
Private IP: 10.0.0.5
Static bucket created: my-app-static-1672531200000
Bucket endpoint: https://s3.fr-par.scw.cloud
Data bucket created: my-app-data-1672531200000

🎉 Scaleway infrastructure deployed successfully!

Next steps:
1. SSH to your server: ssh root@51.159.123.45
2. Upload static files to: https://s3.fr-par.scw.cloud
3. Access files at: https://my-app-static-1672531200000.s3.fr-par.scw.cloud/
```

## Setting Up Your Web Server

SSH into your new server and set up a simple web application:

```sh
# SSH to your server (use the IP from the output above)
ssh root@51.159.123.45

# Update the system
apt update && apt upgrade -y

# Install nginx
apt install -y nginx

# Start and enable nginx
systemctl start nginx
systemctl enable nginx

# Create a simple index page
cat > /var/www/html/index.html << 'EOF'
<!DOCTYPE html>
<html>
<head>
    <title>My Scaleway App</title>
</head>
<body>
    <h1>Hello from Scaleway!</h1>
    <p>This server is running on Scaleway infrastructure managed by Alchemy.</p>
    <p>Server IP: <span id="ip"></span></p>
    <script>
        fetch('https://api.ipify.org?format=json')
            .then(response => response.json())
            .then(data => document.getElementById('ip').textContent = data.ip);
    </script>
</body>
</html>
EOF

# Restart nginx
systemctl restart nginx
```

Visit `http://YOUR_SERVER_IP` in your browser to see your website!

## Using Object Storage

Upload files to your buckets using the S3-compatible API:

```ts
// upload-example.ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: 'https://s3.fr-par.scw.cloud',
  accessKeyId: process.env.SCALEWAY_ACCESS_KEY!,
  secretAccessKey: process.env.SCALEWAY_SECRET_KEY!,
  region: 'fr-par',
  s3ForcePathStyle: true
});

// Upload a file to your static bucket
await s3.upload({
  Bucket: 'my-app-static-1672531200000', // Use your actual bucket name
  Key: 'hello.txt',
  Body: 'Hello from Scaleway Object Storage!',
  ContentType: 'text/plain'
}).promise();

console.log('File uploaded successfully!');
```

## Advanced Configuration

### Multi-Region Setup

Deploy resources across multiple European regions:

```ts
// Amsterdam region
const euServer = await ScalewayInstance("eu-server", {
  name: "eu-web-server",
  type: "DEV1-S",
  zone: "nl-ams-1",
  region: "nl-ams"
});

// Warsaw region  
const plServer = await ScalewayInstance("pl-server", {
  name: "pl-web-server", 
  type: "DEV1-S",
  zone: "pl-waw-1",
  region: "pl-waw"
});
```

### Database Security Group

Create a security group for database access:

```ts
const dbSg = await ScalewaySecurityGroup("db-security-group", {
  name: "database-servers",
  description: "Security group for PostgreSQL databases",
  inbound_default_policy: "drop",
  rules: [
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 5432,
      dest_port_to: 5432,
      ip_range: "10.0.0.0/8" // Only private network access
    }
  ]
});
```

## Tear Down

Clean up your infrastructure when you're done:

::: code-group

```sh [bun]
bun ./alchemy.run.ts --destroy
```

```sh [npm]
npx tsx ./alchemy.run.ts --destroy
```

```sh [pnpm]
pnpm tsx ./alchemy.run.ts --destroy
```

```sh [yarn]
yarn tsx ./alchemy.run.ts --destroy
```

:::

This will delete all the resources created by the script, including:
- The web server instance
- Both object storage buckets (and their contents)
- The security group

## Next Steps

Now that you have a basic Scaleway setup, you can:

1. **Add a Database**: Implement the Database resource for managed PostgreSQL
2. **Set up Load Balancing**: Add a LoadBalancer resource for high availability
3. **Configure Private Networking**: Use PrivateNetwork for secure inter-service communication
4. **Add Monitoring**: Set up monitoring and alerting for your infrastructure
5. **Implement CI/CD**: Automate deployments using the Alchemy scripts

Check out the [Scaleway provider documentation](/providers/scaleway/) for more advanced features and resources.