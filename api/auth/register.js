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

  const { username, password, fullname, birthdate } = req.body;

  if (!username || !password || !fullname || !birthdate)
    return res.status(400).json({ error: 'Заполни все поля' });
  if (username.length < 3)
    return res.status(400).json({ error: 'Логин минимум 3 символа' });
  if (!/^[a-zA-Z0-9_]+$/.test(username))
    return res.status(400).json({ error: 'Логин только латиница и цифры' });
  if (password.length < 6)
    return res.status(400).json({ error: 'Пароль минимум 6 символов' });
  if (fullname.length < 2)
    return res.status(400).json({ error: 'Введите настоящее имя' });

  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('username', username)
    .limit(1);

  if (existing?.length)
    return res.status(409).json({ error: 'Логин уже занят' });

  const password_hash = await bcrypt.hash(password, 12);
  const bonus = Math.floor(Math.random() * 40001) + 10000;
  const card = '4' + Array(15).fill(0).map(() => Math.floor(Math.random() * 10)).join('');

  const { data: newUsers, error } = await supabase
    .from('users')
    .insert([{
      username,
      password_hash,
      fullname,
      birthdate,
      balance: bonus,
      card_number: card,
      is_admin: false,
      is_blocked: false,
      last_seen: new Date().toISOString()
    }])
    .select();

  if (error) return res.status(500).json({ error: 'Ошибка при регистрации' });

  const user = newUsers[0];
  await supabase.from('transactions').insert([{
    username,
    type: 'bonus',
    amount: bonus,
    description: '🎉 Приветственный бонус',
    date: new Date().toLocaleString('ru-RU')
  }]);

  const token = jwt.sign(
    { id: user.id, username: user.username, is_admin: false },
    process.env.JWT_SECRET,
    { expiresIn: '7d' }
  );

  const { password_hash: _, ...safeUser } = user;
  res.status(201).json({ token, user: safeUser, bonus });
};
