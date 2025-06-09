/**
 * Scaleway API error response structure
 */
export interface ScalewayApiError {
  type: string;
  message: string;
  details?: any;
  fields?: Record<string, string[]>;
}

/**
 * Scaleway API error response wrapper
 */
export interface ScalewayApiErrorResponse {
  message?: string;
  type?: string;
  details?: any;
  fields?: Record<string, string[]>;
}

/**
 * Handle Scaleway API errors with proper error messages
 */
export async function handleApiError(
  response: Response,
  operation: string,
  resourceType: string,
  resourceId?: string,
): Promise<never> {
  const resourceInfo = resourceId ? ` '${resourceId}'` : "";

  try {
    const errorData: ScalewayApiErrorResponse = await response.json();
    const errorMessage =
      errorData.message || errorData.type || `HTTP ${response.status}`;

    let detailMessage = `Failed to ${operation} ${resourceType}${resourceInfo}: ${errorMessage}`;

    if (errorData.details) {
      detailMessage += `\nDetails: ${JSON.stringify(errorData.details)}`;
    }

    if (errorData.fields) {
      const fieldErrors = Object.entries(errorData.fields)
        .map(([field, errors]) => `${field}: ${errors.join(", ")}`)
        .join("; ");
      detailMessage += `\nField errors: ${fieldErrors}`;
    }

    throw new Error(detailMessage);
  } catch (_parseError) {
    // If we can't parse the error response, use the status
    const statusText = response.statusText || "Unknown Error";
    throw new Error(
      `Failed to ${operation} ${resourceType}${resourceInfo}: HTTP ${response.status} ${statusText}`,
    );
  }
}
