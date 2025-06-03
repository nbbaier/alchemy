import {
  deserializeState,
  ResourceScope,
  serialize,
  type Scope,
  type State,
  type StateStore,
} from "alchemy";
import { bundle } from "alchemy/esbuild";
import path from "node:path";
import { handleApiError } from "../api-error.ts";
import {
  createCloudflareApi,
  type CloudflareApi,
  type CloudflareApiOptions,
} from "../api.ts";
import { getWorkerScriptMetadata, putWorker } from "../worker.ts";

export interface DOStateStoreOptions extends CloudflareApiOptions {
  prefix?: string;
  worker?: {
    name?: string;
    token?: string;
    url?: string;
    force?: boolean;
  };
}

export class DOStateStore implements StateStore {
  private client?: Promise<DOFetchClient>;
  private prefix: string;

  constructor(
    private readonly scope: Scope,
    private readonly options: DOStateStoreOptions = {},
  ) {
    // Use the scope's chain to build the prefix, similar to how FileSystemStateStore builds its directory
    const scopePath = scope.chain.join("/");
    this.prefix = options.prefix
      ? `${options.prefix}${scopePath}`
      : `alchemy/${scopePath}`;
  }

  async init() {
    await this.getClient();
  }

  async get(key: string): Promise<State | undefined> {
    const client = await this.getClient();
    const res = await client.rpc("get", { key });
    if (!res.ok) {
      return undefined;
    }
    const state = await deserializeState(this.scope, await res.text());
    if (state.output === undefined) {
      state.output = {} as any;
    }
    state.output[ResourceScope] = this.scope;
    return state;
  }

  async getBatch(keys: string[]): Promise<Record<string, State>> {
    const client = await this.getClient();
    const res = await client.rpc("getBatch", { keys });
    if (!res.ok) {
      return {};
    }
    const result: Record<string, string> = await res.json();
    return Object.fromEntries(
      await Promise.all(
        Object.entries(result).map(async ([key, value]) => [
          key,
          await deserializeState(this.scope, value),
        ]),
      ),
    );
  }

  async all(): Promise<Record<string, State>> {
    const client = await this.getClient();
    const res = await client.rpc("all");
    if (!res.ok) {
      return {};
    }
    const result: Record<string, string> = await res.json();
    return Object.fromEntries(
      await Promise.all(
        Object.entries(result).map(async ([key, value]) => [
          key,
          await deserializeState(this.scope, value),
        ]),
      ),
    );
  }

  async set(key: string, value: State): Promise<void> {
    const client = await this.getClient();
    const serialized = await serialize(this.scope, value);
    await client.rpc("set", { key }, serialized);
  }

  async delete(key: string): Promise<void> {
    const client = await this.getClient();
    await client.rpc("delete", { key });
  }

  async list(): Promise<string[]> {
    const client = await this.getClient();
    const res = await client.rpc("list");
    return await res.json();
  }

  async count(): Promise<number> {
    const client = await this.getClient();
    const res = await client.rpc("count");
    return await res.json();
  }

  private async getClient(): Promise<DOFetchClient> {
    this.client ??= this.createClient();
    return await this.client;
  }

  private async createClient(): Promise<DOFetchClient> {
    const workerName = this.options.worker?.name ?? "alchemy-state";
    const token = this.options.worker?.token ?? process.env.ALCHEMY_STATE_TOKEN;
    if (!token) {
      throw new Error(
        "DOStateStore requires an API key. Please set options.worker.token or the ALCHEMY_STATE_TOKEN environment variable.",
      );
    }
    if (this.options.worker?.url) {
      const client = new DOFetchClient(
        this.options.worker.url,
        token,
        this.prefix,
      );
      const res = await client.fetch("/status");
      if (res.ok) {
        return client;
      }
      if (res.status === 401) {
        throw new Error(
          "A worker URL was provided to DOStateStore, but the token is incorrect. Correct the token or remove the worker URL to create a new worker.",
        );
      }
      throw new Error(
        `A worker URL was provided to DOStateStore, but the worker status is ${res.status} ${res.statusText}.`,
      );
    }
    const api = await createCloudflareApi(this.options);
    const [subdomain, worker] = await Promise.all([
      this.getAccountSubdomain(api),
      getWorkerScriptMetadata(api, workerName),
    ]);
    const client = new DOFetchClient(
      `https://${workerName}.${subdomain}.workers.dev`,
      token,
      this.prefix,
    );
    if (worker && !this.options.worker?.force) {
      return client;
    }
    await this.createWorker(api, workerName, token, !worker);
    return client;
  }

  private async getAccountSubdomain(api: CloudflareApi) {
    const res = await api.get(`/accounts/${api.accountId}/workers/subdomain`);
    if (!res.ok) {
      throw new Error(
        `Failed to get account subdomain: ${res.status} ${res.statusText}`,
      );
    }
    const json: { result: { subdomain: string } } = await res.json();
    return json.result.subdomain;
  }

  private async createWorker(
    api: CloudflareApi,
    workerName: string,
    token: string,
    migrate: boolean,
  ) {
    const script = await this.bundleWorkerScript();
    await putWorker(api, workerName, script, {
      main_module: "worker.js",
      compatibility_date: "2025-06-01",
      compatibility_flags: ["nodejs_compat"],
      bindings: [
        {
          name: "DOFS_STATE_STORE",
          type: "durable_object_namespace",
          class_name: "DOFSStateStore",
        },
        {
          name: "DOFS_TOKEN",
          type: "secret_text",
          text: token,
        },
      ],
      migrations: migrate
        ? {
            new_sqlite_classes: ["DOFSStateStore"],
          }
        : undefined,
      tags: ["alchemy-state-store"],
      observability: {
        enabled: true,
      },
    });
    const subdomainRes = await api.post(
      `/accounts/${api.accountId}/workers/scripts/${workerName}/subdomain`,
      { enabled: true, preview_enabled: false },
      {
        headers: { "Content-Type": "application/json" },
      },
    );
    if (!subdomainRes.ok) {
      await handleApiError(
        subdomainRes,
        "creating worker subdomain",
        "worker",
        workerName,
      );
    }
    await new Promise((resolve) => setTimeout(resolve, 1000));
  }

  private async bundleWorkerScript() {
    const result = await bundle({
      entryPoint: path.join(__dirname, "worker.ts"),
      bundle: true,
      format: "esm",
      target: "es2022",
      external: ["cloudflare:*", "node:crypto"],
      write: false,
    });
    if (!result.outputFiles?.[0]) {
      throw new Error("Failed to bundle worker.ts");
    }
    return result.outputFiles[0].text;
  }
}

class DOFetchClient {
  constructor(
    private readonly url: string,
    private readonly token: string,
    private readonly prefix: string,
  ) {}

  async fetch(path: string, init: RequestInit = {}) {
    return fetch(`${this.url}${path}`, {
      ...init,
      headers: {
        Authorization: `Bearer ${this.token}`,
        ...init.headers,
      },
    });
  }

  async rpc(
    method: string,
    params: Record<string, string | string[]> = {},
    value?: unknown,
  ): Promise<Response> {
    const res = await this.fetch("/rpc", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        method,
        prefix: this.prefix,
        ...params,
        ...(value ? { value } : {}),
      }),
    });
    if (!res.ok && res.status !== 404) {
      console.log({
        method,
        prefix: this.prefix,
        params,
        value,
        status: res.status,
        text: await res.text(),
      });
      throw new Error(
        `Failed to call RPC method ${method}: ${res.status} ${res.statusText}`,
      );
    }
    return res;
  }
}
