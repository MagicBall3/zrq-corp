const { createClient } = require('@supabase/supabase-js');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

module.exports = async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ error: 'Заполни все поля' });

  const { data: users, error } = await supabase
    .from('users')
    .select('*')
    .eq('username', username)
    .limit(1);

  if (error) return res.status(500).json({ error: 'Ошибка базы данных' });

  const user = users?.[0];
  if (!user) return res.status(401).json({ error: 'Пользователь не найден' });
  if (user.is_blocked) return res.status(403).json({ error: 'Аккаунт заблокирован' });

  const valid = await bcrypt.compare(password, user.password_hash);
  if (!valid) return res.status(401).json({ error: 'Неверный пароль' });

  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: user.is_admin },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash, ...safeUser } = user;
  res.status(200).json({ token, user: safeUser });
};
