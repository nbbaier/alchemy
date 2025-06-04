import { describe, it, expect, vi, beforeEach } from "vitest";
import { Project, type ProjectResource } from "../../alchemy/src/supabase/project.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";

vi.mock("../../alchemy/src/supabase/api.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("Project", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create a project", async () => {
    const mockProjectData = {
      id: "proj-123",
      organization_id: "org-123",
      name: "test-project",
      region: "us-east-1",
      created_at: "2023-01-01T00:00:00Z",
      status: "ACTIVE",
    };

    mockApi.post.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjectData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Project.call(context as any, "test-project", {
      organizationId: "org-123",
      region: "us-east-1",
      dbPass: "secure-password",
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects", {
      name: "test-project",
      organization_id: "org-123",
      region: "us-east-1",
      db_pass: "secure-password",
      desired_instance_size: undefined,
      template_url: undefined,
    });

    expect(result).toMatchObject({
      id: "proj-123",
      organizationId: "org-123",
      name: "test-project",
      region: "us-east-1",
      status: "ACTIVE",
    });
  });

  it("should delete a project when delete is not false", async () => {
    mockApi.delete.mockResolvedValue({
      ok: true,
    });

    const context = {
      phase: "delete",
      output: { id: "proj-123" },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await Project.call(context as any, "test-project", {
      organizationId: "org-123",
      region: "us-east-1",
      dbPass: "secure-password",
      delete: true,
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/projects/proj-123");
    expect(context.destroy).toHaveBeenCalled();
  });

  it("should adopt existing project when adopt is true", async () => {
    const mockProjectData = {
      id: "proj-existing",
      organization_id: "org-123",
      name: "existing-project",
      region: "us-west-2",
      created_at: "2023-01-01T00:00:00Z",
      status: "ACTIVE",
    };

    mockApi.post.mockRejectedValue(new Error("Project already exists"));

    mockApi.get.mockImplementation((path) => {
      if (path === "/projects") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([mockProjectData]),
        });
      }
      if (path === "/projects/proj-existing") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockProjectData),
        });
      }
      return Promise.reject(new Error("Not found"));
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Project.call(context as any, "existing-project", {
      organizationId: "org-123",
      region: "us-west-2",
      dbPass: "secure-password",
      adopt: true,
    });

    expect(result).toMatchObject({
      id: "proj-existing",
      name: "existing-project",
      region: "us-west-2",
    });
  });
});
