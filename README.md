# Todo API

REST API Express + TypeScript untuk skema MySQL `todo_db` yang dibuat pada praktikum. API
menggunakan tabel `users (id, username, email, password)` dan
`todos (id, user_id, task, is_completed)`; tidak perlu menjalankan ulang SQL
atau membuat tabel tambahan.

## Menjalankan

1. Pastikan MySQL aktif dan database `todo_db` beserta tabelnya sudah dibuat.
2. Dari folder `backend`, jalankan `npm install`.
3. Salin `.env.example` menjadi `.env` (`Copy-Item .env.example .env` di
   PowerShell), lalu sesuaikan konfigurasi MySQL.
   `JWT_SECRET` wajib diganti dengan secret acak minimal 32 karakter.
4. Jalankan `npm run dev`. API tersedia di `http://localhost:4000`.
   Source TypeScript berada di `src`; `npm run build` menghasilkan JavaScript
   di `dist` dan `npm start` menjalankan hasil build.
5. Jalankan `npm test` untuk tes endpoint menggunakan database tiruan (tanpa
   mengubah database MySQL).

Contoh membuat secret lokal:

```powershell
node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
```

Jangan membagikan atau meng-commit file `.env`.

## Endpoint

Semua respons error berbentuk `{ "error": { "code": "...", "message": "..." } }`.
Endpoint todo membutuhkan header `Authorization: Bearer <token>`.

| Method | Path | Keterangan |
| --- | --- | --- |
| GET | `/` | Memastikan server Express berjalan |
| GET | `/api/health` | Memeriksa koneksi database |
| POST | `/api/auth/register` | Membuat akun dengan `username`, `email`, dan `password` |
| POST | `/api/auth/login` | Login dengan `identifier` (email atau username) dan `password` |
| GET | `/api/todos` | Menampilkan todo milik pengguna yang login |
| GET | `/api/todos/:id` | Menampilkan satu todo milik pengguna yang login |
| POST | `/api/todos` | Membuat todo dengan `task` |
| PUT | `/api/todos/:id` | Mengubah `task` dan/atau `is_completed` |
| PATCH | `/api/todos/:id` | Mengubah `task` dan/atau `isCompleted` |
| DELETE | `/api/todos/:id` | Menghapus todo milik pengguna yang login |

Respons error dan endpoint yang tidak dikenal menggunakan format
`{ "success": false, "message": "..." }`. GET `/api/todos` mengembalikan
`{ "success": true, "data": [...] }`, sedangkan GET `/api/todos/:id`
mengembalikan `{ "success": true, "data": ... }`.

`PUT` mengikuti format praktikum Tugas 5 (`is_completed`) dan mengembalikan
status `200` dengan pesan sukses. `PATCH` tetap tersedia untuk kompatibilitas
dengan frontend, yang mengirim `isCompleted`. Detail todo mengembalikan
`{ "success": true, "data": ... }`; penghapusan mengembalikan status `200`
dengan pesan sukses.

Untuk mencoba update di Postman, gunakan `PUT
http://localhost:4000/api/todos/1`, pilih **Authorization → Bearer Token**,
isi token login Anda, lalu kirim Body **raw → JSON**:

```json
{
  "task": "Tugas diperbarui",
  "is_completed": true
}
```

Register dan login mengembalikan `{ "user": { "id", "username", "email" },
"token": "..." }`. Data todo menggunakan bentuk
`{ "id", "userId", "task", "isCompleted" }`. Password baru disimpan sebagai
hash bcrypt, dan query database menggunakan parameter agar input pengguna
tidak dieksekusi sebagai SQL.

Contoh:

```powershell
curl.exe -X POST http://localhost:4000/api/auth/register `
  -H "Content-Type: application/json" `
  -d '{"username":"andi","email":"andi@example.com","password":"passwordku123"}'

curl.exe http://localhost:4000/api/todos `
  -H "Authorization: Bearer $TOKEN"
```

Data contoh yang memiliki nilai `password` seperti `hashed_pass_1` pada SQL
praktikum bukan hash bcrypt yang valid, sehingga tidak dapat digunakan untuk
login. Buat akun baru melalui endpoint register untuk menguji autentikasi.
