// Netlify Function: /api/categories -> /.netlify/functions/categories

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

function getIdFromPath(path) {
  const parts = path.split('/').filter(Boolean);
  const idx = parts.lastIndexOf('categories');
  const id = idx >= 0 && parts[idx + 1] ? parts[idx + 1] : null;
  return id;
}

function getUserFromAuth(event) {
  try {
    const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const jwtMod = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwtMod.verify(token, secret, { algorithms: ['HS256'] });
    return payload && payload.uid ? payload : null;
  } catch (_) { return null; }
}

exports.handler = async (event) => {
  try {
    const supabase = await getSupabase();
    const method = event.httpMethod;
    const id = getIdFromPath(event.path || '');
    const body = event.body ? JSON.parse(event.body) : {};

    const user = getUserFromAuth(event);
    if (!user) return json(401, { error: 'Unauthorized' });

    if (method === 'GET') {
      const { data, error } = await supabase.from('categories').select('id, name').order('name');
      if (error) return json(500, { error: error.message });
      return json(200, data || []);
    }

    if (method === 'POST') {
      const name = (body.name || '').toString().trim();
      if (!name) return json(400, { error: 'Name required' });
      const { data: existing, error: selErr } = await supabase
        .from('categories')
        .select('id, name')
        .ilike('name', name)
        .limit(1);
      if (selErr) return json(500, { error: selErr.message });
      if (existing && existing[0]) return json(200, existing[0]);
      const { data, error } = await supabase
        .from('categories')
        .insert([{ name }])
        .select('id, name')
        .single();
      if (error) return json(500, { error: error.message });
      return json(200, data);
    }

    if (method === 'DELETE') {
      if (!id) return json(400, { error: 'Missing id' });
      const { error } = await supabase.from('categories').delete().eq('id', id);
      if (error) return json(400, { error: error.message });
      return json(200, { success: true });
    }

    return json(405, { error: 'Method Not Allowed' });
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
