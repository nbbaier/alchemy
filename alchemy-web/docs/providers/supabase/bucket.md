# Supabase Bucket Resource

The `Bucket` resource manages Supabase Storage buckets, which provide file storage capabilities with access controls.

## Usage

```typescript
import { Bucket } from "alchemy/supabase";

// Create a new storage bucket
const bucket = Bucket("user-uploads", {
  project: "proj-123",
  public: false,
  fileSizeLimit: 5242880, // 5MB
  allowedMimeTypes: ["image/jpeg", "image/png", "image/gif"],
});

// Create a public bucket
const publicBucket = Bucket("public-assets", {
  project: "proj-123", 
  public: true,
});
```

## Properties

### Required Properties

- **`project`** (`string | Project`): Reference to the project where the bucket will be created

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
  project: "my-project-ref",
  public: false,
});
```

### Public Bucket with File Restrictions

```typescript
const imageBucket = Bucket("public-images", {
  project: "my-project-ref",
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
  project: "my-project-ref",
  adopt: true,
  public: true,
});
```

### Bucket that Won't be Deleted

```typescript
const persistentBucket = Bucket("persistent-storage", {
  project: "my-project-ref",
  delete: false, // Bucket will not be deleted when resource is destroyed
  public: false,
});
```

### Large File Bucket

```typescript
const videosBucket = Bucket("video-uploads", {
  project: "my-project-ref",
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
