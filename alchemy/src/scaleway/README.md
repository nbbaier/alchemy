# Scaleway Provider

This directory contains the Scaleway provider for Alchemy, enabling infrastructure-as-code management of Scaleway cloud resources.

## Overview

Scaleway is a European cloud provider offering Infrastructure-as-a-Service (IaaS) and Platform-as-a-Service (PaaS) solutions with a focus on GDPR compliance and European data sovereignty.

**Official Links:**
- [Scaleway Website](https://www.scaleway.com/en/)
- [Scaleway Console](https://console.scaleway.com/)
- [Scaleway API Documentation](https://www.scaleway.com/en/developers/api/)
- [Scaleway Terraform Provider](https://registry.terraform.io/providers/scaleway/scaleway/latest/docs)

## Resources

### Core Infrastructure
- [**Instance**](./instance.ts) - Virtual compute instances (VMs) with configurable CPU, RAM, and storage
- [**InstanceVolume**](./instance-volume.ts) - Persistent block storage volumes for instances
- [**SecurityGroup**](./security-group.ts) - Firewall rules for controlling network access to instances

### Networking
- [**Vpc**](./vpc.ts) - Virtual Private Cloud for isolated network environments
- [**VpcPrivateNetwork**](./vpc-private-network.ts) - Private networks within VPCs for secure communication
- [**LoadBalancer**](./load-balancer.ts) - Application load balancers for distributing traffic

### Storage
- [**Bucket**](./bucket.ts) - S3-compatible object storage for files, backups, and static assets

### Databases
- [**RdbInstance**](./rdb-instance.ts) - Managed relational database instances (PostgreSQL, MySQL, Redis)
- [**RdbDatabase**](./rdb-database.ts) - Logical databases within RDB instances

### Serverless
- [**FunctionNamespace**](./function-namespace.ts) - Namespaces for organizing serverless functions

## Design Principles

### Authentication
The provider uses Scaleway's API key authentication with three required credentials:
- **Access Key**: Public identifier for API access
- **Secret Key**: Private key for authentication 
- **Project ID**: Organization/project scope for resources

### Regional Architecture
Scaleway operates in three main regions:
- **fr-par**: Paris, France (default)
- **nl-ams**: Amsterdam, Netherlands  
- **pl-waw**: Warsaw, Poland

Most resources are zone-specific within regions (e.g., `fr-par-1`, `fr-par-2`, `fr-par-3`).

### Resource Lifecycle
All resources follow standard Alchemy patterns:
- **Create**: Provision new resources with validation
- **Update**: Modify existing resources where supported by Scaleway API
- **Delete**: Clean up resources with proper state checking

### Error Handling
Comprehensive error handling with:
- Scaleway-specific error parsing
- Detailed error messages with field validation feedback
- Proper handling of transient states and operations

## API Client Architecture

### Core Components

1. **API Client** (`api.ts`): Low-level HTTP client for Scaleway API
2. **Client** (`client.ts`): High-level client with service-specific URL handling
3. **Error Handling** (`api-error.ts`): Scaleway API error parsing and formatting

### Service URLs
Different Scaleway services use different base URLs:
- **Instance API**: `https://api.scaleway.com/instance/v1/zones/{zone}`
- **Object Storage API**: `https://api.scaleway.com/object/v1/regions/{region}`
- **Database API**: `https://api.scaleway.com/rdb/v1/regions/{region}`

## Implementation Notes

### Instance Resource
- Supports all major instance types (DEV1, GP1 series)
- Automatic IP allocation and volume management
- State monitoring for start/stop operations
- Security group attachment support

### Bucket Resource  
- S3-compatible object storage
- Configurable visibility (private, public-read, public-read-write)
- Versioning support
- Regional deployment

### SecurityGroup Resource
- Stateful/stateless firewall modes
- Inbound/outbound rule management
- Protocol support (TCP, UDP, ICMP, ANY)
- Port range configuration

## Testing Strategy

Each resource includes comprehensive test coverage:
- **Lifecycle Tests**: Create, update, delete operations
- **State Validation**: Proper resource state management
- **Error Scenarios**: API error handling and recovery
- **Cleanup Verification**: Ensures resources are properly deleted

## Implementation Status

### Implemented Resources (10 total)
- ✅ **Instance** - Virtual compute instances
- ✅ **InstanceVolume** - Block storage volumes  
- ✅ **SecurityGroup** - Network security rules
- ✅ **Bucket** - Object storage
- ✅ **Vpc** - Virtual Private Cloud
- ✅ **VpcPrivateNetwork** - Private networks
- ✅ **LoadBalancer** - Application load balancing
- ✅ **RdbInstance** - Managed databases
- ✅ **RdbDatabase** - Database schemas
- ✅ **FunctionNamespace** - Serverless function organization

### Planned Additional Resources (~60 remaining)
Priority resources for future implementation:
- **LoadBalancerBackend** - Backend server pools
- **LoadBalancerFrontend** - Frontend listeners
- **Function** - Serverless functions
- **ContainerNamespace** - Container organization
- **Container** - Serverless containers
- **K8sCluster** - Kubernetes clusters
- **IamApiKey** - API access keys
- **IamSshKey** - SSH public keys
- **RegistryNamespace** - Container registries
- **DomainRecord** - DNS records