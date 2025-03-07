import {
  type GenerateObjectResult,
  type LanguageModelV1,
  generateObject as _generateObject,
  generateText as _generateText,
  streamText as _streamText,
} from "ai";
import type { z } from "zod";
import { isOpenAIModel } from "./openai";

// OpenAI error types
interface OpenAIError extends Error {
  status?: number;
  code?: string;
  type?: string;
}

export interface GenerateTextOptions
  extends Omit<Parameters<typeof _generateText>[0], "model"> {
  model: LanguageModelV1;
  effort?: "low" | "medium" | "high";
}

/**
 * Rate-limited wrapper around generateText
 */
export const generateText = async (options: GenerateTextOptions) => {
  const opts = {
    ...options,
    providerOptions: providerOptions(options),
  };
  return withRateLimit(() => _generateText(opts), opts);
};

export const streamText = async (options: GenerateTextOptions) => {
  const opts = {
    ...options,
    providerOptions: providerOptions(options),
  };
  return withRateLimit(() => _streamText(opts), opts);
};

function providerOptions(options: GenerateTextOptions): any {
  return {
    ...options.providerOptions,
    openai:
      (options.model.modelId.startsWith("gpt") ||
        options.model.modelId.startsWith("o1") ||
        options.model.modelId.startsWith("o3")) &&
      options.effort
        ? {
            ...options.providerOptions?.openai,
            reasoningEffort: options.effort,
          }
        : undefined,
    anthropic:
      options.model.modelId.startsWith("claude") && options.effort
        ? {
            ...options.providerOptions?.anthropic,
            thinking: options.effort
              ? {
                  type: "enabled",
                  budgetTokens: {
                    high: 12000,
                    medium: 6000,
                    low: 3000,
                  }[options.effort],
                }
              : undefined,
          }
        : undefined,
  };
}

/**
 * Rate-limited wrapper around generateObject
 */
export const generateObject: typeof _generateObject = (async <OBJECT>(
  options: Parameters<typeof _generateObject>[0] & {
    schema: z.Schema<OBJECT>;
    effort?: "low" | "medium" | "high";
  },
): Promise<GenerateObjectResult<OBJECT>> => {
  const opts = {
    ...options,
    providerOptions:
      options.model.modelId === "gpt-4o"
        ? undefined
        : {
            openai: {
              reasoningEffort: options.effort ?? "high",
              strict: false,
            },
          },
  };
  return withRateLimit(() => _generateObject<OBJECT>(opts as any), opts);
}) as any;

/**
 * A simple async semaphore implementation for rate limiting
 */
class AsyncSemaphore {
  private permits: number;
  private queue: Array<() => void> = [];

  constructor(permits: number) {
    this.permits = permits;
  }

  async acquire(): Promise<void> {
    if (this.permits > 0) {
      this.permits--;
      return;
    }

    return new Promise<void>((resolve) => {
      this.queue.push(resolve);
    });
  }

  release(): void {
    if (this.queue.length > 0) {
      const next = this.queue.shift();
      next?.();
    } else {
      this.permits++;
    }
  }
}

/**
 * Configuration for rate limiting and retries
 */
export interface RateLimitConfig {
  /**
   * Maximum number of concurrent requests
   * @default 3
   */
  maxConcurrent?: number;

  /**
   * Base delay for exponential backoff (in milliseconds)
   * @default 1000
   */
  baseDelay?: number;

  /**
   * Maximum number of retries
   * @default 3
   */
  maxRetries?: number;

  /**
   * Maximum delay for exponential backoff (in milliseconds)
   * @default 30000
   */
  maxDelay?: number;

  /**
   * Jitter factor for randomizing delays (between 0 and 1)
   * @default 0.1
   */
  jitter?: number;
}

// Global semaphore instances per client configuration
const defaultConfig: Required<RateLimitConfig> = {
  maxConcurrent: 3,
  baseDelay: 1000,
  maxRetries: 10,
  maxDelay: 30000,
  jitter: 0.1,
};

// WeakMap to store semaphores per client
const clientSemaphores = new Map<"openai" | "anthropic", AsyncSemaphore>();

/**
 * Gets or creates a semaphore for a specific client
 */
function getSemaphore(client: "openai" | "anthropic"): AsyncSemaphore {
  let semaphore = clientSemaphores.get(client);
  if (!semaphore) {
    semaphore = new AsyncSemaphore(defaultConfig.maxConcurrent);
    clientSemaphores.set(client, semaphore);
  }
  return semaphore;
}

/**
 * Calculates the delay for exponential backoff with jitter
 */
function calculateBackoffDelay(
  attempt: number,
  { baseDelay, maxDelay, jitter }: Required<RateLimitConfig>,
): number {
  const exponentialDelay = Math.min(baseDelay * Math.pow(2, attempt), maxDelay);
  const jitterAmount = exponentialDelay * jitter;
  return exponentialDelay + (Math.random() * 2 - 1) * jitterAmount;
}

/**
 * Checks if an error is a rate limit related error
 */
function isRateLimitError(error: any): boolean {
  if (error.url === "https://api.anthropic.com/v1/messages") {
    return error.status === 429;
  }

  const openAIError = error as OpenAIError;

  // Check for specific OpenAI rate limit error codes
  if (openAIError.code) {
    return [
      "rate_limit_exceeded",
      "insufficient_quota",
      "tokens_quota_exceeded",
      "requests_quota_exceeded",
    ].includes(openAIError.code);
  }

  // Check for HTTP 429 status
  if (openAIError.status === 429) return true;

  // Check error types
  if (openAIError.type) {
    return ["tokens", "requests", "rate_limit", "capacity"].includes(
      openAIError.type.toLowerCase(),
    );
  }

  // Fallback to message content check
  return (
    openAIError.message.toLowerCase().includes("rate") ||
    openAIError.message.toLowerCase().includes("quota") ||
    openAIError.message.toLowerCase().includes("capacity") ||
    openAIError.message.toLowerCase().includes("throttle")
  );
}

/**
 * Wraps an async function with rate limiting and exponential backoff
 */
async function withRateLimit<T>(
  fn: () => T,
  options: GenerateTextOptions,
  config: RateLimitConfig = {},
): Promise<T> {
  const finalConfig = { ...defaultConfig, ...config };
  const client = options.model;
  const semaphore = getSemaphore(
    isOpenAIModel(client.modelId) ? "openai" : "anthropic",
  );
  for (let attempt = 0; attempt <= finalConfig.maxRetries; attempt++) {
    try {
      await semaphore.acquire();
      const result = await fn();
      return result;
    } catch (error) {
      if (attempt === finalConfig.maxRetries) {
        throw error;
      }

      if (!isRateLimitError(error)) {
        throw error;
      }

      const delay = calculateBackoffDelay(attempt, finalConfig);
      console.log(
        `Rate limit error, retrying... (attempt ${attempt + 1}/${finalConfig.maxRetries + 1}, waiting ${Math.round(delay)}ms)`,
      );
      await new Promise((resolve) => setTimeout(resolve, delay));
    } finally {
      semaphore.release();
    }
  }

  throw new Error("Unexpected: Should not reach this point");
}
