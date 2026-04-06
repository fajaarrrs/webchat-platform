import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import useBreakpoint from '../hooks/useBreakpoint';
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

  if (!user) return null;
  if (user.role !== 'admin') return null;

  const menu = menuByRole[user.role] || [];
  const badge = roleBadge[user.role];
  const initials = user.username?.slice(0, 2).toUpperCase() || '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const asideWidthClass = isMobile ? 'w-full' : isTablet ? 'w-[212px]' : 'w-[240px]';

  return (
    <aside className={`${asideWidthClass} ${isMobile ? 'relative' : 'sticky top-0 h-screen'} flex shrink-0 flex-col bg-slate-900 font-sans`}>
      {/* Logo */}
      <div className={`${isMobile ? 'px-4 pb-3 pt-3.5' : 'px-5 pb-5 pt-6'} border-b border-slate-800`}>
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-blue-600 shadow-sm transition-all duration-200">
            <MessageSquare size={18} color="#fff" />
          </div>
          <span className="text-base font-bold tracking-tight text-white">
            WebcareChat
          </span>
        </div>
      </div>

      {/* User Info */}
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

      {/* Navigation */}
      <nav className={`${isMobile ? 'px-2.5 pb-2 pt-2.5' : 'p-3'} flex-1 overflow-y-auto`}>
        {menu.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) => (
              `group relative mb-1 flex items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm transition-all duration-200 ${
                isActive
                  ? 'bg-blue-600/10 text-blue-500'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`
            )}
          >
            {({ isActive }) => (
              <>
                <span
                  className={`absolute left-0 top-1/2 h-5 w-1 -translate-y-1/2 rounded-r-full transition-all duration-200 ${
                    isActive ? 'bg-blue-500 opacity-100' : 'bg-blue-500 opacity-0 group-hover:opacity-40'
                  }`}
                />
                <Icon size={17} />
                <span className="flex-1">{label}</span>
                <ChevronRight size={13} className={`transition-all duration-200 ${isActive ? 'opacity-70' : 'opacity-40 group-hover:opacity-60'}`} />
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div className={`${isMobile ? 'px-2.5 pb-3 pt-2' : 'px-3 pb-5 pt-3'}`}>
        <button
          onClick={handleLogout}
          className="flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-sm text-slate-400 transition-all duration-200 hover:bg-red-500/15 hover:text-red-400"
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
