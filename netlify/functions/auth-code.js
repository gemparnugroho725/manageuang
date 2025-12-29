// Netlify Function: /api/auth-code
// Returns a time-based registration code for authenticated users
const crypto = require('crypto');

function json(statusCode, payload) {
  return { statusCode, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) };
}

function getUserFromAuth(event) {
  try {
    const auth = event.headers && (event.headers.authorization || event.headers.Authorization);
    if (!auth || !auth.startsWith('Bearer ')) return null;
    const token = auth.slice(7);
    const jwt = require('jsonwebtoken');
    const secret = process.env.JWT_SECRET;
    if (!secret) return null;
    const payload = jwt.verify(token, secret, { algorithms: ['HS256'] });
    return payload && payload.uid ? payload : null;
  } catch (_) { return null; }
}

function generateCode(secret, nowMs = Date.now()) {
  const stepMs = 5 * 60 * 1000; // 5 minutes window
  const window = Math.floor(nowMs / stepMs);
  const hmac = crypto.createHmac('sha1', secret).update(String(window)).digest();
  // Take first 4 bytes for simplicity
  const num = hmac.readUInt32BE(0);
  const code = String(num % 1000000).padStart(6, '0');
  const remaining = stepMs - (nowMs % stepMs);
  return { code, expiresInSec: Math.floor(remaining / 1000) };
}

exports.handler = async (event) => {
  try {
    const user = getUserFromAuth(event);
    if (!user) return json(401, { error: 'Unauthorized' });
    const secret = process.env.OTP_SECRET || process.env.JWT_SECRET;
    if (!secret) return json(500, { error: 'Server not configured' });
    const result = generateCode(secret);
    return json(200, result);
  } catch (e) {
    return json(500, { error: String(e && e.message ? e.message : e) });
  }
};
