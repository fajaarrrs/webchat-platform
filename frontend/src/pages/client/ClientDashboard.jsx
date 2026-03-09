import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { MessageSquare, Clock, ArrowUpRight, HelpCircle } from 'lucide-react';

const myHistory = [
  { project: 'Support Umum',  staff: 'budi-webcare',  status: 'active', lastMsg: 'Tentu, kami siap membantu Anda.', date: '09 Mar 2026' },
  { project: 'Billing Issue', staff: 'sari-webcare',  status: 'done',   lastMsg: 'Masalah sudah terselesaikan.',    date: '07 Mar 2026' },
];

export default function ClientDashboard() {
  const { user } = useAuth();

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 860 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
            Halo, {user?.username}! 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Kelola sesi bantuan dan riwayat chat kamu di sini.
          </p>
        </div>

        {/* CTA Banner */}
        <div style={{
          background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
          borderRadius: 14, padding: '24px 28px', marginBottom: 24,
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ color: '#fff', fontSize: 17, fontWeight: 700, marginBottom: 6 }}>
              Butuh Bantuan?
            </h2>
            <p style={{ color: 'rgba(255,255,255,0.75)', fontSize: 13, margin: 0 }}>
              Gunakan link yang diberikan untuk memulai sesi chat dengan tim kami.
            </p>
          </div>
          <a href="/client/chat" style={{
            background: '#fff', color: '#1D4ED8', padding: '10px 18px',
            borderRadius: 8, fontSize: 13, fontWeight: 700,
            whiteSpace: 'nowrap', flexShrink: 0,
            display: 'flex', alignItems: 'center', gap: 6,
          }}>
            <MessageSquare size={14} /> Mulai Chat
          </a>
        </div>

        {/* Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14, marginBottom: 24 }}>
          {[
            { label: 'Sesi Aktif',   value: '1', icon: MessageSquare, color: '#2563EB', bg: '#eff6ff' },
            { label: 'Sesi Pending', value: '0', icon: Clock,         color: '#d97706', bg: '#fffbeb' },
            { label: 'Total Sesi',   value: '2', icon: HelpCircle,    color: '#7c3aed', bg: '#f5f3ff' },
          ].map(({ label, value, icon: Icon, color, bg }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: 12, padding: '18px 20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
              display: 'flex', alignItems: 'center', gap: 14,
            }}>
              <div style={{ background: bg, borderRadius: 10, padding: 10 }}>
                <Icon size={20} color={color} />
              </div>
              <div>
                <p style={{ fontSize: 22, fontWeight: 800, color: '#1F2937', margin: 0 }}>{value}</p>
                <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* History */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Riwayat Sesi</h3>
            <a href="/client/chat" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Lihat Semua <ArrowUpRight size={13} />
            </a>
          </div>
          {myHistory.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '32px 0', color: '#9CA3AF' }}>
              <MessageSquare size={36} style={{ margin: '0 auto 10px', display: 'block', opacity: 0.4 }} />
              <p style={{ fontSize: 14 }}>Belum ada sesi chat</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myHistory.map((item, i) => (
                <div key={i} style={{
                  display: 'flex', alignItems: 'center', gap: 12,
                  padding: '12px 14px', borderRadius: 8,
                  border: '1px solid #F3F4F6', background: '#FAFAFA',
                }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: '#2563EB', flexShrink: 0,
                  }}>
                    {item.project.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: 0 }}>{item.project}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>Staff: {item.staff}</p>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0 }}>
                    <span style={{
                      background: item.status === 'active' ? '#ecfdf5' : '#f3f4f6',
                      color: item.status === 'active' ? '#059669' : '#6B7280',
                      fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99,
                    }}>
                      {item.status === 'active' ? 'Aktif' : 'Selesai'}
                    </span>
                    <p style={{ fontSize: 11, color: '#9CA3AF', margin: '3px 0 0' }}>{item.date}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
