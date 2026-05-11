import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import Sidebar from './Sidebar';
import useBreakpoint from '../hooks/useBreakpoint';
import { useAuth } from '../context/AuthContext';

export default function DashboardLayout({ children, hideSidebar = false }) {
  const { user } = useAuth();
  const location = useLocation();
  const { isMobile } = useBreakpoint();
  const [menuOpen, setMenuOpen] = useState(false);

  const shouldRenderSidebar = !hideSidebar && user?.role === 'admin';

  useEffect(() => {
    setMenuOpen(false);
  }, [location.pathname]);

  useEffect(() => {
    if (!menuOpen) return undefined;

    const handleEscape = (event) => {
      if (event.key === 'Escape') setMenuOpen(false);
    };

    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [menuOpen]);


  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {shouldRenderSidebar && !isMobile && <Sidebar />}

      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {shouldRenderSidebar && isMobile && (
          <div style={{
            height: 58,
            background: '#fff',
            borderBottom: '1px solid #E5E7EB',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 12px',
            position: 'sticky',
            top: 0,
            zIndex: 30,
          }}>
            <button
              type="button"
              onClick={() => setMenuOpen(true)}
              style={{
                width: 36,
                height: 36,
                borderRadius: 8,
                border: '1px solid #E5E7EB',
                background: '#fff',
                color: '#4B5563',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
              }}
            >
              <Menu size={18} />
            </button>
            <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>WebcareChat</span>
            <div style={{ width: 36, height: 36 }} />
          </div>
        )}

        <main style={{ flex: 1, overflowY: 'auto', minWidth: 0 }}>
          {children}
        </main>
      </div>

      {shouldRenderSidebar && isMobile && (
        <div
          onClick={() => setMenuOpen(false)}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(17,24,39,0.35)',
            zIndex: 1200,
            display: 'flex',
            opacity: menuOpen ? 1 : 0,
            pointerEvents: menuOpen ? 'auto' : 'none',
            transition: 'opacity 0.24s ease',
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              width: 280,
              height: '100%',
              background: '#111827',
              position: 'relative',
              transform: menuOpen ? 'translateX(0)' : 'translateX(-100%)',
              transition: 'transform 0.28s cubic-bezier(0.22, 1, 0.36, 1)',
              boxShadow: '8px 0 30px rgba(0,0,0,0.24)',
            }}
          >
            <button
              type="button"
              onClick={() => setMenuOpen(false)}
              style={{
                position: 'absolute',
                top: 10,
                right: 10,
                width: 32,
                height: 32,
                borderRadius: 8,
                border: '1px solid rgba(255,255,255,0.15)',
                background: 'rgba(255,255,255,0.06)',
                color: '#fff',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                zIndex: 2,
                transition: 'all 0.2s ease',
              }}
            >
              <X size={16} />
            </button>
            <Sidebar />
          </div>
        </div>
      )}
    </div>
  );
}
