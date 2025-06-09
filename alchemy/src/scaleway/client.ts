import {
  createScalewayApi,
  type ScalewayApiOptions,
  type ScalewayRegion,
  type ScalewayZone,
} from "./api.ts";

/**
 * High-level Scaleway client for managing resources
 */
export class ScalewayClient {
  private api: ReturnType<typeof createScalewayApi>;

  constructor(options: ScalewayApiOptions = {}) {
    this.api = createScalewayApi(options);
  }

  get region(): ScalewayRegion {
    return this.api.region;
  }

  get projectId(): string {
    return this.api.projectId;
  }

  /**
   * Get service-specific base URL for a region and zone
   */
  getServiceBaseUrl(service: string, zone?: ScalewayZone): string {
    const zoneParam = zone || `${this.region}-1`;
    return `https://api.scaleway.com/${service}/v1/zones/${zoneParam}`;
  }

  /**
   * Get service-specific base URL for a region (not zone-specific)
   */
  getRegionalServiceBaseUrl(service: string): string {
    return `https://api.scaleway.com/${service}/v1/regions/${this.region}`;
  }

  /**
   * Raw API access for advanced usage
   */
  get rawApi() {
    return this.api;
  }
}

/**
 * Create a Scaleway client instance
 */
export function createScalewayClient(
  options: ScalewayApiOptions = {},
): ScalewayClient {
  return new ScalewayClient(options);
}
