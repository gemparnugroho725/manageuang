// Netlify Function: /api/auth-login
// Authenticates user and returns a signed JWT token

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  return createClient(url, key);
}

function json(statusCode, payload) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
}

function validateEmail(email) {
  return typeof email === 'string' && email.length <= 254 && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

exports.handler = async (event) => {
  try {
    if (event.httpMethod !== 'POST') return json(405, { error: 'Method Not Allowed' });
    const supabase = await getSupabase();
    const bcryptMod = await import('bcryptjs');
    const jwtMod = await import('jsonwebtoken');
    const bcrypt = bcryptMod.default || bcryptMod;
    const jwt = jwtMod.default || jwtMod;
    const body = event.body ? JSON.parse(event.body) : {};

    const email = (body.email || '').toString().trim().toLowerCase();
    const password = (body.password || '').toString();
    if (!validateEmail(email) || !password) return json(400, { error: 'Invalid credentials' });

    const { data: users, error: selErr } = await supabase
      .from('users')
      .select('id, password_hash')
      .eq('email', email)
      .limit(1);
    if (selErr) return json(500, { error: selErr.message });
    const user = users && users[0];
    // Generic error to avoid user enumeration
    if (!user) return json(401, { error: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password_hash);
    if (!ok) return json(401, { error: 'Invalid credentials' });

    // Update last_login (non-blocking)
    supabase.from('users').update({ last_login: new Date().toISOString() }).eq('id', user.id);

    const secret = process.env.JWT_SECRET;
    if (!secret) return json(500, { error: 'Server not configured' });
    const token = jwt.sign({ uid: user.id, sub: String(user.id), email }, secret, { algorithm: 'HS256', expiresIn: '1d' });

    return json(200, { token, userId: user.id });
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
