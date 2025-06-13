#!/usr/bin/env bun
import { readFile } from "node:fs/promises";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { Miniflare } from "miniflare";
import { version } from "workerd";
import prettier from "prettier";

const OUTPUT_DIR = "alchemy/src/cloudflare/workerd";

interface Config {
  compatibility_date?: string;
  compatibility_flags?: string[];
}

/**
 * Generates runtime types for a Workers project based on the provided project configuration.
 *
 * This function is designed to be isolated and portable, making it easy to integrate into various
 * build processes or development workflows. It handles the whole process of generating runtime
 * types, from ensuring the output directory exists to spawning the workerd process (via Miniflare)
 * and writing the generated types to a file.
 *
 * @throws {Error} If the config file does not have a compatibility date.
 */
export async function generateRuntimeTypes({
  config: { compatibility_date, compatibility_flags = [] },
  outFile = "default.ts",
}: {
  config: Pick<Config, "compatibility_date" | "compatibility_flags">;
  outFile?: string;
}): Promise<{ runtimeHeader: string; runtimeTypes: string }> {
  if (!compatibility_date) {
    throw new Error("Config must have a compatibility date.");
  }

  const header = `// Runtime types generated with workerd@${version} ${compatibility_date} ${compatibility_flags.sort().join(",")}`;

  try {
    const lines = (await readFile(join(OUTPUT_DIR, outFile), "utf8")).split("\n");
    const existingHeader = lines.find((line) =>
      line.startsWith("// Runtime types generated with workerd@")
    );
    const existingTypesStart = lines.findIndex(
      (line) => line === "// Begin runtime types"
    );
    if (existingHeader === header && existingTypesStart !== -1) {
      console.log("Using cached runtime types: ", header);

      return {
        runtimeHeader: header,
        runtimeTypes: lines.slice(existingTypesStart + 1).join("\n"),
      };
    }
  } catch (e) {
    if ((e as { code: string }).code !== "ENOENT") {
      throw e;
    }
  }

  const types = await generate({
    compatibilityDate: compatibility_date,
    // Ignore nodejs compat flags as there is currently no mechanism to generate these dynamically.
    compatibilityFlags: compatibility_flags.filter(
      (flag) => !flag.includes("nodejs_compat")
    ),
  });

  return { runtimeHeader: header, runtimeTypes: types };
}

/**
 * Generates runtime types for Cloudflare Workers by spawning a workerd process with the type-generation
 * worker, and then making a request to that worker to fetch types.
 */
async function generate({
  compatibilityDate,
  compatibilityFlags = [],
}: {
  compatibilityDate: string;
  compatibilityFlags?: string[];
}) {
  const worker = (await readFile(require.resolve("workerd/worker.mjs"))).toString();
  const mf = new Miniflare({
    compatibilityDate: "2024-01-01",
    compatibilityFlags: ["nodejs_compat", "rtti_api"],
    modules: true,
    script: worker,
  });

  const flagsString = compatibilityFlags.length
    ? `+${compatibilityFlags.join("+")}`
    : "";

  const path = `http://dummy.com/${compatibilityDate}${flagsString}`;

  try {
    const res = await mf.dispatchFetch(path);
    const text = await res.text();

    if (!res.ok) {
      throw new Error(text);
    }

    return text;
  } finally {
    await mf.dispose();
  }
}

