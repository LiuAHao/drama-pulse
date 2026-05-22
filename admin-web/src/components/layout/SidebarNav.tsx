import { NavLink } from 'react-router-dom';

const navItems = [
  { to: '/dashboard', label: '仪表盘', icon: '📊' },
  { to: '/dramas', label: '短剧管理', icon: '🎬' },
  { to: '/episodes', label: '剧集管理', icon: '📺' },
  { to: '/highlights', label: '高光管理', icon: '✨' },
  { to: '/interactions', label: '互动数据', icon: '💬' },
  { to: '/branch-tasks', label: '分支任务', icon: '🔀' },
  { to: '/assets-config', label: '资源配置', icon: '📁' },
  { to: '/demo-tools', label: '演示工具', icon: '🛠' },
];

export function SidebarNav({ onLogout }: { onLogout: () => void }) {
  return (
    <aside className="w-56 bg-white border-r border-gray-200 flex flex-col shrink-0">
      <div className="px-5 py-4 border-b border-gray-100">
        <h2 className="text-base font-semibold text-gray-800">Drama Pulse</h2>
        <p className="text-xs text-gray-400 mt-0.5">管理后台</p>
      </div>
      <nav className="flex-1 py-3 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-5 py-2.5 text-sm transition-colors ${
                isActive
                  ? 'bg-blue-50 text-blue-700 font-medium border-r-2 border-blue-600'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-800'
              }`
            }
          >
            <span className="text-base">{item.icon}</span>
            {item.label}
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-100">
        <button
          onClick={onLogout}
          className="w-full text-left text-sm text-gray-500 hover:text-red-600 transition-colors cursor-pointer"
        >
          退出登录
        </button>
      </div>
    </aside>
  );
}
