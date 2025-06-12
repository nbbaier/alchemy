import type { Pipeline } from "cloudflare:pipelines";
import type { Secret } from "../secret.ts";
import type { AiGatewayResource as _AiGateway } from "./ai-gateway.ts";
import type { Ai as _Ai } from "./ai.ts";
import type { AnalyticsEngineDataset as _AnalyticsEngineDataset } from "./analytics-engine.ts";
import type { Assets } from "./assets.ts";
import type { Binding, Json, Self } from "./bindings.ts";
import type { BrowserRendering } from "./browser-rendering.ts";
import type { R2BucketResource as _R2Bucket } from "./bucket.ts";
import type { D1DatabaseResource } from "./d1-database.ts";
import type { DispatchNamespaceResource } from "./dispatch-namespace.ts";
import type { DurableObjectNamespace as _DurableObjectNamespace } from "./durable-object-namespace.ts";
import type { HyperdriveResource as _Hyperdrive } from "./hyperdrive.ts";
import type { Images as _Images } from "./images.ts";
import type { PipelineResource as _Pipeline } from "./pipeline.ts";
import type { QueueResource as _Queue } from "./queue.ts";
import type { SecretsStore as _SecretsStore } from "./secrets-store.ts";
import type { VectorizeIndexResource as _VectorizeIndex } from "./vectorize-index.ts";
import type { VersionMetadata as _VersionMetadata } from "./version-metadata.ts";
import type { Worker as _Worker, WorkerRef } from "./worker.ts";
import type { Workflow as _Workflow } from "./workflow.ts";

/**
 * Vendored Cloudflare Workers types to avoid implicit dependency on @cloudflare/workers-types
 */

// Basic types
export interface Fetcher {
  fetch(input: RequestInfo, init?: RequestInit): Promise<Response>;
  connect(address: SocketAddress | string, options?: SocketOptions): Socket;
}

export interface Service<Methods = Record<string, unknown>> extends Fetcher {
  connect(address: SocketAddress | string, options?: SocketOptions): Socket;
}

export interface SocketAddress {
  hostname: string;
  port: number;
}

export interface SocketOptions {
  secureTransport?: "off" | "on" | "starttls";
  allowHalfOpen?: boolean;
}

export interface Socket {
  readable: ReadableStream;
  writable: WritableStream;
  opened: Promise<SocketInfo>;
  closed: Promise<void>;
  close(): Promise<void>;
  upgraded: boolean;
  secureTransport?: "off" | "on" | "starttls";
  startTls(): Socket;
}

interface SocketInfo {
  localAddress?: string;
  remoteAddress?: string;
}

// KV Namespace
interface KVNamespace {
  get(key: string, options?: KVGetOptions): Promise<string | null>;
  get(key: string, type: "text"): Promise<string | null>;
  get(key: string, type: "json"): Promise<any>;
  get(key: string, type: "arrayBuffer"): Promise<ArrayBuffer | null>;
  get(key: string, type: "stream"): Promise<ReadableStream | null>;
  getWithMetadata(key: string, options?: KVGetOptions): Promise<KVGetResult>;
  getWithMetadata(key: string, type: "text"): Promise<KVGetResult<string>>;
  getWithMetadata(key: string, type: "json"): Promise<KVGetResult<any>>;
  getWithMetadata(
    key: string,
    type: "arrayBuffer",
  ): Promise<KVGetResult<ArrayBuffer>>;
  getWithMetadata(
    key: string,
    type: "stream",
  ): Promise<KVGetResult<ReadableStream>>;
  put(
    key: string,
    value: string | ArrayBuffer | ArrayBufferView | ReadableStream,
    options?: KVPutOptions,
  ): Promise<void>;
  delete(key: string): Promise<void>;
  list(options?: KVListOptions): Promise<KVListResult>;
}

interface KVGetOptions {
  type?: "text" | "json" | "arrayBuffer" | "stream";
  cacheTtl?: number;
}

interface KVGetResult<T = unknown> {
  value: T | null;
  metadata: unknown;
  cacheStatus?: string;
}

