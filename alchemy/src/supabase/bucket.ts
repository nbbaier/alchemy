import type { Context } from "../context.ts";
import { Resource, ResourceKind, ResourceID, ResourceFQN, ResourceScope, ResourceSeq } from "../resource.ts";
import { Scope } from "../scope.ts";
import { createSupabaseApi, type SupabaseApiOptions, type SupabaseApi } from "./api.ts";
import { handleApiError } from "./api-error.ts";

export interface BucketProps extends SupabaseApiOptions {
  projectRef: string;
  name?: string;
  public?: boolean;
  fileSizeLimit?: number;
  allowedMimeTypes?: string[];
  adopt?: boolean;
  delete?: boolean;
}

export interface BucketResource extends Resource<"supabase::Bucket"> {
  id: string;
  name: string;
  owner: string;
  public: boolean;
  createdAt: string;
  updatedAt: string;
}

export function isBucket(resource: Resource): resource is BucketResource {
  return resource[ResourceKind] === "supabase::Bucket";
}

export const Bucket = Resource(
  "supabase::Bucket",
  async function (
    this: Context<BucketResource>,
    id: string,
    props: BucketProps,
  ): Promise<BucketResource> {
    const api = await createSupabaseApi(props);
    const name = props.name ?? id;

    if (this.phase === "delete") {
      const bucketName = this.output?.name;
      if (bucketName && props.delete !== false) {
        await deleteBucket(api, props.projectRef, bucketName);
      }
      return this.destroy();
    }

    if (this.phase === "update" && this.output?.name) {
      const bucket = await getBucket(api, props.projectRef, this.output.name);
      return this(bucket);
    }

    try {
      const bucket = await createBucket(api, props.projectRef, {
        name,
        public: props.public,
        file_size_limit: props.fileSizeLimit,
        allowed_mime_types: props.allowedMimeTypes,
      });
      return this(bucket);
    } catch (error) {
      if (
        props.adopt &&
        error instanceof Error &&
        error.message.includes("already exists")
      ) {
        const existingBucket = await findBucketByName(api, props.projectRef, name);
        if (!existingBucket) {
          throw new Error(`Failed to find existing bucket '${name}' for adoption`);
        }
        return this(existingBucket);
      }
      throw error;
    }
  },
);

async function createBucket(
  api: SupabaseApi,
  projectRef: string,
  params: any,
): Promise<BucketResource> {
  const response = await api.post(`/projects/${projectRef}/storage/buckets`, params);
  if (!response.ok) {
    await handleApiError(response, "creating", "bucket", params.name);
  }
  const data = await response.json();
  return mapBucketResponse(data);
}

async function getBucket(
  api: SupabaseApi,
  projectRef: string,
  name: string,
): Promise<BucketResource> {
  const response = await api.get(`/projects/${projectRef}/storage/buckets`);
  if (!response.ok) {
    await handleApiError(response, "listing", "buckets");
  }
  const buckets = await response.json() as any[];
  const bucket = buckets.find((b: any) => b.name === name);
  if (!bucket) {
    throw new Error(`Bucket '${name}' not found`);
  }
  return mapBucketResponse(bucket);
}

async function deleteBucket(
  api: SupabaseApi,
  projectRef: string,
  name: string,
): Promise<void> {
  const response = await api.delete(`/projects/${projectRef}/storage/buckets/${name}`);
  if (!response.ok && response.status !== 404) {
    await handleApiError(response, "deleting", "bucket", name);
  }
}

async function findBucketByName(
  api: SupabaseApi,
  projectRef: string,
  name: string,
): Promise<BucketResource | null> {
  try {
    return await getBucket(api, projectRef, name);
  } catch {
    return null;
  }
}

function mapBucketResponse(data: any): BucketResource {
  return {
    [ResourceKind]: "supabase::Bucket",
    [ResourceID]: data.id,
    [ResourceFQN]: `supabase::Bucket::${data.id}`,
    [ResourceScope]: Scope.current,
    [ResourceSeq]: 0,
    id: data.id,
    name: data.name,
    owner: data.owner,
    public: data.public,
    createdAt: data.created_at,
    updatedAt: data.updated_at,
  };
}