async function generateTypeFile(): Promise<void> {
  console.log("Generating types for latest compatibility date");

  // Always generate for today's date as requested by sam-goodwin
  const today = new Date();
  const compatibilityDate = today.toISOString().split('T')[0]; // YYYY-MM-DD format

  const config: Config = {
    compatibility_date: compatibilityDate,
    compatibility_flags: ["nodejs_compat"],
  };

  const { runtimeHeader, runtimeTypes } = await generateRuntimeTypes({
    config,
    outFile: "default.d.ts"
  });

  // Convert workerd types to exportable declarations
  // Replace 'declare' with 'export declare' to make types exportable as a module
  const exportedTypes = runtimeTypes
    .replace(/^declare (interface|type|class|enum|namespace) /gm, 'export declare $1 ')
    .replace(/^declare (var|let|const) /gm, 'export declare $1 ')
    .replace(/^declare function /gm, 'export declare function ')
    .replace(/^declare abstract class /gm, 'export declare abstract class ')
    .replace(/^declare module /gm, '// declare module ') // Comment out module declarations
    .replace(/^declare global /gm, '// declare global '); // Comment out global declarations

  // Add missing core binding types that miniflare doesn't generate
  const missingTypes = `
// Missing core Cloudflare Workers binding types
export declare interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  connect(address: SocketAddress | string, options?: SocketOptions): Socket;
}

export declare interface Service<_Methods = Record<string, unknown>> extends Fetcher {
  connect(address: SocketAddress | string, options?: SocketOptions): Socket;
}

export declare interface Socket {
  readable: ReadableStream;
  writable: WritableStream;
  opened: Promise<SocketInfo>;
  closed: Promise<void>;
  close(): Promise<void>;
  upgraded: boolean;
  secureTransport?: "off" | "on" | "starttls";
  startTls(): Socket;
}

declare interface SocketInfo {
  localAddress?: string;
  remoteAddress?: string;
}

export declare interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<any>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  getWithMetadata(key: string, options?: KVGetOptions): Promise<KVGetResult>;
  getWithMetadata(key: string, type: "text"): Promise<KVGetResult<string>>;
  getWithMetadata(key: string, type: "json"): Promise<KVGetResult<any>>;
  getWithMetadata(key: string, type: "arrayBuffer"): Promise<KVGetResult<ArrayBuffer>>;
  getWithMetadata(key: string, type: "stream"): Promise<KVGetResult<ReadableStream>>;
  put(key: string, value: string | ArrayBuffer | ArrayBufferView | ReadableStream, options?: KVPutOptions): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

export declare interface KVGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
  cacheTtl?: number;
}

export declare interface KVGetResult<T = unknown> {
  value: T | null;
  metadata: unknown;
  cacheStatus?: string;
}

export declare interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

export declare interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

export declare interface KVListResult {
  keys: KVKey[];
  list_complete: boolean;
  cursor?: string;
}

export declare interface KVKey {
  name: string;
  expiration?: number;
  metadata?: unknown;
}

export declare interface R2Bucket {
  head(key: string): Promise<R2Object | null>;
  get(key: string, options?: R2GetOptions): Promise<R2ObjectBody | null>;
  put(key: string, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob, options?: R2PutOptions): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  createMultipartUpload(key: string, options?: R2CreateMultipartUploadOptions): Promise<R2MultipartUpload>;
}

export declare interface R2GetOptions {
  onlyIf?: R2Conditional;
  range?: R2Range;
}

export declare interface R2PutOptions {
  onlyIf?: R2Conditional;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export declare interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  include?: ("httpMetadata" | "customMetadata")[];
}

export declare interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  checksums: R2Checksums;
}

export declare interface R2ObjectBody extends R2Object {
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  blob(): Promise<Blob>;
}

export declare interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

export declare interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

export declare interface R2Conditional {
  etagMatches?: string;
  etagDoesNotMatch?: string;
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

export declare interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

export declare interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

export declare interface R2CreateMultipartUploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

export declare interface R2MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(partNumber: number, value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob): Promise<R2UploadedPart>;
  complete(uploadedParts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
}

export declare interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

export declare interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
  withSession<T>(callback: (db: D1Database) => Promise<T>): Promise<T>;
}

export declare interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T[]>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

export declare interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  meta: D1Meta;
  results?: T;
  error?: string;
}

export declare interface D1ExecResult {
  count: number;
  duration: number;
}

export declare interface D1Meta {
  duration: number;
  size_after: number;
  rows_read: number;
  rows_written: number;
  last_row_id?: number;
  changed_db: boolean;
  changes: number;
}

export declare interface DurableObjectNamespace<T = DurableObjectStub> {
  newUniqueId(options?: DurableObjectNamespaceNewUniqueIdOptions): DurableObjectId;
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): T;
}

export declare interface DurableObjectNamespaceNewUniqueIdOptions {
  jurisdiction?: DurableObjectJurisdiction;
}

export declare type DurableObjectJurisdiction = "eu" | "fedramp";

export declare interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  getName(): string | undefined;
}

export declare interface DurableObjectStub extends Fetcher {
  id: DurableObjectId;
  name?: string;
}

export declare interface Queue<Body = unknown> {
  send(message: Body, options?: QueueSendOptions): Promise<void>;
  sendBatch(messages: QueueMessage<Body>[], options?: QueueSendBatchOptions): Promise<void>;
}

export declare interface QueueMessage<Body = unknown> {
  body: Body;
  contentType?: string;
  delaySeconds?: number;
}

export declare interface QueueSendOptions {
  contentType?: string;
  delaySeconds?: number;
}

export declare interface QueueSendBatchOptions {
  delaySeconds?: number;
}

export declare interface AnalyticsEngineDataset {
  writeDataPoint(event?: AnalyticsEngineDataPoint): void;
}

export declare interface AnalyticsEngineDataPoint {
  doubles?: number[];
  blobs?: string[];
  indexes?: string[];
}

export declare interface AiGateway {
  get(input: AiGatewayGetOptions): Promise<AiGatewayGetResponse>;
  getLog(input: AiGatewayGetLogOptions): Promise<AiGatewayGetLogResponse>;
  getUrl(input: AiGatewayGetUrlOptions): Promise<AiGatewayGetUrlResponse>;
  patchLog(input: AiGatewayPatchLogOptions): Promise<AiGatewayPatchLogResponse>;
  run(input: AiGatewayRunOptions): Promise<AiGatewayRunResponse>;
}

export declare interface AiGatewayGetOptions {
  gatewayId: string;
}

export declare interface AiGatewayGetResponse {
  id: string;
  name: string;
  slug: string;
  cacheStatus: string;
  created: string;
  modified: string;
}

export declare interface AiGatewayGetLogOptions {
  gatewayId: string;
  logId: string;
}

export declare interface AiGatewayGetLogResponse {
  id: string;
  success: boolean;
  created: string;
  model: string;
  provider: string;
  request: any;
  response: any;
  metadata: any;
}

export declare interface AiGatewayGetUrlOptions {
  gatewayId: string;
}

export declare interface AiGatewayGetUrlResponse {
  url: string;
}

export declare interface AiGatewayPatchLogOptions {
  gatewayId: string;
  logId: string;
  metadata: any;
}

export declare interface AiGatewayPatchLogResponse {
  success: boolean;
}

export declare interface AiGatewayRunOptions {
  gatewayId: string;
  metadata: any;
  chatInput?: any;
  messages?: any[];
}

export declare interface AiGatewayRunResponse {
  id: string;
  success: boolean;
  created: string;
  model: string;
  provider: string;
  response: any;
  metadata: any;
}
`;

  const fileContent = `${runtimeHeader}
// DO NOT EDIT THIS FILE DIRECTLY

// Begin runtime types
${exportedTypes}

${missingTypes}`;

  // Skip prettier formatting for now due to syntax issues
  const formattedTypes = fileContent;

  const outputPath = join(OUTPUT_DIR, "default.d.ts");
  await writeFile(outputPath, formattedTypes);
  console.log(`Generated types for ${compatibilityDate} at ${outputPath}`);
}

