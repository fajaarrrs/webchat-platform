import { NavLink, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import useBreakpoint from '../hooks/useBreakpoint';
import webcareLogo from '../assets/webcare-logo.webp';
import {
  LayoutDashboard, MessageSquare, Users, Link2,
  MessagesSquare, Settings, LogOut, ChevronRight,
} from 'lucide-react';

const menuByRole = {
  admin: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/admin/dashboard' },
    { label: 'Create Link',  icon: Link2,           to: '/admin/create-link' },
    { label: 'Users',        icon: Users,           to: '/admin/users' },
    { label: 'Forum',        icon: MessagesSquare,  to: '/admin/forum' },
    { label: 'Chat',         icon: MessageSquare,   to: '/admin/chat' },
    { label: 'Settings',     icon: Settings,        to: '/admin/settings' },
  ],
  karyawan: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/karyawan/dashboard' },
    { label: 'Forum',        icon: MessagesSquare,  to: '/karyawan/forum' },
    { label: 'Chat',         icon: MessageSquare,   to: '/karyawan/chat' },
    { label: 'Settings',     icon: Settings,        to: '/karyawan/settings' },
  ],
  client: [
    { label: 'Dashboard',    icon: LayoutDashboard, to: '/client/dashboard' },
    { label: 'Forum',        icon: MessagesSquare,  to: '/client/forum' },
    { label: 'Chat',         icon: MessageSquare,   to: '/client/chat' },
    { label: 'Settings',     icon: Settings,        to: '/client/settings' },
  ],
};

const roleBadge = {
  admin:    { label: 'Admin',    className: 'bg-violet-100 text-violet-700' },
  karyawan: { label: 'Employee', className: 'bg-blue-100 text-blue-700' },
  client:   { label: 'Client',   className: 'bg-emerald-100 text-emerald-700' },
};

export default function Sidebar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { isMobile, isTablet } = useBreakpoint();

  const [collapsed, setCollapsed] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('wchat_sidebar_collapsed')) || false;
    } catch (e) {
      return false;
    }
  });

  useEffect(() => {
    try { localStorage.setItem('wchat_sidebar_collapsed', JSON.stringify(collapsed)); } catch (e) { }
  }, [collapsed]);

  if (!user) return null;
  if (user.role !== 'admin') return null;

  const menu = menuByRole[user.role] || [];
  const badge = roleBadge[user.role];
  const initials = user.username?.slice(0, 2).toUpperCase() || '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const asideWidthClass = collapsed ? 'w-20' : (isMobile ? 'w-full' : isTablet ? 'w-[212px]' : 'w-[240px]');

  return (
    <aside className={`${asideWidthClass} ${isMobile ? 'relative' : 'sticky top-0 h-screen'} flex shrink-0 flex-col bg-slate-900 font-sans`}>
      {/* Logo */}
      <div className={`${isMobile ? 'px-4 pb-3 pt-3.5' : 'px-5 pb-5 pt-6'} border-b border-slate-800`}>
        <div className="flex items-center gap-2.5">
          <div
            className="flex shrink-0 transition-all duration-200"
            style={{ width: 40, height: 40, borderRadius: 5, background: '#FFFFFF ', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 1px 2px rgba(0,0,0,0.06)', overflow: 'hidden' }}
          >
            <img src={webcareLogo} alt="Webcare" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            {!collapsed && (
              <span className="text-base font-bold tracking-tight text-white">
                WebcareChat
              </span>
            )}
        </div>
      </div>
        {/* Collapse handle (hidden on mobile) */}
        {!isMobile && (
          <div style={{ position: 'absolute', right: -14, top: '50%', transform: 'translateY(-50%)', zIndex: 40 }}>
            <button
              onClick={() => setCollapsed(v => !v)}
              title={collapsed ? 'Open sidebar' : 'Close sidebar'}
              aria-expanded={!collapsed}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                width: 36, height: 56, borderRadius: 8, border: '1px solid rgba(255,255,255,0.04)',
                background: '#0f1724', color: '#9CA3AF', cursor: 'pointer',
                boxShadow: '0 6px 18px rgba(2,6,23,0.35)'
              }}
            >
              <ChevronRight size={18} style={{ transform: collapsed ? 'rotate(0deg)' : 'rotate(180deg)' }} />
            </button>
          </div>
        )}

        {/* User Info (only shown when expanded) */}
        {!collapsed && (
          <div className={`${isMobile ? 'px-4 py-2.5' : 'px-5 py-4'} flex items-center gap-3 border-b border-slate-800`}>
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-600 text-xs font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0 overflow-hidden">
              <div className="truncate text-sm font-semibold text-slate-50">
                {user.username}
              </div>
              <span className={`mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-semibold ${badge?.className || 'bg-slate-100 text-slate-700'}`}>
                {badge.label}
              </span>
            </div>
          </div>
        )}

        {/* Navigation (icons always visible; labels hidden when collapsed) */}
        <nav className={`${isMobile ? 'px-2.5 pb-2 pt-2.5' : 'p-3'} flex-1 overflow-y-auto`}>
          {menu.map(({ label, icon: Icon, to }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) => (
                collapsed
                  ? `group relative mb-1 flex items-center justify-center rounded-lg p-2 text-sm transition-all duration-200 ${isActive ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}`
                  : `group relative mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${isActive ? 'bg-blue-600/10 text-blue-500' : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'}`
              )}
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200 ${isActive ? 'bg-blue-500 opacity-100' : 'bg-blue-500 opacity-0 group-hover:opacity-40'}`}
                  />
                  <Icon size={collapsed ? 18 : 17} />
                  {!collapsed && <span className="flex-1">{label}</span>}
                </>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Logout (only when expanded) */}
        {!collapsed && (
          <div className={`${isMobile ? 'px-2.5 pb-3 pt-2' : 'px-3 pb-5 pt-3'}`}>
            <button
              onClick={handleLogout}
              className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:bg-red-500/15 hover:text-red-400"
            >
              <LogOut size={17} />
              <span>Logout</span>
            </button>
          </div>
        )}
    </aside>
  );
}
