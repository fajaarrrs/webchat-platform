import React from 'react';
import { HelpCircle, X } from 'lucide-react';

export default function FaqModal({ onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 28, width: '100%', maxWidth: 480, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 8 }}><HelpCircle size={18} color="#2563EB" /></div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>FAQ</h2>
          </div>
          <button onClick={() => onClose && onClose()} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, fontSize: 13, color: '#4B5563' }}>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <strong style={{ color: '#1F2937' }}>Bagaimana cara gabung forum?</strong>
            <p style={{ margin: '6px 0 0' }}>Buka menu titik tiga, pilih Gabung Forum, lalu paste link atau token dari admin.</p>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <strong style={{ color: '#1F2937' }}>Bagaimana edit profil?</strong>
            <p style={{ margin: '6px 0 0' }}>Buka menu titik tiga lalu pilih Profile untuk mengubah data akun.</p>
          </div>
          <div style={{ padding: '10px 12px', borderRadius: 10, background: '#F9FAFB', border: '1px solid #E5E7EB' }}>
            <strong style={{ color: '#1F2937' }}>Di mana pengaturan akun?</strong>
            <p style={{ margin: '6px 0 0' }}>Pilih Settings pada menu titik tiga untuk membuka halaman pengaturan.</p>
          </div>
        </div>
      </div>
    </div>
  );
}
