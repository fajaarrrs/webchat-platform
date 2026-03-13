import { useState } from 'react';
import Sidebar from './Sidebar';
import { Menu } from 'lucide-react';

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
          }}
        />
      )}

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
    </div>
  );
}
