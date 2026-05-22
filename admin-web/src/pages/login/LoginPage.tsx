import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../../features/auth/useAuth';
import { TOKEN_KEY } from '../../shared/constants';

export function LoginPage() {
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  if (localStorage.getItem(TOKEN_KEY)) {
    return <Navigate to="/dashboard" replace />;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token.trim()) {
      setError('请输入后台令牌');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await login(token.trim());
      navigate('/dashboard', { replace: true });
    } catch {
      setError('令牌无效或服务端不可达');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="w-full max-w-sm bg-white rounded-lg shadow-sm border border-gray-200 p-8">
        <h1 className="text-lg font-semibold text-gray-800 text-center mb-1">Drama Pulse</h1>
        <p className="text-sm text-gray-400 text-center mb-6">管理后台登录</p>
        <form onSubmit={handleSubmit}>
          <label className="block text-sm text-gray-600 mb-1.5">后台令牌</label>
          <input
            type="password"
            value={token}
            onChange={(e) => setToken(e.target.value)}
            placeholder="输入 ADMIN_TOKEN"
            className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
          {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
          <button
            type="submit"
            disabled={loading}
            className="w-full mt-4 py-2 bg-blue-600 text-white text-sm rounded-md hover:bg-blue-700 disabled:opacity-50 cursor-pointer transition-colors"
          >
            {loading ? '验证中...' : '登录'}
          </button>
        </form>
      </div>
    </div>
  );
}
