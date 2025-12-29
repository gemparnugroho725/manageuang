// Netlify Function: /api/auth-register
// Registers a new user with hashed password

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
    const { default: bcrypt } = await import('bcryptjs');
    const body = event.body ? JSON.parse(event.body) : {};

    const email = (body.email || '').toString().trim().toLowerCase();
    const password = (body.password || '').toString();

    if (!validateEmail(email) || password.length < 8 || password.length > 72) {
      return json(400, { error: 'Invalid email or password policy failed' });
    }

    // Check existence
    const { data: existing, error: selErr } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .limit(1);
    if (selErr) return json(500, { error: selErr.message });
    if (existing && existing.length > 0) return json(409, { error: 'Email already registered' });

    // Hash password (use 12 salt rounds)
    const saltRounds = 12;
    const password_hash = await bcrypt.hash(password, saltRounds);

    const { error: insErr } = await supabase
      .from('users')
      .insert([{ email, password_hash }]);
    if (insErr) return json(500, { error: insErr.message });

    return json(200, { success: true });
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
