import { describe, it, expect, vi, beforeEach } from "vitest";
import { Secret, type SecretResource } from "../../alchemy/src/supabase/secret.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";

vi.mock("../../alchemy/src/supabase/api.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("Secret", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create secrets", async () => {
    const mockSecretsData = [
      { name: "API_KEY", value: "secret-value-1" },
      { name: "DB_PASSWORD", value: "secret-value-2" },
    ];

    mockApi.post.mockResolvedValue({
      ok: true,
    });

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecretsData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Secret.call(context as any, "app-secrets", {
      projectRef: "proj-123",
      secrets: {
        API_KEY: "secret-value-1",
        DB_PASSWORD: "secret-value-2",
      },
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects/proj-123/secrets", [
      { name: "API_KEY", value: "secret-value-1" },
      { name: "DB_PASSWORD", value: "secret-value-2" },
    ]);

    expect(result).toMatchObject({
      projectRef: "proj-123",
      secrets: mockSecretsData,
    });
  });

  it("should update secrets", async () => {
    const mockSecretsData = [
      { name: "API_KEY", value: "updated-value-1" },
      { name: "NEW_SECRET", value: "new-value" },
    ];

    mockApi.post.mockResolvedValue({
      ok: true,
    });

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecretsData),
    });

    const context = {
      phase: "update",
      output: { projectRef: "proj-123", secrets: [] },
      destroy: vi.fn(),
    };

    const result = await Secret.call(context as any, "app-secrets", {
      projectRef: "proj-123",
      secrets: {
        API_KEY: "updated-value-1",
        NEW_SECRET: "new-value",
      },
    });

    expect(result).toMatchObject({
      projectRef: "proj-123",
      secrets: mockSecretsData,
    });
  });

  it("should delete secrets", async () => {
    mockApi.delete.mockResolvedValue({
      ok: true,
    });

    const context = {
      phase: "delete",
      output: {
        projectRef: "proj-123",
        secrets: [
          { name: "API_KEY", value: "secret-value-1" },
          { name: "DB_PASSWORD", value: "secret-value-2" },
        ],
      },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await Secret.call(context as any, "app-secrets", {
      projectRef: "proj-123",
      secrets: {},
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/projects/proj-123/secrets", {
      body: JSON.stringify(["API_KEY", "DB_PASSWORD"]),
    });
    expect(context.destroy).toHaveBeenCalled();
  });

  it("should adopt existing secrets when adopt is true", async () => {
    const mockSecretsData = [
      { name: "EXISTING_SECRET", value: "existing-value" },
    ];

    mockApi.post.mockRejectedValue(new Error("Secrets already exist"));

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockSecretsData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Secret.call(context as any, "app-secrets", {
      projectRef: "proj-123",
      secrets: {
        EXISTING_SECRET: "new-value",
      },
      adopt: true,
    });

    expect(result).toMatchObject({
      projectRef: "proj-123",
      secrets: mockSecretsData,
    });
  });
});
