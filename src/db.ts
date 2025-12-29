import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_ANON_KEY!;

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
