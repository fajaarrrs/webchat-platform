# Backend WebChat

Backend dibangun dengan Express + SQLite (better-sqlite3) dan Socket.io untuk real-time chat.

## Tech Stack

- Node.js
- Express 5
- better-sqlite3
- Socket.io
- JWT (jsonwebtoken)
- bcryptjs
- multer (upload file)
- dotenv

## Scripts

```bash
npm run start  # node index.js
npm run dev    # nodemon index.js
```

## Environment Variables

Buat file .env di folder backend:

```env
PORT=5000
JWT_SECRET=ubah-ke-secret-yang-kuat
FRONTEND_URL=http://localhost:5173
```

Catatan:

- Jika variabel tidak diset, backend memakai default internal.
- Untuk production, jangan gunakan JWT secret default.

## Menjalankan Backend

```bash
npm install
npm run dev
```

Server berjalan di:

- http://localhost:5000

Health check:

- GET /health

## Database

Database file:

- backend/webchat.db

Inisialisasi database dilakukan otomatis saat server start:

- Create table jika belum ada (users, forums, forum_members, messages)
- Lightweight migration untuk kolom messages yang belum ada
- Seed akun admin utama jika belum ada admin

Akun seed admin utama:

- Username: admin
- Email: admin@gmail.com
- Password: admin123

## Arsitektur Modul

- index.js: bootstrap express, route mounting, socket server
- database.js: koneksi DB, schema init, migration, admin seed
- middleware/auth.js: autentikasi JWT + guard admin
- routes/auth.js: register, login, me
- routes/forums.js: create/list/join forum, dashboard data, members, leave, delete forum
- routes/messages.js: history message, upload attachment, download file
- routes/users.js: profile update, admin user management

## Ringkasan Endpoint REST

Base API: /api

Auth:

- POST /auth/register
- POST /auth/login
- GET /auth/me

Forums:

- GET /forums
- POST /forums (admin)
- POST /forums/join/:token
- GET /forums/dashboard/client
- GET /forums/dashboard/karyawan
- GET /forums/:id/members
- DELETE /forums/:id/leave
- DELETE /forums/:id (admin)

Messages:

- GET /messages/:forumId
- POST /messages/upload
- GET /messages/download/:messageId

Users:

- GET /users (admin)
- PUT /users/me
- PUT /users/:id (admin)
- DELETE /users/:id (admin)

## Event Socket.io

Client -> Server:

- join_forum
- leave_forum
- send_message
- edit_message
- pin_message
- delete_message

Server -> Client:

- new_message
- message_edited
- message_deleted
- message_pinned
- forum_preview_updated

## Upload File

- Endpoint: POST /api/messages/upload
- Multipart field: file
- Parameter tambahan: forumId (dan opsional replyToId)
- Maksimal ukuran file: 10MB
- File disimpan di folder backend/uploads
- URL file disimpan ke database sebagai /uploads/<nama-file>

## Security Notes

- Semua endpoint sensitif diproteksi JWT bearer token.
- Aksi admin diproteksi middleware requireAdmin.
- Akses forum untuk non-admin diverifikasi lewat tabel forum_members.
- Akun admin utama dilindungi agar tidak bisa dihapus.

## Batasan Saat Ini

- Konfigurasi CORS masih terbuka (origin: *), aman untuk development tapi perlu diperketat di production.
- Tidak ada rate limiting dan audit logging detail.
- Belum ada test otomatis (unit/integration).

## Rekomendasi Produksi

1. Gunakan JWT secret yang kuat dan unik.
2. Batasi CORS hanya ke origin frontend yang valid.
3. Tambahkan reverse proxy (Nginx) + HTTPS.
4. Tambahkan backup strategy untuk file DB SQLite.
5. Implementasi rate limiting untuk endpoint auth/upload.