interface KVPutOptions {
  expiration?: number;
  expirationTtl?: number;
  metadata?: any;
}

interface KVListOptions {
  prefix?: string;
  limit?: number;
  cursor?: string;
}

interface KVListResult {
  keys: KVKey[];
  list_complete: boolean;
  cursor?: string;
}

interface KVKey {
  name: string;
  expiration?: number;
  metadata?: unknown;
}

// R2 Bucket
interface R2Bucket {
  get(key: string, options?: R2GetOptions): Promise<R2Object | null>;
  put(
    key: string,
    object: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
    options?: R2PutOptions,
  ): Promise<R2Object>;
  delete(keys: string | string[]): Promise<void>;
  list(options?: R2ListOptions): Promise<R2Objects>;
  head(key: string): Promise<R2Object | null>;
  createMultipartUpload(
    key: string,
    options?: R2CreateMultipartUploadOptions,
  ): Promise<R2MultipartUpload>;
  resumeMultipartUpload(key: string, uploadId: string): R2MultipartUpload;
}

interface R2GetOptions {
  range?: R2Range;
  onlyIf?: R2Conditional;
}

interface R2PutOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  onlyIf?: R2Conditional;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  md5?: ArrayBuffer;
}

interface R2ListOptions {
  limit?: number;
  prefix?: string;
  cursor?: string;
  delimiter?: string;
  startAfter?: string;
  include?: ("httpMetadata" | "customMetadata")[];
}

interface R2Object {
  key: string;
  version: string;
  size: number;
  etag: string;
  httpEtag: string;
  uploaded: Date;
  checksums: R2Checksums;
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
  range?: R2Range;
  body: ReadableStream;
  bodyUsed: boolean;
  arrayBuffer(): Promise<ArrayBuffer>;
  text(): Promise<string>;
  json(): Promise<any>;
  blob(): Promise<Blob>;
}

interface R2Objects {
  objects: R2Object[];
  truncated: boolean;
  cursor?: string;
  delimitedPrefixes: string[];
}

interface R2Range {
  offset?: number;
  length?: number;
  suffix?: number;
}

interface R2Conditional {
  etagMatches?: string | string[];
  etagDoesNotMatch?: string | string[];
  uploadedBefore?: Date;
  uploadedAfter?: Date;
}

interface R2HTTPMetadata {
  contentType?: string;
  contentLanguage?: string;
  contentDisposition?: string;
  contentEncoding?: string;
  cacheControl?: string;
  cacheExpiry?: Date;
}

interface R2Checksums {
  md5?: ArrayBuffer;
  sha1?: ArrayBuffer;
  sha256?: ArrayBuffer;
  sha384?: ArrayBuffer;
  sha512?: ArrayBuffer;
}

interface R2CreateMultipartUploadOptions {
  httpMetadata?: R2HTTPMetadata;
  customMetadata?: Record<string, string>;
}

interface R2MultipartUpload {
  key: string;
  uploadId: string;
  uploadPart(
    partNumber: number,
    value: ReadableStream | ArrayBuffer | ArrayBufferView | string | Blob,
  ): Promise<R2UploadedPart>;
  complete(uploadedParts: R2UploadedPart[]): Promise<R2Object>;
  abort(): Promise<void>;
}

interface R2UploadedPart {
  partNumber: number;
  etag: string;
}

// D1 Database
interface D1Database {
  prepare(query: string): D1PreparedStatement;
  dump(): Promise<ArrayBuffer>;
  batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
  exec(query: string): Promise<D1ExecResult>;
  withSession<T>(callback: (db: D1Database) => Promise<T>): Promise<T>;
}

interface D1PreparedStatement {
  bind(...values: unknown[]): D1PreparedStatement;
  first<T = unknown>(colName?: string): Promise<T | null>;
  run(): Promise<D1Result>;
  all<T = unknown>(): Promise<D1Result<T[]>>;
  raw<T = unknown[]>(): Promise<T[]>;
}

