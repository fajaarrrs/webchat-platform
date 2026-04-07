# Frontend WebChat

Frontend menggunakan React + Vite dengan pendekatan role-based routing (admin, karyawan, client) dan real-time chat via Socket.io client.

## Tech Stack

- React 19
- React Router DOM 7
- Vite 7
- TailwindCSS (tersedia di project)
- Socket.io Client
- Lucide React (icons)

## Scripts

```bash
npm run dev      # Jalankan dev server (vite --host)
npm run build    # Build production
npm run preview  # Preview build
npm run lint     # Lint source
```

## Konfigurasi Environment

Buat file .env di folder frontend:

```env
VITE_API_BASE_URL=http://localhost:5000
```

Catatan teknis penting:

- Request REST memakai nilai VITE_API_BASE_URL.
- Socket URL di ChatPage saat ini masih hardcoded ke http://localhost:5000.
	Jika deploy production, sebaiknya dipindah ke environment variable agar konsisten.

## Struktur Folder Penting

```text
src/
	api.js                    # Wrapper fetch API + token header
	context/AuthContext.jsx   # Auth state, login/register/logout, toast
	components/               # Layout, ProtectedRoute, sidebar, toast
	pages/                    # Semua halaman per role
		admin/
		client/
		karyawan/
```

## Routing dan Akses Role

Public route:

- /login
- /register

Protected route:

- /chat/join/:token -> semua role login
- Admin: /admin/dashboard, /admin/create-link, /admin/users, /admin/forum, /admin/chat, /admin/settings
- Karyawan: /karyawan/dashboard, /karyawan/forum, /karyawan/chat, /karyawan/settings
- Client: /client/dashboard, /client/forum, /client/chat, /client/settings

Semua validasi role dilakukan di komponen ProtectedRoute.

## Arsitektur Auth

AuthContext menangani:

- Validasi token saat app mount melalui GET /api/auth/me
- Penyimpanan token di localStorage key: wchat_token
- Login, register, logout
- Update profil, upload avatar, hapus avatar
- Toast notifikasi global

## API Layer

File src/api.js menyediakan helper:

- api.get
- api.post
- api.put
- api.delete
- api.upload (multipart/form-data)

Behavior utama:

- Otomatis menambahkan header Authorization jika token ada.
- Default Content-Type application/json (kecuali upload form data).
- Error response dipetakan ke Error message agar bisa langsung dipakai UI.

## Fitur Real-time Chat

Halaman ChatPage memiliki fitur:

- Ambil daftar forum dari /api/forums
- Join/leave room Socket.io berdasarkan forum aktif
- Ambil histori message dari /api/messages/:forumId
- Kirim pesan real-time (event send_message)
- Terima event new_message, message_edited, message_deleted, message_pinned, forum_preview_updated
- Upload attachment via POST /api/messages/upload
- Reply message dengan snapshot pesan referensi
- Mention username (format @username)
- Pencarian pesan, pinned message list, selection mode

## Komponen dan Hook Kunci

- DashboardLayout: shell layout per role
- ProtectedRoute: guard role-based route
- ToastContainer: notifikasi sukses/gagal
- useBreakpoint: responsif behavior desktop/mobile

## Build dan Deploy

1. Jalankan npm run build.
2. Ambil output dari folder dist.
3. Pastikan VITE_API_BASE_URL mengarah ke backend yang aktif.
4. Pastikan backend mengizinkan origin frontend via CORS policy.

## Catatan Pengembangan

- Styling saat ini campuran inline CSS dan file CSS per halaman.
- Sebagian nilai konfigurasi masih hardcoded di komponen (contoh socket URL).
- Jika ingin scaling, pertimbangkan sentralisasi endpoint dan socket config ke satu file env-config.