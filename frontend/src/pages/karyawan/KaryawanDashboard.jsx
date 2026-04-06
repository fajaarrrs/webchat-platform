import { useEffect, useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../api';
import { MessageSquare, Clock, CheckCircle, Inbox, ArrowUpRight, Hand } from 'lucide-react';
import useBreakpoint from '../../hooks/useBreakpoint';

const statusStyle = {
  active:  { bg: '#ecfdf5', color: '#059669', label: 'Aktif' },
  pending: { bg: '#fffbeb', color: '#d97706', label: 'Menunggu' },
  done:    { bg: '#f3f4f6', color: '#6B7280', label: 'Selesai' },
};

function formatRelativeTime(dt) {
  if (!dt) return '-';
  const utc = dt.endsWith('Z') ? dt : `${dt.replace(' ', 'T')}Z`;
  const diffMs = Date.now() - new Date(utc).getTime();
  const minutes = Math.max(0, Math.floor(diffMs / 60000));

  if (minutes < 1) return 'Baru saja';
  if (minutes < 60) return `${minutes} mnt`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam`;

  return new Date(utc).toLocaleDateString('id-ID', { day: '2-digit', month: 'short' });
}

export default function KaryawanDashboard() {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';
  const [stats, setStats] = useState({ activeCount: 0, pendingCount: 0, handledTodayCount: 0 });
  const [queue, setQueue] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.get('/forums/dashboard/karyawan')
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats || { activeCount: 0, pendingCount: 0, handledTodayCount: 0 });
        setQueue(Array.isArray(data.queue) ? data.queue : []);
      })
      .catch(() => {
        if (cancelled) return;
        setStats({ activeCount: 0, pendingCount: 0, handledTodayCount: 0 });
        setQueue([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <DashboardLayout>
      <div style={{ padding: isMobile ? '20px 14px' : isTablet ? '26px 20px' : '32px 36px', width: '100%' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div className="admin-dash-reveal" style={{ marginBottom: 28, '--dash-delay': '20ms' }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', margin: 0 }}>
              {greeting}, {user?.username}!
              <span className="admin-dash-wave-icon" aria-hidden="true">
                <Hand size={24} color="#2563EB" strokeWidth={2.2} />
              </span>
            </h1>
            <p style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>
              Berikut status antrian chat kamu hari ini.
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 28 }}>
            {[
              { label: 'Chat Aktif', value: stats.activeCount, icon: MessageSquare, color: '#2563EB', bg: '#eff6ff' },
              { label: 'Menunggu', value: stats.pendingCount, icon: Clock, color: '#d97706', bg: '#fffbeb' },
              { label: 'Ditangani Hari Ini', value: stats.handledTodayCount, icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
            ].map(({ label, value, icon: Icon, color, bg }, index) => (
              <div key={label} className="admin-dash-reveal admin-dash-stat-card" style={{
                '--dash-delay': `${90 + index * 55}ms`,
                background: '#fff', borderRadius: 14, padding: '20px 22px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
                display: 'flex', alignItems: 'center', gap: 14, minHeight: 94,
              }}>
                <div style={{ background: bg, borderRadius: 12, padding: 12 }}>
                  <Icon size={20} color={color} />
                </div>
                <div>
                  <p style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', margin: 0 }}>{value}</p>
                  <p style={{ fontSize: 12, color: '#6B7280', margin: '2px 0 0' }}>{label}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="admin-dash-reveal" style={{
            '--dash-delay': '260ms',
            background: '#fff', borderRadius: 14, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Inbox size={17} color="#2563EB" />
                <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>Antrian Chat Saya</h3>
              </div>
              <a href="/karyawan/chat" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
                Lihat Semua <ArrowUpRight size={13} />
              </a>
            </div>
            {loading ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Memuat antrian chat...
              </div>
            ) : queue.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Belum ada chat yang masuk dari database.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {queue.map((chat, index) => {
                  const s = statusStyle[chat.status] || statusStyle.pending;
                  return (
                    <div key={chat.id} className="admin-dash-activity-item" style={{
                      '--dash-delay': `${320 + index * 45}ms`,
                      display: 'flex', alignItems: 'center', gap: 14,
                      padding: '14px 16px', borderRadius: 10,
                      border: '1px solid #F3F4F6', background: '#FAFAFA',
                    }}>
                      <div style={{
                        width: 42, height: 42, borderRadius: '50%',
                        background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: 12, fontWeight: 700, color: '#2563EB', flexShrink: 0,
                      }}>
                        {chat.client_name.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <span style={{ fontSize: 14, fontWeight: 700, color: '#1F2937' }}>{chat.client_name}</span>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>· {chat.project}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {chat.last_preview}
                        </p>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 5, flexShrink: 0 }}>
                        <span style={{ fontSize: 10, color: '#9CA3AF' }}>{formatRelativeTime(chat.last_activity)}</span>
                        <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 700, padding: '3px 9px', borderRadius: 99 }}>
                          {s.label}
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