interface D1Result<T = Record<string, unknown>> {
  success: boolean;
  meta: D1Meta;
  results?: T;
  error?: string;
}

interface D1ExecResult {
  count: number;
  duration: number;
}

interface D1Meta {
  duration: number;
  size_after: number;
  rows_read: number;
  rows_written: number;
  last_row_id?: number;
  changed_db: boolean;
  changes: number;
}

// Durable Object Namespace
interface DurableObjectNamespace<T = DurableObjectStub> {
  newUniqueId(
    options?: DurableObjectNamespaceNewUniqueIdOptions,
  ): DurableObjectId;
  idFromName(name: string): DurableObjectId;
  idFromString(id: string): DurableObjectId;
  get(id: DurableObjectId): T;
}

interface DurableObjectNamespaceNewUniqueIdOptions {
  jurisdiction?: DurableObjectJurisdiction;
}

type DurableObjectJurisdiction = "eu" | "fedramp";

interface DurableObjectId {
  toString(): string;
  equals(other: DurableObjectId): boolean;
  getName(): string | undefined;
}

interface DurableObjectStub extends Fetcher {
  id: DurableObjectId;
  name?: string;
}

// Queue
interface Queue<Body = unknown> {
  send(message: Body, options?: QueueSendOptions): Promise<void>;
  sendBatch(
    messages: QueueMessage<Body>[],
    options?: QueueSendBatchOptions,
  ): Promise<void>;
}

interface QueueMessage<Body = unknown> {
  body: Body;
  contentType?: string;
  delaySeconds?: number;
}

interface QueueSendOptions {
  contentType?: string;
  delaySeconds?: number;
}

interface QueueSendBatchOptions {
  delaySeconds?: number;
}

// Vectorize Index
interface VectorizeIndex {
  query(
    vector: number[] | VectorizeVector,
    options?: VectorizeQueryOptions,
  ): Promise<VectorizeMatches>;
  insert(vectors: VectorizeVector[]): Promise<VectorizeInsertResult>;
  upsert(vectors: VectorizeVector[]): Promise<VectorizeUpsertResult>;
  deleteByIds(ids: string[]): Promise<VectorizeDeleteResult>;
  describe(): Promise<VectorizeIndexDetails>;
  getByIds(ids: string[]): Promise<VectorizeVector[]>;
}

interface VectorizeVector {
  id: string;
  values: number[];
  metadata?: Record<string, unknown>;
  namespace?: string;
}

interface VectorizeQueryOptions {
  topK?: number;
  namespace?: string;
  filter?: Record<string, unknown>;
  returnValues?: boolean;
  returnMetadata?: boolean;
}

interface VectorizeMatches {
  matches: VectorizeMatch[];
  count: number;
}

interface VectorizeMatch {
  id: string;
  score: number;
  values?: number[];
  metadata?: Record<string, unknown>;
}

interface VectorizeInsertResult {
  count: number;
  ids: string[];
}

interface VectorizeUpsertResult {
  count: number;
  ids: string[];
}

interface VectorizeDeleteResult {
  count: number;
  ids: string[];
}

interface VectorizeIndexDetails {
  name: string;
  description?: string;
  dimensions: number;
  metric: string;
  vectors_count: number;
}

// Analytics Engine
interface AnalyticsEngineDataset {
  writeDataPoint(event: AnalyticsEngineDataPoint): void;
}

interface AnalyticsEngineDataPoint {
  indexes?: string[];
  doubles?: number[];
  blobs?: string[];
}

// AI Gateway
interface AiGateway {
  get(options: AiGatewayGetOptions): Promise<AiGatewayLogEntry[]>;
  getLog(options: AiGatewayGetOptions): Promise<AiGatewayLogEntry[]>;
  getUrl(): string;
  patchLog(id: string, data: any): Promise<void>;
  run(input: any, options?: any): Promise<any>;
}

interface AiGatewayGetOptions {
  orderBy?: string;
  direction?: "asc" | "desc";
  limit?: number;
  cursor?: string;
}

