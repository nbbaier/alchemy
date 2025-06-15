import fs from "node:fs/promises";
import path from "node:path";
import { describe, expect, it, beforeEach, afterEach } from "vitest";
import type { WranglerJsonSpec } from "../../src/cloudflare/wrangler.json.ts";

// Import the functions we want to test
// Note: We need to mock the CLI parts and test the core functions
const scriptPath = path.resolve(
  import.meta.dirname,
  "../../../scripts/wrangler-to-alchemy.ts",
);

// Create a temporary directory for test files
const testDir = path.join(process.cwd(), ".test-tmp");

describe("wrangler-to-alchemy conversion script", () => {
  // Helper function to run conversion script
  async function runConversion(inputSpec: WranglerJsonSpec, filename = "test") {
    const testFilePath = path.join(testDir, `${filename}-wrangler.json`);
    const outputPath = path.join(testDir, `${filename}-alchemy.run.ts`);
    
    // Ensure test directory exists
    await fs.mkdir(testDir, { recursive: true });
    await fs.writeFile(testFilePath, JSON.stringify(inputSpec, null, 2));

    const { exec } = await import("node:child_process");
    const { promisify } = await import("node:util");
    const execAsync = promisify(exec);

    await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);
    
    return await fs.readFile(outputPath, "utf-8");
  }

  beforeEach(async () => {
    // Create test directory
    await fs.mkdir(testDir, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("parseArgs", () => {
    it("should parse basic arguments", async () => {
      // Test argument parsing by running the script with --help
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      const { stdout } = await execAsync(`bun ${scriptPath} --help`);
      expect(stdout).toContain("Usage: bun scripts/wrangler-to-alchemy.ts");
      expect(stdout).toContain(
        "Convert a wrangler.json file to an alchemy.run.ts file",
      );
    });

    it("should exit with error for missing arguments", async () => {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      try {
        await execAsync(`bun ${scriptPath}`);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.stderr).toContain("Error: Missing required argument");
      }
    });
  });

  describe("loadWranglerJson", () => {
    it("should load valid wrangler.json", async () => {
      const testSpec: WranglerJsonSpec = {
        name: "test-worker",
        main: "src/index.ts",
        compatibility_date: "2023-12-01",
      };

      const testFilePath = path.join(testDir, "wrangler.json");
      await fs.writeFile(testFilePath, JSON.stringify(testSpec, null, 2));

      // We need to import and test the function, but since it's in a script file,
      // we'll test via the CLI interface for now
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const outputPath = path.join(testDir, "alchemy.run.ts");

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const generatedContent = await fs.readFile(outputPath, "utf-8");
      expect(generatedContent).toContain('import alchemy from "alchemy"');
      expect(generatedContent).toContain(
        'import { Worker } from "alchemy/cloudflare"',
      );
      expect(generatedContent).toContain('"test-worker"');
    });

    it("should handle file not found error", async () => {
      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);
      const nonExistentPath = path.join(testDir, "nonexistent.json");

      try {
        await execAsync(`bun ${scriptPath} ${nonExistentPath}`);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.code).toBe(1);
        expect(error.stderr).toContain("File not found");
      }
    });

    it("should handle invalid JSON", async () => {
      const invalidJsonPath = path.join(testDir, "invalid.json");
      // Ensure directory exists first
      await fs.mkdir(testDir, { recursive: true });
      await fs.writeFile(invalidJsonPath, "{ invalid json");

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      try {
        await execAsync(`bun ${scriptPath} ${invalidJsonPath}`);
        expect.fail("Should have thrown an error");
      } catch (error: any) {
        expect(error.stderr).toContain("Invalid JSON");
      }
    });
  });

  describe("generateImports", () => {
    it("should generate basic imports", async () => {
      const spec: WranglerJsonSpec = {
        name: "basic-worker",
      };

      const content = await runConversion(spec, "basic");
      expect(content).toContain('import alchemy from "alchemy"');
      expect(content).toContain('import { Worker } from "alchemy/cloudflare"');
    });

    it("should include KV imports when KV namespaces are present", async () => {
      const spec: WranglerJsonSpec = {
        name: "kv-worker",
        kv_namespaces: [{ binding: "MY_KV", id: "kv-id-123" }],
      };

      const content = await runConversion(spec, "kv");
      expect(content).toContain("KVNamespace");
      expect(content).toContain('await KVNamespace("MY_KV"');
    });

    it("should include R2 imports when R2 buckets are present", async () => {
      const spec: WranglerJsonSpec = {
        name: "r2-worker",
        r2_buckets: [{ binding: "MY_BUCKET", bucket_name: "my-bucket" }],
      };

      const content = await runConversion(spec, "r2");
      expect(content).toContain("R2Bucket");
      expect(content).toContain('await R2Bucket("my-bucket"');
    });

    it("should include D1 imports when D1 databases are present", async () => {
      const spec: WranglerJsonSpec = {
        name: "d1-worker",
        d1_databases: [
          { binding: "DB", database_id: "db-id-123", database_name: "my-db" },
        ],
      };

      const content = await runConversion(spec, "d1");
      expect(content).toContain("D1Database");
      expect(content).toContain('await D1Database("my-db"');
    });

    it("should include multiple imports when multiple binding types are present", async () => {
      const spec: WranglerJsonSpec = {
        name: "multi-worker",
        kv_namespaces: [{ binding: "MY_KV", id: "kv-id-123" }],
        r2_buckets: [{ binding: "MY_BUCKET", bucket_name: "my-bucket" }],
        d1_databases: [
          { binding: "DB", database_id: "db-id-123", database_name: "my-db" },
        ],
        ai: { binding: "AI" },
      };

      const content = await runConversion(spec, "multi");
      expect(content).toContain(
        "KVNamespace, R2Bucket, D1Database, Ai, Worker",
      );
      expect(content).toContain("MY_KV: my_kv");
      expect(content).toContain("MY_BUCKET: my_bucket");
      expect(content).toContain("DB: db");
      expect(content).toContain("AI: ai");
    });
  });

  describe("generateBindings", () => {
    it("should generate durable object bindings correctly", async () => {
      const spec: WranglerJsonSpec = {
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
      };

      const content = await runConversion(spec, "do");
      expect(content).toContain("DurableObjectNamespace");
      expect(content).toContain('new DurableObjectNamespace("MY_DO"');
      expect(content).toContain('className: "MyDurableObject"');
      expect(content).toContain('scriptName: "do-script"');
      expect(content).toContain('environment: "production"');
    });

    it("should generate queue bindings and event sources correctly", async () => {
      const spec: WranglerJsonSpec = {
        name: "queue-worker",
        queues: {
          producers: [{ binding: "MY_QUEUE", queue: "my-queue" }],
          consumers: [{ queue: "my-queue", max_batch_size: 10 }],
        },
      };

      const content = await runConversion(spec, "queue");
      expect(content).toContain("Queue");
      expect(content).toContain('await Queue("my-queue"');
      expect(content).toContain("eventSources: [my_queue]");
    });

    it("should generate workflow bindings correctly", async () => {
      const spec: WranglerJsonSpec = {
        name: "workflow-worker",
        workflows: [
          {
            name: "my-workflow",
            binding: "MY_WORKFLOW",
            class_name: "MyWorkflow",
            script_name: "workflow-script",
          },
        ],
      };

      const content = await runConversion(spec, "workflow");
      expect(content).toContain("Workflow");
      expect(content).toContain('new Workflow("my-workflow"');
      expect(content).toContain('className: "MyWorkflow"');
      expect(content).toContain('workflowName: "my-workflow"');
      expect(content).toContain('scriptName: "workflow-script"');
    });
  });

  describe("generateWorkerConfig", () => {
    it("should generate basic worker configuration", async () => {
      const spec: WranglerJsonSpec = {
        name: "basic-worker",
        main: "src/index.ts",
        compatibility_date: "2023-12-01",
        compatibility_flags: ["nodejs_compat"],
        workers_dev: true,
      };

      const testFilePath = path.join(testDir, "worker-wrangler.json");
      const outputPath = path.join(testDir, "worker-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain('await Worker("basic-worker"');
      expect(content).toContain('entrypoint: "src/index.ts"');
      expect(content).toContain('compatibilityDate: "2023-12-01"');
      expect(content).toContain('compatibilityFlags: ["nodejs_compat"]');
      expect(content).toContain("url: true");
      expect(content).toContain("adopt: true");
    });

    it("should include environment variables", async () => {
      const spec: WranglerJsonSpec = {
        name: "env-worker",
        vars: {
          API_URL: "https://api.example.com",
          DEBUG: "true",
        },
      };

      const testFilePath = path.join(testDir, "env-wrangler.json");
      const outputPath = path.join(testDir, "env-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain('"API_URL": "https://api.example.com"');
      expect(content).toContain('"DEBUG": "true"');
    });

    it("should include cron triggers", async () => {
      const spec: WranglerJsonSpec = {
        name: "cron-worker",
        triggers: {
          crons: ["0 0 * * *", "0 12 * * *"],
        },
      };

      const testFilePath = path.join(testDir, "cron-wrangler.json");
      const outputPath = path.join(testDir, "cron-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain('crons: ["0 0 * * *","0 12 * * *"]');
    });
  });

  describe("hyperdrive bindings", () => {
    it("should generate hyperdrive bindings with secret import", async () => {
      const spec: WranglerJsonSpec = {
        name: "hyperdrive-worker",
        hyperdrive: [
          {
            binding: "HYPERDRIVE",
            id: "hyperdrive-id-123",
            localConnectionString:
              "postgres://user:password@localhost:5432/mydb",
          },
        ],
      };

      const testFilePath = path.join(testDir, "hyperdrive-wrangler.json");
      const outputPath = path.join(testDir, "hyperdrive-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain('import { secret } from "alchemy"');
      expect(content).toContain("Hyperdrive");
      expect(content).toContain('await Hyperdrive("hyperdrive-id-123"');
      expect(content).toContain('scheme: "postgres"');
      expect(content).toContain('host: "localhost"');
      expect(content).toContain("port: 5432");
      expect(content).toContain('database: "mydb"');
      expect(content).toContain('user: "user"');
      expect(content).toContain('password: secret("USER_PASSWORD")');
    });
  });

  describe("routes handling", () => {
    it("should generate routes when present", async () => {
      const spec: WranglerJsonSpec = {
        name: "route-worker",
        routes: ["example.com/*", "*.example.com/api/*"],
      };

      const testFilePath = path.join(testDir, "route-wrangler.json");
      const outputPath = path.join(testDir, "route-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain("// Routes");
      expect(content).toContain('await Route("route-0"');
      expect(content).toContain('pattern: "example.com/*"');
      expect(content).toContain('await Route("route-1"');
      expect(content).toContain('pattern: "*.example.com/api/*"');
    });
  });

  describe("complete conversion", () => {
    it("should generate a complete alchemy.run.ts file", async () => {
      const spec: WranglerJsonSpec = {
        name: "complete-worker",
        main: "src/index.ts",
        compatibility_date: "2023-12-01",
        compatibility_flags: ["nodejs_compat"],
        workers_dev: true,
        kv_namespaces: [{ binding: "CACHE", id: "kv-cache-123" }],
        vars: {
          API_URL: "https://api.example.com",
        },
        triggers: {
          crons: ["0 */6 * * *"],
        },
        routes: ["*.example.com/*"],
      };

      const content = await runConversion(spec, "complete");

      // Check structure
      expect(content).toContain('import alchemy from "alchemy"');
      expect(content).toContain(
        'import { KVNamespace, Worker } from "alchemy/cloudflare"',
      );
      expect(content).toContain('const app = await alchemy("complete-worker"');
      expect(content).toContain("// Resources");
      expect(content).toContain("// Worker");
      expect(content).toContain("// Routes");
      expect(content).toContain("console.log(worker.url)");
      expect(content).toContain("await app.finalize()");

      // Check specific configurations
      expect(content).toContain('await KVNamespace("CACHE"');
      expect(content).toContain("CACHE: cache");
      expect(content).toContain('"API_URL": "https://api.example.com"');
      expect(content).toContain('crons: ["0 */6 * * *"]');
      expect(content).toContain('pattern: "*.example.com/*"');
    });
  });

  describe("edge cases", () => {
    it("should handle empty wrangler.json", async () => {
      const spec: WranglerJsonSpec = {
        name: "empty-worker",
      };

      const content = await runConversion(spec, "empty");
      expect(content).toContain('const app = await alchemy("empty-worker"');
      expect(content).toContain('await Worker("empty-worker"');
      expect(content).toContain("adopt: true");
    });

    it("should handle special binding types like AI, Browser, Images", async () => {
      const spec: WranglerJsonSpec = {
        name: "special-worker",
        ai: { binding: "AI" },
        browser: { binding: "BROWSER" },
        images: { binding: "IMAGES" },
        version_metadata: { binding: "VERSION" },
      };

      const testFilePath = path.join(testDir, "special-wrangler.json");
      const outputPath = path.join(testDir, "special-alchemy.run.ts");
      await fs.writeFile(testFilePath, JSON.stringify(spec));

      const { exec } = await import("node:child_process");
      const { promisify } = await import("node:util");
      const execAsync = promisify(exec);

      await execAsync(`bun ${scriptPath} ${testFilePath} ${outputPath}`);

      const content = await fs.readFile(outputPath, "utf-8");
      expect(content).toContain(
        "Ai, BrowserRendering, Images, VersionMetadata",
      );
      expect(content).toContain("export const ai = new Ai()");
      expect(content).toContain(
        'export const browser = { type: "browser" as const }',
      );
      expect(content).toContain(
        'export const images = { type: "images" as const }',
      );
      expect(content).toContain(
        'export const versionMetadata = { type: "version_metadata" as const }',
      );
    });
  });
});
