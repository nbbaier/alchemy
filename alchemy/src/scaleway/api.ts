import type { Secret } from "../secret.ts";

/**
 * Scaleway region where resources can be provisioned
 */
export type ScalewayRegion =
  | "fr-par" // Paris, France
  | "nl-ams" // Amsterdam, Netherlands
  | "pl-waw"; // Warsaw, Poland

/**
 * Scaleway zone within a region
 */
export type ScalewayZone =
  | "fr-par-1"
  | "fr-par-2"
  | "fr-par-3"
  | "nl-ams-1"
  | "nl-ams-2"
  | "nl-ams-3"
  | "pl-waw-1"
  | "pl-waw-2"
  | "pl-waw-3";

/**
 * Scaleway API client options
 */
export interface ScalewayApiOptions {
  /**
   * Scaleway API key (access key)
   * Get this from the Scaleway console under "API Keys"
   */
  accessKey?: string | Secret;

  /**
   * Scaleway secret key
   * Get this from the Scaleway console under "API Keys"
   */
  secretKey?: string | Secret;

  /**
   * Scaleway project ID (organization ID)
   * Get this from the Scaleway console
   */
  projectId?: string | Secret;

  /**
   * Scaleway region to use for API calls
   * @default "fr-par"
   */
  region?: ScalewayRegion;

  /**
   * Base URL for the Scaleway API
   * @default "https://api.scaleway.com"
   */
  baseUrl?: string;
}

/**
 * Create a Scaleway API client
 */
export function createScalewayApi(options: ScalewayApiOptions = {}) {
  const baseUrl = options.baseUrl || "https://api.scaleway.com";
  const region = options.region || "fr-par";

  const accessKey =
    typeof options.accessKey === "string"
      ? options.accessKey
      : options.accessKey?.value || process.env.SCALEWAY_ACCESS_KEY;

  const secretKey =
    typeof options.secretKey === "string"
      ? options.secretKey
      : options.secretKey?.value || process.env.SCALEWAY_SECRET_KEY;

  const projectId =
    typeof options.projectId === "string"
      ? options.projectId
      : options.projectId?.value || process.env.SCALEWAY_PROJECT_ID;

  if (!accessKey) {
    throw new Error(
      "Scaleway access key is required. Set SCALEWAY_ACCESS_KEY environment variable or pass accessKey option.",
    );
  }

  if (!secretKey) {
    throw new Error(
      "Scaleway secret key is required. Set SCALEWAY_SECRET_KEY environment variable or pass secretKey option.",
    );
  }

  if (!projectId) {
    throw new Error(
      "Scaleway project ID is required. Set SCALEWAY_PROJECT_ID environment variable or pass projectId option.",
    );
  }

  async function request(
    endpoint: string,
    options: RequestInit = {},
    serviceBaseUrl?: string,
  ): Promise<Response> {
    const url = `${serviceBaseUrl || baseUrl}${endpoint}`;

    const headers = new Headers(options.headers);
    headers.set("X-Auth-Token", secretKey);
    headers.set("Content-Type", "application/json");

    const response = await fetch(url, {
      ...options,
      headers,
    });

    return response;
  }

  return {
    region,
    projectId,

    async get(endpoint: string, serviceBaseUrl?: string): Promise<Response> {
      return request(endpoint, { method: "GET" }, serviceBaseUrl);
    },

    async post(
      endpoint: string,
      body?: any,
      serviceBaseUrl?: string,
    ): Promise<Response> {
      return request(
        endpoint,
        {
          method: "POST",
          body: body ? JSON.stringify(body) : undefined,
        },
        serviceBaseUrl,
      );
    },

    async put(
      endpoint: string,
      body?: any,
      serviceBaseUrl?: string,
    ): Promise<Response> {
      return request(
        endpoint,
        {
          method: "PUT",
          body: body ? JSON.stringify(body) : undefined,
        },
        serviceBaseUrl,
      );
    },

    async patch(
      endpoint: string,
      body?: any,
      serviceBaseUrl?: string,
    ): Promise<Response> {
      return request(
        endpoint,
        {
          method: "PATCH",
          body: body ? JSON.stringify(body) : undefined,
        },
        serviceBaseUrl,
      );
    },

    async delete(endpoint: string, serviceBaseUrl?: string): Promise<Response> {
      return request(endpoint, { method: "DELETE" }, serviceBaseUrl);
    },
  };
}

/**
 * Type for the Scaleway API client
 */
export type ScalewayApi = ReturnType<typeof createScalewayApi>;
