import { DurableObject } from "cloudflare:workers";
import { Fs } from "dofs";
import crypto from "node:crypto";

interface Env {
  DOFS_STATE_STORE: DurableObjectNamespace<DOFSStateStore>;
  DOFS_TOKEN: string;
}

export default {
  fetch: async (request: Request, env: Env) => {
    if (!isAuthorized(request, env)) {
      return new Response("Unauthorized", { status: 401 });
    }
    if (request.url.endsWith("/status")) {
      return new Response("OK");
    }
    if (request.method !== "POST") {
      return new Response("Method not allowed", { status: 405 });
    }
    const id = env.DOFS_STATE_STORE.idFromName("default");
    const stub = env.DOFS_STATE_STORE.get(id);
    return await stub.fetch(request);
  },
} satisfies ExportedHandler<Env>;

const isAuthorized = (request: Request, env: Env) => {
  const encoder = new TextEncoder();
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) {
    return false;
  }
  return crypto.timingSafeEqual(
    encoder.encode(token),
    encoder.encode(env.DOFS_TOKEN),
  );
};

export class DOFSStateStore extends DurableObject<Env> {
  fs = new Fs(this.ctx, this.env, {
    chunkSize: 256 * 1024,
  });

  override async fetch(request: Request) {
    const { method, prefix, key, keys, value } = (await request.json()) as {
      method: string;
      prefix: string;
      key?: string;
      keys?: string[];
      value?: Record<string, unknown>;
    };
    try {
      switch (method) {
        case "get": {
          if (!key) {
            return new Response("Key is required", { status: 400 });
          }
          const file = await this.get(prefix, key);
          if (!file) {
            return new Response("Not found", { status: 404 });
          }
          return new Response(file);
        }
        case "getBatch": {
          if (!keys) {
            return new Response("Keys are required", { status: 400 });
          }
          return Response.json(await this.getBatch(prefix, keys));
        }
        case "list":
          return Response.json(this.list(prefix));
        case "count":
          return Response.json(this.list(prefix).length);
        case "all":
          return Response.json(await this.all(prefix));
        case "set": {
          if (!key) {
            return new Response("Key is required", { status: 400 });
          }
          if (!value) {
            return new Response("Value is required", { status: 400 });
          }
          await this.set(prefix, key, value);
          return new Response("OK");
        }
        case "delete": {
          if (!key) {
            return new Response("Key is required", { status: 400 });
          }
          this.delete(prefix, key);
          return new Response("OK");
        }
        default:
          return new Response("Method not found", { status: 404 });
      }
    } catch (error) {
      console.error(error);
      return Response.json(
        {
          error: error instanceof Error ? error.message : "Unknown error",
          request: {
            method,
            prefix,
            key,
            keys,
            value,
          },
        },
        { status: 500 },
      );
    }
  }

  async get(prefix: string, key: string): Promise<string | undefined> {
    try {
      const file = this.fs.readFile(this.formatPath(prefix, key), {
        encoding: "utf8",
      });
      return new Response(file).text();
    } catch {
      return undefined;
    }
  }

  async getBatch(
    prefix: string,
    keys: string[],
  ): Promise<Record<string, string>> {
    console.log({
      method: "getBatch",
      prefix,
      keys,
    });
    const results: Record<string, string> = {};
    await Promise.all(
      keys.map(async (key) => {
        const result = await this.get(prefix, key);
        if (result) {
          results[key] = result;
        }
      }),
    );
    return results;
  }

  list(prefix: string): string[] {
    const path = this.formatPath(prefix);
    if (!this.isDirectory(path)) {
      return [];
    }
    return this.fs
      .listDir(path, { recursive: true })
      .filter((item) => item !== "." && item !== "..")
      .map((item) => this.formatKey(prefix, item));
  }

  async all(prefix: string): Promise<Record<string, string>> {
    console.log({
      method: "all",
      prefix,
    });
    return this.getBatch(prefix, this.list(prefix));
  }

  async set(
    prefix: string,
    key: string,
    value: Record<string, unknown>,
  ): Promise<void> {
    const path = this.formatPath(prefix, key);
    console.log({
      method: "set",
      prefix,
      key,
      path,
      value,
    });
    this.ensureDir(path);
    await this.fs.writeFile(path, JSON.stringify(value));
  }

  delete(prefix: string, key: string): void {
    const path = this.formatPath(prefix, key);
    try {
      this.fs.unlink(path);
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        return;
      }
      throw error;
    }
  }

  private isDirectory(path: string): boolean {
    try {
      return this.fs.stat(path).isDirectory;
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        return false;
      }
      throw error;
    }
  }

  private ensureDir(path: string): void {
    const dir = path.split("/").slice(0, -1).join("/");
    try {
      this.fs.mkdir(dir, { recursive: true });
    } catch {
      // directory already exists, ignore
    }
  }

  private formatPath(prefix: string, key?: string) {
    return [prefix, key]
      .filter((part) => part !== undefined)
      .flatMap((part) => part.split("/"))
      .map((part) => encodeURIComponent(part))
      .join("/");
  }

  private formatKey(prefix: string, path: string) {
    return path
      .replace(`${prefix}/`, "")
      .split("/")
      .map(decodeURIComponent)
      .join(":");
  }
}
