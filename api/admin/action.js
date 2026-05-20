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
  if (!payload.is_admin) return res.status(403).json({ error: 'Нет доступа' });

  const { action, username, amount } = req.body;

  if (action === 'setBalance') {
    const amt = parseFloat(amount);
    if (isNaN(amt)) return res.status(400).json({ error: 'Неверная сумма' });
    await supabase.from('users').update({ balance: amt }).eq('username', username);
    const date = new Date().toLocaleString('ru-RU');
    await supabase.from('transactions').insert([{
      username, type: 'bonus', amount: amt,
      description: '👑 Баланс установлен администратором', date
    }]);
    return res.status(200).json({ success: true });
  }

  if (action === 'addBalance') {
    const amt = parseFloat(amount);
    const { data: users } = await supabase.from('users').select('balance').eq('username', username).limit(1);
    const newBalance = users[0].balance + amt;
    await supabase.from('users').update({ balance: newBalance }).eq('username', username);
    const date = new Date().toLocaleString('ru-RU');
    await supabase.from('transactions').insert([{
      username, type: 'bonus', amount: amt,
      description: '👑 Начислено администратором', date
    }]);
    return res.status(200).json({ success: true });
  }

  if (action === 'block') {
    await supabase.from('users').update({ is_blocked: true }).eq('username', username);
    return res.status(200).json({ success: true });
  }

  if (action === 'unblock') {
    await supabase.from('users').update({ is_blocked: false }).eq('username', username);
    return res.status(200).json({ success: true });
  }

  if (action === 'reset') {
    await supabase.from('users').update({ balance: 0 }).eq('username', username);
    await supabase.from('credits').update({ active: false }).eq('username', username).eq('active', true);
    await supabase.from('deposits').update({ active: false }).eq('username', username).eq('active', true);
    await supabase.from('transactions').delete().eq('username', username);
    return res.status(200).json({ success: true });
  }

  if (action === 'clearHistory') {
    await supabase.from('transactions').delete().eq('username', username);
    return res.status(200).json({ success: true });
  }

  if (action === 'closeDeposits') {
    await supabase.from('deposits').update({ active: false }).eq('username', username).eq('active', true);
    return res.status(200).json({ success: true });
  }

  if (action === 'closeCredits') {
    await supabase.from('credits').update({ active: false, remaining: 0 }).eq('username', username).eq('active', true);
    return res.status(200).json({ success: true });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};
