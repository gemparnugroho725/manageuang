import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

// Try loading .env from common locations for local dev
try {
	// First: current working directory
	dotenv.config({ path: path.resolve(process.cwd(), '.env') });
	// Fallback: project root relative to compiled or src dir
	if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY) {
		dotenv.config({ path: path.resolve(__dirname, '../.env') });
	}
} catch {}

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
	throw new Error('Missing environment variables: SUPABASE_URL or SUPABASE_ANON_KEY');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// Note: Tables need to be created in Supabase dashboard or via SQL
// CREATE TABLE wallets (
//   id SERIAL PRIMARY KEY,
//   name TEXT NOT NULL,
//   balance BIGINT NOT NULL DEFAULT 0
// );
//
// CREATE TABLE transactions (
//   id SERIAL PRIMARY KEY,
//   type TEXT NOT NULL,
//   amount BIGINT NOT NULL,
//   note TEXT,
//   date TEXT,
//   wallet_id BIGINT REFERENCES wallets(id)
// );
