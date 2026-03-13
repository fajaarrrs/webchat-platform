import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard, MessageSquare, Users, Link2,
  MessagesSquare, Settings, LogOut, ChevronRight, X
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
  admin:    { label: 'Admin',    bg: '#ede9fe', color: '#6d28d9' },
  karyawan: { label: 'Employee', bg: '#dbeafe', color: '#1d4ed8' },
  client:   { label: 'Client',   bg: '#d1fae5', color: '#065f46' },
};

export default function Sidebar({ isOpen, onClose }) {
<<<<<<< HEAD

=======
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;

  if (!user) return null;

  const menu = menuByRole[user.role] || [];
  const badge = roleBadge[user.role];
  const initials = user.username?.slice(0, 2).toUpperCase() || '??';

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside style={{
<<<<<<< HEAD
      width: 260, minHeight: '100vh', background: '#111827',
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, 
      position: 'fixed',
      left: 0,
      top: 0,
      bottom: 0,
      zIndex: 1000,
      transform: isOpen ? 'translateX(0)' : 'translateX(-100%)',
      transition: 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      height: '100vh',
      boxShadow: isOpen ? '10px 0 30px rgba(0,0,0,0.5)' : 'none',
=======
      width: 240, minHeight: '100vh', 
      background: '#0f172a', // Slate 950 Dark Navy
      display: 'flex', flexDirection: 'column',
      flexShrink: 0, position: isMobile ? 'fixed' : 'sticky', 
      top: 0, height: '100dvh', zIndex: 999,
      transform: isMobile ? (isOpen ? 'translateX(0)' : 'translateX(-100%)') : 'none',
      transition: 'transform 0.3s ease-in-out',
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
    }}>

      {/* Logo */}
      <div style={{
        padding: '24px 20px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36, borderRadius: 10,
              background: '#1D4ED8',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              flexShrink: 0,
            }}>
              <MessageSquare size={18} color="#fff" />
            </div>
            <span style={{ color: '#fff', fontWeight: 700, fontSize: 16, letterSpacing: '-0.3px' }}>
              WebcareChat
            </span>
          </div>
          {onClose && (
            <button 
              onClick={onClose}
              style={{
                background: 'none', border: 'none', color: 'rgba(255,255,255,0.4)',
                cursor: 'pointer', padding: 4
              }}
            >
              <X size={20} />
            </button>
          )}
        </div>

      </div>

      {/* User Info */}
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid rgba(255,255,255,0.07)',
        display: 'flex', alignItems: 'center', gap: 12,
      }}>
        <div style={{
          width: 38, height: 38, borderRadius: '50%',
          background: '#2563EB',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0,
        }}>
          {initials}
        </div>
        <div style={{ overflow: 'hidden' }}>
          <div style={{
            color: '#f9fafb', fontSize: 13, fontWeight: 600,
            whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
          }}>
            {user.username}
          </div>
          <span style={{
            display: 'inline-block', fontSize: 10, fontWeight: 600,
            padding: '1px 7px', borderRadius: 99,
            background: badge.bg, color: badge.color, marginTop: 2,
          }}>
            {badge.label}
          </span>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, minHeight: 0, padding: '12px 12px 0', overflowY: 'auto' }}>
        {menu.map(({ label, icon: Icon, to }) => (
          <NavLink
            key={to}
            to={to}
            style={({ isActive }) => ({
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8, marginBottom: 2,
              color: isActive ? '#fff' : 'rgba(255,255,255,0.55)',
              background: isActive ? 'rgba(37,99,235,0.85)' : 'transparent',
              fontWeight: isActive ? 600 : 400, fontSize: 14,
              transition: 'all 0.15s',
              textDecoration: 'none',
              flexShrink: 0
            })}
            onMouseEnter={e => {
              if (!e.currentTarget.classList.contains('active')) {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                e.currentTarget.style.color = 'rgba(255,255,255,0.85)';
              }
            }}
            onMouseLeave={e => {
              if (!e.currentTarget.getAttribute('aria-current')) {
                e.currentTarget.style.background = 'transparent';
                e.currentTarget.style.color = 'rgba(255,255,255,0.55)';
              }
            }}
            onClick={() => {
              if (window.innerWidth < 1024 && onClose) onClose();
            }}
          >
            <Icon size={17} />
            <span style={{ flex: 1 }}>{label}</span>
            <ChevronRight size={13} style={{ opacity: 0.4 }} />
          </NavLink>
        ))}
      </nav>

      {/* Logout */}
      <div style={{ padding: '4px 12px 24px', flexShrink: 0, background: '#0f172a' }}>
        <button
          onClick={handleLogout}
          style={{
            display: 'flex', alignItems: 'center', gap: 10,
            width: '100%', padding: '9px 12px', borderRadius: 8,
            background: 'none', border: 'none',
            color: 'rgba(255,255,255,0.45)', fontSize: 14, fontWeight: 400,
            cursor: 'pointer', transition: 'all 0.15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239,68,68,0.15)'; e.currentTarget.style.color = '#f87171'; }}
          onMouseLeave={e => { e.currentTarget.style.background = 'none'; e.currentTarget.style.color = 'rgba(255,255,255,0.45)'; }}
        >
          <LogOut size={17} />
          <span>Logout</span>
        </button>
      </div>
    </aside>
  );
}
