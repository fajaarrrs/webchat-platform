import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import DashboardLayout from '../../components/DashboardLayout';
import { Link } from 'react-router-dom';
import {
  Users,
  Link2,
  MessageSquare,
  TrendingUp,
  Activity,
  ArrowUpRight,
  Clock3,
  AlertCircle,
} from 'lucide-react';
import { api } from '../../api';
import useBreakpoint from '../../hooks/useBreakpoint';

const typeColor = { join: '#059669', chat: '#2563EB', link: '#7c3aed', forum: '#d97706', done: '#6B7280' };
const typeBg = { join: '#ecfdf5', chat: '#eff6ff', link: '#f5f3ff', forum: '#fffbeb', done: '#f9fafb' };

function toRelativeTime(dt) {
  if (!dt) return '—';
  const time = new Date(dt).getTime();
  if (!Number.isFinite(time)) return '—';

  const diffMs = Date.now() - time;
  const minutes = Math.floor(diffMs / 60000);
  if (minutes < 1) return 'baru saja';
  if (minutes < 60) return `${minutes} menit lalu`;

  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} jam lalu`;

  const days = Math.floor(hours / 24);
  return `${days} hari lalu`;
}

export default function AdminDashboard() {
  const { user } = useAuth();
  const { isMobile, isTablet } = useBreakpoint();
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Selamat pagi' : hour < 17 ? 'Selamat siang' : 'Selamat malam';

  const [stats, setStats] = useState({ totalUsers: 0, totalForums: 0, totalMessages: 0 });
  const [recentForums, setRecentForums] = useState([]);
  const [followUpItems, setFollowUpItems] = useState([]);
  const [activityItems, setActivityItems] = useState([]);

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

        const now = Date.now();
        const oneDayMs = 24 * 60 * 60 * 1000;

        const nextFollowUps = forumsData
          .flatMap((forum) => {
            const messageCount = forum.message_count || 0;
            const memberCount = forum.member_count || 0;
            const lastActivityMs = forum.last_activity ? new Date(forum.last_activity).getTime() : NaN;

            if (messageCount === 0) {
              return [{
                id: `no-message-${forum.id}`,
                title: 'Forum belum ada pesan',
                desc: `"${forum.title}" belum ada percakapan.`,
                icon: Clock3,
                color: '#2563EB',
                bg: '#eff6ff',
                to: { pathname: '/admin/chat' },
                state: { forumId: forum.id },
              }];
            }

            if (memberCount === 1) {
              return [{
                id: `admin-only-${forum.id}`,
                title: 'Forum hanya Admin',
                desc: `"${forum.title}" belum ditambah client/employee.`,
                icon: Users,
                color: '#7c3aed',
                bg: '#f5f3ff',
                to: { pathname: '/admin/chat' },
                state: { forumId: forum.id },
              }];
            }

            const isQuiet = Number.isFinite(lastActivityMs) && (now - lastActivityMs > oneDayMs);
            if (isQuiet) {
              return [{
                id: `quiet-${forum.id}`,
                title: 'Forum tidak aktif > 24 jam',
                desc: `"${forum.title}" terakhir aktif kemarin.`,
                icon: AlertCircle,
                color: '#d97706',
                bg: '#fffbeb',
                to: { pathname: '/admin/chat' },
                state: { forumId: forum.id },
              }];
            }

            return [];
          })
          .slice(0, 3);

        setFollowUpItems(nextFollowUps);

        const events = forumsData
          .flatMap((forum) => {
            const forumEvents = [];
            if (forum.created_at) {
              forumEvents.push({
                user: forum.creator_name || 'admin',
                action: `Membuat forum "${forum.title}"`,
                timeSource: forum.created_at,
                type: 'forum',
              });
            }
            if (forum.last_activity) {
              forumEvents.push({
                user: 'Sistem',
                action: `Aktivitas terbaru di forum "${forum.title}"`,
                timeSource: forum.last_activity,
                type: 'chat',
              });
            }
            return forumEvents;
          })
          .sort((a, b) => new Date(b.timeSource).getTime() - new Date(a.timeSource).getTime())
          .slice(0, 5)
          .map((event) => ({
            ...event,
            time: toRelativeTime(event.timeSource),
          }));

        setActivityItems(events);
      })
      .catch(() => {
        setFollowUpItems([]);
        setActivityItems([]);
      });
  }, []);

  const statCards = [
    { label: 'Total Users', value: stats.totalUsers, sub: 'Terdaftar', icon: Users, color: '#2563EB', bg: '#eff6ff' },
    { label: 'Forum Aktif', value: stats.totalForums, sub: 'Dibuat', icon: Link2, color: '#7c3aed', bg: '#f5f3ff' },
    { label: 'Total Pesan', value: stats.totalMessages, sub: 'All-time', icon: MessageSquare, color: '#059669', bg: '#ecfdf5' },
    { label: 'Forum Terbaru', value: recentForums[0]?.title || '—', sub: 'Forum terakhir', icon: TrendingUp, color: '#d97706', bg: '#fffbeb' },
  ];

  const pagePadding = isMobile ? '20px 14px' : isTablet ? '26px 20px' : '32px 36px';
  const statGridColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(4, minmax(0, 1fr))';
  const followUpGridColumns = isMobile ? '1fr' : isTablet ? 'repeat(2, minmax(0, 1fr))' : 'repeat(3, minmax(0, 1fr))';
  const bottomGridColumns = isMobile ? '1fr' : '1fr 1fr';

  return (
    <DashboardLayout>
      <div style={{ padding: pagePadding, width: '100%' }}>
        {/* Page Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: 28, fontWeight: 800, color: '#1F2937', margin: 0 }}>
            {greeting}, {user?.username}! 👋
          </h1>
          <p style={{ color: '#6B7280', fontSize: 14, marginTop: 6 }}>
            Berikut ringkasan aktivitas platform hari ini.
          </p>
        </div>

        {/* Stat Cards */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: statGridColumns,
            gap: 16,
            marginBottom: 28,
          }}
        >
          {statCards.map(({ label, value, sub, icon: Icon, color, bg }) => (
            <div
              key={label}
              style={{
                background: '#fff',
                borderRadius: 14,
                padding: 20,
                boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                border: '1px solid #E5E7EB',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p style={{ fontSize: 12, color: '#6B7280', fontWeight: 500, margin: '0 0 6px' }}>{label}</p>
                  <div style={{ minHeight: 40 }}>
                    {label === 'Forum Terbaru' ? (
                      <p
                        title={String(value)}
                        style={{
                          fontSize: 22,
                          lineHeight: 1.2,
                          fontWeight: 800,
                          color: '#1F2937',
                          margin: 0,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          wordBreak: 'break-word',
                        }}
                      >
                        {value}
                      </p>
                    ) : (
                      <p style={{ fontSize: 30, fontWeight: 800, color: '#1F2937', margin: 0 }}>{value}</p>
                    )}
                  </div>
                  <p style={{ fontSize: 11, color: '#10B981', marginTop: 6, display: 'flex', alignItems: 'center', gap: 3 }}>
                    <ArrowUpRight size={11} />
                    {sub}
                  </p>
                </div>
                <div style={{ background: bg, borderRadius: 12, padding: 10, flexShrink: 0 }}>
                  <Icon size={20} color={color} />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Perlu Ditindaklanjuti */}
        <div style={{ marginBottom: 24 }}>
          <div
            style={{
              background: '#fff',
              borderRadius: 14,
              padding: 22,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
              <AlertCircle size={18} color="#DC2626" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0 }}>
                Perlu Ditindaklanjuti
              </h3>
            </div>

            {followUpItems.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Belum ada data yang perlu ditindaklanjuti.
              </div>
            ) : (
              <div style={{ display: 'grid', gridTemplateColumns: followUpGridColumns, gap: 14 }}>
                {followUpItems.map(({ id, title, desc, icon: Icon, color, bg, to, state }) => (
                  <Link
                    key={id}
                    to={to}
                    state={state}
                    style={{
                      borderRadius: 12,
                      padding: 16,
                      background: '#F9FAFB',
                      border: '1px solid #E5E7EB',
                      textDecoration: 'none',
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      display: 'block',
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.background = '#FFFFFF';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 6px 18px rgba(0,0,0,0.06)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.background = '#F9FAFB';
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                  >
                    <div
                      style={{
                        width: 38,
                        height: 38,
                        borderRadius: 10,
                        background: bg,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: 12,
                      }}
                    >
                      <Icon size={18} color={color} />
                    </div>
                    <p style={{ margin: '0 0 6px', fontSize: 14, fontWeight: 700, color: '#1F2937' }}>{title}</p>
                    <p style={{ margin: 0, fontSize: 12, color: '#6B7280', lineHeight: 1.5 }}>{desc}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Bottom Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: bottomGridColumns, gap: 20 }}>
          {/* Aktivitas Terkini */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #E5E7EB',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 18 }}>
              <Activity size={17} color="#2563EB" />
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', margin: 0 }}>Aktivitas Terkini</h3>
            </div>
            {activityItems.length === 0 ? (
              <div style={{ padding: '24px 8px', textAlign: 'center', color: '#9CA3AF', fontSize: 13 }}>
                Belum ada aktivitas terbaru dari database.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                {activityItems.map((item, i) => (
                  <div key={`${item.action}-${item.time}-${i}`} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div
                      style={{
                        width: 34,
                        height: 34,
                        borderRadius: '50%',
                        flexShrink: 0,
                        background: typeBg[item.type] || '#f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 13,
                        fontWeight: 700,
                        color: typeColor[item.type] || '#6B7280',
                      }}
                    >
                      {(item.user || '??').slice(0, 2).toUpperCase()}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontSize: 13, color: '#1F2937', fontWeight: 600, margin: 0 }}>{item.user}</p>
                      <p style={{ fontSize: 12, color: '#6B7280', margin: 0 }}>{item.action}</p>
                    </div>
                    <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{item.time}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Aksi Cepat */}
          <div
            style={{
              background: '#fff',
              borderRadius: 12,
              padding: 24,
              boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
              border: '1px solid #E5E7EB',
            }}
          >
            <h3 style={{ fontSize: 15, fontWeight: 700, color: '#1F2937', marginBottom: 18 }}>Aksi Cepat</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { label: 'Generate Link Baru', to: '/admin/create-link', color: '#2563EB', bg: '#eff6ff' },
                { label: 'Kelola Users', to: '/admin/users', color: '#7c3aed', bg: '#f5f3ff' },
                { label: 'Lihat Semua Forum', to: '/admin/forum', color: '#059669', bg: '#ecfdf5' },
                { label: 'Buka Chat', to: '/admin/chat', color: '#d97706', bg: '#fffbeb' },
              ].map(({ label, to, color, bg }) => (
                <Link
                  key={to}
                  to={to}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '12px 14px',
                    borderRadius: 8,
                    background: bg,
                    color,
                    fontSize: 13,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  {label}
                  <ArrowUpRight size={14} />
                </Link>
              ))}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}