import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../api';
import { MessageSquare, Clock, ArrowUpRight, HelpCircle } from 'lucide-react';

const statusStyle = {
  active: { bg: '#ecfdf5', color: '#059669', label: 'Aktif' },
  pending: { bg: '#fffbeb', color: '#d97706', label: 'Menunggu' },
  done: { bg: '#f3f4f6', color: '#6B7280', label: 'Selesai' },
};

function formatSessionDate(dt) {
  if (!dt) return '-';
  const utc = dt.endsWith('Z') ? dt : `${dt.replace(' ', 'T')}Z`;
  return new Date(utc).toLocaleDateString('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  });
}

export default function ClientDashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({ activeCount: 0, pendingCount: 0, totalCount: 0 });
  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    api.get('/forums/dashboard/client')
      .then((data) => {
        if (cancelled) return;
        setStats(data.stats || { activeCount: 0, pendingCount: 0, totalCount: 0 });
        setSessions(Array.isArray(data.sessions) ? data.sessions : []);
      })
      .catch(() => {
        if (cancelled) return;
        setStats({ activeCount: 0, pendingCount: 0, totalCount: 0 });
        setSessions([]);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const statCards = [
    { label: 'Sesi Aktif', value: stats.activeCount, icon: MessageSquare, color: '#2563EB', bg: '#eff6ff' },
    { label: 'Sesi Pending', value: stats.pendingCount, icon: Clock, color: '#d97706', bg: '#fffbeb' },
    { label: 'Total Sesi', value: stats.totalCount, icon: HelpCircle, color: '#7c3aed', bg: '#f5f3ff' },
  ];

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', width: '100%' }}>
        <div style={{ maxWidth: 1180, margin: '0 auto' }}>
          <div style={{ marginBottom: 28 }}>
            <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', margin: 0 }}>
              Halo, {user?.username}! 👋
            </h1>
            <p style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>
              Kelola sesi bantuan dan riwayat chat kamu di sini.

            </p>
          </div>


          <div style={{
            background: '#1D4ED8',
            borderRadius: 16,
            padding: '26px 28px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 18,
            flexWrap: 'wrap',
          }}>
            <div>
              <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 800, margin: '0 0 8px' }}>
                Butuh Bantuan?
              </h2>
              <p style={{ color: 'rgba(255,255,255,0.78)', fontSize: 14, margin: 0, maxWidth: 560 }}>
                Gunakan forum yang sudah tersedia untuk melanjutkan percakapan atau memulai sesi chat dengan tim kami.
              </p>
            </div>
            <Link to="/client/chat" style={{
              background: '#fff',
              color: '#1D4ED8',
              padding: '12px 18px',
              borderRadius: 10,
              fontSize: 14,
              fontWeight: 700,
              whiteSpace: 'nowrap',
              flexShrink: 0,
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
              textDecoration: 'none',

            }}>
              <MessageSquare size={16} /> Buka Chat
            </Link>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, minmax(0, 1fr))', gap: 16, marginBottom: 24 }}>
            {statCards.map(({ label, value, icon: Icon, color, bg }) => (
              <div key={label} style={{
                background: '#fff',
                borderRadius: 14,
                padding: '20px 22px',
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: '1px solid #E5E7EB',
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                minHeight: 94,
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

          <div style={{
            background: '#fff',
            borderRadius: 14,
            padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
            border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
              <h3 style={{ fontSize: 18, fontWeight: 700, color: '#1F2937', margin: 0 }}>Riwayat Sesi</h3>
              <Link to="/client/chat" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, display: 'inline-flex', alignItems: 'center', gap: 4, textDecoration: 'none' }}>
                Lihat Semua <ArrowUpRight size={13} />
              </Link>
            </div>

            {loading ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF', fontSize: 13 }}>
                Memuat data sesi...
              </div>
            ) : sessions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
                <MessageSquare size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
                <p style={{ fontSize: 14, margin: 0 }}>Belum ada sesi chat dari data forum.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {sessions.map((item) => {
                  const status = statusStyle[item.status] || statusStyle.pending;
                  return (
                    <Link
                      key={item.id}
                      to="/client/chat"
                      state={{ forumId: item.id }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 14,
                        padding: '14px 16px',
                        borderRadius: 10,
                        border: '1px solid #F3F4F6',
                        background: '#FAFAFA',
                        textDecoration: 'none',
                      }}
                    >
                      <div style={{
                        width: 42,
                        height: 42,
                        borderRadius: '50%',
                        background: '#eff6ff',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 12,
                        fontWeight: 700,
                        color: '#2563EB',
                        flexShrink: 0,
                      }}>
                        {item.title.slice(0, 2).toUpperCase()}
                      </div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3, flexWrap: 'wrap' }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: '#1F2937', margin: 0 }}>{item.title}</p>
                          <span style={{ fontSize: 11, color: '#6B7280' }}>· {item.project}</span>
                        </div>
                        <p style={{ fontSize: 12, color: '#6B7280', margin: '0 0 4px' }}>Staff: {item.staff_name}</p>
                        <p style={{ fontSize: 12, color: '#4B5563', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {item.last_preview}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <span style={{
                          background: status.bg,
                          color: status.color,
                          fontSize: 10,
                          fontWeight: 700,
                          padding: '3px 9px',
                          borderRadius: 99,
                          display: 'inline-block',
                          marginBottom: 6,
                        }}>
                          {status.label}
                        </span>
                        <p style={{ fontSize: 11, color: '#9CA3AF', margin: 0 }}>{formatSessionDate(item.last_activity)}</p>
                      </div>
                    </Link>
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
