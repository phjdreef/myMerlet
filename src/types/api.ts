/**
 * Standard API response wrapper used across all IPC calls
 * Provides consistent error handling and type safety
 */
export type APIResponse<T = unknown> = {
  success: boolean;
  data?: T;
  error?: string;
};

/**
 * API response for operations that don't return data
 */
export type APIResult = {
  success: boolean;
  error?: string;
};
