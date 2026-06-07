import { Download, FileText, Users, X } from 'lucide-react';

export default function DirectoryPanel({
  activeForum,
  forumMembers,
  user,
  getInitials,
  getRoleColor,
  getRoleLabel,
  getColor,
  sharedFiles,
  getFileInfo,
  setShowDirectory,
  baseUrl,
  overlay = false,
}) {
  if (!activeForum) {
    return null;
  }

  const formatLastSeenText = (iso) => {
    if (!iso) return '';
    try {
      const then = new Date(iso.endsWith('Z') ? iso : `${iso.replace(' ', 'T')}Z`).getTime();
      const diff = Date.now() - then;
      const sec = Math.floor(diff / 1000);
      if (sec < 60) return `terakhir dilihat ${sec}s yg lalu`;
      const min = Math.floor(sec / 60);
      if (min < 60) return `terakhir dilihat ${min}m yg lalu`;
      const hr = Math.floor(min / 60);
      if (hr < 24) return `terakhir dilihat ${hr}j yg lalu`;
      const days = Math.floor(hr / 24);
      return `terakhir dilihat ${days}d yg lalu`;
    } catch (err) { return ''; }
  };

  const containerStyle = overlay ? {
    width: '100%', maxWidth: 360, height: '100%', borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0
  } : {
    width: 272, borderLeft: '1px solid #E5E7EB', background: '#fff', display: 'flex', flexDirection: 'column', flexShrink: 0
  };

  return (
    <div style={containerStyle}>
      <div style={{ padding: '14px 16px 12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderBottom: '1px solid #F3F4F6' }}>
        <span style={{ fontSize: 15, fontWeight: 700, color: '#1F2937' }}>Directory</span>
        <button
          onClick={() => setShowDirectory(false)}
          title="Tutup directory"
          style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
        >
          <X size={16} />
        </button>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: '14px 0 16px' }}>
        {activeForum.description && activeForum.description.toString().trim().length > 0 && (
          <div style={{ padding: '0 16px 12px' }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: '#374151', marginBottom: 6 }}>Deskripsi</div>
            <div style={{ fontSize: 13, color: '#6B7280', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{activeForum.description}</div>
          </div>
        )}
        <div style={{ padding: '0 16px 10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <Users size={14} color="#6B7280" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Team Members</span>
            <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>
              {forumMembers.length}
            </span>
          </div>
          {forumMembers.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '6px 0' }}>Belum ada anggota.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {forumMembers.map((member) => (
                <div key={member.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ position: 'relative' }}>
                    <div style={{ width: 34, height: 34, borderRadius: '50%', flexShrink: 0, background: getColor(member.id % 6), display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: '#fff' }}>
                      {getInitials(member.username)}
                    </div>
                    {member.is_online ? (
                      <div style={{ position: 'absolute', right: -2, bottom: -2, width: 10, height: 10, borderRadius: '50%', background: '#10B981', border: '2px solid #fff' }} />
                    ) : null}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 500, color: '#1F2937', display: 'flex', alignItems: 'center', gap: 5 }}>
                      {member.username}
                      {member.id === user?.id && (
                        <span style={{ fontSize: 10, fontWeight: 600, color: '#6366F1', background: '#EEF2FF', borderRadius: 6, padding: '1px 6px' }}>Anda</span>
                      )}
                    </div>
                    <div style={{ fontSize: 11, color: getRoleColor(member.role), display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div>{getRoleLabel(member.role)}</div>
                      <div style={{ color: '#6B7280', fontWeight: 500 }}>{member.is_online ? 'online' : formatLastSeenText(member.last_seen)}</div>
                      {/* Device label hidden by design to avoid showing full userAgent strings */}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ height: 1, background: '#F3F4F6', margin: '12px 0' }} />

        <div style={{ padding: '0 16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
            <FileText size={14} color="#6B7280" style={{ flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 600, color: '#374151' }}>Files</span>
            <span style={{ background: '#F3F4F6', color: '#6B7280', fontSize: 11, fontWeight: 600, padding: '1px 7px', borderRadius: 10 }}>
              {sharedFiles.length}
            </span>
          </div>
          {sharedFiles.length === 0 ? (
            <div style={{ fontSize: 12, color: '#9CA3AF', textAlign: 'center', padding: '6px 0' }}>
              Belum ada file yang dibagikan.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[...sharedFiles].reverse().slice(0, 20).map((file) => {
                const { Icon, color, bg, label } = getFileInfo(file.file_name || '');
                return (
                  <div key={file.id} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <div style={{ width: 34, height: 34, borderRadius: 8, flexShrink: 0, background: bg, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Icon size={16} color={color} />
                    </div>
                    <div style={{ flex: 1, overflow: 'hidden' }}>
                      <div style={{ fontSize: 12, fontWeight: 500, color: '#1F2937', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{file.file_name}</div>
                      <div style={{ fontSize: 11, color: '#9CA3AF' }}>
                        {label}{file.file_size ? ` · ${(file.file_size / 1024).toFixed(0)} KB` : ''}
                      </div>
                    </div>
                    <a
                      href={`${baseUrl}/api/messages/download/${file.id}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9CA3AF', flexShrink: 0 }}
                    >
                      <Download size={14} />
                    </a>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
