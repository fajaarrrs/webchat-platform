import { useAuth } from '../context/AuthContext';
import { CheckCircle, XCircle, AlertTriangle, Info, X } from 'lucide-react';

const iconMap = {
  success: <CheckCircle size={18} />,
  error: <XCircle size={18} />,
  warning: <AlertTriangle size={18} />,
  info: <Info size={18} />,
};

const colorMap = {
  success: { bg: '#f0fdf4', border: '#86efac', text: '#15803d', icon: '#16a34a' },
  error:   { bg: '#fef2f2', border: '#fca5a5', text: '#b91c1c', icon: '#dc2626' },
  warning: { bg: '#fffbeb', border: '#fcd34d', text: '#92400e', icon: '#d97706' },
  info:    { bg: '#eff6ff', border: '#93c5fd', text: '#1e40af', icon: '#2563eb' },
};

export default function ToastContainer() {
  const { toasts, removeToast } = useAuth();

  if (!toasts.length) return null;

  return (
    <div style={{
      position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
      display: 'flex', flexDirection: 'column', gap: 10,
    }}>
      {toasts.map(toast => {
        const c = colorMap[toast.type] || colorMap.info;
        return (
          <div key={toast.id} style={{
            display: 'flex', alignItems: 'center', gap: 10,
            background: c.bg, border: `1px solid ${c.border}`,
            borderRadius: 10, padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
            minWidth: 260, maxWidth: 360,
            animation: 'slideIn 0.25s ease',
          }}>
            <span style={{ color: c.icon, flexShrink: 0 }}>{iconMap[toast.type]}</span>
            <span style={{ color: c.text, fontSize: 14, flex: 1 }}>{toast.message}</span>
            <button onClick={() => removeToast(toast.id)} style={{
              background: 'none', border: 'none', padding: 2,
              color: c.text, cursor: 'pointer', flexShrink: 0,
            }}>
              <X size={14} />
            </button>
          </div>
        );
      })}
      <style>{`@keyframes slideIn { from { opacity:0; transform: translateX(20px); } to { opacity:1; transform: translateX(0); } }`}</style>
    </div>
  );
}
