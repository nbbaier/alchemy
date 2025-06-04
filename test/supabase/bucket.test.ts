import { describe, it, expect, vi, beforeEach } from "vitest";
import { Bucket, type BucketResource } from "../../alchemy/src/supabase/bucket.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";

vi.mock("../../alchemy/src/supabase/api.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("Bucket", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create a bucket", async () => {
    const mockBucketData = {
      id: "bucket-123",
      name: "test-bucket",
      owner: "user-123",
      public: false,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    mockApi.post.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockBucketData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Bucket.call(context as any, "test-bucket", {
      projectRef: "proj-123",
      public: false,
      fileSizeLimit: 1024000,
      allowedMimeTypes: ["image/jpeg", "image/png"],
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects/proj-123/storage/buckets", {
      name: "test-bucket",
      public: false,
      file_size_limit: 1024000,
      allowed_mime_types: ["image/jpeg", "image/png"],
    });

    expect(result).toMatchObject({
      id: "bucket-123",
      name: "test-bucket",
      public: false,
    });
  });

  it("should get bucket on update", async () => {
    const mockBucketData = {
      id: "bucket-123",
      name: "test-bucket",
      owner: "user-123",
      public: true,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T01:00:00Z",
    };

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve([mockBucketData]),
    });

    const context = {
      phase: "update",
      output: { name: "test-bucket" },
      destroy: vi.fn(),
    };

    const result = await Bucket.call(context as any, "test-bucket", {
      projectRef: "proj-123",
      public: true,
    });

    expect(mockApi.get).toHaveBeenCalledWith("/projects/proj-123/storage/buckets");
    expect(result).toMatchObject({
      name: "test-bucket",
      public: true,
    });
  });

  it("should delete bucket when delete is not false", async () => {
    mockApi.delete.mockResolvedValue({
      ok: true,
    });

    const context = {
      phase: "delete",
      output: { name: "test-bucket" },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await Bucket.call(context as any, "test-bucket", {
      projectRef: "proj-123",
      delete: true,
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/projects/proj-123/storage/buckets/test-bucket");
    expect(context.destroy).toHaveBeenCalled();
  });
});
