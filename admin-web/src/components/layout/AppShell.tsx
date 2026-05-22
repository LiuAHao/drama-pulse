import { Outlet, Navigate } from 'react-router-dom';
import { SidebarNav } from './SidebarNav';
import { useAuth } from '../../features/auth/useAuth';
import { API_BASE_URL } from '../../shared/constants';

export function AppShell() {
  const { isAuthenticated, logout } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <SidebarNav onLogout={logout} />
      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="h-10 bg-white border-b border-gray-200 flex items-center px-6 shrink-0">
          <span className="text-xs text-gray-400">API: {API_BASE_URL}</span>
        </header>
        <main className="flex-1 overflow-y-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
