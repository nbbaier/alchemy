import { describe, expect, it } from "vitest";
import { convertWranglerToAlchemy } from "../../../scripts/wrangler-to-alchemy.ts";

describe("wrangler-to-alchemy conversion", () => {
  it("should convert basic wrangler.json", () => {
    const input = JSON.stringify({
      name: "my-worker",
      main: "src/index.ts",
      compatibility_date: "2023-12-01",
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain('import alchemy from "alchemy";');
    expect(output).toContain('import { Worker } from "alchemy/cloudflare";');
    expect(output).toContain('const app = await alchemy("my-worker"');
    expect(output).toContain('await Worker("my-worker"');
    expect(output).toContain('entrypoint: "src/index.ts"');
    expect(output).toContain('compatibilityDate: "2023-12-01"');
    expect(output).toContain("adopt: true");
    expect(output).toContain("console.log(worker.url);");
    expect(output).toContain("await app.finalize();");
  });

  it("should convert worker with KV namespace", () => {
    const input = JSON.stringify({
      name: "kv-worker",
      kv_namespaces: [{ binding: "MY_KV", id: "kv-id-123" }],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("KVNamespace");
    expect(output).toContain('await KVNamespace("MY_KV"');
    expect(output).toContain('title: "MY_KV"');
    expect(output).toContain("MY_KV: my_kv");
    expect(output).toContain("// Resources");
  });

  it("should convert worker with R2 bucket", () => {
    const input = JSON.stringify({
      name: "r2-worker",
      r2_buckets: [{ binding: "MY_BUCKET", bucket_name: "my-bucket" }],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("R2Bucket");
    expect(output).toContain('await R2Bucket("my-bucket"');
    expect(output).toContain('name: "my-bucket"');
    expect(output).toContain("MY_BUCKET: my_bucket");
  });

  it("should convert worker with D1 database", () => {
    const input = JSON.stringify({
      name: "d1-worker",
      d1_databases: [
        { binding: "DB", database_id: "db-id-123", database_name: "my-db" },
      ],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("D1Database");
    expect(output).toContain('await D1Database("my-db"');
    expect(output).toContain('name: "my-db"');
    expect(output).toContain("DB: db");
  });

  it("should convert worker with durable objects", () => {
    const input = JSON.stringify({
      name: "do-worker",
      durable_objects: {
        bindings: [
          {
            name: "MY_DO",
            class_name: "MyDurableObject",
            script_name: "do-script",
            environment: "production",
          },
        ],
      },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("DurableObjectNamespace");
    expect(output).toContain('new DurableObjectNamespace("MY_DO"');
    expect(output).toContain('className: "MyDurableObject"');
    expect(output).toContain('scriptName: "do-script"');
    expect(output).toContain('environment: "production"');
    expect(output).toContain("MY_DO: my_do");
  });

  it("should convert worker with queues", () => {
    const input = JSON.stringify({
      name: "queue-worker",
      queues: {
        producers: [{ binding: "MY_QUEUE", queue: "my-queue" }],
        consumers: [{ queue: "my-queue", max_batch_size: 10 }],
      },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("Queue");
    expect(output).toContain('await Queue("my-queue"');
    expect(output).toContain('name: "my-queue"');
    expect(output).toContain("MY_QUEUE: my_queue");
    expect(output).toContain("eventSources: [my_queue]");
  });

  it("should convert worker with workflows", () => {
    const input = JSON.stringify({
      name: "workflow-worker",
      workflows: [
        {
          name: "my-workflow",
          binding: "MY_WORKFLOW",
          class_name: "MyWorkflow",
          script_name: "workflow-script",
        },
      ],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("Workflow");
    expect(output).toContain('new Workflow("my-workflow"');
    expect(output).toContain('className: "MyWorkflow"');
    expect(output).toContain('workflowName: "my-workflow"');
    expect(output).toContain('scriptName: "workflow-script"');
    expect(output).toContain("MY_WORKFLOW: my_workflow");
  });

  it("should convert worker with AI binding", () => {
    const input = JSON.stringify({
      name: "ai-worker",
      ai: { binding: "AI" },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("Ai");
    expect(output).toContain("export const ai = new Ai();");
    expect(output).toContain("AI: ai");
  });

  it("should convert worker with browser binding", () => {
    const input = JSON.stringify({
      name: "browser-worker",
      browser: { binding: "BROWSER" },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("BrowserRendering");
    expect(output).toContain(
      'export const browser = { type: "browser" as const }',
    );
    expect(output).toContain("BROWSER: browser");
  });

  it("should convert worker with images binding", () => {
    const input = JSON.stringify({
      name: "images-worker",
      images: { binding: "IMAGES" },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("Images");
    expect(output).toContain(
      'export const images = { type: "images" as const }',
    );
    expect(output).toContain("IMAGES: images");
  });

  it("should convert worker with version metadata binding", () => {
    const input = JSON.stringify({
      name: "version-worker",
      version_metadata: { binding: "VERSION" },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("VersionMetadata");
    expect(output).toContain(
      'export const versionMetadata = { type: "version_metadata" as const }',
    );
    expect(output).toContain("VERSION: versionMetadata");
  });

  it("should convert worker with hyperdrive", () => {
    const input = JSON.stringify({
      name: "hyperdrive-worker",
      hyperdrive: [
        {
          binding: "HYPERDRIVE",
          id: "hyperdrive-id-123",
          localConnectionString: "postgres://user:password@localhost:5432/mydb",
        },
      ],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain('import { secret } from "alchemy";');
    expect(output).toContain("Hyperdrive");
    expect(output).toContain('await Hyperdrive("hyperdrive-id-123"');
    expect(output).toContain('scheme: "postgres"');
    expect(output).toContain('host: "localhost"');
    expect(output).toContain("port: 5432");
    expect(output).toContain('database: "mydb"');
    expect(output).toContain('user: "user"');
    expect(output).toContain('password: secret("USER_PASSWORD")');
  });

  it("should convert worker with vectorize", () => {
    const input = JSON.stringify({
      name: "vectorize-worker",
      vectorize: [{ binding: "VECTORIZE", index_name: "my-index" }],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("VectorizeIndex");
    expect(output).toContain('await VectorizeIndex("my-index"');
    expect(output).toContain('name: "my-index"');
    expect(output).toContain("VECTORIZE: vectorize");
  });

  it("should convert worker with environment variables", () => {
    const input = JSON.stringify({
      name: "env-worker",
      vars: {
        API_URL: "https://api.example.com",
        DEBUG: "true",
      },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain('"API_URL": "https://api.example.com"');
    expect(output).toContain('"DEBUG": "true"');
    expect(output).toContain("env: {");
  });

  it("should convert worker with cron triggers", () => {
    const input = JSON.stringify({
      name: "cron-worker",
      triggers: {
        crons: ["0 0 * * *", "0 12 * * *"],
      },
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain('crons: ["0 0 * * *","0 12 * * *"]');
  });

  it("should convert worker with routes", () => {
    const input = JSON.stringify({
      name: "route-worker",
      routes: ["example.com/*", "*.example.com/api/*"],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("Route");
    expect(output).toContain("// Routes");
    expect(output).toContain('await Route("route-0"');
    expect(output).toContain('pattern: "example.com/*"');
    expect(output).toContain('await Route("route-1"');
    expect(output).toContain('pattern: "*.example.com/api/*"');
  });

  it("should convert worker with compatibility flags", () => {
    const input = JSON.stringify({
      name: "compat-worker",
      compatibility_flags: ["nodejs_compat", "experimental_flag"],
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain(
      'compatibilityFlags: ["nodejs_compat","experimental_flag"]',
    );
  });

  it("should convert worker with workers_dev", () => {
    const input = JSON.stringify({
      name: "dev-worker",
      workers_dev: true,
    });

    const output = convertWranglerToAlchemy(input);

    expect(output).toContain("url: true");
  });

  it("should convert complex worker with multiple bindings", () => {
    const input = JSON.stringify({
      name: "complex-worker",
      main: "src/index.ts",
      compatibility_date: "2023-12-01",
      compatibility_flags: ["nodejs_compat"],
      workers_dev: true,
      kv_namespaces: [{ binding: "CACHE", id: "kv-cache-123" }],
      r2_buckets: [{ binding: "STORAGE", bucket_name: "my-storage" }],
      d1_databases: [
        { binding: "DB", database_id: "db-123", database_name: "my-db" },
      ],
      ai: { binding: "AI" },
      vars: {
        API_URL: "https://api.example.com",
        ENV: "production",
      },
      triggers: {
        crons: ["0 */6 * * *"],
      },
      routes: ["*.example.com/*"],
    });

    const output = convertWranglerToAlchemy(input);

    // Check imports
    expect(output).toContain('import alchemy from "alchemy";');
    expect(output).toContain(
      "Ai, D1Database, KVNamespace, R2Bucket, Route, Worker",
    );

    // Check app initialization
    expect(output).toContain('const app = await alchemy("complex-worker"');

    // Check resources
    expect(output).toContain("// Resources");
    expect(output).toContain('await KVNamespace("CACHE"');
    expect(output).toContain('await R2Bucket("my-storage"');
    expect(output).toContain('await D1Database("my-db"');
    expect(output).toContain("export const ai = new Ai();");

    // Check worker config
    expect(output).toContain("// Worker");
    expect(output).toContain('await Worker("complex-worker"');
    expect(output).toContain('entrypoint: "src/index.ts"');
    expect(output).toContain('compatibilityDate: "2023-12-01"');
    expect(output).toContain('compatibilityFlags: ["nodejs_compat"]');
    expect(output).toContain("url: true");
    expect(output).toContain("CACHE: cache");
    expect(output).toContain("STORAGE: storage");
    expect(output).toContain("DB: db");
    expect(output).toContain("AI: ai");
    expect(output).toContain('"API_URL": "https://api.example.com"');
    expect(output).toContain('"ENV": "production"');
    expect(output).toContain('crons: ["0 */6 * * *"]');

    // Check routes
    expect(output).toContain("// Routes");
    expect(output).toContain('pattern: "*.example.com/*"');

    // Check finalization
    expect(output).toContain("console.log(worker.url);");
    expect(output).toContain("await app.finalize();");
  });

  describe("error handling", () => {
    it("should throw error for invalid JSON", () => {
      const input = "{ invalid json";

      expect(() => convertWranglerToAlchemy(input)).toThrow("Invalid JSON");
    });

    it("should throw error for missing name field", () => {
      const input = JSON.stringify({
        main: "src/index.ts",
      });

      expect(() => convertWranglerToAlchemy(input)).toThrow(
        "wrangler.json must have a 'name' field",
      );
    });

    it("should handle empty JSON object", () => {
      const input = JSON.stringify({
        name: "empty-worker",
      });

      const output = convertWranglerToAlchemy(input);

      expect(output).toContain('const app = await alchemy("empty-worker"');
      expect(output).toContain('await Worker("empty-worker"');
      expect(output).toContain("adopt: true");
      expect(output).toContain("await app.finalize();");
    });
  });
});
