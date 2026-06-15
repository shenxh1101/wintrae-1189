import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Settings, Play, FileCheck, Download, ChevronLeft, ChevronRight } from 'lucide-react';
import { useState } from 'react';
import { cn } from '@/lib/utils';

const menuItems = [
  { path: '/', icon: LayoutDashboard, label: '仪表盘' },
  { path: '/rules', icon: Settings, label: '规则配置' },
  { path: '/tasks', icon: Play, label: '任务执行' },
  { path: '/review', icon: FileCheck, label: '结果复核' },
  { path: '/export', icon: Download, label: '导出归档' },
];

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false);

  return (
    <aside
      className={cn(
        'flex flex-col bg-slate-900 text-white transition-all duration-300 ease-in-out',
        collapsed ? 'w-16' : 'w-60',
      )}
    >
      <div className="flex h-16 items-center justify-between px-4 border-b border-slate-700">
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-sm">
              售
            </div>
            <span className="font-semibold text-sm">售后自动化</span>
          </div>
        )}
        {collapsed && (
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-teal-400 to-cyan-500 flex items-center justify-center font-bold text-sm mx-auto">
            售
          </div>
        )}
      </div>

      <nav className="flex-1 py-4">
        <ul className="space-y-1 px-2">
          {menuItems.map((item) => (
            <li key={item.path}>
              <NavLink
                to={item.path}
                end={item.path === '/'}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-200',
                    isActive
                      ? 'bg-teal-600 text-white shadow-lg shadow-teal-600/30'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white',
                    collapsed && 'justify-center px-2',
                  )
                }
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <button
        onClick={() => setCollapsed(!collapsed)}
        className="flex items-center justify-center h-12 border-t border-slate-700 text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
      >
        {collapsed ? <ChevronRight className="w-5 h-5" /> : <ChevronLeft className="w-5 h-5" />}
      </button>
    </aside>
  );
}
