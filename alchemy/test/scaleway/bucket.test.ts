import { destroy } from "../../src/destroy.ts";
import { BRANCH_PREFIX } from "../util.ts";
import { ScalewayBucket } from "../../src/scaleway/bucket.ts";
import { createScalewayApi } from "../../src/scaleway/api.ts";

import "../../src/test/vitest.ts";

const test = alchemy.test(import.meta, {
  prefix: BRANCH_PREFIX,
});

describe("Scaleway", () => {
  test("Bucket lifecycle", async (scope) => {
    const bucketId = `${BRANCH_PREFIX}-bucket-test`;
    // Generate unique bucket name (must be globally unique)
    const bucketName = `${bucketId}-${Date.now()}`;
    let bucket: ScalewayBucket;

    try {
      // Create bucket
      bucket = await ScalewayBucket(bucketId, {
        name: bucketName,
        region: "fr-par",
        visibility: "private",
        versioning: false,
        tags: {
          purpose: "test",
          framework: "alchemy",
        },
      });

      expect(bucket).toMatchObject({
        name: bucketName,
        region: "fr-par",
        visibility: "private",
        versioning: false,
      });

      expect(bucket.endpoint).toBeTruthy();
      expect(bucket.project_id).toBeTruthy();
      expect(bucket.created_at).toBeTruthy();
      expect(bucket.tags?.purpose).toBe("test");
      expect(bucket.tags?.framework).toBe("alchemy");

      // Update bucket
      bucket = await ScalewayBucket(bucketId, {
        name: bucketName,
        region: "fr-par",
        visibility: "public-read",
        versioning: true,
        tags: {
          purpose: "test",
          framework: "alchemy",
          updated: "true",
        },
      });

      expect(bucket).toMatchObject({
        visibility: "public-read",
        versioning: true,
      });
      expect(bucket.tags?.updated).toBe("true");
    } finally {
      await destroy(scope);
      if (bucket!) {
        await assertBucketDoesNotExist(bucket);
      }
    }
  });
});

async function assertBucketDoesNotExist(bucket: ScalewayBucket) {
  const api = createScalewayApi();
  const region = bucket.region;
  const serviceBaseUrl = `https://api.scaleway.com/object/v1/regions/${region}`;

  const response = await api.get(`/buckets/${bucket.name}`, serviceBaseUrl);

  if (response.ok) {
    throw new Error(`Bucket ${bucket.name} still exists after deletion`);
  }

  if (response.status !== 404) {
    throw new Error(
      `Unexpected error checking bucket ${bucket.name}: HTTP ${response.status}`,
    );
  }
}
