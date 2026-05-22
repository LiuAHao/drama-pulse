export interface ApiResponse<T = unknown> {
  code: number;
  message: string;
  data: T;
}

export function success<T>(data: T): ApiResponse<T> {
  return { code: 0, message: 'ok', data };
}

export function error(code: number, message: string): ApiResponse<null> {
  return { code, message, data: null };
}
