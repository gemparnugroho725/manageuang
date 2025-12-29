// Netlify Function: /api/wallets -> /.netlify/functions/wallets
// Handles GET, POST, PUT, DELETE using Supabase

async function getSupabase() {
  const { createClient } = await import('@supabase/supabase-js');
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error('Missing SUPABASE_URL or SUPABASE_ANON_KEY');
  }
  return createClient(url, key);
}

function json(statusCode, payload) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  };
}

function getIdFromPath(path) {
  // Path looks like "/.netlify/functions/wallets" or "/.netlify/functions/wallets/123"
  const parts = path.split('/').filter(Boolean);
  const idx = parts.lastIndexOf('wallets');
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

    // Require auth for all methods
    const user = getUserFromAuth(event);
    if (!user) return json(401, { error: 'Unauthorized' });

    if (method === 'GET') {
      const { data, error } = await supabase.from('wallets').select('*');
      if (error) return json(500, { error: error.message });
      return json(200, data || []);
    }

    if (method === 'POST') {
      const { name, balance } = body;
      if (!name) return json(400, { error: 'Name required' });
      const { error } = await supabase
        .from('wallets')
        .insert([{ name, balance: balance || 0 }]);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    if (method === 'PUT') {
      if (!id) return json(400, { error: 'Missing wallet id' });
      const { name, balance } = body;
      const { error } = await supabase
        .from('wallets')
        .update({ name, balance })
        .eq('id', id);
      if (error) return json(500, { error: error.message });
      return json(200, { success: true });
    }

    if (method === 'DELETE') {
      if (!id) return json(400, { error: 'Missing wallet id' });
      const { error } = await supabase
        .from('wallets')
        .delete()
        .eq('id', id);
      if (error) return json(400, { error: error.message });
      return json(200, { success: true });
    }

    return json(405, { error: 'Method Not Allowed' });
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
