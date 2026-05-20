const { createClient } = require('@supabase/supabase-js');
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

  const { to, amount, note } = req.body;
  const amt = parseFloat(amount);

  if (!to || !amt || amt <= 0)
    return res.status(400).json({ error: 'Заполни получателя и сумму' });
  if (to === payload.username)
    return res.status(400).json({ error: 'Нельзя переводить себе' });

  const { data: senders } = await supabase
    .from('users').select('*').eq('username', payload.username).limit(1);
  const sender = senders?.[0];
  if (!sender) return res.status(404).json({ error: 'Отправитель не найден' });
  if (amt > sender.balance)
    return res.status(400).json({ error: 'Недостаточно средств' });

  const { data: receivers } = await supabase
    .from('users').select('*').eq('username', to).limit(1);
  const receiver = receivers?.[0];
  if (!receiver) return res.status(404).json({ error: 'Получатель не найден' });
  if (receiver.is_blocked) return res.status(400).json({ error: 'Получатель заблокирован' });

  await supabase.from('users')
    .update({ balance: sender.balance - amt })
    .eq('username', payload.username);

  await supabase.from('users')
    .update({ balance: receiver.balance + amt })
    .eq('username', to);

  const id = Math.random().toString(36).slice(2, 10).toUpperCase();
  const date = new Date().toLocaleString('ru-RU');

  await supabase.from('transactions').insert([
    { username: payload.username, type: 'out', amount: -amt,
      description: `↗ Перевод → ${receiver.fullname}${note ? ': ' + note : ''}`, date },
    { username: to, type: 'in', amount: amt,
      description: `↙ Перевод ← ${sender.fullname}${note ? ': ' + note : ''}`, date },
  ]);

  res.status(200).json({ success: true, newBalance: sender.balance - amt });
};
