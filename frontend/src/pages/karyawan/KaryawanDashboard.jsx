import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { MessageSquare, Clock, CheckCircle, Inbox, ArrowUpRight } from 'lucide-react';

const myChats = [
  { client: 'Client #021', project: 'Support Umum',     status: 'active',  lastMsg: 'Halo, ada yang bisa dibantu?', time: '5 mnt' },
  { client: 'Client #018', project: 'Project Alpha',    status: 'pending', lastMsg: 'Saya butuh bantuan segera.',   time: '22 mnt' },
  { client: 'Client #015', project: 'Support Billing',  status: 'done',    lastMsg: 'Terima kasih sudah membantu!', time: '2 jam' },
];

const statusStyle = {
  active:  { bg: '#ecfdf5', color: '#059669', label: 'Aktif' },
  pending: { bg: '#fffbeb', color: '#d97706', label: 'Menunggu' },
  done:    { bg: '#f3f4f6', color: '#6B7280', label: 'Selesai' },
};

export default function KaryawanDashboard() {
  const { user } = useAuth();
  const isMobile = window.innerWidth <= 768;
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  return (
    <DashboardLayout>
      <div style={{ padding: isMobile ? '20px 16px' : '32px 36px', maxWidth: 900 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
            {greeting}, {user?.username}! 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Berikut status antrian chat kamu hari ini.
          </p>
        </div>

        {/* Stat mini */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : 'repeat(3, 1fr)', 
          gap: 14, 
          marginBottom: 28 
        }}>
          {[
            { label: 'Chat Aktif',    value: '2', icon: MessageSquare, color: '#2563EB', bg: '#eff6ff' },
            { label: 'Menunggu',      value: '1', icon: Clock,         color: '#d97706', bg: '#fffbeb' },
            { label: 'Selesai Hari Ini', value: '5', icon: CheckCircle, color: '#059669', bg: '#ecfdf5' },
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

        {/* My Chats */}
        <div style={{
          background: '#fff', borderRadius: 12, padding: 24,
          boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB',
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Inbox size={17} color="#2563EB" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Antrian Chat Saya</h3>
            </div>
            <a href="/karyawan/chat" style={{ fontSize: 13, color: '#2563EB', fontWeight: 600, display: 'flex', alignItems: 'center', gap: 4 }}>
              Lihat Semua <ArrowUpRight size={13} />
            </a>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {myChats.map((chat, i) => {
              const s = statusStyle[chat.status];
              return (
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
                    {chat.client.slice(0, 2).toUpperCase()}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937' }}>{chat.client}</span>
                      <span style={{ fontSize: 11, color: '#6B7280' }}>· {chat.project}</span>
                    </div>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {chat.lastMsg}
                    </p>
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                    <span style={{ fontSize: 10, color: '#9CA3AF' }}>{chat.time}</span>
                    <span style={{ background: s.bg, color: s.color, fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 99 }}>
                      {s.label}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
