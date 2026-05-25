import React from 'react';
import { ChevronLeft, MoreVertical, Search, Info, Link2, Star, Eraser, LogOut, CheckSquare, HelpCircle } from 'lucide-react';
import { cn, getInitials, getColor } from '../chatUtils';

export default function ChatHeader({
  isMobile,
  activeForum,
  activeForumId,
  setActiveForumId,
  forums,
  handleHeaderSearchClick,
  showMessageSearch,
  showHeaderMenu,
  setShowHeaderMenu,
  handleShareForumLink,
  isActiveForumFavorite,
  toggleFavoriteForum,
  handleClearChat,
  handleExitGroup,
  handleGoDashboard,
  handleOpenSettings,
  handleOpenJoinModal,
  handleOpenFaq,
  handleOpenTasks,
  handleOpenGroupInfo,
  handleLogout,
}) {
  return (
    <div className="relative z-[320] flex items-center justify-between border-b border-slate-200 bg-white/85 px-5 py-3 backdrop-blur-md">
      <div className="flex items-center gap-3">
        {isMobile && (
          <button
            onClick={() => setActiveForumId(null)}
            title="Kembali ke daftar forum"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-all duration-200 hover:border-slate-300 hover:bg-slate-50"
          >
            <ChevronLeft size={14} />
          </button>
        )}
        <div
          className="flex h-10 w-10 items-center justify-center rounded-full text-xs font-bold text-white shadow-sm"
          style={{ background: getColor(forums.findIndex(f => f.id === activeForumId)) }}
        >
          {getInitials(activeForum?.title || '')}
        </div>
        <div>
          <p
            role="button"
            onClick={() => handleOpenGroupInfo && handleOpenGroupInfo()}
            className="m-0 text-sm font-bold text-slate-800 cursor-pointer"
          >
            {activeForum?.title}
          </p>
          <p
            role="button"
            onClick={() => handleOpenGroupInfo && handleOpenGroupInfo()}
            className="m-0 flex items-center gap-1.5 text-xs text-slate-500 cursor-pointer"
          >
            <span className="text-slate-500">{activeForum?.project || ''}</span>
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleHeaderSearchClick}
          title="Cari pesan"
          className={cn(
            'flex h-10 w-10 items-center justify-center rounded-lg border text-slate-500 transition-all duration-200',
            showMessageSearch
              ? 'border-blue-200 bg-blue-50 text-blue-600'
              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
          )}
        >
          <Search size={19} />
        </button>

        <div data-headermenu="true" className="relative">
          <button
            onClick={() => setShowHeaderMenu(v => !v)}
            title="Menu grup"
            className={cn(
              'flex h-10 w-10 items-center justify-center rounded-lg border text-slate-500 transition-all duration-200',
              showHeaderMenu
                ? 'border-blue-200 bg-blue-50 text-blue-600'
                : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
            )}
          >
            <MoreVertical size={19} />
          </button>

          {showHeaderMenu && (
            <div style={{ position: 'absolute', top: 40, right: 0, width: 220, background: '#fff', border: '1px solid #E5E7EB', borderRadius: 10, boxShadow: '0 12px 28px rgba(0,0,0,0.12)', padding: 6, zIndex: 120 }}>
              {[
                { key: 'info', label: 'Grup Info', icon: Info, onClick: () => { handleOpenGroupInfo && handleOpenGroupInfo(); setShowHeaderMenu(false); } },
                { key: 'tasks', label: 'Tasks', icon: CheckSquare, onClick: () => { handleOpenTasks && handleOpenTasks(); setShowHeaderMenu(false); } },
                { key: 'share-link', label: 'Share link', icon: Link2, onClick: handleShareForumLink },
                { key: 'favorite', label: isActiveForumFavorite ? 'Remove from favorites' : 'Add to favorites', icon: Star, onClick: () => { toggleFavoriteForum && toggleFavoriteForum(activeForumId); setShowHeaderMenu(false); } },
                { key: 'faq', label: 'FAQ', icon: HelpCircle, onClick: () => { handleOpenFaq && handleOpenFaq(); setShowHeaderMenu(false); } },
                { key: 'clear', label: 'Clear chat', icon: Eraser, onClick: handleClearChat, danger: false },
                { key: 'exit', label: 'Exit group', icon: LogOut, onClick: handleExitGroup, danger: true },
              ].map(({ key, label, icon: Icon, onClick, danger }) => (
                <button
                  key={key}
                  onClick={onClick}
                  style={{ width: '100%', border: 'none', background: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 10, padding: '9px 10px', borderRadius: 8, fontSize: 13, color: danger ? '#DC2626' : '#374151', textAlign: 'left' }}
                  onMouseEnter={e => e.currentTarget.style.background = '#F9FAFB'}
                  onMouseLeave={e => e.currentTarget.style.background = 'none'}
                >
                  <Icon size={14} /> {label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
