export interface ApiError {
  error: string;
}

export class ApiException extends Error {
  constructor(message: string, public status?: number) {
    super(message);
    this.name = 'ApiException';
  }
}

export async function apiCall<T>(
  path: string, 
  options: RequestInit = {}
): Promise<T> {
  try {
    const response = await fetch(path, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'same-origin',
    });

    if (!response.ok) {
      const error: ApiError = await response.json();
      throw new ApiException(error.error || 'API error', response.status);
    }

    return response.json();
  } catch (error) {
    if (error instanceof ApiException) {
      throw error;
    }
    throw new ApiException('Network error');
  }
}