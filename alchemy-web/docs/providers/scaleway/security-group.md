# SecurityGroup

The Scaleway SecurityGroup resource creates and manages firewall rules for controlling network access to instances, providing network security at the instance level.

## Props

```ts
interface ScalewaySecurityGroupProps {
  name: string;
  description?: string;
  zone?: ScalewayZone;
  stateful?: boolean;
  inbound_default_policy?: ScalewaySecurityGroupRuleAction;
  outbound_default_policy?: ScalewaySecurityGroupRuleAction;
  rules?: ScalewaySecurityGroupRule[];
  tags?: string[];
  
  // Authentication (optional if using environment variables)
  accessKey?: string | Secret;
  secretKey?: string | Secret;
  projectId?: string | Secret;
  region?: ScalewayRegion;
}

interface ScalewaySecurityGroupRule {
  direction: "inbound" | "outbound";
  action: "accept" | "drop";
  ip_range?: string;
  protocol?: "TCP" | "UDP" | "ICMP" | "ANY";
  dest_port_from?: number;
  dest_port_to?: number;
  position?: number;
}
```

## Output

```ts
interface ScalewaySecurityGroup {
  id: string;
  name: string;
  description: string;
  zone: ScalewayZone;
  stateful: boolean;
  inbound_default_policy: ScalewaySecurityGroupRuleAction;
  outbound_default_policy: ScalewaySecurityGroupRuleAction;
  organization_default: boolean;
  project_default: boolean;
  tags: string[];
  created_at: string;
  updated_at: string;
  servers: Array<{ id: string; name: string }>;
  rules: ScalewaySecurityGroupRule[];
}
```

## Examples

### Basic Web Server Security Group

Create a security group allowing SSH, HTTP, and HTTPS access:

```ts
import { ScalewaySecurityGroup } from "alchemy/scaleway";

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
```

### Database Security Group

Create a security group for database servers with restricted access:

```ts
const dbSg = await ScalewaySecurityGroup("db-sg", {
  name: "database-servers",
  description: "Security group for PostgreSQL databases",
  inbound_default_policy: "drop",
  outbound_default_policy: "accept",
  rules: [
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 5432,
      dest_port_to: 5432,
      ip_range: "10.0.0.0/8" // Only allow private network access
    },
    {
      direction: "inbound", 
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "203.0.113.0/24" // SSH only from admin network
    }
  ]
});
```

### Application Tier Security Group

Create a security group for application servers with specific port ranges:

```ts
const appSg = await ScalewaySecurityGroup("app-sg", {
  name: "application-servers",
  description: "Security group for application tier",
  stateful: true,
  rules: [
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP", 
      dest_port_from: 8000,
      dest_port_to: 8999, // Port range for multiple app instances
      ip_range: "10.0.1.0/24"
    },
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "0.0.0.0/0"
    }
  ],
  tags: ["application", "middleware"]
});
```

### Custom Zone and Monitoring

Create a security group in a specific zone with monitoring access:

```ts
const monitoringSg = await ScalewaySecurityGroup("monitoring-sg", {
  name: "monitoring-servers",
  description: "Security group for monitoring infrastructure",
  zone: "nl-ams-1",
  rules: [
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 9090, // Prometheus
      dest_port_to: 9090,
      ip_range: "192.168.1.0/24"
    },
    {
      direction: "inbound",
      action: "accept", 
      protocol: "TCP",
      dest_port_from: 3000, // Grafana
      dest_port_to: 3000,
      ip_range: "192.168.1.0/24"
    },
    {
      direction: "inbound",
      action: "accept",
      protocol: "ICMP", // Allow ping
      ip_range: "192.168.1.0/24"
    }
  ]
});
```

## Rule Configuration

### Direction
- **inbound**: Traffic coming into the instance
- **outbound**: Traffic leaving the instance

### Action
- **accept**: Allow the traffic
- **drop**: Block the traffic silently

### IP Range
- Use CIDR notation (e.g., `192.168.1.0/24`)
- `0.0.0.0/0` allows access from anywhere
- Specific IPs: `203.0.113.1/32`
- Private networks: `10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`

### Protocols
- **TCP**: Most common for web services, databases, SSH
- **UDP**: DNS, DHCP, VPN protocols
- **ICMP**: Ping, network diagnostics
- **ANY**: All protocols (use with caution)

### Ports
- **Single port**: `dest_port_from: 80, dest_port_to: 80`
- **Port range**: `dest_port_from: 8000, dest_port_to: 8999`
- **Omit for ICMP**: ICMP doesn't use ports

## Default Policies

### Inbound Default Policy
- **drop** (recommended): Deny all inbound traffic by default
- **accept**: Allow all inbound traffic (security risk)

### Outbound Default Policy  
- **accept** (common): Allow all outbound traffic by default
- **drop**: Deny all outbound traffic (requires explicit rules)

## Stateful vs Stateless

### Stateful (default: true)
- Automatically allows return traffic for established connections
- Simpler rule configuration
- Better for most use cases

### Stateless (stateful: false)
- Requires explicit rules for both directions
- More granular control
- Used in advanced networking scenarios

## Common Patterns

### Three-Tier Architecture

```ts
// Web tier - public access
const webTier = await ScalewaySecurityGroup("web-tier", {
  name: "web-tier",
  rules: [
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 80, dest_port_to: 80 },
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 443, dest_port_to: 443 }
  ]
});

// App tier - only from web tier  
const appTier = await ScalewaySecurityGroup("app-tier", {
  name: "app-tier",
  rules: [
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 8080, dest_port_to: 8080, ip_range: "10.0.1.0/24" }
  ]
});

// Database tier - only from app tier
const dbTier = await ScalewaySecurityGroup("db-tier", {
  name: "db-tier", 
  rules: [
    { direction: "inbound", action: "accept", protocol: "TCP", dest_port_from: 5432, dest_port_to: 5432, ip_range: "10.0.2.0/24" }
  ]
});
```

### SSH Bastion Access

```ts
const bastionSg = await ScalewaySecurityGroup("bastion-sg", {
  name: "ssh-bastion",
  description: "SSH bastion host security group",
  rules: [
    {
      direction: "inbound",
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "203.0.113.0/24" // Your office IP range
    }
  ]
});

const privateSg = await ScalewaySecurityGroup("private-sg", {
  name: "private-servers",
  description: "Private servers accessible via bastion",
  rules: [
    {
      direction: "inbound", 
      action: "accept",
      protocol: "TCP",
      dest_port_from: 22,
      dest_port_to: 22,
      ip_range: "10.0.0.10/32" // Bastion host IP
    }
  ]
});
```

## Attaching to Instances

Use security groups with instances:

```ts
import { ScalewayInstance } from "alchemy/scaleway";

const instance = await ScalewayInstance("web-server", {
  name: "my-web-server",
  security_groups: [webSg.id] // Reference security group
});
```

## Best Practices

1. **Principle of Least Privilege**: Only allow necessary traffic
2. **Use Specific IP Ranges**: Avoid `0.0.0.0/0` when possible
3. **Document Rules**: Use descriptive names and descriptions
4. **Regular Audits**: Review and clean up unused rules
5. **Layer Security**: Use multiple security groups for different tiers
6. **Monitor Access**: Track which rules are actually used

## Troubleshooting

### Connection Issues
1. Check if the required port is open in the security group
2. Verify the IP range includes your source IP
3. Ensure the action is "accept"
4. Check if outbound rules allow return traffic (for stateless groups)

### Rule Conflicts
- Rules are processed in order (position field)
- First matching rule determines the action
- Default policies apply when no rules match