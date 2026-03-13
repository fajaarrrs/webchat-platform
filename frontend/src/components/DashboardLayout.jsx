import { useState, useEffect } from 'react';
import Sidebar from './Sidebar';

export default function DashboardLayout({ children, disableScroll = false }) {
  const [isSidebarOpen, setSidebarOpen] = useState(false);

  // Body scroll lock untuk mobile saat sidebar terbuka
  useEffect(() => {
    if (isSidebarOpen) {
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.width = '100%';
    } else {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.body.style.position = '';
      document.body.style.width = '';
    };
  }, [isSidebarOpen]);

  return (
    <div style={{ 
      display: 'flex', 
      height: disableScroll ? '100vh' : 'auto', 
      minHeight: '100vh',
      background: 'var(--bg)', 
      position: 'relative', 
      overflow: disableScroll ? 'hidden' : 'visible' 
    }}>
      <Sidebar isOpen={isSidebarOpen} onClose={() => setSidebarOpen(false)} />
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          onClick={() => setSidebarOpen(false)}
          className="show-mobile"
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', zIndex: 998,
            transition: 'opacity 0.3s'
          }}
        />
      )}

      <main style={{ 
        flex: 1, 
        minWidth: 0, 
        display: 'flex', 
        flexDirection: 'column', 
        height: disableScroll ? '100%' : 'auto',
        overflow: disableScroll ? 'hidden' : 'visible' 
      }}>
        {/* Mobile Header Toggle */}
        <div className="show-mobile" style={{
          padding: '12px 16px', background: '#fff', borderBottom: '1px solid var(--border)',
          display: 'flex', alignItems: 'center', gap: 12
        }}>
          <button 
            onClick={() => setSidebarOpen(true)}
            style={{ padding: 8, background: 'none', border: 'none', display: 'flex' }}
          >
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="3" y1="12" x2="21" y2="12"></line><line x1="3" y1="6" x2="21" y2="6"></line><line x1="3" y1="18" x2="21" y2="18"></line></svg>
          </button>
        </div>
        
        <div style={{ 
          flex: 1, 
          display: 'flex', 
          flexDirection: 'column', 
          minHeight: 0, 
          overflowY: disableScroll ? 'hidden' : 'visible'
        }}>
          {children}
        </div>
      </main>
    </div>
  );
}
