import { Search, MoreVertical, UserPlus, CornerUpLeft, Settings, HelpCircle, LogOut, Star } from 'lucide-react';
import webcareLogo from '../../../assets/webcare-logo.webp';

export default function ForumListPanel({
  isMobile,
  user,
  searchGroup,
  setSearchGroup,
  chatTab,
  setChatTab,
  showQuickMenu,
  setShowQuickMenu,
  filteredForums,
  activeForumId,
  setActiveForumId,
  favoriteForumIds,
  formatForumActivityLabel,
  getForumPreview,
  formatUnreadCount,
  getInitials,
  getColor,
  handleGoDashboard,
  handleOpenSettings,
  handleOpenJoinModal,
  handleOpenFaq,
  handleLogout,
}) {
  return (
    <div style={{
      width: isMobile ? '100%' : 300,
      borderRight: isMobile ? 'none' : '1px solid #E5E7EB',
      background: '#fff',
      display: 'flex',
      flexDirection: 'column',
      flexShrink: 0,
    }}>
      <div style={{ padding: '14px 16px 10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 36, height: 36, borderRadius: 5, display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden', boxShadow: '0 1px 2px rgba(0,0,0,0.06)' }}>
              <img src={webcareLogo} alt="Webcare" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            </div>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1F2937' }}>WebcareChat</span>
          </div>
          {user?.role !== 'admin' && (
            <div data-quickmenu="true" style={{ position: 'relative' }}>
              <button
                onClick={() => setShowQuickMenu((v) => !v)}
                title="Menu"
                style={{
                  width: 32, height: 32, borderRadius: 8, border: '1.5px solid #E5E7EB',
                  background: showQuickMenu ? '#EFF6FF' : '#fff', color: showQuickMenu ? '#2563EB' : '#6B7280', cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                }}
              >
                <MoreVertical size={15} />
              </button>

              {showQuickMenu && (
                <div style={{ position: 'absolute', top: 38, right: 0, width: 196, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 6, zIndex: 120 }}>
                  {[
                    { key: 'dashboard', label: 'Dashboard', icon: CornerUpLeft, onClick: handleGoDashboard },
                    { key: 'settings', label: 'Settings', icon: Settings, onClick: handleOpenSettings },
                    { key: 'join', label: 'Gabung Forum', icon: UserPlus, onClick: handleOpenJoinModal },
                    { key: 'faq', label: 'FAQ', icon: HelpCircle, onClick: handleOpenFaq },
                    { key: 'logout', label: 'Logout', icon: LogOut, onClick: handleLogout, danger: true },
                  ].map(({ key, label, icon: Icon, onClick }) => (
                    <button
                      key={key}
                      onClick={onClick}
                      style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: key === 'logout' ? '#DC2626' : '#374151', textAlign: 'left' }}
                      onMouseEnter={(e) => { e.currentTarget.style.background = key === 'logout' ? '#FEF2F2' : '#F9FAFB'; }}
                      onMouseLeave={(e) => { e.currentTarget.style.background = 'none'; }}
                    >
                      <Icon size={14} /> {label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
        <div style={{ position: 'relative', marginBottom: 10 }}>
          <Search size={14} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: '#9CA3AF' }} />
          <input
            value={searchGroup}
            onChange={(e) => setSearchGroup(e.target.value)}
            placeholder="Cari atau mulai chat baru"
            style={{
              width: '100%', padding: '9px 12px 9px 32px',
              border: '1.5px solid #E5E7EB', borderRadius: 20, fontSize: 13,
              outline: 'none', background: '#F9FAFB', boxSizing: 'border-box',
            }}
            onFocus={(e) => { e.target.style.borderColor = '#2563EB'; }}
            onBlur={(e) => { e.target.style.borderColor = '#E5E7EB'; }}
          />
        </div>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', paddingBottom: 2 }}>
          {[
            { key: 'all', label: 'Semua' },
            { key: 'favorites', label: 'Favorit' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setChatTab(tab.key)}
              style={{
                padding: '5px 13px', borderRadius: 16, border: 'none', cursor: 'pointer',
                background: chatTab === tab.key ? '#2563EB' : '#F3F4F6',
                color: chatTab === tab.key ? '#fff' : '#6B7280',
                fontSize: 12, fontWeight: 500, whiteSpace: 'nowrap', flexShrink: 0,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{ flex: 1, overflowY: 'auto' }}>
        {filteredForums.length === 0 && (
          <div style={{ textAlign: 'center', padding: '32px 16px', color: '#9CA3AF', fontSize: 13 }}>
            {chatTab === 'favorites'
              ? 'Belum ada forum favorit.'
              : user?.role === 'admin' ? 'Belum ada forum.' : (
                <>
                  <p style={{ margin: '0 0 10px' }}>Belum ada forum.</p>
                  <button
                    onClick={handleOpenJoinModal}
                    style={{
                      padding: '8px 14px', borderRadius: 8, border: 'none',
                      background: 'linear-gradient(135deg, #1D4ED8, #2563EB)',
                      color: '#fff', fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                    }}
                  >
                    <UserPlus size={13} /> Gabung Forum
                  </button>
                </>
              )}
          </div>
        )}
        {filteredForums.map((forum, i) => {
          const isActive = activeForumId === forum.id;
          const activityLabel = formatForumActivityLabel(forum.last_activity || forum.created_at);
          return (
            <div
              key={forum.id}
              onClick={() => setActiveForumId(forum.id)}
              style={{
                padding: '12px 16px', cursor: 'pointer', transition: 'background 0.15s',
                background: isActive ? '#EFF6FF' : 'transparent',
                borderLeft: isActive ? '3px solid #2563EB' : '3px solid transparent',
                display: 'flex', alignItems: 'center', gap: 12,
              }}
              onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.background = '#F9FAFB'; }}
              onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.background = 'transparent'; }}
            >
              <div style={{
                width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                background: getColor(i),
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, fontWeight: 700, color: '#fff',
              }}>
                {getInitials(forum.title)}
              </div>
              <div style={{ flex: 1, minWidth: 0, display: 'flex', justifyContent: 'space-between', gap: 10 }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 13, fontWeight: 600, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {forum.title}
                    </span>
                    {favoriteForumIds.includes(forum.id) && <Star size={11} color="#d97706" fill="#fbbf24" />}
                  </div>
                  <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 1 }}>{forum.project}</div>
                  <div style={{ fontSize: 12, color: '#6B7280', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', marginTop: 2 }}>
                    {getForumPreview(forum)}
                  </div>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6, flexShrink: 0 }}>
                  {activityLabel && (
                    <span style={{ fontSize: 11, color: '#9CA3AF' }}>
                      {activityLabel}
                    </span>
                  )}
                  {Number(forum.unread_count) > 0 && (
                    <span style={{
                      minWidth: 20,
                      height: 20,
                      padding: '0 6px',
                      borderRadius: 999,
                      background: '#2563EB',
                      color: '#fff',
                      fontSize: 11,
                      fontWeight: 700,
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      lineHeight: 1,
                    }}>
                      {formatUnreadCount(Number(forum.unread_count))}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
