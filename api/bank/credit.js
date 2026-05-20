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

  const payload = verifyToken(req);
  if (!payload) return res.status(401).json({ error: 'Не авторизован' });

  const { action, amount, months, creditId } = req.body;

  if (action === 'create') {
    const amt = parseFloat(amount);
    const mo = parseInt(months);
    if (!amt || amt <= 0) return res.status(400).json({ error: 'Введите сумму' });
    if (amt > 5000000) return res.status(400).json({ error: 'Максимум 5 000 000 ₸' });

    const { data: credits } = await supabase
      .from('credits').select('id')
      .eq('username', payload.username).eq('active', true);
    if (credits?.length)
      return res.status(400).json({ error: 'У вас уже есть активный кредит' });

    const rate = 0.18;
    const monthly = parseFloat((amt * (rate / 12) / (1 - Math.pow(1 + rate / 12, -mo))).toFixed(2));
    const date = new Date().toLocaleString('ru-RU');

    await supabase.from('credits').insert([{
      username: payload.username, amount: amt,
      remaining: parseFloat((monthly * mo).toFixed(2)),
      monthly, months: mo, paid: 0, active: true, date
    }]);

    const { data: users } = await supabase
      .from('users').select('balance').eq('username', payload.username).limit(1);
    const newBalance = users[0].balance + amt;

    await supabase.from('users')
      .update({ balance: newBalance })
      .eq('username', payload.username);

    await supabase.from('transactions').insert([{
      username: payload.username, type: 'credit', amount: amt,
      description: `💳 Кредит на ${mo} мес.`, date
    }]);

    return res.status(200).json({ success: true, newBalance, monthly });
  }

  if (action === 'pay') {
    const { data: credits } = await supabase
      .from('credits').select('*').eq('id', creditId).eq('active', true).limit(1);
    const credit = credits?.[0];
    if (!credit) return res.status(404).json({ error: 'Кредит не найден' });

    const { data: users } = await supabase
      .from('users').select('*').eq('username', payload.username).limit(1);
    const user = users?.[0];

    const pay = Math.min(credit.monthly, credit.remaining);
    if (user.balance < pay)
      return res.status(400).json({ error: 'Недостаточно средств' });

    const remaining = parseFloat((credit.remaining - pay).toFixed(2));

    await supabase.from('credits')
      .update({ remaining, paid: credit.paid + 1, active: remaining > 0 })
      .eq('id', creditId);

    await supabase.from('users')
      .update({ balance: user.balance - pay })
      .eq('username', payload.username);

    const date = new Date().toLocaleString('ru-RU');
    await supabase.from('transactions').insert([{
      username: payload.username, type: 'out', amount: -pay,
      description: `💳 Оплата кредита #${creditId}`, date
    }]);

    return res.status(200).json({ success: true, newBalance: user.balance - pay, remaining });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};
