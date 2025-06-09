# Scaleway

Scaleway is a European cloud provider offering Infrastructure-as-a-Service (IaaS) and Platform-as-a-Service (PaaS) solutions with a strong focus on GDPR compliance and European data sovereignty.

**Official Links:**
- [Scaleway Website](https://www.scaleway.com/en/)
- [Scaleway Console](https://console.scaleway.com/)
- [Scaleway API Documentation](https://www.scaleway.com/en/developers/api/)
- [Getting Started Guide](/guides/scaleway)

## Resources

- [Instance](./instance.md) - Virtual compute instances with configurable CPU, RAM, and storage
- [Bucket](./bucket.md) - S3-compatible object storage for files, backups, and static assets  
- [SecurityGroup](./security-group.md) - Firewall rules for controlling network access to instances

## Example Usage

```ts
import { ScalewayInstance, ScalewayBucket, ScalewaySecurityGroup } from "alchemy/scaleway";

// Create a security group for web servers
const webSg = await ScalewaySecurityGroup("web-sg", {
  name: "web-servers",
  description: "Security group for web servers",
  rules: [
    {
      direction: "inbound",
      action: "accept", 
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "0.0.0.0/0"
    },
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP", 
      dest_port_from: 80,
      dest_port_to: 80,
      ip_range: "0.0.0.0/0"
    },
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 443, 
      dest_port_to: 443,
      ip_range: "0.0.0.0/0"
    }
  ]
});

// Create a web server instance
const webServer = await ScalewayInstance("web-server", {
  name: "my-web-server",
  type: "GP1-S",
  zone: "fr-par-1",
  security_groups: [webSg.id],
  tags: ["web", "production"]
});

// Create an S3-compatible bucket for static assets
const staticBucket = await ScalewayBucket("static-assets", {
  name: "my-app-static-assets",
  region: "fr-par", 
  visibility: "public-read",
  tags: {
    purpose: "static-hosting",
    environment: "production"
  }
});

console.log(`Web server: ${webServer.public_ip?.address}`);
console.log(`Static assets: ${staticBucket.endpoint}`);
```