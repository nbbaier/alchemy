import type { Context } from "../context.ts";
import { Resource } from "../resource.ts";
import { logger } from "../util/logger.ts";
import { handleApiError } from "./api-error.ts";
import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
} from "./api.ts";

/**
 * Scaleway Object Storage bucket visibility
 */
export type ScalewayBucketVisibility =
  | "private"
  | "public-read"
  | "public-read-write";

/**
 * Properties for creating or updating a Scaleway Object Storage bucket
 */
export interface ScalewayBucketProps extends ScalewayApiOptions {
  /**
   * Bucket name (must be globally unique)
   */
  name: string;

  /**
   * Region where the bucket will be created
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Bucket visibility/access control
   * @default "private"
   */
  visibility?: ScalewayBucketVisibility;

  /**
   * Whether to enable versioning on the bucket
   * @default false
   */
  versioning?: boolean;

  /**
   * Tags for the bucket
   */
  tags?: Record<string, string>;
}

/**
 * API response structure for Scaleway Object Storage buckets
 */
interface ScalewayBucketApiResponse {
  bucket: {
    name: string;
    region: string;
    visibility: string;
    versioning: boolean;
    creation_date: string;
    size: number;
    objects_count: number;
    project_id: string;
    endpoint: string;
    tags?: Record<string, string>;
  };
}

/**
 * A Scaleway Object Storage bucket
 */
export interface ScalewayBucket extends Resource<"scaleway::Bucket"> {
  /**
   * Bucket name
   */
  name: string;

  /**
   * Region where the bucket is located
   */
  region: ScalewayRegion;

  /**
   * Bucket visibility/access control
   */
  visibility: ScalewayBucketVisibility;

  /**
   * Whether versioning is enabled
   */
  versioning: boolean;

  /**
   * Time at which the bucket was created
   */
  created_at: string;

  /**
   * Bucket size in bytes
   */
  size: number;

  /**
   * Number of objects in the bucket
   */
  objects_count: number;

  /**
   * Project ID the bucket belongs to
   */
  project_id: string;

  /**
   * S3-compatible endpoint URL
   */
  endpoint: string;

  /**
   * Bucket tags
   */
  tags?: Record<string, string>;
}

/**
 * Creates a Scaleway Object Storage bucket.
 *
 * @example
 * ## Basic Bucket
 *
 * Create a basic private bucket:
 *
 * ```ts
 * const bucket = await ScalewayBucket("my-bucket", {
 *   name: "my-app-storage"
 * });
 * ```
 *
 * @example
 * ## Public Bucket
 *
 * Create a public bucket for static website hosting:
 *
 * ```ts
 * const staticBucket = await ScalewayBucket("static-assets", {
 *   name: "my-app-static-assets",
 *   visibility: "public-read",
 *   region: "nl-ams",
 *   tags: {
 *     purpose: "static-hosting",
 *     environment: "production"
 *   }
 * });
 * ```
 *
 * @example
 * ## Versioned Bucket
 *
 * Create a bucket with versioning enabled:
 *
 * ```ts
 * const backupBucket = await ScalewayBucket("backups", {
 *   name: "app-backups",
 *   versioning: true,
 *   accessKey: alchemy.secret(process.env.SCALEWAY_ACCESS_KEY),
 *   secretKey: alchemy.secret(process.env.SCALEWAY_SECRET_KEY),
 *   projectId: alchemy.secret(process.env.SCALEWAY_PROJECT_ID)
 * });
 * ```
 */
export const ScalewayBucket = Resource(
  "scaleway::Bucket",
  async function (
    this: Context<ScalewayBucket>,
    id: string,
    props: ScalewayBucketProps,
  ): Promise<ScalewayBucket> {
    const api = createScalewayApi(props);
    const region = props.region || api.region;
    const serviceBaseUrl = `https://api.scaleway.com/object/v1/regions/${region}`;

    const bucketName = this.output?.name || props.name;

    if (this.phase === "delete") {
      try {
        if (bucketName) {
          const deleteResponse = await api.delete(
            `/buckets/${bucketName}`,
            serviceBaseUrl,
          );
          if (!deleteResponse.ok && deleteResponse.status !== 404) {
            await handleApiError(deleteResponse, "delete", "bucket", id);
          }
        }
      } catch (error) {
        logger.error(`Error deleting Scaleway bucket ${id}:`, error);
        throw error;
      }
      return this.destroy();
    }

    let response: ScalewayBucketApiResponse;

    try {
      if (this.phase === "update" && bucketName) {
        // Update existing bucket (limited operations available)
        const updateData: any = {};

        if (props.visibility !== undefined)
          updateData.visibility = props.visibility;
        if (props.versioning !== undefined)
          updateData.versioning = props.versioning;
        if (props.tags !== undefined) updateData.tags = props.tags;

        const updateResponse = await api.patch(
          `/buckets/${bucketName}`,
          updateData,
          serviceBaseUrl,
        );

        if (!updateResponse.ok) {
          await handleApiError(updateResponse, "update", "bucket", id);
        }

        // Get updated bucket data
        const getResponse = await api.get(
          `/buckets/${bucketName}`,
          serviceBaseUrl,
        );
        if (!getResponse.ok) {
          await handleApiError(getResponse, "get", "bucket", id);
        }

        response = await getResponse.json();
      } else {
        // Check if bucket already exists
        if (bucketName) {
          const getResponse = await api.get(
            `/buckets/${bucketName}`,
            serviceBaseUrl,
          );
          if (getResponse.ok) {
            response = await getResponse.json();
          } else if (getResponse.status !== 404) {
            await handleApiError(getResponse, "get", "bucket", id);
            throw new Error("Failed to check if bucket exists");
          } else {
            // Bucket doesn't exist, create new
            response = await createNewBucket(
              api,
              props,
              region,
              serviceBaseUrl,
            );
          }
        } else {
          // No output name, create new bucket
          response = await createNewBucket(api, props, region, serviceBaseUrl);
        }
      }

      return this({
        name: response.bucket.name,
        region: response.bucket.region as ScalewayRegion,
        visibility: response.bucket.visibility as ScalewayBucketVisibility,
        versioning: response.bucket.versioning,
        created_at: response.bucket.creation_date,
        size: response.bucket.size,
        objects_count: response.bucket.objects_count,
        project_id: response.bucket.project_id,
        endpoint: response.bucket.endpoint,
        tags: response.bucket.tags,
      });
    } catch (error) {
      logger.error(`Error ${this.phase} Scaleway bucket '${id}':`, error);
      throw error;
    }
  },
);

/**
 * Helper function to create a new Scaleway bucket
 */
async function createNewBucket(
  api: any,
  props: ScalewayBucketProps,
  _region: ScalewayRegion,
  serviceBaseUrl: string,
): Promise<ScalewayBucketApiResponse> {
  const createData = {
    name: props.name,
    visibility: props.visibility || "private",
    versioning: props.versioning || false,
    project_id: api.projectId,
    tags: props.tags || {},
  };

  const createResponse = await api.post("/buckets", createData, serviceBaseUrl);

  if (!createResponse.ok) {
    await handleApiError(createResponse, "create", "bucket");
  }

  return await createResponse.json();
}
