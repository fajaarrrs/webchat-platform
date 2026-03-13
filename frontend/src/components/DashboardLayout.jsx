<<<<<<< HEAD
import { useState } from 'react';
=======
import { useState, useEffect } from 'react';
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

<<<<<<< HEAD
export default function DashboardLayout({ children }) {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      {/* Overlay for mobile */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          style={{
            position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', 
            zIndex: 999, transition: 'opacity 0.3s'
=======
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
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
          }}
        />
      )}

<<<<<<< HEAD
      <Sidebar isOpen={isSidebarOpen} onClose={() => setIsSidebarOpen(false)} />
      
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        {/* Mobile Header */}
        <header style={{
          height: 60, background: '#fff', borderBottom: '1px solid #E5E7EB',
          display: 'flex', alignItems: 'center', padding: '0 16px',
          position: 'sticky', top: 0, zIndex: 50,
          justifyContent: 'space-between',
        }}>
          <button 
            onClick={() => setIsSidebarOpen(true)}
            style={{
              padding: 8, borderRadius: 8, background: '#F3F4F6', border: 'none',
              color: '#374151', cursor: 'pointer'
            }}
          >
            <Menu size={20} />
          </button>
          <span style={{ fontWeight: 700, fontSize: 16, color: '#1D4ED8' }}>WebcareChat</span>
          <div style={{ width: 36 }} /> {/* Spacer */}
        </header>

        <main style={{ flex: 1, overflowY: 'auto' }}>
          {children}
        </main>
      </div>

      <style>{`
        @media (min-width: 1024px) {
          header { display: none !important; }
          aside { 
            position: sticky !important; 
            transform: none !important; 
            box-shadow: none !important;
          }
          .sidebar-overlay { display: none !important; }
        }
      `}</style>
=======
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
>>>>>>> 4aff7a5d1b0566286d99997a26f5f76ca51653ff
    </div>
  );
}