interface AiGatewayLogEntry {
  id: string;
  timestamp: string;
  level: string;
  message: string;
}

// Hyperdrive
interface Hyperdrive {
  connectionString: string;
  host: string;
  port: number;
  database: string;
  user: string;
}

// Workflow
interface Workflow<P = unknown> {
  create(
    options?: WorkflowInstanceCreateOptions<P>,
  ): Promise<WorkflowInstance<P>>;
  get(id: string): Promise<WorkflowInstance<P>>;
}

interface WorkflowInstanceCreateOptions<P = unknown> {
  id?: string;
  params?: P;
}

interface WorkflowInstance<P = unknown> {
  id: string;
  status: WorkflowInstanceStatus;
  output?: unknown;
  error?: WorkflowInstanceError;
  pause(): Promise<void>;
  resume(): Promise<void>;
  restart(): Promise<void>;
  terminate(): Promise<void>;
}

interface WorkflowInstanceStatus {
  status:
    | "queued"
    | "running"
    | "paused"
    | "terminated"
    | "complete"
    | "failed";
  error?: WorkflowInstanceError;
  output?: unknown;
}

interface WorkflowInstanceError {
  message: string;
  name: string;
  stack?: string;
}

// Images Binding
interface ImagesBinding {
  get(id: string): Promise<ArrayBuffer>;
}

// Worker Version Metadata
interface WorkerVersionMetadata {
  id: string;
  tag: string;
  timestamp: string;
}

// RPC types
namespace Rpc {
  export type Provider<
    Methods,
    WorkerInterface extends "fetch" | "connect" = "fetch" | "connect",
  > = {
    [K in keyof Methods]: Methods[K];
  };
}

export type Bound<T extends Binding> = T extends _DurableObjectNamespace<
  infer O
>
  ? DurableObjectNamespace<O>
  : T extends { type: "kv_namespace" }
    ? KVNamespace
    : T extends _Worker<any, infer RPC> | WorkerRef<infer RPC>
      ? Service<RPC> & {
          // cloudflare's Rpc.Provider type loses mapping between properties (jump to definition)
          // we fix that using Pick to re-connect mappings
          [property in keyof Pick<
            RPC,
            Extract<keyof Rpc.Provider<RPC, "fetch" | "connect">, keyof RPC>
          >]: Rpc.Provider<RPC, "fetch" | "connect">[property];
        }
      : T extends { type: "service" }
        ? Service
        : T extends _R2Bucket
          ? R2Bucket
          : T extends _AiGateway
            ? AiGateway
            : T extends _Hyperdrive
              ? Hyperdrive
              : T extends Secret
                ? string
                : T extends Assets
                  ? Service
                  : T extends _Workflow<infer P>
                    ? Workflow<P>
                    : T extends D1DatabaseResource
                      ? D1Database
                      : T extends DispatchNamespaceResource
                        ? { get(name: string): Fetcher }
                        : T extends _VectorizeIndex
                          ? VectorizeIndex
                          : T extends _Queue<infer Body>
                            ? Queue<Body>
                            : T extends _SecretsStore<infer S>
                              ? SecretsStoreBinding<S>
                              : T extends _AnalyticsEngineDataset
                                ? AnalyticsEngineDataset
                                : T extends _Pipeline<infer R>
                                  ? Pipeline<R>
                                  : T extends string
                                    ? string
                                    : T extends BrowserRendering
                                      ? Fetcher
                                      : T extends _Ai<infer M>
                                        ? Ai<M>
                                        : T extends _Images
                                          ? ImagesBinding
                                          : T extends _VersionMetadata
                                            ? WorkerVersionMetadata
                                            : T extends Self
                                              ? Service
                                              : T extends Json<infer T>
                                                ? T
                                                : Service;

interface SecretsStoreBinding<
  S extends Record<string, Secret> | undefined = undefined,
> {
  get(
    key: (S extends Record<string, any> ? keyof S : never) | (string & {}),
  ): Promise<string>;
}
