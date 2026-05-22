export const TOKEN_KEY = 'drama-pulse-admin-token';

function getDefaultApiBaseUrl(): string {
  if (typeof window === 'undefined') {
    return 'http://localhost:8787';
  }

  const { protocol, hostname } = window.location;
  const isLocalHost =
    hostname === 'localhost' ||
    hostname === '127.0.0.1' ||
    hostname === '0.0.0.0';

  if (isLocalHost) {
    return 'http://localhost:8787';
  }

  return `${protocol}//${hostname}:8787`;
}

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || getDefaultApiBaseUrl();
