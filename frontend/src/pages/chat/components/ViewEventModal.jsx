import React from 'react';
import { Calendar, X, Clock, MapPin } from 'lucide-react';

export default function ViewEventModal({ viewingEvent, onClose }) {
  if (!viewingEvent) return null;
  return (
    <div
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(15, 23, 42, 0.5)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        zIndex: 1000, padding: 16,
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose && onClose(); }}
    >
      <div style={{
        background: '#fff', borderRadius: 18, width: '100%', maxWidth: 420,
        boxShadow: '0 24px 64px rgba(15, 23, 42, 0.22)', overflow: 'hidden',
      }}>
        <div style={{ padding: '18px 20px 14px', borderBottom: '1px solid #F3F4F6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 36, height: 36, borderRadius: 10, background: 'linear-gradient(135deg, #059669, #047857)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Calendar size={18} color="#fff" />
            </div>
            <h2 style={{ fontSize: 16, fontWeight: 700, color: '#1F2937', margin: 0 }}>Detail Event</h2>
          </div>
          <button onClick={() => onClose && onClose()} style={{ background: '#F3F4F6', border: 'none', cursor: 'pointer', width: 30, height: 30, borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#6B7280' }}>
            <X size={15} />
          </button>
        </div>

        <div style={{ padding: '20px 20px 24px', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Nama Event</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>{viewingEvent.event_name}</div>
          </div>

          <div>
            <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Waktu</div>
            <div style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
              <Clock size={13} color="#6B7280" />
              {new Date(viewingEvent.event_start_at).toLocaleString('id-ID', {
                weekday: 'long', day: 'numeric', month: 'long', year: 'numeric',
                hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta',
              })}
              {viewingEvent.event_end_at && (
                <span style={{ color: '#6B7280' }}>
                  {' – '}
                  {new Date(viewingEvent.event_end_at).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Jakarta' })}
                </span>
              )}
            </div>
          </div>

          {viewingEvent.event_location && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Lokasi</div>
              <div style={{ fontSize: 13, color: '#374151', display: 'flex', alignItems: 'center', gap: 6 }}>
                <MapPin size={13} color="#6B7280" />
                {viewingEvent.event_location}
              </div>
            </div>
          )}

          {viewingEvent.event_description && (
            <div>
              <div style={{ fontSize: 11, fontWeight: 600, color: '#6B7280', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 4 }}>Deskripsi</div>
              <div style={{ fontSize: 13, color: '#374151', lineHeight: 1.6, background: '#F9FAFB', borderRadius: 8, padding: '10px 12px', border: '1px solid #E5E7EB' }}>{viewingEvent.event_description}</div>
            </div>
          )}

          <button onClick={() => onClose && onClose()} style={{ padding: '11px', borderRadius: 10, border: '1.5px solid #E5E7EB', background: '#fff', color: '#6B7280', fontSize: 14, fontWeight: 500, cursor: 'pointer', marginTop: 4 }}>Tutup</button>
        </div>
      </div>
    </div>
  );
}
