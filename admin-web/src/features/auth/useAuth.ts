import { useState, useCallback } from 'react';
import { getToken, setToken, removeToken } from '../../shared/storage';
import { apiRequest } from '../../services/apiClient';

export function useAuth() {
  const [token, setTokenState] = useState<string | null>(getToken());

  const login = useCallback(async (newToken: string) => {
    setToken(newToken);
    setTokenState(newToken);
    await apiRequest('/admin/dramas');
  }, []);

  const logout = useCallback(() => {
    removeToken();
    setTokenState(null);
  }, []);

  return { isAuthenticated: !!token, login, logout };
}
