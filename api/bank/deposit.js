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

  const { action, amount, months, depositId } = req.body;

  if (action === 'create') {
    const amt = parseFloat(amount);
    const mo = parseInt(months);
    if (!amt || amt < 1000) return res.status(400).json({ error: 'Минимум 1000 ₸' });

    const { data: users } = await supabase
      .from('users').select('*').eq('username', payload.username).limit(1);
    const user = users?.[0];
    if (amt > user.balance) return res.status(400).json({ error: 'Недостаточно средств' });

    const { data: deps } = await supabase
      .from('deposits').select('id').eq('username', payload.username).eq('active', true);
    if (deps?.length >= 3) return res.status(400).json({ error: 'Максимум 3 активных вклада' });

    const rate = mo <= 3 ? 0.10 : mo <= 6 ? 0.12 : mo <= 12 ? 0.15 : 0.18;
    const profit = parseFloat((amt * rate * mo / 12).toFixed(2));
    const date = new Date().toLocaleString('ru-RU');

    await supabase.from('deposits').insert([{
      username: payload.username, amount: amt, months: mo,
      rate: rate * 100, profit, active: true, date
    }]);

    await supabase.from('users')
      .update({ balance: user.balance - amt })
      .eq('username', payload.username);

    await supabase.from('transactions').insert([{
      username: payload.username, type: 'out', amount: -amt,
      description: `🏦 Вклад на ${mo} мес.`, date
    }]);

    return res.status(200).json({ success: true, newBalance: user.balance - amt, profit });
  }

  if (action === 'close') {
    const { data: deps } = await supabase
      .from('deposits').select('*').eq('id', depositId).eq('active', true).limit(1);
    const dep = deps?.[0];
    if (!dep) return res.status(404).json({ error: 'Вклад не найден' });

    const { data: users } = await supabase
      .from('users').select('*').eq('username', payload.username).limit(1);
    const user = users?.[0];

    const parseDate = (d) => {
      if (!d) return new Date();
      if (d.includes('T')) return new Date(d);
      const p = d.split(', ');
      const dp = p[0].split('.');
      return new Date(`${dp[2]}-${dp[1]}-${dp[0]}T${p[1] || '00:00:00'}`);
    };

    const daysHeld = (new Date() - parseDate(dep.date)) / 86400000;
    const daysReq = dep.months * 30;
    const early = daysHeld < daysReq;
    const total = early ? dep.amount : dep.amount + dep.profit;

    await supabase.from('deposits').update({ active: false }).eq('id', depositId);
    await supabase.from('users')
      .update({ balance: user.balance + total })
      .eq('username', payload.username);

    const date = new Date().toLocaleString('ru-RU');
    await supabase.from('transactions').insert([{
      username: payload.username, type: 'in', amount: total,
      description: early
        ? `🏦 Досрочное закрытие #${depositId} (без процентов)`
        : `🏦 Закрытие вклада #${depositId} с процентами`,
      date
    }]);

    return res.status(200).json({ success: true, newBalance: user.balance + total, early, total });
  }

  res.status(400).json({ error: 'Неизвестное действие' });
};
