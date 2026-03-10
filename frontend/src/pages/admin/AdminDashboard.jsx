import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { api } from '../../api';
import { Users, Link2, MessageSquare, TrendingUp, Activity, ArrowUpRight } from 'lucide-react';

export default function AdminDashboard() {
  const { user } = useAuth();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  const [stats, setStats] = useState({ totalUsers: 0, totalForums: 0, totalMessages: 0 });
  const [recentForums, setRecentForums] = useState([]);

  useEffect(() => {
    Promise.all([api.get('/users'), api.get('/forums')])
      .then(([usersData, forumsData]) => {
        const totalMessages = forumsData.reduce((sum, f) => sum + (f.message_count || 0), 0);
        setStats({
          totalUsers: usersData.length,
          totalForums: forumsData.length,
          totalMessages,
        });
        setRecentForums(forumsData.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const statCards = [
    { label: 'Total Users',   value: stats.totalUsers,    sub: 'Terdaftar', icon: Users,         color: '#2563EB', bg: '#eff6ff' },
    { label: 'Forum Aktif',   value: stats.totalForums,   sub: 'Dibuat',    icon: Link2,          color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Total Pesan',   value: stats.totalMessages, sub: 'All-time',  icon: MessageSquare,  color: '#059669', bg: '#ecfdf5' },
    { label: 'Forum Terbaru', value: recentForums[0]?.title || '—', sub: 'Forum terakhir', icon: TrendingUp, color: '#d97706', bg: '#fffbeb' },
  ];

  const formatDate = (dt) => {
    if (!dt) return '—';
    return new Date(dt).toLocaleDateString('id-ID', { day: '2-digit', month: 'short', year: 'numeric' });
  };

  return (
    <DashboardLayout>
      <div style={{ padding: '32px 36px', maxWidth: 1100 }}>
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1F2937' }}>
            {greeting}, {user?.username}! 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 4 }}>
            Berikut ringkasan aktivitas platform.
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
                  <p style={{ fontSize: 26, fontWeight: 800, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', maxWidth: 140, whiteSpace: 'nowrap' }}>{value}</p>
                  <p style={{ fontSize: 11, color: '#6B7280', marginTop: 4, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ArrowUpRight size={11} />{sub}
                  </p>
                </div>
                <div style={{ background: bg, borderRadius: 10, padding: 10, flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Recent Forums */}
        <div style={{ background: '#fff', borderRadius: 12, padding: 24, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', border: '1px solid #E5E7EB' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
            <Activity size={17} color="#2563EB" />
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Forum Terbaru</h3>
          </div>
          {recentForums.length === 0 ? (
            <p style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center', padding: '24px 0' }}>Belum ada forum. Buat lewat menu Create Link.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {recentForums.map(forum => (
                <div key={forum.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid #F9FAFB' }}>
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', margin: '0 0 2px' }}>{forum.title}</p>
                    <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{forum.project}</p>
                  </div>
                  <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{forum.member_count ?? 0} anggota</span>
                    <span style={{ fontSize: 12, color: '#6B7280' }}>{forum.message_count ?? 0} pesan</span>
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>{formatDate(forum.created_at)}</span>
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
