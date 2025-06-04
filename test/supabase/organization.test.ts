import { describe, it, expect, vi, beforeEach } from "vitest";
import { Organization, type OrganizationResource } from "../../alchemy/src/supabase/organization.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";
import { alchemy } from "../../alchemy/src/alchemy.ts";

vi.mock("../../alchemy/src/supabase/api.ts");
vi.mock("../../alchemy/src/alchemy.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("Organization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create an organization", async () => {
    const mockOrgData = {
      id: "org-123",
      name: "test-org",
      plan: "free",
      opt_in_tags: [],
      allowed_release_channels: ["stable"],
    };

    mockApi.post.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve({ id: "org-123" }),
    });

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockOrgData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Organization.call(context as any, "test-org", {
      name: "test-org",
    });

    expect(mockApi.post).toHaveBeenCalledWith("/organizations", { name: "test-org" });
    expect(mockApi.get).toHaveBeenCalledWith("/organizations/org-123");
    expect(result).toMatchObject({
      id: "org-123",
      name: "test-org",
      plan: "free",
    });
  });

  it("should adopt existing organization when adopt is true", async () => {
    const mockOrgData = {
      id: "org-existing",
      name: "existing-org",
      plan: "pro",
      opt_in_tags: [],
      allowed_release_channels: ["stable"],
    };

    mockApi.post.mockRejectedValue(new Error("Organization already exists"));

    mockApi.get.mockImplementation((path) => {
      if (path === "/organizations") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockOrgData]),
        });
      }
      if (path === "/organizations/org-existing") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockOrgData),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Organization.call(context as any, "existing-org", {
      name: "existing-org",
      adopt: true,
    });

    expect(result).toMatchObject({
      id: "org-existing",
      name: "existing-org",
      plan: "pro",
    });
  });

  it("should handle delete phase", async () => {
    const context = {
      phase: "delete",
      output: { id: "org-123" },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await Organization.call(context as any, "test-org", {});

    expect(context.destroy).toHaveBeenCalled();
    expect(result).toEqual({ deleted: true });
  });
});
