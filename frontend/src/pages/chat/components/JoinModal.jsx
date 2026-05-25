import React from 'react';
import { Link2, X } from 'lucide-react';

export default function JoinModal({ joinLink, setJoinLink, joinLoading, onSubmit, onClose }) {
  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div style={{ background: '#fff', borderRadius: 16, padding: 32, width: '100%', maxWidth: 440, boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ background: '#eff6ff', borderRadius: 10, padding: 8 }}><Link2 size={18} color="#2563EB" /></div>
            <h2 style={{ fontSize: 17, fontWeight: 700, color: '#1F2937', margin: 0 }}>Gabung Forum</h2>
          </div>
          <button onClick={() => { onClose && onClose(); setJoinLink && setJoinLink(''); }} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF' }}><X size={20} /></button>
        </div>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>Paste link atau token yang dikirim admin untuk bergabung ke forum chat.</p>
        <form onSubmit={onSubmit}>
          <input
            value={joinLink}
            onChange={e => setJoinLink && setJoinLink(e.target.value)}
            placeholder="https://..."
            autoFocus
            style={{ width: '100%', padding: '11px 14px', border: '1.5px solid #E5E7EB', borderRadius: 8, fontSize: 14, outline: 'none', boxSizing: 'border-box', marginBottom: 16 }}
            onFocus={e => e.target.style.borderColor = '#2563EB'}
            onBlur={e => e.target.style.borderColor = '#E5E7EB'}
          />
          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={() => { onClose && onClose(); setJoinLink && setJoinLink(''); }}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, cursor: 'pointer' }}
            >Batal</button>
            <button type="submit" disabled={joinLoading || !joinLink?.trim()}
              style={{ flex: 1, padding: '10px', borderRadius: 8, border: 'none', background: joinLoading || !joinLink?.trim() ? '#93c5fd' : 'linear-gradient(135deg, #1D4ED8, #2563EB)', color: '#fff', fontSize: 14, fontWeight: 600, cursor: joinLoading || !joinLink?.trim() ? 'not-allowed' : 'pointer' }}
            >{joinLoading ? 'Bergabung...' : 'Gabung'}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
