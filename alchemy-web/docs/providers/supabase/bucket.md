# Supabase Bucket Resource

The `Bucket` resource manages Supabase Storage buckets, which provide file storage capabilities with access controls.

## Usage

```typescript
import { Bucket } from "alchemy/supabase";

// Create a new storage bucket
const bucket = Bucket("user-uploads", {
  projectRef: "proj-123",
  public: false,
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"],
});

// Create a public bucket
const publicBucket = Bucket("public-assets", {
  projectRef: "proj-123", 
  public: true,
});
```

## Properties

### Required Properties

- **`projectRef`** (`string`): Reference ID of the project where the bucket will be created

### Optional Properties

- **`name`** (`string`): The name of the bucket. Defaults to the resource ID if not provided.
- **`public`** (`boolean`): Whether the bucket allows public access. Default: `false`.
- **`fileSizeLimit`** (`number`): Maximum file size in bytes. Default: no limit.
- **`allowedMimeTypes`** (`string[]`): Array of allowed MIME types. Default: all types allowed.
- **`adopt`** (`boolean`): Whether to adopt an existing bucket if creation fails due to name conflict. Default: `false`.
- **`delete`** (`boolean`): Whether to delete the bucket when the resource is destroyed. Default: `true`.
- **`accessToken`** (`Secret`): Supabase access token. Falls back to `SUPABASE_ACCESS_TOKEN` environment variable.
- **`baseUrl`** (`string`): Base URL for Supabase API. Default: `https://api.supabase.com/v1`.

## Resource Properties

The bucket resource exposes the following properties:

- **`id`** (`string`): Unique identifier for the bucket
- **`name`** (`string`): Bucket name
- **`owner`** (`string`): ID of the bucket owner
- **`public`** (`boolean`): Whether the bucket allows public access
- **`createdAt`** (`string`): ISO timestamp when the bucket was created
- **`updatedAt`** (`string`): ISO timestamp when the bucket was last updated

## Examples

### Basic Private Bucket

```typescript
const privateBucket = Bucket("user-documents", {
  projectRef: "my-project-ref",
  public: false,
});
```

### Public Bucket with File Restrictions

```typescript
const imageBucket = Bucket("public-images", {
  projectRef: "my-project-ref",
  public: true,
  fileSizeLimit: 10485760, // 10MB
  allowedMimeTypes: [
    "image/jpeg",
    "image/png", 
    "image/gif",
    "image/webp"
  ],
});
```

### Bucket with Adoption

```typescript
// This will adopt an existing bucket if one with the same name already exists
const existingBucket = Bucket("existing-bucket", {
  projectRef: "my-project-ref",
  adopt: true,
  public: true,
});
```

### Bucket that Won't be Deleted

```typescript
const persistentBucket = Bucket("persistent-storage", {
  projectRef: "my-project-ref",
  delete: false, // Bucket will not be deleted when resource is destroyed
  public: false,
});
```

### Large File Bucket

```typescript
const videosBucket = Bucket("video-uploads", {
  projectRef: "my-project-ref",
  public: false,
  fileSizeLimit: 104857600, // 100MB
  allowedMimeTypes: [
    "video/mp4",
    "video/mpeg",
    "video/quicktime",
    "video/webm"
  ],
});
```

## API Operations

### Create Bucket
- **Endpoint**: `POST /projects/{projectRef}/storage/buckets`
- **Body**: Bucket configuration including name, public, file_size_limit, allowed_mime_types
- **Response**: Bucket object with ID and configuration

### List Buckets
- **Endpoint**: `GET /projects/{projectRef}/storage/buckets`
- **Response**: Array of bucket objects

### Delete Bucket
- **Endpoint**: `DELETE /projects/{projectRef}/storage/buckets/{name}`
- **Response**: 200 on successful deletion

## Error Handling

The resource handles the following error scenarios:

- **409 Conflict**: When `adopt: true` is set, the resource will attempt to find and adopt an existing bucket with the same name
- **Rate Limiting**: Automatic exponential backoff for 429 responses
- **Server Errors**: Automatic retry for 5xx responses
- **404 on Delete**: Ignored (bucket already deleted)

## Lifecycle Management

- **Creation**: Buckets are created with the specified access controls and file restrictions
- **Updates**: Bucket configuration can be refreshed to get current state
- **Deletion**: Buckets can be deleted unless `delete: false` is specified

## Dependencies

Buckets depend on:
- **Project**: Must specify a valid `projectRef`

## Access Control

### Public Buckets
- Files in public buckets can be accessed without authentication
- URLs follow the pattern: `https://{project-ref}.supabase.co/storage/v1/object/public/{bucket-name}/{file-path}`

### Private Buckets
- Files require authentication or signed URLs
- Access controlled through Row Level Security (RLS) policies
- URLs follow the pattern: `https://{project-ref}.supabase.co/storage/v1/object/authenticated/{bucket-name}/{file-path}`

## File Operations

Once a bucket is created, you can perform file operations using the Supabase client:

```typescript
// Upload file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .upload('file-path', file);

// Download file
const { data, error } = await supabase.storage
  .from('bucket-name')
  .download('file-path');

// Delete file
const { error } = await supabase.storage
  .from('bucket-name')
  .remove(['file-path']);

// Get public URL (for public buckets)
const { data } = supabase.storage
  .from('bucket-name')
  .getPublicUrl('file-path');

// Create signed URL (for private buckets)
const { data, error } = await supabase.storage
  .from('bucket-name')
  .createSignedUrl('file-path', 60); // 60 seconds expiry
```

## Security Considerations

- **Public Access**: Only make buckets public if files should be accessible without authentication
- **File Size Limits**: Set appropriate file size limits to prevent abuse
- **MIME Type Restrictions**: Restrict allowed file types for security
- **RLS Policies**: Implement Row Level Security policies for fine-grained access control

## Best Practices

- **Naming**: Use descriptive bucket names that indicate their purpose
- **Organization**: Create separate buckets for different types of content
- **Monitoring**: Monitor storage usage and costs
- **Cleanup**: Implement file cleanup strategies for temporary uploads
- **Backup**: Consider backup strategies for critical files