async function generateIndexFile(): Promise<void> {
  const indexContent = `// Generated Cloudflare Worker types index
// DO NOT EDIT THIS FILE DIRECTLY

// Re-export types from declaration file
export type {
  // Core binding types
  Fetcher,
  Service,
  SocketAddress,
  SocketOptions,
  KVNamespace,
  R2Bucket,
  D1Database,
  DurableObjectNamespace,
  Queue,
  VectorizeIndex,
  AnalyticsEngineDataset,
  AiGateway,
  Hyperdrive,
  Workflow,
  ImagesBinding,
  WorkerVersionMetadata,
  Rpc,
  DispatchNamespace,
  
  // Additional type exports for other related types
  Socket,
  KVGetOptions,
  KVGetResult,
  KVPutOptions,
  KVListOptions,
  KVListResult,
  KVKey,
  R2Object,
  R2ObjectBody,
  R2Objects,
  R2GetOptions,
  R2PutOptions,
  R2ListOptions,
  R2HTTPMetadata,
  R2Conditional,
  R2Range,
  R2Checksums,
  R2CreateMultipartUploadOptions,
  R2MultipartUpload,
  R2UploadedPart,
  D1PreparedStatement,
  D1Result,
  D1ExecResult,
  D1Meta,
  DurableObjectId,
  DurableObjectStub,
  DurableObjectNamespaceNewUniqueIdOptions,
  DurableObjectJurisdiction,
  QueueMessage,
  QueueSendOptions,
  QueueSendBatchOptions,
  AnalyticsEngineDataPoint,
  AiGatewayGetOptions,
  AiGatewayGetResponse,
  AiGatewayGetLogOptions,
  AiGatewayGetLogResponse,
  AiGatewayGetUrlOptions,
  AiGatewayGetUrlResponse,
  AiGatewayPatchLogOptions,
  AiGatewayPatchLogResponse,
  AiGatewayRunOptions,
  AiGatewayRunResponse,
} from "./default.d.ts";
`;

  const formattedIndex = indexContent;

  const indexPath = join(OUTPUT_DIR, "index.ts");
  await writeFile(indexPath, formattedIndex);
  console.log(`Generated index file at ${indexPath}`);
}

export async function generateCloudflareWorkerTypes(): Promise<void> {
  console.log("Generating Cloudflare Worker types...");

  // Ensure output directory exists
  await mkdir(OUTPUT_DIR, { recursive: true });

  // Generate types for latest date
  await generateTypeFile();

  // Generate index file
  await generateIndexFile();

  console.log("Successfully generated Cloudflare Worker type definitions");
}

// If this script is run directly, execute the generation
if (import.meta.main) {
  try {
    await generateCloudflareWorkerTypes();
  } catch (error) {
    console.error(
      "Error generating Cloudflare Worker type definitions:",
      error,
    );
    process.exit(1);
  }
}
