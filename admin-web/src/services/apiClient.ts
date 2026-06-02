import { API_BASE_URL } from '../shared/constants';
import { getToken, removeToken } from '../shared/storage';
import type { ApiResponse } from '../shared/types';

export class ApiError extends Error {
  constructor(
    public code: number,
    message: string,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function apiRequest<T>(
  path: string,
  options: RequestInit = {},
): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  const hasJsonBody =
    options.body !== undefined &&
    options.body !== null &&
    !(options.body instanceof FormData);
  if (hasJsonBody && !headers['Content-Type']) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await res.json();

  if (json.code === 40101) {
    removeToken();
    window.location.href = '/login';
    throw new ApiError(json.code, json.message);
  }

  if (json.code !== 0) {
    throw new ApiError(json.code, json.message);
  }

  return json.data;
}
