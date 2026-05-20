const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

function verifyToken(req) {
  const auth = req.headers.authorization;
  if (!auth?.startsWith('Bearer ')) return null;
  try { return jwt.verify(auth.slice(7), process.env.JWT_SECRET); }
  catch { return null; }
}

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Не авторизован' });

  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword)
    return res.status(400).json({ error: 'Заполни все поля' });
  if (newPassword.length < 6)
    return res.status(400).json({ error: 'Новый пароль минимум 6 символов' });

  const { data: users } = await supabase
    .from('users').select('*').eq('username', payload.username).limit(1);
  const user = users?.[0];
  if (!user) return res.status(404).json({ error: 'Пользователь не найден' });

  const valid = await bcrypt.compare(oldPassword, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Неверный текущий пароль' });

  const password_hash = await bcrypt.hash(newPassword, 12);
  await supabase.from('users')
    .update({ password_hash })
    .eq('username', payload.username);

  res.status(200).json({ success: true });
};
