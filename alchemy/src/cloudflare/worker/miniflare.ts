import {
  Log,
  LogLevel,
  Miniflare,
  type MiniflareOptions,
  type Request as MiniflareRequest,
  type MixedModeConnectionString,
  type WorkerOptions,
} from "miniflare";
import {
  buildMiniflareWorkerOptions,
  buildRemoteBindings,
  type MiniflareWorkerOptions,
} from "./miniflare-worker-options.ts";
import { createMixedModeProxy, type MixedModeProxy } from "./mixed-mode.ts";

class MiniflareServer {
  miniflare?: Miniflare;
  workers = new Map<string, WorkerOptions>();
  servers = new Map<string, Bun.Server>();
  mixedModeProxies = new Map<string, MixedModeProxy>();

  stream = new WritableStream<MiniflareWorkerOptions>({
    write: async (chunk) => {
      await this.set(chunk);
    },
    close: async () => {
      await this.dispose();
    },
  });
  writer = this.stream.getWriter();

  async push(worker: MiniflareWorkerOptions) {
    await this.writer.write(worker);
  }

  async close() {
    await this.writer.close();
  }

  private async set(worker: MiniflareWorkerOptions) {
    this.workers.set(
      worker.name as string,
      buildMiniflareWorkerOptions({
        ...worker,
        mixedModeConnectionString: await this.maybeCreateMixedModeProxy(worker),
      }),
    );
    if (this.miniflare) {
      await this.miniflare.setOptions(this.miniflareOptions());
    } else {
      this.miniflare = new Miniflare(this.miniflareOptions());
      await this.miniflare.ready;
    }
    if (!this.servers.has(worker.name as string)) {
      // TODO: Use node:http for runtime compatibility
      const server = Bun.serve({
        port: worker.port,
        fetch: this.createRequestHandler(worker.name as string),
      });
      this.servers.set(worker.name as string, server);
    }
  }

  private async dispose() {
    await Promise.all([
      this.miniflare?.dispose(),
      ...Array.from(this.servers.values()).map((server) => server.stop()),
    ]);
    this.miniflare = undefined;
    this.workers.clear();
    this.servers.clear();
  }

  private async maybeCreateMixedModeProxy(
    worker: MiniflareWorkerOptions,
  ): Promise<MixedModeConnectionString | undefined> {
    const bindings = buildRemoteBindings(worker);
    if (bindings.length === 0) {
      return undefined;
    }
    const existing = this.mixedModeProxies.get(worker.name);
    if (existing) {
      return existing.connectionString;
    }
    const proxy = await createMixedModeProxy({
      name: `mixed-mode-proxy-${crypto.randomUUID()}`,
      bindings,
    });
    this.mixedModeProxies.set(worker.name, proxy);
    return proxy.connectionString;
  }

  private createRequestHandler(name: string) {
    return async (req: Request) => {
      try {
        if (!this.miniflare) {
          return new Response(
            "[Alchemy] Miniflare is not initialized. Please try again.",
            {
              status: 503,
            },
          );
        }
        const miniflare = await this.miniflare?.getWorker(name);
        if (!miniflare) {
          return new Response(
            `[Alchemy] Cannot find worker "${name}". Please try again.`,
            {
              status: 503,
            },
          );
        }
        // The types aren't identical but they're close enough
        const res = await miniflare.fetch(req as unknown as MiniflareRequest);
        return res as unknown as Response;
      } catch (error) {
        console.error(error);
        return new Response("[Alchemy] Internal server error", {
          status: 500,
        });
      }
    };
  }

  private miniflareOptions(): MiniflareOptions {
    return {
      workers: Array.from(this.workers.values()),
      log: new Log(LogLevel.DEBUG),
    };
  }
}

let instance: MiniflareServer | undefined;

export const miniflareServer = new Proxy({} as MiniflareServer, {
  get: (_, prop: keyof MiniflareServer) => {
    instance ??= new MiniflareServer();
    return instance[prop];
  },
});
