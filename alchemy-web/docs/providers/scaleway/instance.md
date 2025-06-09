# Instance

The Scaleway Instance resource creates and manages virtual compute instances (VMs) in Scaleway's European data centers.

## Props

```ts
interface ScalewayInstanceProps {
  name: string;
  type?: ScalewayInstanceType;
  zone?: ScalewayZone;
  image?: string;
  enable_dynamic_ip?: boolean;
  root_volume_size?: number;
  root_volume_type?: "l_ssd" | "b_ssd";
  tags?: string[];
  security_groups?: string[];
  boot_type?: ScalewayInstanceBootType;
  start_on_create?: boolean;
  
  // Authentication (optional if using environment variables)
  accessKey?: string | Secret;
  secretKey?: string | Secret;
  projectId?: string | Secret;
  region?: ScalewayRegion;
}
```

## Output

```ts
interface ScalewayInstance {
  id: string;
  name: string;
  type: ScalewayInstanceType;
  zone: ScalewayZone;
  state: ScalewayInstanceState;
  created_at: string;
  updated_at: string;
  public_ip?: ScalewayInstanceIp;
  private_ip?: string;
  volumes: Record<string, ScalewayInstanceVolume>;
  tags: string[];
  security_groups: Array<{ id: string; name: string }>;
  image: { id: string; name: string; arch: string };
}
```

## Examples

### Basic Development Instance

Create a small development instance with default settings:

```ts
import { ScalewayInstance } from "alchemy/scaleway";

const devServer = await ScalewayInstance("dev-server", {
  name: "my-dev-server"
});

console.log(`Dev server IP: ${devServer.public_ip?.address}`);
```

### Production Web Server

Create a production web server with specific configuration:

```ts
import { ScalewayInstance, ScalewaySecurityGroup } from "alchemy/scaleway";

// Create security group first
const webSg = await ScalewaySecurityGroup("web-sg", {
  name: "web-servers",
  rules: [
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 22, dest_port_to: 22 },
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 80, dest_port_to: 80 },
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 443, dest_port_to: 443 }
  ]
});

const prodServer = await ScalewayInstance("prod-server", {
  name: "production-web-server",
  type: "GP1-L",
  zone: "fr-par-1",
  root_volume_size: 50,
  root_volume_type: "b_ssd",
  security_groups: [webSg.id],
  tags: ["production", "web"]
});
```

### Custom Image Instance

Create an instance with a specific operating system image:

```ts
const customServer = await ScalewayInstance("custom-server", {
  name: "ubuntu-focal-server",
  image: "ubuntu_focal",
  type: "DEV1-M",
  zone: "nl-ams-1",
  start_on_create: false
});
```

## Instance Types

Common Scaleway instance types:

### Development Series (DEV1)
- **DEV1-S**: 1 vCPU, 2GB RAM - Basic development
- **DEV1-M**: 2 vCPU, 4GB RAM - Small applications  
- **DEV1-L**: 4 vCPU, 8GB RAM - Medium workloads
- **DEV1-XL**: 8 vCPU, 16GB RAM - Large development

### General Purpose Series (GP1)
- **GP1-XS**: 1 vCPU, 1GB RAM - Micro services
- **GP1-S**: 2 vCPU, 4GB RAM - Small production
- **GP1-M**: 4 vCPU, 8GB RAM - Standard production
- **GP1-L**: 8 vCPU, 16GB RAM - Large applications
- **GP1-XL**: 16 vCPU, 32GB RAM - High performance

## Regions and Zones

### Available Regions
- **fr-par**: Paris, France (default)
- **nl-ams**: Amsterdam, Netherlands
- **pl-waw**: Warsaw, Poland

### Zones per Region
Each region has multiple availability zones:
- **fr-par-1, fr-par-2, fr-par-3**
- **nl-ams-1, nl-ams-2, nl-ams-3**  
- **pl-waw-1, pl-waw-2, pl-waw-3**

## Instance States

Instances can be in various states during their lifecycle:
- **running**: Instance is active and ready
- **stopped**: Instance is shut down
- **stopping**: Instance is shutting down
- **starting**: Instance is booting up
- **provisioning**: Instance is being created
- **locked**: Instance is locked for maintenance

## Storage Options

### Root Volume Types
- **l_ssd**: Local SSD (faster, tied to physical host)
- **b_ssd**: Block SSD (network attached, more flexible)

### Volume Sizes
- Default: 20GB
- Range: 10GB to 3TB depending on instance type

## Security

Instances can be associated with security groups for firewall protection. Use the SecurityGroup resource to define network access rules.

## Networking

### Public IP
- Dynamic IP assigned by default (`enable_dynamic_ip: true`)
- Static IP available (requires separate IP resource)

### Private IP
- Automatically assigned within Scaleway's private network
- Used for internal communication between resources