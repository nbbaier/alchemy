import { describe, it, expect, vi, beforeEach } from "vitest";
import { Function, type FunctionResource } from "../../alchemy/src/supabase/function.ts";
import { createSupabaseApi } from "../../alchemy/src/supabase/api.ts";

vi.mock("../../alchemy/src/supabase/api.ts");

const mockApi = {
  post: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
};

const mockCreateSupabaseApi = vi.mocked(createSupabaseApi);

describe("Function", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockCreateSupabaseApi.mockResolvedValue(mockApi as any);
  });

  it("should create a function", async () => {
    const mockFunctionData = {
      id: "func-123",
      slug: "test-function",
      name: "test-function",
      status: "ACTIVE",
      version: 1,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T00:00:00Z",
    };

    mockApi.post.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFunctionData),
    });

    const context = {
      phase: "create",
      output: undefined,
      destroy: vi.fn(),
    };

    const result = await Function.call(context as any, "test-function", {
      projectRef: "proj-123",
      body: "export default function handler() { return new Response('Hello'); }",
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects/proj-123/functions", {
      slug: "test-function",
      name: "test-function",
      body: "export default function handler() { return new Response('Hello'); }",
      import_map: undefined,
      entrypoint_url: undefined,
      verify_jwt: undefined,
    });

    expect(result).toMatchObject({
      id: "func-123",
      slug: "test-function",
      name: "test-function",
      status: "ACTIVE",
      version: 1,
    });
  });

  it("should deploy function on update when body is provided", async () => {
    const mockFunctionData = {
      id: "func-123",
      slug: "test-function",
      name: "test-function",
      status: "ACTIVE",
      version: 2,
      created_at: "2023-01-01T00:00:00Z",
      updated_at: "2023-01-01T01:00:00Z",
    };

    mockApi.post.mockResolvedValue({
      ok: true,
    });

    mockApi.get.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockFunctionData),
    });

    const context = {
      phase: "update",
      output: { slug: "test-function" },
      destroy: vi.fn(),
    };

    const result = await Function.call(context as any, "test-function", {
      projectRef: "proj-123",
      body: "export default function handler() { return new Response('Updated'); }",
    });

    expect(mockApi.post).toHaveBeenCalledWith("/projects/proj-123/functions/test-function/deploy", {
      body: "export default function handler() { return new Response('Updated'); }",
      import_map: undefined,
      entrypoint_url: undefined,
      verify_jwt: undefined,
    });

    expect(result).toMatchObject({
      version: 2,
    });
  });

  it("should delete function when delete is not false", async () => {
    mockApi.delete.mockResolvedValue({
      ok: true,
    });

    const context = {
      phase: "delete",
      output: { slug: "test-function" },
      destroy: vi.fn().mockReturnValue({ deleted: true }),
    };

    const result = await Function.call(context as any, "test-function", {
      projectRef: "proj-123",
      delete: true,
    });

    expect(mockApi.delete).toHaveBeenCalledWith("/projects/proj-123/functions/test-function");
    expect(context.destroy).toHaveBeenCalled();
  });
});
