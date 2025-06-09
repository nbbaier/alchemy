# Bucket

The Scaleway Bucket resource creates and manages S3-compatible object storage buckets for files, backups, static assets, and data archival.

## Props

```ts
interface ScalewayBucketProps {
  name: string;
  region?: ScalewayRegion;
  visibility?: ScalewayBucketVisibility;
  versioning?: boolean;
  tags?: Record<string, string>;
  
  // Authentication (optional if using environment variables)
  accessKey?: string | Secret;
  secretKey?: string | Secret;
  projectId?: string | Secret;
}
```

## Output

```ts
interface ScalewayBucket {
  name: string;
  region: ScalewayRegion;
  visibility: ScalewayBucketVisibility;
  versioning: boolean;
  created_at: string;
  size: number;
  objects_count: number;
  project_id: string;
  endpoint: string;
  tags?: Record<string, string>;
}
```

## Examples

### Basic Private Bucket

Create a simple private bucket for application data:

```ts
import { ScalewayBucket } from "alchemy/scaleway";

const dataBucket = await ScalewayBucket("app-data", {
  name: "my-app-data-bucket"
});

console.log(`Bucket endpoint: ${dataBucket.endpoint}`);
```

### Public Static Assets Bucket

Create a public bucket for static website hosting:

```ts
const staticBucket = await ScalewayBucket("static-assets", {
  name: "my-website-static-assets",
  region: "fr-par",
  visibility: "public-read",
  tags: {
    purpose: "static-hosting",
    environment: "production",
    website: "example.com"
  }
});
```

### Versioned Backup Bucket

Create a bucket with versioning enabled for backups:

```ts
const backupBucket = await ScalewayBucket("backups", {
  name: "application-backups",
  region: "nl-ams",
  visibility: "private",
  versioning: true,
  tags: {
    purpose: "backup",
    retention: "long-term"
  }
});
```

### Multi-Region Setup

Create buckets in different regions for global distribution:

```ts
// Primary bucket in Paris
const primaryBucket = await ScalewayBucket("primary-storage", {
  name: "app-primary-storage",
  region: "fr-par"
});

// Backup bucket in Amsterdam
const backupBucket = await ScalewayBucket("backup-storage", {
  name: "app-backup-storage", 
  region: "nl-ams"
});

// Edge bucket in Warsaw
const edgeBucket = await ScalewayBucket("edge-storage", {
  name: "app-edge-storage",
  region: "pl-waw"
});
```

## Bucket Visibility

### Private Buckets
- **private**: Default visibility
- Objects are only accessible with proper authentication
- Suitable for application data, backups, and sensitive files

### Public Buckets
- **public-read**: Objects can be read by anyone
- Objects can only be written with authentication
- Perfect for static website hosting, CDN content

- **public-read-write**: Objects can be read and written by anyone
- Use with extreme caution
- Only appropriate for specific use cases like public file drops

## Versioning

Enable versioning to maintain multiple versions of objects:

```ts
const versionedBucket = await ScalewayBucket("versioned-content", {
  name: "my-versioned-bucket",
  versioning: true
});
```

**Benefits:**
- Protect against accidental deletion
- Maintain object history
- Enable rollback capabilities

**Considerations:**
- Increased storage costs
- More complex object management

## Regions

Choose the region closest to your users or applications:

### Available Regions
- **fr-par**: Paris, France (default)
  - Low latency for Western Europe
  - GDPR compliant data residency

- **nl-ams**: Amsterdam, Netherlands  
  - Good for Northern Europe
  - Alternative European location

- **pl-waw**: Warsaw, Poland
  - Serves Eastern Europe
  - Cost-effective European option

## S3 Compatibility

Scaleway Object Storage is fully S3-compatible, meaning you can use standard S3 SDKs and tools:

### AWS SDK
```ts
import AWS from 'aws-sdk';

const s3 = new AWS.S3({
  endpoint: bucket.endpoint,
  accessKeyId: 'your-access-key',
  secretAccessKey: 'your-secret-key',
  s3ForcePathStyle: true,
  signatureVersion: 'v4',
  region: bucket.region
});
```

### Common Operations
- **Upload**: `s3.upload()` or `s3.putObject()`
- **Download**: `s3.getObject()`
- **List**: `s3.listObjectsV2()`
- **Delete**: `s3.deleteObject()`

## Use Cases

### Static Website Hosting
```ts
const websiteBucket = await ScalewayBucket("website", {
  name: "my-website-assets",
  visibility: "public-read"
});

// Upload your static files to: websiteBucket.endpoint
// Access files at: https://{bucket-name}.s3.{region}.scw.cloud/{file-path}
```

### Application Data Storage
```ts
const appDataBucket = await ScalewayBucket("app-data", {
  name: "application-user-data",
  visibility: "private",
  versioning: true
});
```

### Content Distribution
```ts
const cdnBucket = await ScalewayBucket("cdn-content", {
  name: "global-cdn-content",
  visibility: "public-read",
  region: "fr-par" // Choose based on primary audience
});
```

### Backup and Archival
```ts
const archiveBucket = await ScalewayBucket("archives", {
  name: "long-term-archives",
  visibility: "private",
  versioning: true,
  tags: {
    retention: "7-years",
    compliance: "gdpr"
  }
});
```

## Pricing Considerations

- **Storage**: Pay for data stored (GB/month)
- **Requests**: Pay per API request (GET, PUT, DELETE)
- **Transfer**: Outbound data transfer charges
- **Versioning**: Additional storage for object versions

Choose the appropriate region and configuration based on your performance and cost requirements.