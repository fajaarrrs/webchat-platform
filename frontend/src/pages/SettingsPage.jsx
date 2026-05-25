import { useEffect, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../context/AuthContext';
import { usePushNotifications } from '../hooks/usePushNotifications';
import { api, BASE_URL } from '../api';
import {
  ArrowLeft,
  BadgeCheck,
  Bell,
  BellOff,
  Camera,
  Eye,
  EyeOff,
  Lock,
  Pencil,
  Save,
  Settings,
  ShieldCheck,
  Trash2,
  User,
  UserCircle,
  Users,
  X,
} from 'lucide-react';

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/i;

const roleMeta = {
  admin: {
    label: 'Admin',
    tone: 'bg-violet-100 text-violet-700',
    Icon: ShieldCheck,
  },
  karyawan: {
    label: 'Employee',
    tone: 'bg-blue-100 text-blue-700',
    Icon: BadgeCheck,
  },
  client: {
    label: 'Client',
    tone: 'bg-emerald-100 text-emerald-700',
    Icon: UserCircle,
  },
};

const inputClass =
  'w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-800 placeholder:text-slate-400 transition-all focus:bg-white focus:outline-none focus:ring-4 focus:ring-blue-500/10';

const primaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full bg-gradient-to-r from-blue-600 to-blue-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-blue-500/10 transition hover:scale-105 hover:shadow-blue-500/20 disabled:cursor-not-allowed disabled:opacity-60';

const secondaryButtonClass =
  'inline-flex items-center justify-center gap-2 rounded-full border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600 disabled:cursor-not-allowed disabled:opacity-60';

function SectionShell({ title, description, children }) {
  return (
    <section className="grid gap-6 md:grid-cols-12 md:items-center md:gap-8">
      <div className="space-y-4 pt-1 md:col-span-3 md:self-center md:pt-0">
        <h2 className="text-2xl font-bold text-slate-900">{title}</h2>
        <p className="text-sm leading-relaxed text-slate-500">{description}</p>
      </div>
      <div className="rounded-3xl border border-slate-100 bg-white p-6 shadow-lg shadow-slate-200/60 sm:p-8 md:col-span-9 md:p-10">{children}</div>
    </section>
  );
}

export default function SettingsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const initialTab = location.state?.initialTab === 'password' || location.state?.initialTab === 'users'
    ? location.state.initialTab
    : 'profile';

  const { user, updateProfile, uploadAvatar, deleteAvatar, addToast } = useAuth();
  const { isSupported: isPushSupported, isSubscribed, toggleSubscription } = usePushNotifications();
  const [pushToggling, setPushToggling] = useState(false);
  const [tab, setTab] = useState(initialTab);
  const [profileForm, setProfileForm] = useState({ username: user?.username || '', email: user?.email || '' });
  const [passForm, setPassForm] = useState({ newPass: '', confirm: '' });
  const [showPass, setShowPass] = useState({ new: false, confirm: false });
  const [saving, setSaving] = useState(false);
  const [avatarUploading, setAvatarUploading] = useState(false);
  const [profileEmailTouched, setProfileEmailTouched] = useState(false);

  const [users, setUsers] = useState([]);
  const [usersLoading, setUsersLoading] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [editSaving, setEditSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [editEmailTouched, setEditEmailTouched] = useState(false);

  const avatarInputRef = useRef(null);

  const isAdmin = user?.role === 'admin';
  const roleInfo = roleMeta[user?.role] || roleMeta.client;
  const RoleIcon = roleInfo.Icon;
  const initials = user?.username?.slice(0, 2).toUpperCase() || '??';
  const roleBasePath = user?.role ? `/${user.role}` : '';
  const isProfileEmailValid = emailRegex.test(profileForm.email.trim());
  const showProfileEmailError = profileEmailTouched && profileForm.email.trim() && !isProfileEmailValid;
  const isEditEmailValid = !editingUser?.email || emailRegex.test(editingUser.email.trim());
  const showEditEmailError = Boolean(editingUser) && editEmailTouched && editingUser?.email?.trim() && !isEditEmailValid;

  const tabs = [
    { key: 'profile', label: 'Profil', icon: User },
    { key: 'password', label: 'Ubah Password', icon: Lock },
    ...(isAdmin ? [{ key: 'users', label: 'Kelola Users', icon: Users }] : []),
  ];

  useEffect(() => {
    setProfileForm({ username: user?.username || '', email: user?.email || '' });
    setProfileEmailTouched(false);
  }, [user?.username, user?.email]);

  useEffect(() => {
    if (!location.state?.initialTab) return;
    if (location.state.initialTab === 'password' || (location.state.initialTab === 'users' && isAdmin)) {
      setTab(location.state.initialTab);
      return;
    }
    setTab('profile');
  }, [location.state, isAdmin]);

  useEffect(() => {
    if (!isAdmin || tab !== 'users') return;

    setUsersLoading(true);
    api
      .get('/users')
      .then((data) => setUsers(data))
      .catch((err) => addToast(err.message, 'error'))
      .finally(() => setUsersLoading(false));
  }, [isAdmin, tab, addToast]);

  const handleAvatarChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setAvatarUploading(true);
    await uploadAvatar(file);
    setAvatarUploading(false);
    e.target.value = '';
  };

  const handleSaveProfile = async (e) => {
    e.preventDefault();
    if (!profileForm.username.trim()) return;
    setProfileEmailTouched(true);
    if (!isProfileEmailValid) {
      addToast('Format email belum valid. Gunakan format seperti nama@domain.com.', 'error');
      return;
    }

    setSaving(true);
    await updateProfile({
      username: profileForm.username.trim(),
      email: profileForm.email.trim(),
    });
    setSaving(false);
  };

  const handleChangePass = async (e) => {
    e.preventDefault();

    if (passForm.newPass !== passForm.confirm) {
      addToast('Password baru tidak cocok.', 'error');
      return;
    }
    if (passForm.newPass.length < 6) {
      addToast('Password minimal 6 karakter.', 'error');
      return;
    }

    setSaving(true);
    const result = await updateProfile({ newPassword: passForm.newPass });
    if (result.success) {
      setPassForm({ newPass: '', confirm: '' });
      setShowPass({ new: false, confirm: false });
    }
    setSaving(false);
  };

  const handleDeleteAvatar = async () => {
    setAvatarUploading(true);
    await deleteAvatar();
    setAvatarUploading(false);
  };

  const handleTogglePushNotifications = async () => {
    setPushToggling(true);
    try {
      const result = await toggleSubscription();
      if (result) {
        addToast(
          isSubscribed ? 'Push notifications disabled' : 'Push notifications enabled',
          'success'
        );
      } else {
        addToast('Failed to toggle push notifications', 'error');
      }
    } catch (err) {
      addToast(err.message || 'Error toggling push notifications', 'error');
    }
    setPushToggling(false);
  };
  
  const handleEditUser = async (e) => {
    e.preventDefault();
    if (!editingUser) return;
    setEditEmailTouched(true);
    if (!isEditEmailValid) {
      addToast('Format email tidak valid. Mohon masukkan alamat email yang benar.', 'error');
      return;
    }

    setEditSaving(true);
    try {
      const updated = await api.put(`/users/${editingUser.id}`, {
        username: editingUser.username,
        email: editingUser.email,
        role: editingUser.role,
      });
      setUsers((prev) => prev.map((u) => (u.id === updated.id ? updated : u)));
      setEditingUser(null);
      addToast('User berhasil diperbarui.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
    setEditSaving(false);
  };

  const handleDeleteUser = async (id) => {
    try {
      await api.delete(`/users/${id}`);
      setUsers((prev) => prev.filter((u) => u.id !== id));
      setDeleteConfirm(null);
      addToast('User berhasil dihapus.', 'success');
    } catch (err) {
      addToast(err.message, 'error');
    }
  };

  return (
    <DashboardLayout hideSidebar={!isAdmin}>
      <div className="min-h-screen bg-slate-50 px-4 py-3 md:px-8 md:py-4 lg:px-10">
        <div className="mx-auto w-full max-w-6xl">
          <header className="mb-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-6">
              {!isAdmin && (
                <div className="ml-2">
                  <button
                    type="button"
                    onClick={() => navigate(`${roleBasePath}/chat`)}
                    className={secondaryButtonClass}
                  >
                    <ArrowLeft size={15} /> Kembali ke Chat
                  </button>
                </div>
              )}
            </div>
          </header>
          <div className="mb-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-7 md:p-8">
            <div className="flex items-center gap-6">
              <div className="w-24 h-24 rounded-full overflow-hidden shrink-0">
                {user?.avatar ? (
                  <img src={`${BASE_URL}${user.avatar}`} alt="avatar" className="w-24 h-24 object-cover rounded-full" />
                ) : (
                  <div className="w-24 h-24 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">{initials}</div>
                )}
              </div>
              <div className="flex flex-col gap-1">
                <p className="text-2xl font-bold text-slate-900">{user?.username}</p>
                <p className="text-sm text-slate-500">{user?.email}</p>
                <span className={`mt-2 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ${roleInfo.tone}`}>
                  <RoleIcon size={12} /> {roleInfo.label}
                </span>
              </div>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm md:p-4">
            {tabs.map(({ key, label, icon: Icon }) => (
              <button
                key={key}
                type="button"
                onClick={() => setTab(key)}
                className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-sm font-semibold transition ${
                  tab === key
                    ? 'bg-blue-600 text-white shadow'
                    : 'text-slate-600 hover:bg-slate-100'
                }`}
              >
                <Icon size={15} /> {label}
              </button>
            ))}
          </div>

            <div className="space-y-8">
            {tab === 'profile' && (
              <SectionShell
                title="Profil Akun"
                description="Perbarui data akun agar profil terlihat profesional, jelas, dan mudah dikenali saat kolaborasi."
              >
                <form onSubmit={handleSaveProfile} className="flex flex-col gap-4">
                  <div className="flex items-center gap-5 mb-4">
                      <div className="w-24 h-24 rounded-full overflow-hidden">
                        {user?.avatar ? (
                          <img src={`${BASE_URL}${user.avatar}`} alt="avatar" className="w-24 h-24 object-cover rounded-full" />
                        ) : (
                          <div className="w-24 h-24 flex items-center justify-center rounded-full bg-blue-600 text-white font-bold">{initials}</div>
                        )}
                      </div>
                      <div className="flex flex-col gap-1">
                        <p className="text-lg font-bold text-slate-900">{user?.username}</p>
                        <p className="text-sm text-slate-500">{user?.email}</p>
                        <div className="mt-1.5">
                          <button type="button" onClick={() => avatarInputRef.current?.click()} className={secondaryButtonClass}><Camera size={14}/> {avatarUploading ? 'Mengunggah...' : 'Pilih Foto'}</button>
                          <input ref={avatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAvatarChange} />
                        </div>
                      </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Username</label>
                      <input
                        type="text"
                        value={profileForm.username}
                        onChange={(e) => setProfileForm({ ...profileForm, username: e.target.value })}
                        placeholder="Masukkan username"
                        className={inputClass}
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700">Email</label>
                      <input
                        type="email"
                        value={profileForm.email}
                        onChange={(e) => setProfileForm({ ...profileForm, email: e.target.value })}
                        onBlur={() => setProfileEmailTouched(true)}
                        placeholder="Masukkan email"
                        className={`${inputClass} ${showProfileEmailError ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : ''}`}
                      />
                      {showProfileEmailError && (
                        <p className="text-xs font-medium text-red-500">Format email tidak valid. Mohon masukkan alamat email yang benar.</p>
                      )}
                    </div>
                  </div>

                  {isPushSupported && (
                    <div className="mt-6 p-4 rounded-xl bg-blue-50 border border-blue-200">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {isSubscribed ? <Bell size={18} className="text-blue-600" /> : <BellOff size={18} className="text-slate-400" />}
                          <div>
                            <p className="text-sm font-semibold text-slate-900">Push Notifications</p>
                            <p className="text-xs text-slate-600">Receive notifications for mentions and important updates</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleTogglePushNotifications}
                          disabled={pushToggling}
                          className={`px-4 py-2 rounded-lg font-semibold text-sm transition ${
                            isSubscribed
                              ? 'bg-blue-600 text-white hover:bg-blue-700'
                              : 'bg-white border border-blue-300 text-blue-600 hover:bg-blue-50'
                          } disabled:opacity-60 disabled:cursor-not-allowed`}
                        >
                          {pushToggling ? 'Updating...' : isSubscribed ? 'Disable' : 'Enable'}
                        </button>
                      </div>
                    </div>
                  )}

                  <div className="mt-6 pt-4 border-t border-slate-100 flex justify-end">
                    <button type="submit" disabled={saving} className={primaryButtonClass}>
                      <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
                    </button>
                  </div>
                </form>
              </SectionShell>
            )}

            {tab === 'password' && (
              <SectionShell
                title="Ubah Password"
                description="Gunakan kombinasi huruf besar, huruf kecil, angka, dan simbol untuk menjaga keamanan akun."
              >
                <form onSubmit={handleChangePass} autoComplete="off" className="space-y-8">
                  {[
                    { key: 'new', label: 'Password Baru', field: 'newPass' },
                    { key: 'confirm', label: 'Konfirmasi Password', field: 'confirm' },
                  ].map(({ key, label, field }) => (
                    <div key={key} className="space-y-2">
                      <label className="block text-sm font-semibold text-slate-700 mb-2">{label}</label>
                      <div className="relative">
                        <input
                          type={showPass[key] ? 'text' : 'password'}
                          value={passForm[field]}
                          onChange={(e) => setPassForm({ ...passForm, [field]: e.target.value })}
                          placeholder={label}
                          autoComplete="new-password"
                          data-lpignore="true"
                          className={`${inputClass} pr-12`}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPass((prev) => ({ ...prev, [key]: !prev[key] }))}
                          className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 transition hover:text-blue-600"
                        >
                          {showPass[key] ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>
                  ))}

                  <div className="flex justify-end mt-2">
                    <button type="submit" disabled={saving} className={primaryButtonClass}>
                      <Save size={15} /> {saving ? 'Menyimpan...' : 'Simpan Password'}
                    </button>
                  </div>
                </form>
              </SectionShell>
            )}

            {tab === 'users' && isAdmin && (
              <SectionShell
                title="Kelola Pengguna"
                description="Atur data user yang terdaftar, termasuk email, username, serta role sesuai kebutuhan operasional."
              >
                {usersLoading ? (
                  <div className="rounded-2xl bg-slate-50 p-8 text-center text-sm text-slate-500">Memuat data user...</div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                      <thead className="bg-slate-50">
                        <tr>
                          {['Username', 'Email', 'Role', 'Aksi'].map((head) => (
                            <th key={head} className="px-4 py-4 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                              {head}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100 bg-white">
                        {users.map((item) => {
                          const itemRole = roleMeta[item.role] || roleMeta.client;
                          const ItemRoleIcon = itemRole.Icon;
                          const isSelf = item.id === user?.id;

                          return (
                            <tr key={item.id} className="hover:bg-slate-50/70">
                              <td className="px-4 py-4 text-sm font-semibold text-slate-800">
                                {item.username} {isSelf && <span className="text-xs font-medium text-blue-600">(kamu)</span>}
                              </td>
                              <td className="px-4 py-4 text-sm text-slate-600">{item.email}</td>
                              <td className="px-4 py-4">
                                <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ${itemRole.tone}`}>
                                  <ItemRoleIcon size={11} /> {itemRole.label}
                                </span>
                              </td>
                              <td className="px-4 py-4">
                                <div className="flex items-center gap-2">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditEmailTouched(false);
                                      setEditingUser({
                                        id: item.id,
                                        username: item.username,
                                        email: item.email,
                                        role: item.role,
                                      });
                                    }}
                                    className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-blue-300 hover:text-blue-600"
                                  >
                                    <Pencil size={12} /> Edit
                                  </button>

                                  {!isSelf && item.role !== 'admin' && (
                                    deleteConfirm === item.id ? (
                                      <div className="flex items-center gap-2">
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteUser(item.id)}
                                          className="rounded-full bg-red-500 px-3 py-1.5 text-xs font-semibold text-white transition hover:bg-red-600"
                                        >
                                          Ya
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => setDeleteConfirm(null)}
                                          className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
                                        >
                                          Batal
                                        </button>
                                      </div>
                                    ) : (
                                      <button
                                        type="button"
                                        onClick={() => setDeleteConfirm(item.id)}
                                        className="inline-flex items-center rounded-full border border-slate-200 bg-white p-2 text-slate-600 transition hover:border-red-300 hover:bg-red-50 hover:text-red-600"
                                      >
                                        <Trash2 size={12} />
                                      </button>
                                    )
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </SectionShell>
            )}
          </div>
        </div>
      </div>

      {editingUser && (
        <div
          className="fixed inset-0 z-[1000] flex items-center justify-center bg-slate-900/45 p-6"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setEditEmailTouched(false);
              setEditingUser(null);
            }
          }}
        >
          <div className="w-full max-w-lg rounded-3xl border border-slate-100 bg-white p-8 shadow-2xl shadow-slate-900/20">
            <div className="mb-6 flex items-center justify-between gap-4">
              <h3 className="text-xl font-bold text-slate-900">Edit User</h3>
              <button
                type="button"
                onClick={() => {
                  setEditEmailTouched(false);
                  setEditingUser(null);
                }}
                className="rounded-full p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleEditUser} className="space-y-5">
              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Username</label>
                <input
                  type="text"
                  value={editingUser.username}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev, username: e.target.value }))}
                  className={inputClass}
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev, email: e.target.value }))}
                  onBlur={() => setEditEmailTouched(true)}
                  className={`${inputClass} ${showEditEmailError ? 'border-red-500 bg-red-50 focus:ring-red-500/10' : ''}`}
                />
                {showEditEmailError && (
                  <p className="mt-2 text-xs font-medium text-red-500">Email user belum valid. Gunakan format seperti nama@domain.com.</p>
                )}
              </div>

              <div>
                <label className="mb-2 block text-sm font-semibold text-slate-700">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser((prev) => ({ ...prev, role: e.target.value }))}
                  className={inputClass}
                >
                  <option value="admin">Admin</option>
                  <option value="karyawan">Employee</option>
                  <option value="client">Client</option>
                </select>
              </div>

              <div className="flex justify-end gap-4 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditEmailTouched(false);
                    setEditingUser(null);
                  }}
                  className={secondaryButtonClass}
                >
                  Batal
                </button>
                <button type="submit" disabled={editSaving} className={primaryButtonClass}>
                  <Save size={14} /> {editSaving ? 'Menyimpan...' : 'Simpan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
