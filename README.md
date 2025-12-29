# Expense Manager Web

Aplikasi web untuk mengelola pengeluaran dengan Supabase sebagai database.

## Setup Supabase

1. Buat proyek baru di [Supabase](https://supabase.com)
2. Pergi ke Settings > API untuk mendapatkan URL dan anon key
3. Update file `.env` dengan credentials kamu:
   ```
   SUPABASE_URL=your_project_url
   SUPABASE_ANON_KEY=your_anon_key
   ```
4. Buat tabel di Supabase SQL Editor:

```sql
-- Wallets table
CREATE TABLE wallets (
  id SERIAL PRIMARY KEY,
  name TEXT NOT NULL,
  balance BIGINT NOT NULL DEFAULT 0
);

-- Transactions table
CREATE TABLE transactions (
  id SERIAL PRIMARY KEY,
  type TEXT NOT NULL,
  amount BIGINT NOT NULL,
  note TEXT,
  date TEXT,
  wallet_id BIGINT REFERENCES wallets(id)
);
```

## Install & Run

```bash
npm install
npm run dev
```

Aplikasi akan berjalan di http://localhost:3000

## Deploy ke Netlify

Netlify tidak menjalankan server Express. Untuk itu, API di-deploy sebagai Netlify Functions, dan frontend dipublish sebagai static site.

1. Set environment variables di Netlify (Site Settings > Environment Variables):
   - `SUPABASE_URL`
   - `SUPABASE_ANON_KEY`
  - `JWT_SECRET` (string acak minimal 32 karakter untuk menandatangani token)
2. Pastikan file `netlify.toml` ada dengan konfigurasi berikut:

```toml
[build]
  publish = "public"
  functions = "netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200

[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200
```

3. Deploy repository ini ke Netlify. Netlify akan otomatis membuat endpoint:
   - `/.netlify/functions/wallets` (diakses via `/api/wallets`)
   - `/.netlify/functions/transactions` (diakses via `/api/transactions`)

4. Frontend sudah memakai path `/api/...`, sehingga akan langsung diarahkan ke functions via redirect di atas.

Catatan: Untuk development lokal, gunakan `npm run dev` yang menjalankan Express. Untuk Netlify (production), Express tidak digunakan.

## Auth Kustom (Users Table)

Eksekusi SQL berikut di Supabase (SQL editor) untuk membuat tabel users:

```sql
CREATE EXTENSION IF NOT EXISTS citext;

CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
```

Endpoints fungsi Netlify:
- Registrasi: `/api/auth-register` (POST `{ email, password }`)
- Login: `/api/auth-login` (POST `{ email, password }` → `{ token, userId }`)

Tambahkan halaman:
- `public/register.html` dan `public/login.html` untuk UI.
