export type IpcSuccessResponse<T> = { success: true; data: T };
export type IpcSuccessVoidResponse = { success: true };
export type IpcErrorResponse = { success: false; error: string };

export function getErrorMessage(
  error: unknown,
  fallbackMessage: string,
): string {
  return error instanceof Error ? error.message : fallbackMessage;
}

export async function withIpcData<T>(
  operation: () => Promise<T>,
  fallbackMessage: string,
): Promise<IpcSuccessResponse<T> | IpcErrorResponse> {
  try {
    const data = await operation();
    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, fallbackMessage),
    };
  }
}

export async function withIpcVoid(
  operation: () => Promise<void>,
  fallbackMessage: string,
): Promise<IpcSuccessVoidResponse | IpcErrorResponse> {
  try {
    await operation();
    return { success: true };
  } catch (error) {
    return {
      success: false,
      error: getErrorMessage(error, fallbackMessage),
    };
  }
}
