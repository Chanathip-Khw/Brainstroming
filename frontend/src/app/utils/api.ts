import { ERROR_MESSAGES } from '../constants';

export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface ApiError extends Error {
  status?: number;
  code?: string;
}

/**
 * Creates a standardized API error
 */
export const createApiError = (
  message: string,
  status?: number,
  code?: string
): ApiError => {
  const error = new Error(message) as ApiError;
  if (status !== undefined) error.status = status;
  if (code !== undefined) error.code = code;
  return error;
};

/**
 * Handles API response and converts to standardized format
 */
export const handleApiResponse = async <T>(
  response: Response
): Promise<ApiResponse<T>> => {
  try {
    const data = await response.json();

    if (!response.ok) {
      return {
        success: false,
        error: data.error || getErrorMessage(response.status),
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error) {
    return {
      success: false,
      error: ERROR_MESSAGES.NETWORK_ERROR,
    };
  }
};

/**
 * Gets appropriate error message for HTTP status codes
 */
export const getErrorMessage = (status: number): string => {
  switch (status) {
    case 401:
      return ERROR_MESSAGES.UNAUTHORIZED;
    case 404:
      return ERROR_MESSAGES.NOT_FOUND;
    case 500:
      return ERROR_MESSAGES.SERVER_ERROR;
    default:
      return ERROR_MESSAGES.NETWORK_ERROR;
  }
};

/**
 * Retry wrapper for API calls
 */
export const withRetry = async <T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000
): Promise<T> => {
  let lastError: Error;

  for (let i = 0; i <= maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;

      if (i === maxRetries) {
        break;
      }

      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }

  throw lastError!;
};

/**
 * Debounced API call function
 */
export const debounceApiCall = <T extends any[], R>(
  fn: (...args: T) => Promise<R>,
  delay: number = 300
): ((...args: T) => Promise<R>) => {
  let timeoutId: NodeJS.Timeout;
  let currentPromise: Promise<R> | null = null;

  return (...args: T): Promise<R> => {
    // Clear existing timeout
    clearTimeout(timeoutId);

    // If there's already a promise, return it
    if (currentPromise) {
      return currentPromise;
    }

    // Create new promise
    currentPromise = new Promise((resolve, reject) => {
      timeoutId = setTimeout(async () => {
        try {
          const result = await fn(...args);
          resolve(result);
        } catch (error) {
          reject(error);
        } finally {
          currentPromise = null;
        }
      }, delay);
    });

    return currentPromise;
  };
};

/**
 * Validates response data structure
 */
export const validateApiResponse = <T>(
  data: any,
  validator: (data: any) => data is T
): T => {
  if (!validator(data)) {
    throw createApiError('Invalid response data structure');
  }
  return data;
};
