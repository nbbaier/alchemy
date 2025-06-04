import { describe, it, expect, vi, beforeEach } from "vitest";
import { SSOProvider, type SSOProviderResource } from "../../alchemy/src/supabase/sso-provider.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";

vi.mock("../../alchemy/src/supabase/api.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("SSOProvider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create an SSO provider", async () => {
    const mockProviderData = {
      id: "provider-123",
      type: "saml",
      metadata: {
        entity_id: "https://example.com/saml",
        sso_url: "https://example.com/sso",
      },
      domains: ["example.com"],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    mockApi.post.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProviderData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await SSOProvider.call(context as any, "saml-provider", {
      projectRef: "proj-123",
      type: "saml",
      metadata: {
        entity_id: "https://example.com/saml",
        sso_url: "https://example.com/sso",
      },
      domains: ["example.com"],
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects/proj-123/config/auth/sso/providers", {
      type: "saml",
      metadata: {
        entity_id: "https://example.com/saml",
        sso_url: "https://example.com/sso",
      },
      domains: ["example.com"],
    });

    expect(result).toMatchObject({
      id: "provider-123",
      type: "saml",
      domains: ["example.com"],
    });
  });

  it("should get SSO provider on update", async () => {
    const mockProviderData = {
      id: "provider-123",
      type: "saml",
      metadata: {},
      domains: [],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T01:00:00Z",
    };

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProviderData),
    });

    const context = {
      phase: "update",
      output: { id: "provider-123" },
      destroy: vi.fn(),
    };

    const result = await SSOProvider.call(context as any, "saml-provider", {
      projectRef: "proj-123",
      type: "saml",
    });

    expect(mockApi.get).toHaveBeenCalledWith("/projects/proj-123/config/auth/sso/providers/provider-123");
    expect(result).toMatchObject({
      id: "provider-123",
      type: "saml",
    });
  });

  it("should delete SSO provider when delete is not false", async () => {
    mockApi.delete.mockResolvedValue({
      ok: true,
    });

    const context = {
      phase: "delete",
      output: { id: "provider-123" },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await SSOProvider.call(context as any, "saml-provider", {
      projectRef: "proj-123",
      type: "saml",
      delete: true,
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/projects/proj-123/config/auth/sso/providers/provider-123");
    expect(context.destroy).toHaveBeenCalled();
  });

  it("should adopt existing SSO provider when adopt is true", async () => {
    const mockProviderData = {
      id: "provider-existing",
      type: "oidc",
      metadata: {},
      domains: [],
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    mockApi.post.mockRejectedValue(new Error("Provider already exists"));

    mockApi.get.mockImplementation((path) => {
      if (path === "/projects/proj-123/config/auth/sso/providers") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockProviderData]),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await SSOProvider.call(context as any, "oidc-provider", {
      projectRef: "proj-123",
      type: "oidc",
      adopt: true,
    });

    expect(result).toMatchObject({
      id: "provider-existing",
      type: "oidc",
    });
  });
});
