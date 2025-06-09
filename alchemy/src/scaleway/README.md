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

- [**Instance**](./instance.ts) - Virtual compute instances (VMs) with configurable CPU, RAM, and storage
- [**Bucket**](./bucket.ts) - S3-compatible object storage for files, backups, and static assets
- [**SecurityGroup**](./security-group.ts) - Firewall rules for controlling network access to instances

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

## Future Extensions

Planned additional resources:
- **Database** (managed PostgreSQL/MySQL)
- **PrivateNetwork** (VPC networking)
- **LoadBalancer** (application load balancing)
- **ContainerRegistry** (Docker image storage)