import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { Users, Link2, MessageSquare, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

const statCards = [
  { label: 'Total Users',    value: '24',  sub: '+3 bulan ini',  icon: Users,        color: '#2563EB', bg: '#eff6ff' },
  { label: 'Link Aktif',     value: '12',  sub: '3 dibuat minggu ini', icon: Link2,  color: '#7c3aed', bg: '#f5f3ff' },
  { label: 'Chat Aktif',     value: '8',   sub: '2 butuh respons', icon: MessageSquare, color: '#059669', bg: '#ecfdf5' },
  { label: 'Pesan Hari Ini', value: '143', sub: '+22% dari kemarin', icon: TrendingUp, color: '#d97706', bg: '#fffbeb' },
];

const recentActivity = [
  { user: 'budi-webcare', action: 'Bergabung sebagai karyawan', time: '5 menit lalu', type: 'join' },
  { user: 'Client #021',  action: 'Memulai sesi chat baru',    time: '12 menit lalu', type: 'chat' },
  { user: 'admin',        action: 'Generate link "Project X"', time: '1 jam lalu',    type: 'link' },
  { user: 'sari-webcare', action: 'Membuat posting forum baru',time: '2 jam lalu',    type: 'forum' },
  { user: 'Client #019',  action: 'Sesi chat selesai',         time: '3 jam lalu',    type: 'done' },
];

const typeColor = { join: '#059669', chat: '#2563EB', link: '#7c3aed', forum: '#d97706', done: '#6B7280' };
const typeBg    = { join: '#ecfdf5', chat: '#eff6ff', link: '#f5f3ff', forum: '#fffbeb', done: '#f9fafb' };

export default function AdminDashboard() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
            {greeting}, {user?.username}! 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Berikut ringkasan aktivitas platform hari ini.
          </p>
        </div>

        {/* Stat Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 28 }}>
          {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div key={label} style={{
              background: '#fff', borderRadius: 12, padding: '20px',
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, marginBottom: 6 }}>{label}</p>
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#1F2937' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#10B981', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ArrowUpRight size={11} />{sub}
                  </p>
                </div>
                <div style={{ background: bg, borderRadius: 10, padding: 10 }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          {/* Recent Activity */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Activity size={17} color="#2563EB" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Aktivitas Terkini</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {recentActivity.map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
                    background: typeBg[item.type],
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 13, fontWeight: 700, color: typeColor[item.type],
                  }}>
                    {item.user.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <p style={{ fontSize: 13, color: '#1F2937', fontWeight: 500, margin: 0 }}>{item.user}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{item.action}</p>
                  </div>
                  <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.time}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Quick Actions */}
          <div style={{
            background: '#fff', borderRadius: 12, padding: 24,
            boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
          }}>
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 18 }}>Aksi Cepat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Generate Link Baru',   to: '/admin/create-link', color: '#2563EB', bg: '#eff6ff' },
                { label: 'Kelola Users',          to: '/admin/users',       color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'Lihat Semua Forum',     to: '/admin/forum',       color: '#059669', bg: '#ecfdf5' },
                { label: 'Buka Chat',             to: '/admin/chat',        color: '#d97706', bg: '#fffbeb' },
              ].map(({ label, to, color, bg }) => (
                <a key={to} href={to} style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '12px 14px', borderRadius: 8, background: bg,
                  color, fontSize: 13, fontWeight: 600, textDecoration: 'none',
                  transition: 'opacity 0.2s',
                }}>
                  {label}
                  <ArrowUpRight size={14} />
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
