-- Enable case-insensitive text (optional but recommended for email)
CREATE EXTENSION IF NOT EXISTS citext;

-- Users table for custom auth
CREATE TABLE IF NOT EXISTS users (
  id BIGSERIAL PRIMARY KEY,
  email CITEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login TIMESTAMPTZ
);

-- Index for fast lookup by email
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
