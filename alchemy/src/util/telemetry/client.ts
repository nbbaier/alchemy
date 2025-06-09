import { type WriteStream, createWriteStream } from "node:fs";
import { mkdir, readdir, readFile, unlink, writeFile } from "node:fs/promises";
import { randomUUID } from "node:crypto";
import os from "node:os";
import { join } from "node:path";
import type { Phase } from "../../alchemy.ts";
import { INGEST_URL, STATE_DIR, TELEMETRY_DISABLED } from "./constants.ts";
import { context } from "./context.ts";
import type { Telemetry } from "./types.ts";

// Cache session ID in memory to ensure it's consistent within a single application run
let _sessionId: string | undefined;

/**
 * Generate or retrieve a session ID that persists across application runs.
 * The session ID is stored in the XDG application state directory and cached in memory.
 */
async function getSessionId(): Promise<string> {
  if (_sessionId) {
    return _sessionId;
  }

  const sessionPath = join(STATE_DIR, "session.jsonl");

  try {
    // Try to read existing session ID
    const sessionData = JSON.parse(await readFile(sessionPath, "utf-8"));
    if (sessionData && typeof sessionData.sessionId === "string") {
      _sessionId = sessionData.sessionId;
      return sessionData.sessionId;
    }
  } catch {
    // File doesn't exist or is invalid, continue to create new session
  }

  // Generate a new session ID and save it
  _sessionId = randomUUID();

  try {
    // Ensure the state directory exists
    await mkdir(STATE_DIR, { recursive: true });
    // Save the session ID
    await writeFile(sessionPath, JSON.stringify({ sessionId: _sessionId }));
  } catch (error) {
    // If we can't save the session ID, continue with the generated one
    // This ensures the application doesn't fail due to file system issues
    console.warn("Warning: Could not save session ID to disk:", error);
  }

  return _sessionId;
}

export interface TelemetryClientOptions {
  sessionId: string;
  phase: Phase;
  enabled: boolean;
  quiet: boolean;
}

export interface ITelemetryClient {
  ready: Promise<void>;
  record(event: Telemetry.EventInput): void;
  finalize(): Promise<void>;
}

export class NoopTelemetryClient implements ITelemetryClient {
  ready = Promise.resolve();
  record(_: Telemetry.EventInput) {}
  finalize() {
    return Promise.resolve();
  }
}

export class TelemetryClient implements ITelemetryClient {
  ready: Promise<void>;

  private path: string;
  private promises: Promise<unknown>[] = [];
  private _writeStream?: WriteStream;
  private _context?: Telemetry.Context;

  constructor(readonly options: TelemetryClientOptions) {
    this.path = join(STATE_DIR, `session-${this.options.sessionId}.jsonl`);
    this.ready = this.init();
  }

  private async init() {
    const now = Date.now();
    const [ctx] = await Promise.all([
      context({
        sessionId: this.options.sessionId,
        phase: this.options.phase,
      }),
      this.initFs(),
    ]);
    this._context = ctx;
    this.record(
      {
        event: "app.start",
      },
      now,
    );
  }

  private async initFs() {
    try {
      await mkdir(STATE_DIR, { recursive: true });
    } catch (error) {
      if (
        error instanceof Error &&
        "code" in error &&
        error.code === "EEXIST"
      ) {
        // ignore
      } else {
        throw error;
      }
    }

    const files = await readdir(STATE_DIR);
    this.promises.push(
      ...files
        .filter((file) => file.endsWith(".jsonl"))
        .map((file) => this.flush(join(STATE_DIR, file))),
    );

    this._writeStream = createWriteStream(this.path, { flags: "a" });
  }

  private get context() {
    if (!this._context) {
      throw new Error("Context not initialized");
    }
    return this._context;
  }

  private get writeStream() {
    if (!this._writeStream) {
      throw new Error("Write stream not initialized");
    }
    return this._writeStream;
  }

  record(event: Telemetry.EventInput, timestamp = Date.now()) {
    const payload = {
      ...event,
      error: this.serializeError(event.error),
      context: this.context,
      timestamp,
    } as Telemetry.Event;
    this.writeStream.write(`${JSON.stringify(payload)}\n`);
  }

  private serializeError(
    error: Telemetry.ErrorInput | undefined,
  ): Telemetry.SerializedError | undefined {
    if (!error) {
      return undefined;
    }
    if (error instanceof Error) {
      return {
        ...error, // include additional properties from error object
        name: error.name,
        message: error.message,
        // TODO: maybe redact more of the stack trace?
        stack: error.stack?.replaceAll(os.homedir(), "~"), // redact home directory
      };
    }
    return error;
  }

  async finalize() {
    await new Promise((resolve) => this.writeStream.end(resolve));
    this.promises.push(this.flush(this.path));
    await Promise.allSettled(this.promises).then((results) => {
      for (const result of results) {
        if (result.status === "rejected" && !this.options.quiet) {
          console.warn(result.reason);
        }
      }
    });
  }

  async flush(path: string) {
    const events = await readFile(path, "utf-8").then((file) => {
      const events: Telemetry.Event[] = [];
      for (const line of file.split("\n")) {
        try {
          events.push(JSON.parse(line));
        } catch {
          // ignore
        }
      }
      return events;
    });
    // TODO: deduplicate events on send
    await this.send(events);
    await unlink(path).catch((error) => {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        // ignore
      } else {
        throw error;
      }
    });
  }

  private async send(events: Telemetry.Event[]) {
    if (events.length === 0) {
      return;
    }
    const response = await fetch(INGEST_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(events),
    });
    if (!response.ok) {
      throw new Error(
        `Failed to send telemetry: ${response.status} ${response.statusText} - ${await response.text()}`,
      );
    }
  }

  static async create({
    phase,
    enabled,
    quiet,
  }: Omit<TelemetryClientOptions, "sessionId">): Promise<ITelemetryClient> {
    if (!enabled || TELEMETRY_DISABLED) {
      if (!quiet) {
        console.warn("[Alchemy] Telemetry is disabled.");
      }
      return new NoopTelemetryClient();
    }
    return new TelemetryClient({
      sessionId: await getSessionId(),
      phase,
      enabled,
      quiet,
    });
  }
}
