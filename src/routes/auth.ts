import { Router } from "express";
import { supabase } from "../db";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

export const authRouter = Router();

function validateEmail(email: string) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

authRouter.post("/auth-register", async (req, res) => {
  try {
    const email = String((req.body?.email || '')).trim().toLowerCase();
    const password = String(req.body?.password || '');
    const code = String(req.body?.code || '').trim();
    if (!validateEmail(email) || password.length < 8 || password.length > 72) {
      return res.status(400).json({ error: 'Invalid email or password policy failed' });
    }

    // Verify registration code (current or previous window)
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured' });
    const stepMs = 5 * 60 * 1000;
    const nowMs = Date.now();
    const windows = [Math.floor(nowMs / stepMs), Math.floor((nowMs - stepMs) / stepMs)];
    const valid = windows.some(w => {
      const h = crypto.createHmac('sha1', secret).update(String(w)).digest();
      const c = String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
      return c === code;
    });
    if (!valid) return res.status(401).json({ error: 'Invalid registration code' });

    const { data: existing, error: selErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (selErr) return res.status(500).json({ error: selErr.message });
    if (existing && existing.length > 0) return res.status(409).json({ error: 'Email already registered' });

    const password_hash = await bcrypt.hash(password, 12);
    const { error: insErr } = await supabase
      .from('users')
      .insert([{ email, password_hash }]);
    if (insErr) return res.status(500).json({ error: insErr.message });
    return res.json({ success: true });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

authRouter.post("/auth-login", async (req, res) => {
  try {
    const email = String((req.body?.email || '')).trim().toLowerCase();
    const password = String(req.body?.password || '');
    if (!validateEmail(email) || !password) return res.status(400).json({ error: 'Invalid credentials' });

    const { data: users, error: selErr } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', email)
      .limit(1);
    if (selErr) return res.status(500).json({ error: selErr.message });
    const user = users && users[0];
    if (!user) return res.status(401).json({ error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return res.status(401).json({ error: 'Invalid credentials' });

    const secret = process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured' });
    const token = jwt.sign({ uid: user.id, sub: String(user.id), email }, secret, { algorithm: 'HS256', expiresIn: '1d' });

    // update last_login (non-blocking)
    supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    return res.json({ token, userId: user.id });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});

// Return current registration code for authenticated users
authRouter.get("/auth-code", async (req, res) => {
  try {
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
    if (!secret) return res.status(500).json({ error: 'Server not configured' });
    const stepMs = 5 * 60 * 1000;
    const nowMs = Date.now();
    const window = Math.floor(nowMs / stepMs);
    const h = crypto.createHmac('sha1', secret).update(String(window)).digest();
    const code = String(h.readUInt32BE(0) % 1000000).padStart(6, '0');
    const expiresInSec = Math.floor((stepMs - (nowMs % stepMs)) / 1000);
    return res.json({ code, expiresInSec });
  } catch (e: any) {
    return res.status(500).json({ error: e?.message || String(e) });
  }
});
