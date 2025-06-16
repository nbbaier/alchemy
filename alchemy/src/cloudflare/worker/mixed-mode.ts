import type { MixedModeConnectionString } from "miniflare";
import path from "node:path";
import { bundle } from "../../esbuild/bundle.ts";
import type { CloudflareApi } from "../api.ts";
import type { WorkerBindingSpec } from "../bindings.ts";
import type { WorkerMetadata } from "../worker-metadata.ts";
import { getAccountSubdomain } from "./subdomain.ts";

type WranglerSessionConfig =
  | {
      workers_dev: boolean;
      minimal_mode: boolean;
    }
  | {
      routes: string[];
      minimal_mode: boolean;
    };

interface WorkersPreviewSession {
  inspector_websocket: string;
  prewarm: string;
  token: string;
}

async function bundleWorkerScript() {
  const result = await bundle({
    entryPoint: path.join(
      __dirname,
      "../../../templates/mixed-mode-proxy-worker.ts",
    ),
    bundle: true,
    format: "esm",
    target: "es2022",
    external: ["cloudflare:*"],
    write: false,
  });
  if (!result.outputFiles?.[0]) {
    throw new Error("Failed to bundle worker.ts");
  }
  return new File([result.outputFiles[0].text], "worker.js", {
    type: "application/javascript+module",
  });
}

export async function createMixedModeProxy(input: {
  name: string;
  bindings: WorkerBindingSpec[];
}) {
  const script = await bundleWorkerScript();
  const [token, subdomain] = await Promise.all([
    createWorkersPreviewToken(api, {
      name: input.name,
      metadata: {
        main_module: script.name,
        compatibility_date: "2025-06-16",
        bindings: input.bindings,
        observability: {
          enabled: false,
        },
      },
      files: [script],
      session: {
        workers_dev: true,
        minimal_mode: true,
      },
    }),
    getAccountSubdomain(api),
  ]);
  return new MixedModeProxy(
    `https://${input.name}.${subdomain}.workers.dev`,
    token,
    input.bindings,
  );
}

export class MixedModeProxy {
  server: Bun.Server;
  constructor(
    readonly url: string,
    readonly token: string,
    readonly bindings: WorkerBindingSpec[],
  ) {
    this.server = Bun.serve({
      fetch: this.fetch,
    });
  }

  get connectionString() {
    return new URL(
      `http://${this.server.hostname}:${this.server.port}`,
    ) as MixedModeConnectionString;
  }

  fetch = async (req: Request) => {
    const origin = new URL(req.url);
    const url = new URL(origin.pathname, this.url);
    url.search = origin.search;
    url.hash = origin.hash;

    const headers = new Headers(req.headers);
    headers.set("cf-workers-preview-token", this.token);
    headers.set("host", new URL(this.url).hostname);
    headers.delete("cf-connecting-ip");

    return await fetch(url, {
      method: req.method,
      headers,
      body: req.body,
      redirect: "manual",
    });
  };
}

async function createWorkersPreviewToken(
  api: CloudflareApi,
  input: {
    name: string;
    metadata: WorkerMetadata;
    files: File[];
    session: WranglerSessionConfig;
  },
) {
  const session = await createWorkersPreviewSession(api);
  const formData = new FormData();
  formData.append("metadata", JSON.stringify(input.metadata));
  for (const file of input.files) {
    formData.append(file.name, file);
  }
  formData.append("wrangler-session-config", JSON.stringify(input.session));
  const res = await api
    .post(
      `/accounts/${api.accountId}/workers/scripts/${input.name}/edge-preview`,
      formData,
      {
        headers: {
          "cf-preview-upload-config-token": session.token,
        },
      },
    )
    .then((res) =>
      parseCloudflareResponse<{ preview_token: string }>(
        res,
        "Failed to create workers preview token",
      ),
    );
  prewarm(session.prewarm, res.preview_token);
  return res.preview_token;
}

function prewarm(url: string, previewToken: string) {
  fetch(url, {
    headers: {
      "cf-workers-preview-token": previewToken,
    },
  }).then((res) => {
    if (!res.ok) {
      console.error(
        `Failed to prewarm worker: ${res.status} ${res.statusText}`,
      );
    }
  });
}

async function createWorkersPreviewSession(api: CloudflareApi) {
  const { exchange_url } = await api
    .get(`/accounts/${api.accountId}/workers/subdomain/edge-preview`)
    .then((res) =>
      parseCloudflareResponse<{
        exchange_url: string;
        token: string;
      }>(res, "Failed to create workers preview session"),
    );
  return await fetch(exchange_url).then((res) =>
    parseResponse<WorkersPreviewSession>(
      res,
      "Failed to create workers preview session",
    ),
  );
}

interface CloudflareResponse<T> {
  success: boolean;
  errors: {
    code: number;
    message: string;
  }[];
  result: T;
}

async function parseResponse<T>(res: Response, message: string): Promise<T> {
  if (!res.ok) {
    throw new Error(`${message} (${res.status} ${res.statusText})`);
  }
  const json: T = await res.json();
  return json;
}

async function parseCloudflareResponse<T>(
  res: Response,
  message: string,
): Promise<T> {
  if (!res.ok) {
    throw new Error(`${message} (${res.status} ${res.statusText})`);
  }
  const json: CloudflareResponse<T> = await res.json();
  if (!json.success) {
    throw new Error(
      `${message} (${res.status} ${res.statusText} - ${json.errors.map((e) => `${e.code}: ${e.message}`).join(", ")})`,
    );
  }
  if (!json.result) {
    throw new Error(`${message} (${res.status} ${res.statusText})`);
  }
  return json.result;
}
