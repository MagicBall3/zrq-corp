/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from "react";

const SUPABASE_URL = "https://gvorwmwsurbkdlozxnel.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b3J3bXdzdXJia2Rsb3p4bmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDA5MjEsImV4cCI6MjA5NDUxNjkyMX0.Z4P9uDa0UmlTb8aWS5uEWjZqRMwNCY96dMhG6KeV3uM";
const ADMIN_USERNAME = "MrSovaYT";

const sb = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: options.prefer || "return=representation", ...options.headers },
    ...options,
  });
  if (!res.ok) { const e = await res.json(); throw new Error(e.message || "DB Error"); }
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};

const fmt = (n) => new Intl.NumberFormat("kk-KZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " ₸";
const nowStr = () => new Date().toLocaleString("ru-RU");
const genId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const isOnline = (lastSeen) => { if (!lastSeen) return false; return (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000; };
const parseDepDate = (d) => { if (!d) return new Date(); if (d.includes("T")) return new Date(d); const p = d.split(", "); const dp = p[0].split("."); return new Date(`${dp[2]}-${dp[1]}-${dp[0]}T${p[1] || "00:00:00"}`); };

// ── QR ────────────────────────────────────────────────────────────────────────
function QRCode({ value, size = 200 }) {
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1a0533&color=c084fc&format=png`} alt="QR" style={{ width: size, height: size, borderRadius: 16, border: "2px solid #c084fc44" }} />;
}

function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);
  useEffect(() => {
    let stream = null;
    navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } })
      .then(s => { stream = s; if (videoRef.current) { videoRef.current.srcObject = s; videoRef.current.play(); setScanning(true); } })
      .catch(() => setError("Нет доступа к камере"));
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);
  useEffect(() => {
    if (!scanning || !("BarcodeDetector" in window)) { if (scanning) setError("Введите логин вручную"); return; }
    const det = new window.BarcodeDetector({ formats: ["qr_code"] });
    const iv = setInterval(async () => { try { const b = await det.detect(videoRef.current); if (b.length) { clearInterval(iv); onScan(b[0].rawValue); } } catch {} }, 500);
    return () => clearInterval(iv);
  }, [scanning, onScan]);
  return (
    <div style={M.overlay}>
      <div style={M.sheet}>
        <div style={M.sheetHandle} />
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <span style={M.sheetTitle}>📷 Сканировать QR</span>
          <button style={M.closeBtn} onClick={onClose}>✕</button>
        </div>
        {error ? <p style={{ color: "#f87171", textAlign: "center" }}>{error}</p> : <video ref={videoRef} style={{ width: "100%", borderRadius: 16, background: "#000" }} muted playsInline />}
      </div>
    </div>
  );
}

// ── PIN ───────────────────────────────────────────────────────────────────────
function PinScreen({ mode, onSuccess, onCancel, username }) {
  const [pin, setPin] = useState([]);
  const [confirmPin, setConfirmPin] = useState([]);
  const [step, setStep] = useState("enter");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const np = [...pin, d]; setPin(np); setError("");
    if (np.length === 4) setTimeout(() => {
      if (mode === "set") {
        if (step === "enter") { setConfirmPin(np); setStep("confirm"); setPin([]); }
        else if (np.join("") === confirmPin.join("")) { localStorage.setItem(`pin_${username}`, np.join("")); onSuccess(); }
        else { setError("PIN не совпадает"); doShake(); setPin([]); setStep("enter"); setConfirmPin([]); }
      } else {
        if (np.join("") === localStorage.getItem(`pin_${username}`)) onSuccess();
        else { setError("Неверный PIN"); doShake(); setPin([]); }
      }
    }, 150);
  };

  const titles = { set: { enter: "Придумайте PIN-код", confirm: "Повторите PIN-код" }, check: "Введите PIN-код" };
  const title = mode === "set" ? titles.set[step] : titles.check;

  return (
    <div style={P.root}>
      <div style={P.glow} />
      <div style={P.card}>
        <div style={P.logo}>⛁</div>
        <div style={P.brand}>QAZAQBANK</div>
        {username && <div style={P.sub}>@{username}</div>}
        <div style={P.label}>{title}</div>
        <div style={{ ...P.dots, ...(shake ? { transform: "translateX(8px)" } : {}) }}>
          {[0,1,2,3].map(i => <div key={i} style={{ ...P.dot, ...(i < pin.length ? P.dotOn : {}) }} />)}
        </div>
        {error && <div style={P.err}>{error}</div>}
        <div style={P.grid}>
          {[1,2,3,4,5,6,7,8,9].map(d => <button key={d} style={P.key} onClick={() => handleDigit(d)}>{d}</button>)}
          <div />
          <button style={P.key} onClick={() => handleDigit(0)}>0</button>
          <button style={{ ...P.key, color: "#f87171", fontSize: 20 }} onClick={() => setPin(p => p.slice(0,-1))}>⌫</button>
        </div>
        {onCancel && <button style={P.out} onClick={onCancel}>Выйти из аккаунта</button>}
      </div>
    </div>
  );
}

const P = {
  root: { position: "fixed", inset: 0, background: "#0d0118", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, overflow: "hidden" },
  glow: { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle, #7c3aed44 0%, transparent 70%)", top: "10%", left: "50%", transform: "translateX(-50%)", pointerEvents: "none" },
  card: { position: "relative", width: "100%", maxWidth: 340, padding: "48px 24px 32px", display: "flex", flexDirection: "column", alignItems: "center" },
  logo: { fontSize: 52, marginBottom: 8, filter: "drop-shadow(0 0 20px #a855f7)" },
  brand: { fontSize: 20, fontWeight: 900, letterSpacing: 4, background: "linear-gradient(135deg, #c084fc, #818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 4 },
  sub: { fontSize: 13, color: "#6b7280", marginBottom: 36 },
  label: { fontSize: 15, color: "#d1d5db", marginBottom: 28, fontWeight: 500 },
  dots: { display: "flex", gap: 18, marginBottom: 12, transition: "transform .1s" },
  dot: { width: 16, height: 16, borderRadius: "50%", border: "2px solid #374151", background: "transparent", transition: "all .2s" },
  dotOn: { background: "linear-gradient(135deg, #c084fc, #818cf8)", border: "2px solid #c084fc", boxShadow: "0 0 12px #c084fc88", transform: "scale(1.2)" },
  err: { color: "#f87171", fontSize: 13, marginBottom: 12, textAlign: "center" },
  grid: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, width: "100%", maxWidth: 260, marginTop: 20 },
  key: { aspectRatio: "1", borderRadius: "50%", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", color: "#f3f4f6", fontSize: 22, fontWeight: 600, cursor: "pointer", backdropFilter: "blur(10px)", transition: "all .15s" },
  out: { marginTop: 36, background: "none", border: "none", color: "#6b7280", fontSize: 14, cursor: "pointer" },
};

// ── APP ───────────────────────────────────────────────────────────────────────
export default function ZRQBank() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem("qb_session")); } catch { return null; } });
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinState, setPinState] = useState("idle");
  const [allUsers, setAllUsers] = useState([]);
  const [txList, setTxList] = useState([]);
  const [credits, setCredits] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [selUser, setSelUser] = useState(null);
  const [adminUserTx, setAdminUserTx] = useState([]);
  const [adminMenuUser, setAdminMenuUser] = useState(null);
  const [adminTab, setAdminTab] = useState("users");
  const [clicks, setClicks] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [clickAnim, setClickAnim] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [authPage, setAuthPage] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", fullname: "", birthdate: "" });
  const [authErr, setAuthErr] = useState("");
  const [tf, setTf] = useState({ to: "", amount: "", note: "" });
  const [tfErr, setTfErr] = useState("");
  const [cr, setCr] = useState({ amount: "", months: "12" });
  const [crErr, setCrErr] = useState("");
  const [dep, setDep] = useState({ amount: "", months: "6" });
  const [depErr, setDepErr] = useState("");
  const [adminGive, setAdminGive] = useState({ username: "", amount: "" });
  const [balHidden, setBalHidden] = useState(false);

  const toast = (msg, type = "ok") => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 3500); };
  const loadUser = useCallback(async (u) => { try { const [r] = await sb(`users?username=eq.${u}&select=*`); if (r) setUser(r); return r; } catch {} }, []);

  useEffect(() => {
    if (!session?.username || pinState !== "done") return;
    const tick = () => sb(`users?username=eq.${session.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date().toISOString() }) }).catch(() => {});
    tick();
    const iv = setInterval(tick, 30000);
    return () => clearInterval(iv);
  }, [session, pinState]);

  useEffect(() => {
    if (session?.username) loadUser(session.username).then(() => setPinState(localStorage.getItem(`pin_${session.username}`) ? "check" : "set"));
  }, [session, loadUser]);

  useEffect(() => {
    const fn = () => { if (document.hidden && session?.username && pinState === "done") setPinState("check"); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [session, pinState]);

  const nav = (p) => { setPage(p); setDrawerOpen(false); };

  useEffect(() => {
    if (!user || pinState !== "done") return;
    if (page === "home") loadTx(user.username, 5);
    if (page === "statement") loadTx(user.username, 100);
    if (page === "credit") loadCr();
    if (page === "deposit") loadDep();
    if (page === "admin") loadUsers();
  }, [page, user, pinState]);

  useEffect(() => { if (page !== "admin") return; const iv = setInterval(loadUsers, 30000); return () => clearInterval(iv); }, [page]);

  const loadTx = async (u, l = 50) => { try { setTxList(await sb(`transactions?username=eq.${u}&order=created_at.desc&limit=${l}`)); } catch {} };
  const loadCr = async () => { try { setCredits(await sb(`credits?username=eq.${user.username}&active=eq.true&order=created_at.desc`)); } catch {} };
  const loadDep = async () => { try { setDeposits(await sb(`deposits?username=eq.${user.username}&active=eq.true&order=created_at.desc`)); } catch {} };
  const loadUsers = async () => { try { setAllUsers(await sb("users?select=*&order=created_at.desc")); } catch {} };

  // AUTH
  const doRegister = async () => {
    const { username, password, fullname, birthdate } = authForm;
    if (!username || !password || !fullname || !birthdate) return setAuthErr("Заполните все поля");
    if (password.length < 4) return setAuthErr("Пароль минимум 4 символа");
    setLoading(true);
    try {
      if ((await sb(`users?username=eq.${username}&select=id`)).length) { setLoading(false); return setAuthErr("Логин занят"); }
      const bonus = Math.floor(Math.random() * 40001) + 10000;
      const card = "4" + Array(15).fill(0).map(() => Math.floor(Math.random()*10)).join("");
      await sb("users", { method: "POST", body: JSON.stringify({ username, password, fullname, birthdate, balance: bonus, card_number: card, is_admin: username === ADMIN_USERNAME, is_blocked: false, last_seen: new Date().toISOString() }) });
      await sb("transactions", { method: "POST", body: JSON.stringify({ id: genId(), username, type: "bonus", amount: bonus, description: "🎉 Приветственный бонус", date: nowStr() }) });
      setLoading(false); setAuthErr(""); toast(`Добро пожаловать! Бонус ${fmt(bonus)} 🎉`); setAuthPage("login");
    } catch (e) { setLoading(false); setAuthErr(e.message); }
  };

  const doLogin = async () => {
    const { username, password } = authForm;
    if (!username || !password) return setAuthErr("Введите логин и пароль");
    setLoading(true);
    try {
      const [u] = await sb(`users?username=eq.${username}&select=*`);
      if (!u) { setLoading(false); return setAuthErr("Пользователь не найден"); }
      if (u.password !== password) { setLoading(false); return setAuthErr("Неверный пароль"); }
      if (u.is_blocked) { setLoading(false); return setAuthErr("🚫 Аккаунт заблокирован"); }
      await sb(`users?username=eq.${username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date().toISOString() }) });
      const today = new Date(); const bday = new Date(u.birthdate);
      if (bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth() && localStorage.getItem(`bday_${username}`) !== today.toDateString()) {
        const bb = Math.floor(Math.random() * 40001) + 10000;
        await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ balance: u.balance + bb }) });
        await sb("transactions", { method: "POST", body: JSON.stringify({ id: genId(), username, type: "bonus", amount: bb, description: "🎂 С Днём рождения!", date: nowStr() }) });
        localStorage.setItem(`bday_${username}`, today.toDateString()); u.balance += bb; toast(`🎂 С Днём рождения! +${fmt(bb)}`);
      }
      localStorage.setItem("qb_session", JSON.stringify({ username: u.username }));
      setSession({ username: u.username }); setUser(u); setPage("home"); setAuthErr(""); setLoading(false);
      setPinState(localStorage.getItem(`pin_${username}`) ? "check" : "set");
    } catch (e) { setLoading(false); setAuthErr(e.message); }
  };

  const doLogout = () => {
    if (session?.username) sb(`users?username=eq.${session.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date(0).toISOString() }) }).catch(() => {});
    localStorage.removeItem("qb_session");
    setSession(null); setUser(null); setPage("home"); setAuthForm({ username: "", password: "", fullname: "", birthdate: "" }); setDrawerOpen(false); setPinState("idle");
  };

  // EARN
  const doEarn = async () => {
    if (cooldown || !user) return;
    try {
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + 1 }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "earn", amount: 1, description: "💰 Клик-заработок", date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + 1 }));
      setClickAnim(true); setTimeout(() => setClickAnim(false), 200);
      setClicks(c => { const n = c + 1; if (n >= 100) { setCooldown(true); setTimeout(() => { setCooldown(false); setClicks(0); }, 30000); } return n; });
    } catch {}
  };

  // TRANSFER
  const doTransfer = async () => {
    const amt = parseFloat(tf.amount);
    if (!tf.to || !amt) return setTfErr("Заполните получателя и сумму");
    if (tf.to === user.username) return setTfErr("Нельзя переводить себе");
    if (amt <= 0 || amt > user.balance) return setTfErr(amt <= 0 ? "Сумма должна быть больше 0" : "Недостаточно средств");
    setLoading(true);
    try {
      const [r] = await sb(`users?username=eq.${tf.to}&select=*`);
      if (!r) { setLoading(false); return setTfErr("Получатель не найден"); }
      if (r.is_blocked) { setLoading(false); return setTfErr("Получатель заблокирован"); }
      const id = genId();
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance - amt }) });
      await sb(`users?username=eq.${tf.to}`, { method: "PATCH", body: JSON.stringify({ balance: r.balance + amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify([
        { id: id+"S", username: user.username, type: "out", amount: -amt, description: `↗ Перевод → ${r.fullname}${tf.note ? ": "+tf.note : ""}`, date: nowStr() },
        { id: id+"R", username: tf.to, type: "in", amount: amt, description: `↙ Перевод ← ${user.fullname}${tf.note ? ": "+tf.note : ""}`, date: nowStr() },
      ]) });
      setUser(u => ({ ...u, balance: u.balance - amt }));
      setTf({ to: "", amount: "", note: "" }); setTfErr(""); setLoading(false);
      toast(`Переведено ${fmt(amt)} → ${r.fullname}`); nav("home");
    } catch (e) { setLoading(false); setTfErr(e.message); }
  };

  // CREDIT
  const doCredit = async () => {
    const amt = parseFloat(cr.amount); const mo = parseInt(cr.months);
    if (!amt || amt <= 0) return setCrErr("Введите сумму");
    if (amt > 5000000) return setCrErr("Максимум 5 000 000 ₸");
    setLoading(true);
    try {
      if ((await sb(`credits?username=eq.${user.username}&active=eq.true`)).length) { setLoading(false); return setCrErr("У вас уже есть активный кредит"); }
      const rate = 0.18;
      const monthly = parseFloat((amt*(rate/12)/(1-Math.pow(1+rate/12,-mo))).toFixed(2));
      const id = genId();
      await sb("credits", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id, username: user.username, amount: amt, remaining: parseFloat((monthly*mo).toFixed(2)), monthly, months: mo, paid: 0, active: true, date: nowStr() }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "credit", amount: amt, description: `💳 Кредит на ${mo} мес.`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + amt }));
      setCr({ amount: "", months: "12" }); setCrErr(""); setLoading(false); toast(`Кредит одобрен! ${fmt(amt)}`); loadCr();
    } catch (e) { setLoading(false); setCrErr(e.message); }
  };

  const doPayCredit = async (c) => {
    const pay = Math.min(c.monthly, c.remaining);
    if (user.balance < pay) return toast("Недостаточно средств", "err");
    setLoading(true);
    try {
      const nr = parseFloat((c.remaining - pay).toFixed(2));
      await sb(`credits?id=eq.${c.id}`, { method: "PATCH", body: JSON.stringify({ remaining: nr, paid: c.paid+1, active: nr > 0 }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance - pay }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "out", amount: -pay, description: `💳 Оплата кредита #${c.id}`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance - pay }));
      setLoading(false); toast(`Оплачено ${fmt(pay)}`); loadCr();
    } catch (e) { setLoading(false); toast(e.message, "err"); }
  };

  // DEPOSIT
  const doDep = async () => {
    const amt = parseFloat(dep.amount); const mo = parseInt(dep.months);
    if (!amt || amt <= 0) return setDepErr("Введите сумму");
    if (amt < 1000) return setDepErr("Минимум 1 000 ₸");
    setLoading(true);
    try {
      const [fu] = await sb(`users?username=eq.${user.username}&select=balance`);
      if (amt > fu.balance) { setLoading(false); return setDepErr("Недостаточно средств"); }
      if ((await sb(`deposits?username=eq.${user.username}&active=eq.true`)).length >= 3) { setLoading(false); return setDepErr("Максимум 3 активных вклада"); }
      const rate = mo <= 3 ? 0.10 : mo <= 6 ? 0.12 : mo <= 12 ? 0.15 : 0.18;
      const profit = parseFloat((amt * rate * mo / 12).toFixed(2));
      const id = genId();
      await sb("deposits", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id, username: user.username, amount: amt, months: mo, rate: rate*100, profit, active: true, date: nowStr() }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: fu.balance - amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "out", amount: -amt, description: `🏦 Вклад на ${mo} мес.`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: fu.balance - amt }));
      setDep({ amount: "", months: "6" }); setDepErr(""); setLoading(false); toast(`Вклад открыт! Доход: +${fmt(profit)}`); loadDep();
    } catch (e) { setLoading(false); setDepErr(e.message); }
  };

  const doCloseDep = async (d) => {
    const daysHeld = (new Date() - parseDepDate(d.date)) / 86400000;
    const daysReq = d.months * 30;
    const early = daysHeld < daysReq;
    const total = early ? d.amount : d.amount + d.profit;
    setLoading(true);
    try {
      await sb(`deposits?id=eq.${d.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + total }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "in", amount: total, description: early ? `🏦 Досрочное закрытие #${d.id} (без процентов)` : `🏦 Закрытие вклада #${d.id} с процентами`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + total }));
      setLoading(false); toast(early ? `⚠️ Досрочно: ${fmt(d.amount)} без процентов` : `🎉 Получено ${fmt(total)}!`); loadDep();
    } catch (e) { setLoading(false); toast(e.message, "err"); }
  };

  // ADMIN
  const doAdminBalance = async (username, subtract, setExact) => {
    const amt = parseFloat(adminGive.amount);
    if (isNaN(amt) || amt < 0) return toast("Введите корректную сумму", "err");
    try {
      const [t] = await sb(`users?username=eq.${username}&select=*`);
      if (!t) return toast("Пользователь не найден", "err");
      const newBal = setExact ? amt : subtract ? Math.max(0, t.balance - amt) : t.balance + amt;
      await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ balance: newBal }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username, type: subtract ? "out" : "bonus", amount: setExact ? amt : subtract ? -amt : amt, description: `👑 ${setExact ? "Баланс установлен" : subtract ? "Списано" : "Начислено"} администратором`, date: nowStr() }) });
      toast(`✅ Готово: ${fmt(newBal)}`); setAdminGive({ username: "", amount: "" }); setAdminMenuUser(null); loadUsers();
    } catch (e) { toast(e.message, "err"); }
  };

  const doAdminReset = async (username) => {
    try {
      await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ balance: 0 }) });
      await sb(`credits?username=eq.${username}&active=eq.true`, { method: "PATCH", body: JSON.stringify({ active: false }) });
      await sb(`deposits?username=eq.${username}&active=eq.true`, { method: "PATCH", body: JSON.stringify({ active: false }) });
      await sb(`transactions?username=eq.${username}`, { method: "DELETE", prefer: "return=minimal" });
      toast(`🔴 @${username} сброшен`); setAdminMenuUser(null); loadUsers();
    } catch (e) { toast(e.message, "err"); }
  };

  const doAdminBlock = async (username, block) => {
    try { await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ is_blocked: block }) }); toast(block ? `🚫 @${username} заблокирован` : `✅ @${username} разблокирован`); setAdminMenuUser(null); loadUsers(); }
    catch (e) { toast(e.message, "err"); }
  };

  const doAdminCloseDeps = async (username) => {
    try { await sb(`deposits?username=eq.${username}&active=eq.true`, { method: "PATCH", body: JSON.stringify({ active: false }) }); toast(`🏦 Вклады @${username} закрыты`); setAdminMenuUser(null); loadUsers(); }
    catch (e) { toast(e.message, "err"); }
  };

  const doAdminCloseCreds = async (username) => {
    try { await sb(`credits?username=eq.${username}&active=eq.true`, { method: "PATCH", body: JSON.stringify({ active: false, remaining: 0 }) }); toast(`💳 Кредиты @${username} закрыты`); setAdminMenuUser(null); loadUsers(); }
    catch (e) { toast(e.message, "err"); }
  };

  const doAdminClearHistory = async (username) => {
    try { await sb(`transactions?username=eq.${username}`, { method: "DELETE", prefer: "return=minimal" }); toast(`📋 История @${username} очищена`); setAdminMenuUser(null); }
    catch (e) { toast(e.message, "err"); }
  };

  const doAdminResetPin = (username) => { localStorage.removeItem(`pin_${username}`); toast(`🔑 PIN @${username} сброшен`); setAdminMenuUser(null); };

  const viewUserTx = async (username) => { const txs = await sb(`transactions?username=eq.${username}&order=created_at.desc&limit=30`); setAdminUserTx(txs); setSelUser(username); setAdminMenuUser(null); };

  const handleQRScan = (v) => { setShowScanner(false); if (v.startsWith("qazaqbank://transfer/")) { const u = v.replace("qazaqbank://transfer/", ""); setTf(f => ({ ...f, to: u })); nav("transfer"); toast(`QR: @${u}`); } };

  const isAdmin = user?.is_admin || user?.username === ADMIN_USERNAME;

  // ── AUTH SCREEN ───────────────────────────────────────────────────────────
  if (!session || !user) return (
    <div style={A.root}>
      <div style={A.bg1} /><div style={A.bg2} /><div style={A.bg3} />
      {notif && <Toast n={notif} />}
      <div style={A.card}>
        <div style={A.logoWrap}>
          <div style={A.logoIcon}>⛁</div>
          <div style={A.logoText}>QAZAQ<b>BANK</b></div>
        </div>
        <p style={A.tag}>Виртуальный банк нового поколения</p>
        <div style={A.tabs}>
          <button style={{ ...A.tab, ...(authPage==="login" ? A.tabOn : {}) }} onClick={() => { setAuthPage("login"); setAuthErr(""); }}>Войти</button>
          <button style={{ ...A.tab, ...(authPage==="register" ? A.tabOn : {}) }} onClick={() => { setAuthPage("register"); setAuthErr(""); }}>Регистрация</button>
        </div>
        {authPage === "register" && <>
          <Inp placeholder="Полное имя" value={authForm.fullname} onChange={v => setAuthForm({...authForm, fullname: v})} />
          <Inp type="date" placeholder="Дата рождения" value={authForm.birthdate} onChange={v => setAuthForm({...authForm, birthdate: v})} />
        </>}
        <Inp placeholder="Логин" value={authForm.username} onChange={v => setAuthForm({...authForm, username: v})} />
        <Inp type="password" placeholder="Пароль" value={authForm.password} onChange={v => setAuthForm({...authForm, password: v})} onEnter={authPage==="login" ? doLogin : doRegister} />
        {authErr && <p style={A.err}>{authErr}</p>}
        <button style={A.btn} onClick={authPage==="login" ? doLogin : doRegister} disabled={loading}>
          {loading ? <span style={A.spinner}>⟳</span> : authPage==="login" ? "Войти в банк" : "Создать аккаунт"}
        </button>
      </div>
    </div>
  );

  if (pinState === "set") return <PinScreen mode="set" username={session.username} onSuccess={() => setPinState("done")} onCancel={doLogout} />;
  if (pinState === "check") return <PinScreen mode="check" username={session.username} onSuccess={() => setPinState("done")} onCancel={doLogout} />;

  const qrVal = `qazaqbank://transfer/${user.username}`;
  const tabs = [["home","🏠","Главная"],["transfer","↗️","Перевод"],["statement","📋","Выписка"],["credit","💳","Кредит"],["deposit","🏦","Вклад"]];

  return (
    <div style={S.root}>
      <div style={S.purpleGlow} /><div style={S.blueGlow} />
      {notif && <Toast n={notif} />}
      {loading && <div style={S.loadBar} />}
      {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      {/* ── DRAWER ── */}
      {drawerOpen && (
        <div style={M.overlay} onClick={() => setDrawerOpen(false)}>
          <div style={M.sheet} onClick={e => e.stopPropagation()}>
            <div style={M.sheetHandle} />
            <div style={M.userRow}>
              <div style={{ ...M.ava, background: isAdmin ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}>{user.fullname[0]}</div>
              <div>
                <div style={M.uname}>{user.fullname} {isAdmin && <span style={M.adminPill}>ADMIN</span>}</div>
                <div style={M.ulogin}>@{user.username}</div>
                <div style={M.ubal}>{fmt(user.balance)}</div>
              </div>
            </div>
            <div style={M.divider} />
            {[
              [() => { setShowQR(true); setDrawerOpen(false); }, "📱", "Мой QR-код"],
              [() => nav("cards"), "💠", "Мои карты"],
              ...(isAdmin ? [[() => nav("admin"), "👑", "Админ панель"]] : []),
              [() => { setPinState("set"); setDrawerOpen(false); }, "🔐", "Изменить PIN"],
            ].map(([fn, icon, label], i) => (
              <button key={i} style={M.item} onClick={fn}><span style={{ fontSize: 20 }}>{icon}</span> {label}</button>
            ))}
            <div style={M.divider} />
            <button style={M.logout} onClick={doLogout}>⎋ Выйти из аккаунта</button>
          </div>
        </div>
      )}

      {/* ── QR MODAL ── */}
      {showQR && (
        <div style={M.overlay} onClick={() => setShowQR(false)}>
          <div style={M.sheet} onClick={e => e.stopPropagation()}>
            <div style={M.sheetHandle} />
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16, paddingBottom: 16 }}>
              <span style={M.sheetTitle}>📱 Мой QR-код</span>
              <QRCode value={qrVal} size={220} />
              <div style={{ color: "#c084fc", fontWeight: 700, fontSize: 18 }}>@{user.username}</div>
              <div style={{ color: "#6b7280", fontSize: 13, textAlign: "center" }}>Попроси друга отсканировать для перевода</div>
            </div>
          </div>
        </div>
      )}

      {/* ── TOP BAR ── */}
      <div style={S.topBar}>
        <div style={S.brand}>⛁ QAZAQBANK</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.iconBtn} onClick={() => setShowScanner(true)}>📷</button>
          <button style={S.menuBtn} onClick={() => setDrawerOpen(true)}>
            <div style={S.bun} /><div style={S.bun} /><div style={S.bun} />
          </button>
        </div>
      </div>

      {/* ── PAGES ── */}
      <div style={S.body}>

        {/* HOME */}
        {page === "home" && (
          <div>
            <div style={S.greeting}>
              <div>
                <div style={S.greetSub}>Добро пожаловать 👋</div>
                <div style={S.greetName}>{user.fullname.split(" ")[0]}</div>
              </div>
              <button style={S.eyeBtn} onClick={() => setBalHidden(h => !h)}>{balHidden ? "👁️" : "🙈"}</button>
            </div>

            {/* Balance card */}
            <div style={S.balCard}>
              <div style={S.balCardGlow} />
              <div style={S.balTop}>
                <div>
                  <div style={S.balCardLabel}>Основной счёт</div>
                  <div style={S.balCardAmt}>{balHidden ? "••••••" : fmt(user.balance)}</div>
                </div>
                <div style={S.visaWrap}><span style={S.visaText}>VISA</span></div>
              </div>
              <div style={S.balCardBot}>
                <span style={S.cardNum}>**** **** **** {user.card_number?.slice(-4)}</span>
                <span style={S.cardExp}>12/29</span>
              </div>
            </div>

            {/* Quick actions */}
            <div style={S.qRow}>
              {[["transfer","↗️","Перевод"],["credit","💳","Кредит"],["deposit","🏦","Вклад"],["statement","📋","Выписка"]].map(([p,ic,lb]) => (
                <button key={p} style={S.qBtn} onClick={() => nav(p)}>
                  <div style={S.qIcon}>{ic}</div>
                  <div style={S.qLab}>{lb}</div>
                </button>
              ))}
            </div>

            {/* Earn */}
            <div style={S.earnCard}>
              <div style={S.earnGlow} />
              <div style={S.earnHeader}>
                <div>
                  <div style={S.earnTitle}>💰 Клик-заработок</div>
                  <div style={S.earnSub}>1 нажатие = 1 ₸</div>
                </div>
                <div style={S.earnProg}>
                  <div style={S.earnProgVal}>{clicks}</div>
                  <div style={S.earnProgMax}>/100</div>
                </div>
              </div>
              <div style={S.earnBarWrap}><div style={{ ...S.earnBar, width: `${clicks}%` }} /></div>
              <button style={{ ...S.earnBtn, ...(clickAnim ? { transform: "scale(0.95)" } : {}), ...(cooldown ? S.earnBtnOff : {}) }}
                onClick={doEarn} disabled={cooldown}>
                {cooldown ? "⏳ Перерыв 30 сек..." : "💰 НАЖМИ И ЗАРАБОТАЙ!"}
              </button>
            </div>

            {/* Recent tx */}
            <div style={S.section}>
              <div style={S.sectionTitle}>Последние операции</div>
              <div style={S.txList}>
                {txList.length === 0 && <p style={S.empty}>Операций нет</p>}
                {txList.slice(0,5).map(tx => <TxItem key={tx.id} tx={tx} />)}
              </div>
            </div>
          </div>
        )}

        {/* TRANSFER */}
        {page === "transfer" && (
          <div>
            <PageTitle icon="↗️" title="Перевод" />
            <div style={S.formCard}>
              <Label>Получатель</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <Inp2 placeholder="логин получателя" value={tf.to} onChange={v => setTf({...tf, to: v})} flex />
                <button style={S.qrSmall} onClick={() => setShowScanner(true)}>📷</button>
              </div>
              <Label>Сумма (₸)</Label>
              <Inp2 type="number" placeholder="0.00" value={tf.amount} onChange={v => setTf({...tf, amount: v})} />
              <Label>Примечание</Label>
              <Inp2 placeholder="За ужин, за игру..." value={tf.note} onChange={v => setTf({...tf, note: v})} />
              {tfErr && <ErrMsg>{tfErr}</ErrMsg>}
              <div style={S.balHint}>Доступно: <b style={{ color: "#c084fc" }}>{fmt(user.balance)}</b></div>
              <PrimBtn onClick={doTransfer} loading={loading}>Отправить перевод</PrimBtn>
            </div>
          </div>
        )}

        {/* STATEMENT */}
        {page === "statement" && (
          <div>
            <PageTitle icon="📋" title="Выписка" />
            <div style={S.stmtMeta}>
              <span style={{ color: "#6b7280" }}>Операций: {txList.length}</span>
              <span style={{ color: "#c084fc", fontWeight: 700 }}>{fmt(user.balance)}</span>
            </div>
            <div style={S.txList}>
              {txList.length === 0 && <p style={S.empty}>Операций нет</p>}
              {txList.map(tx => <TxItem key={tx.id} tx={tx} full />)}
            </div>
          </div>
        )}

        {/* CREDIT */}
        {page === "credit" && (
          <div>
            <PageTitle icon="💳" title="Кредиты" />
            {credits.map(c => (
              <div key={c.id} style={S.debtCard}>
                <div style={S.debtGlow} />
                <div style={S.debtTop}>
                  <span style={S.debtId}>#{c.id}</span>
                  <span style={S.debtBadge}>Активный</span>
                </div>
                <div style={S.debtAmt}>{fmt(c.amount)}</div>
                <div style={S.debtRow}><span>Остаток</span><b style={{ color: "#f87171" }}>{fmt(c.remaining)}</b></div>
                <div style={S.debtRow}><span>Ежемесячно</span><b>{fmt(c.monthly)}</b></div>
                <div style={S.debtRow}><span>Срок</span><b>{c.months} мес. (оплачено {c.paid})</b></div>
                <div style={S.debtProg}><div style={{ ...S.debtProgBar, width: `${Math.min(100,(c.paid/c.months)*100)}%` }} /></div>
                <button style={S.debtBtn} onClick={() => doPayCredit(c)}>Погасить взнос • {fmt(Math.min(c.monthly, c.remaining))}</button>
              </div>
            ))}
            <div style={S.formCard}>
              <div style={S.formTitle}>Оформить кредит</div>
              <Label>Сумма (₸)</Label>
              <Inp2 type="number" placeholder="100 000" value={cr.amount} onChange={v => setCr({...cr, amount: v})} />
              <Label>Срок</Label>
              <Sel value={cr.months} onChange={v => setCr({...cr, months: v})} options={[6,12,24,36,60].map(m => [m, `${m} месяцев`])} />
              {cr.amount > 0 && <CalcBox>Ставка: <b>18%</b> • Платёж: <b>{fmt(parseFloat(cr.amount)*(0.18/12)/(1-Math.pow(1+0.18/12,-parseInt(cr.months))))}</b>/мес</CalcBox>}
              {crErr && <ErrMsg>{crErr}</ErrMsg>}
              <PrimBtn onClick={doCredit} loading={loading}>Оформить кредит</PrimBtn>
            </div>
          </div>
        )}

        {/* DEPOSIT */}
        {page === "deposit" && (
          <div>
            <PageTitle icon="🏦" title="Вклады" />
            {deposits.map(d => {
              const dh = (new Date() - parseDepDate(d.date)) / 86400000;
              const dr = d.months * 30;
              const ok = dh >= dr;
              return (
                <div key={d.id} style={S.savCard}>
                  <div style={S.savGlow} />
                  <div style={S.debtTop}>
                    <span style={S.debtId}>#{d.id}</span>
                    <span style={{ ...S.debtBadge, background: "#10b98122", color: "#10b981" }}>Активный</span>
                  </div>
                  <div style={{ ...S.debtAmt, color: "#10b981" }}>{fmt(d.amount)}</div>
                  <div style={S.debtRow}><span>Ставка</span><b style={{ color: "#10b981" }}>{d.rate}%</b></div>
                  <div style={S.debtRow}><span>Доход</span><b style={{ color: "#10b981" }}>+{fmt(d.profit)}</b></div>
                  <div style={S.debtRow}><span>{ok ? "✅ Готов к закрытию" : `⏳ Осталось ${Math.ceil(dr-dh)} дн.`}</span></div>
                  <div style={S.debtProg}><div style={{ ...S.debtProgBar, width: `${Math.min(100,(dh/dr)*100)}%`, background: "linear-gradient(90deg,#10b981,#34d399)" }} /></div>
                  <button style={{ ...S.debtBtn, background: ok ? "#10b98122" : "#6b728022", color: ok ? "#10b981" : "#9ca3af", borderColor: ok ? "#10b98144" : "#37415144" }} onClick={() => doCloseDep(d)}>
                    {ok ? `✅ Закрыть +${fmt(d.profit)}` : `⚠️ Досрочно (без процентов)`}
                  </button>
                </div>
              );
            })}
            <div style={S.formCard}>
              <div style={S.formTitle}>Открыть вклад</div>
              <Label>Сумма (₸)</Label>
              <Inp2 type="number" placeholder="10 000" value={dep.amount} onChange={v => setDep({...dep, amount: v})} />
              <Label>Срок</Label>
              <Sel value={dep.months} onChange={v => setDep({...dep, months: v})} options={[["3","3 мес. — 10%"],["6","6 мес. — 12%"],["12","12 мес. — 15%"],["24","24 мес. — 18%"]]} />
              {dep.amount > 0 && <CalcBox>Доход: <b style={{ color: "#10b981" }}>+{fmt(parseFloat(dep.amount||0)*(dep.months<=3?0.10:dep.months<=6?0.12:dep.months<=12?0.15:0.18)*parseInt(dep.months)/12)}</b></CalcBox>}
              <div style={S.balHint}>Доступно: <b style={{ color: "#c084fc" }}>{fmt(user.balance)}</b></div>
              {depErr && <ErrMsg>{depErr}</ErrMsg>}
              <PrimBtn onClick={doDep} loading={loading} green>Открыть вклад</PrimBtn>
            </div>
          </div>
        )}

        {/* CARDS */}
        {page === "cards" && (
          <div>
            <PageTitle icon="💠" title="Мои карты" />
            <div style={S.card3d}>
              <div style={S.card3dGlow} />
              <div style={S.chipRow}><div style={S.chip} /></div>
              <div style={S.cardNumBig}>{user.card_number?.match(/.{1,4}/g)?.join("  ")}</div>
              <div style={S.cardBot}>
                <div>
                  <div style={S.cardMiniLabel}>Владелец</div>
                  <div style={S.cardMiniVal}>{user.fullname.toUpperCase()}</div>
                </div>
                <div>
                  <div style={S.cardMiniLabel}>Срок</div>
                  <div style={S.cardMiniVal}>12/29</div>
                </div>
                <div style={S.cardVisaBig}>VISA</div>
              </div>
            </div>
            <div style={S.formCard}>
              {[["Номер",user.card_number?.match(/.{1,4}/g)?.join(" ")],["CVV","•••"],["Срок","12/29"],["Статус","✅ Активна"],["Тип","VISA Virtual"]].map(([k,v]) => (
                <div key={k} style={S.infoRow}><span style={S.infoKey}>{k}</span><span style={S.infoVal}>{v}</span></div>
              ))}
            </div>
          </div>
        )}

        {/* ADMIN */}
        {page === "admin" && isAdmin && (
          <div>
            <PageTitle icon="👑" title="Админ панель" />
            <div style={S.tabRow}>
              <button style={{ ...S.tabBtn, ...(adminTab==="users"?S.tabOn:{}) }} onClick={() => setAdminTab("users")}>👥 Пользователи</button>
              <button style={{ ...S.tabBtn, ...(adminTab==="actions"?S.tabOn:{}) }} onClick={() => setAdminTab("actions")}>⚙️ Действия</button>
            </div>

            {adminTab === "actions" && (
              <div style={S.formCard}>
                <div style={S.formTitle}>Управление балансом</div>
                <Label>Логин</Label>
                <Inp2 placeholder="username" value={adminGive.username} onChange={v => setAdminGive({...adminGive, username: v})} />
                <Label>Сумма (₸)</Label>
                <Inp2 type="number" placeholder="0" value={adminGive.amount} onChange={v => setAdminGive({...adminGive, amount: v})} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                  {[["➕ Начислить","#8b5cf6",false,false],["➖ Списать","#ef4444",true,false],["🎯 Установить","#3b82f6",false,true]].map(([lb,cl,sub,ex]) => (
                    <button key={lb} style={{ ...S.adminActBtn, background: cl+"22", color: cl, border: `1px solid ${cl}44` }} onClick={() => doAdminBalance(adminGive.username,sub,ex)}>{lb}</button>
                  ))}
                </div>
                <div style={S.divider} />
                <div style={S.formTitle}>Управление аккаунтом</div>
                <Label>Логин для действий</Label>
                <Inp2 placeholder="username" value={adminGive.username} onChange={v => setAdminGive({...adminGive, username: v})} />
                <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
                  {[
                    ["🔴 Сбросить",() => doAdminReset(adminGive.username),"#ef4444"],
                    ["🏦 Закрыть вклады",() => doAdminCloseDeps(adminGive.username),"#f59e0b"],
                    ["💳 Закрыть кредиты",() => doAdminCloseCreds(adminGive.username),"#f97316"],
                    ["📋 Очистить историю",() => doAdminClearHistory(adminGive.username),"#3b82f6"],
                    ["🚫 Заблокировать",() => doAdminBlock(adminGive.username,true),"#ef4444"],
                    ["✅ Разблокировать",() => doAdminBlock(adminGive.username,false),"#10b981"],
                    ["🔑 Сбросить PIN",() => doAdminResetPin(adminGive.username),"#8b5cf6"],
                  ].map(([lb,fn,cl]) => (
                    <button key={lb} style={{ ...S.adminActBtn, background: cl+"22", color: cl, border: `1px solid ${cl}44` }} onClick={fn}>{lb}</button>
                  ))}
                </div>
              </div>
            )}

            {adminTab === "users" && (
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <span style={{ color: "#9ca3af", fontSize: 14 }}>Всего: {allUsers.length}</span>
                  <button style={{ background: "none", border: "none", color: "#c084fc", fontSize: 13, cursor: "pointer" }} onClick={loadUsers}>🔄 Обновить</button>
                </div>
                <div style={S.userList}>
                  {allUsers.map(u => {
                    const on = isOnline(u.last_seen);
                    return (
                      <div key={u.username} style={S.userRow}>
                        <div style={{ position: "relative", flexShrink: 0 }}>
                          <div style={{ ...S.uAva, background: u.is_admin ? "linear-gradient(135deg,#f59e0b,#ef4444)" : u.is_blocked ? "#374151" : "linear-gradient(135deg,#8b5cf6,#3b82f6)" }}>{u.fullname[0]}</div>
                          <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: u.is_blocked ? "#6b7280" : on ? "#10b981" : "#ef4444", border: "2px solid #111827" }} />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                          <div style={S.uName}>{u.fullname} {u.is_admin && <span style={S.adminPill2}>ADMIN</span>} {u.is_blocked && <span style={{ ...S.adminPill2, background: "#6b728022", color: "#9ca3af" }}>БЛОК</span>}</div>
                          <div style={S.uMeta}>@{u.username} · <span style={{ color: u.is_blocked ? "#6b7280" : on ? "#10b981" : "#ef4444" }}>{u.is_blocked ? "заблокирован" : on ? "онлайн" : "офлайн"}</span></div>
                        </div>
                        <div style={S.uBal}>{fmt(u.balance)}</div>
                        <button style={S.dotsBtn} onClick={() => setAdminMenuUser(adminMenuUser===u.username?null:u.username)}>⋮</button>
                        {adminMenuUser === u.username && (
                          <div style={S.drop}>
                            {[
                              ["✏️ Выбрать",() => { setAdminGive(g=>({...g,username:u.username})); setAdminMenuUser(null); setAdminTab("actions"); },"#e5e7eb"],
                              ["📋 История",() => viewUserTx(u.username),"#e5e7eb"],
                              ["➕ Начислить",() => { setAdminGive({username:u.username,amount:adminGive.amount}); doAdminBalance(u.username,false,false); },"#c084fc"],
                              ["➖ Списать",() => { setAdminGive({username:u.username,amount:adminGive.amount}); doAdminBalance(u.username,true,false); },"#f87171"],
                              ["🏦 Закрыть вклады",() => doAdminCloseDeps(u.username),"#fbbf24"],
                              ["💳 Закрыть кредиты",() => doAdminCloseCreds(u.username),"#fb923c"],
                              ["📋 Очистить историю",() => doAdminClearHistory(u.username),"#60a5fa"],
                              ["🔴 Полный сброс",() => doAdminReset(u.username),"#f87171"],
                              u.is_blocked ? ["✅ Разблокировать",() => doAdminBlock(u.username,false),"#34d399"] : ["🚫 Заблокировать",() => doAdminBlock(u.username,true),"#f87171"],
                              ["🔑 Сбросить PIN",() => doAdminResetPin(u.username),"#a78bfa"],
                            ].map(([lb,fn,cl]) => (
                              <button key={lb} style={{ ...S.dropItem, color: cl }} onClick={fn}>{lb}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}

        <div style={{ height: 96 }} />
      </div>

      {/* ── BOTTOM NAV ── */}
      <div style={S.nav}>
        {tabs.map(([p,ic,lb]) => (
          <button key={p} style={{ ...S.navBtn, ...(page===p?S.navBtnOn:{}) }} onClick={() => nav(p)}>
            <span style={S.navIc}>{ic}</span>
            <span style={{ ...S.navLb, color: page===p?"#c084fc":"#4b5563" }}>{lb}</span>
          </button>
        ))}
      </div>

      {/* USER TX MODAL */}
      {selUser && (
        <div style={M.overlay}>
          <div style={M.sheet}>
            <div style={M.sheetHandle} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <span style={M.sheetTitle}>История @{selUser}</span>
              <button style={M.closeBtn} onClick={() => setSelUser(null)}>✕</button>
            </div>
            <div style={{ maxHeight: "55vh", overflowY: "auto" }}>
              {adminUserTx.map(tx => <TxItem key={tx.id} tx={tx} full />)}
              {!adminUserTx.length && <p style={S.empty}>Нет операций</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── MICRO COMPONENTS ──────────────────────────────────────────────────────────
function Toast({ n }) { return <div style={{ position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 24px", borderRadius: 50, background: n.type === "err" ? "linear-gradient(135deg,#dc2626,#ef4444)" : "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 8px 32px #0008", whiteSpace: "nowrap", backdropFilter: "blur(10px)" }}>{n.msg}</div>; }
function Inp({ type="text", placeholder, value, onChange, onEnter }) { return <input style={A.inp} type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} onKeyDown={e=>e.key==="Enter"&&onEnter&&onEnter()} />; }
function Inp2({ type="text", placeholder, value, onChange, flex }) { return <input style={{ ...S.inp2, ...(flex?{flex:1}:{}) }} type={type} placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} />; }
function Sel({ value, onChange, options }) { return <select style={S.sel} value={value} onChange={e=>onChange(e.target.value)}>{options.map(([v,l])=><option key={v} value={v}>{l}</option>)}</select>; }
function Label({ children }) { return <div style={S.label}>{children}</div>; }
function ErrMsg({ children }) { return <p style={{ color: "#f87171", fontSize: 13, margin: "6px 0" }}>{children}</p>; }
function CalcBox({ children }) { return <div style={S.calcBox}>{children}</div>; }
function PrimBtn({ children, onClick, loading, green }) { return <button style={{ ...S.primBtn, ...(green ? S.primBtnGreen : {}) }} onClick={onClick} disabled={loading}>{loading ? "⟳" : children}</button>; }
function PageTitle({ icon, title }) { return <div style={S.pageTitle}><span>{icon}</span> {title}</div>; }
function TxItem({ tx, full }) {
  const pos = tx.amount > 0;
  return (
    <div style={S.txItem}>
      <div style={{ ...S.txDot, background: pos ? "#10b98122" : "#ef444422", color: pos ? "#10b981" : "#ef4444" }}>{pos ? "↙" : "↗"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={S.txDesc}>{tx.description}</div>
        <div style={S.txDate}>{full && `#${tx.id} · `}{tx.date}</div>
      </div>
      <div style={{ ...S.txAmt, color: pos ? "#10b981" : "#ef4444" }}>{pos?"+":""}{new Intl.NumberFormat("kk-KZ",{minimumFractionDigits:2}).format(Math.abs(tx.amount))} ₸</div>
    </div>
  );
}

// ── STYLES ────────────────────────────────────────────────────────────────────
const A = {
  root: { minHeight: "100vh", background: "#0d0118", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden", fontFamily: "'Segoe UI',system-ui,sans-serif", color: "#f3f4f6" },
  bg1: { position: "absolute", width: 500, height: 500, borderRadius: "50%", background: "radial-gradient(circle,#7c3aed33,transparent 70%)", top: "-100px", left: "-100px" },
  bg2: { position: "absolute", width: 400, height: 400, borderRadius: "50%", background: "radial-gradient(circle,#3b82f633,transparent 70%)", bottom: "-100px", right: "-100px" },
  bg3: { position: "absolute", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,#ec489933,transparent 70%)", top: "40%", right: "10%" },
  card: { position: "relative", background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 28, padding: "40px 28px", width: "100%", maxWidth: 400, backdropFilter: "blur(20px)", boxShadow: "0 25px 80px #0009" },
  logoWrap: { display: "flex", alignItems: "center", gap: 12, marginBottom: 6 },
  logoIcon: { fontSize: 36, filter: "drop-shadow(0 0 16px #a855f7)" },
  logoText: { fontSize: 22, letterSpacing: 3, background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  tag: { color: "#6b7280", fontSize: 13, marginBottom: 28 },
  tabs: { display: "flex", background: "rgba(255,255,255,0.05)", borderRadius: 14, padding: 4, marginBottom: 24, gap: 4 },
  tab: { flex: 1, padding: "10px", borderRadius: 10, border: "none", background: "transparent", color: "#6b7280", fontSize: 14, fontWeight: 600, cursor: "pointer" },
  tabOn: { background: "linear-gradient(135deg,#7c3aed,#3b82f6)", color: "#fff", boxShadow: "0 4px 12px #7c3aed44" },
  inp: { width: "100%", padding: "14px 16px", background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 14, color: "#f3f4f6", fontSize: 15, marginBottom: 12, boxSizing: "border-box", outline: "none", backdropFilter: "blur(10px)" },
  err: { color: "#f87171", fontSize: 13, margin: "0 0 12px" },
  btn: { width: "100%", padding: 15, background: "linear-gradient(135deg,#7c3aed,#3b82f6)", border: "none", borderRadius: 14, color: "#fff", fontSize: 16, fontWeight: 700, cursor: "pointer", marginTop: 8, boxShadow: "0 8px 24px #7c3aed44" },
  spinner: { display: "inline-block", animation: "spin 1s linear infinite" },
};

const M = {
  overlay: { position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end", backdropFilter: "blur(4px)" },
  sheet: { background: "linear-gradient(180deg,#1a0533,#0d0118)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: "24px 24px 0 0", padding: "16px 24px 40px", width: "100%", maxHeight: "85vh", overflowY: "auto" },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, background: "rgba(255,255,255,0.2)", margin: "0 auto 20px" },
  sheetTitle: { fontSize: 17, fontWeight: 700, color: "#f3f4f6" },
  closeBtn: { background: "none", border: "none", color: "#6b7280", fontSize: 20, cursor: "pointer" },
  userRow: { display: "flex", gap: 14, alignItems: "center", marginBottom: 12 },
  ava: { width: 52, height: 52, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 22, color: "#fff", flexShrink: 0, boxShadow: "0 4px 16px #0006" },
  uname: { fontSize: 15, fontWeight: 700, color: "#f3f4f6" },
  ulogin: { fontSize: 12, color: "#6b7280" },
  ubal: { fontSize: 16, fontWeight: 800, background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 4 },
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "12px 0" },
  item: { display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", border: "none", background: "transparent", color: "#d1d5db", fontSize: 15, cursor: "pointer", width: "100%" },
  logout: { display: "flex", alignItems: "center", gap: 12, padding: "13px 4px", border: "none", background: "transparent", color: "#f87171", fontSize: 15, cursor: "pointer", marginTop: "auto", width: "100%" },
  adminPill: { background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 7px", borderRadius: 20, marginLeft: 6, verticalAlign: "middle" },
};

const S = {
  root: { minHeight: "100vh", background: "#0d0118", color: "#f3f4f6", fontFamily: "'Segoe UI',system-ui,sans-serif", maxWidth: 480, margin: "0 auto", position: "relative", overflow: "hidden" },
  purpleGlow: { position: "fixed", width: 300, height: 300, borderRadius: "50%", background: "radial-gradient(circle,#7c3aed22,transparent 70%)", top: 0, left: "-50px", pointerEvents: "none", zIndex: 0 },
  blueGlow: { position: "fixed", width: 250, height: 250, borderRadius: "50%", background: "radial-gradient(circle,#3b82f622,transparent 70%)", top: "30%", right: "-50px", pointerEvents: "none", zIndex: 0 },
  loadBar: { position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#7c3aed,#3b82f6,#ec4899)", zIndex: 9999, animation: "shimmer 1.5s infinite" },
  topBar: { position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(13,1,24,0.8)", borderBottom: "1px solid rgba(255,255,255,0.06)", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", zIndex: 100, boxSizing: "border-box", backdropFilter: "blur(20px)" },
  brand: { fontSize: 15, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  iconBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "7px 10px", cursor: "pointer", fontSize: 16 },
  menuBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", display: "flex", flexDirection: "column", gap: 4 },
  bun: { width: 20, height: 2, background: "#d1d5db", borderRadius: 2 },
  body: { paddingTop: 68, padding: "68px 16px 16px", position: "relative", zIndex: 1 },

  // Home
  greeting: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", margin: "8px 0 20px" },
  greetSub: { fontSize: 13, color: "#6b7280", marginBottom: 2 },
  greetName: { fontSize: 26, fontWeight: 900, background: "linear-gradient(135deg,#f3f4f6,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  eyeBtn: { background: "rgba(255,255,255,0.05)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 10, padding: "8px 10px", cursor: "pointer", fontSize: 16 },

  balCard: { position: "relative", background: "linear-gradient(135deg,#1e1b4b,#312e81,#1e3a5f)", borderRadius: 24, padding: "28px 24px", marginBottom: 20, overflow: "hidden", boxShadow: "0 20px 60px #7c3aed33" },
  balCardGlow: { position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,#c084fc22,transparent 70%)", top: -50, right: -50, pointerEvents: "none" },
  balTop: { display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 24 },
  balCardLabel: { fontSize: 11, color: "rgba(255,255,255,0.5)", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  balCardAmt: { fontSize: 34, fontWeight: 900, color: "#fff", textShadow: "0 2px 20px #c084fc44" },
  visaWrap: { background: "rgba(255,255,255,0.1)", borderRadius: 8, padding: "6px 12px", backdropFilter: "blur(10px)" },
  visaText: { fontSize: 16, fontStyle: "italic", fontWeight: 900, color: "#fff" },
  balCardBot: { display: "flex", justifyContent: "space-between" },
  cardNum: { fontSize: 14, fontFamily: "monospace", letterSpacing: 2, color: "rgba(255,255,255,0.7)" },
  cardExp: { fontSize: 13, color: "rgba(255,255,255,0.5)" },

  qRow: { display: "flex", gap: 10, marginBottom: 20 },
  qBtn: { flex: 1, background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer", transition: "all .2s" },
  qIcon: { fontSize: 22 },
  qLab: { fontSize: 11, color: "#9ca3af", fontWeight: 500 },

  earnCard: { position: "relative", background: "linear-gradient(135deg,#1f1229,#14213d)", border: "1px solid rgba(192,132,252,0.15)", borderRadius: 20, padding: 20, marginBottom: 20, overflow: "hidden" },
  earnGlow: { position: "absolute", width: 150, height: 150, borderRadius: "50%", background: "radial-gradient(circle,#7c3aed22,transparent 70%)", top: -30, right: -30, pointerEvents: "none" },
  earnHeader: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  earnTitle: { fontSize: 15, fontWeight: 700, color: "#e5e7eb" },
  earnSub: { fontSize: 12, color: "#6b7280", marginTop: 3 },
  earnProg: { display: "flex", alignItems: "baseline", gap: 2 },
  earnProgVal: { fontSize: 28, fontWeight: 900, background: "linear-gradient(135deg,#c084fc,#818cf8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  earnProgMax: { fontSize: 13, color: "#4b5563" },
  earnBarWrap: { height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, marginBottom: 14, overflow: "hidden" },
  earnBar: { height: "100%", background: "linear-gradient(90deg,#7c3aed,#c084fc)", borderRadius: 2, transition: "width .3s" },
  earnBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#c084fc)", border: "none", borderRadius: 14, fontSize: 15, fontWeight: 800, cursor: "pointer", color: "#fff", boxShadow: "0 4px 20px #7c3aed44", transition: "transform .1s" },
  earnBtnOff: { background: "rgba(255,255,255,0.05)", color: "#4b5563", cursor: "not-allowed", boxShadow: "none" },

  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 15, fontWeight: 700, color: "#9ca3af", marginBottom: 12 },
  txList: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, overflow: "hidden" },
  txItem: { display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  txDot: { width: 38, height: 38, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, flexShrink: 0 },
  txDesc: { fontSize: 14, color: "#d1d5db", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  txDate: { fontSize: 11, color: "#4b5563", marginTop: 2 },
  txAmt: { fontSize: 14, fontWeight: 700, flexShrink: 0 },
  empty: { color: "#4b5563", padding: "24px", textAlign: "center", margin: 0 },

  pageTitle: { fontSize: 22, fontWeight: 800, background: "linear-gradient(135deg,#f3f4f6,#c084fc)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginBottom: 20, marginTop: 4, display: "flex", alignItems: "center", gap: 10 },
  formCard: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)", borderRadius: 20, padding: 22, marginBottom: 16 },
  formTitle: { fontSize: 15, fontWeight: 700, color: "#c084fc", marginBottom: 16 },
  label: { fontSize: 11, color: "#6b7280", marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 1 },
  inp2: { width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#f3f4f6", fontSize: 15, boxSizing: "border-box", outline: "none", marginBottom: 4 },
  sel: { width: "100%", padding: "13px 16px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#f3f4f6", fontSize: 15, outline: "none" },
  calcBox: { background: "rgba(124,58,237,0.1)", border: "1px solid rgba(192,132,252,0.2)", borderRadius: 10, padding: "10px 14px", margin: "10px 0", fontSize: 14, color: "#a78bfa" },
  balHint: { fontSize: 13, color: "#6b7280", margin: "10px 0 4px" },
  primBtn: { width: "100%", padding: 14, background: "linear-gradient(135deg,#7c3aed,#3b82f6)", border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, cursor: "pointer", marginTop: 12, boxShadow: "0 4px 20px #7c3aed33" },
  primBtnGreen: { background: "linear-gradient(135deg,#059669,#10b981)", boxShadow: "0 4px 20px #10b98133" },
  stmtMeta: { display: "flex", justifyContent: "space-between", color: "#6b7280", fontSize: 13, marginBottom: 12 },
  qrSmall: { padding: "13px 14px", background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 12, color: "#f3f4f6", fontSize: 16, cursor: "pointer", flexShrink: 0 },

  debtCard: { position: "relative", background: "linear-gradient(135deg,#1f0a0a,#2d1515)", border: "1px solid rgba(248,113,113,0.15)", borderRadius: 20, padding: 20, marginBottom: 14, overflow: "hidden" },
  debtGlow: { position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,#ef444422,transparent 70%)", top: -20, right: -20, pointerEvents: "none" },
  debtTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  debtId: { fontSize: 11, color: "#6b7280", fontFamily: "monospace" },
  debtBadge: { fontSize: 11, background: "#ef444422", color: "#f87171", padding: "3px 10px", borderRadius: 20 },
  debtAmt: { fontSize: 26, fontWeight: 900, margin: "8px 0 12px", color: "#f3f4f6" },
  debtRow: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#9ca3af", marginBottom: 6 },
  debtProg: { height: 4, background: "rgba(255,255,255,0.05)", borderRadius: 2, margin: "12px 0", overflow: "hidden" },
  debtProgBar: { height: "100%", background: "linear-gradient(90deg,#ef4444,#f87171)", borderRadius: 2 },
  debtBtn: { width: "100%", padding: 12, background: "#ef444422", border: "1px solid #ef444444", borderRadius: 12, color: "#f87171", fontSize: 14, cursor: "pointer", marginTop: 4, fontWeight: 600 },

  savCard: { position: "relative", background: "linear-gradient(135deg,#052017,#053322)", border: "1px solid rgba(16,185,129,0.15)", borderRadius: 20, padding: 20, marginBottom: 14, overflow: "hidden" },
  savGlow: { position: "absolute", width: 120, height: 120, borderRadius: "50%", background: "radial-gradient(circle,#10b98122,transparent 70%)", top: -20, right: -20, pointerEvents: "none" },

  card3d: { position: "relative", background: "linear-gradient(135deg,#1e1b4b,#312e81,#0f172a)", borderRadius: 24, padding: "28px 24px", marginBottom: 20, overflow: "hidden", boxShadow: "0 20px 60px #0009, inset 0 1px 0 rgba(255,255,255,0.1)" },
  card3dGlow: { position: "absolute", width: 200, height: 200, borderRadius: "50%", background: "radial-gradient(circle,#c084fc22,transparent 70%)", top: -50, right: -50 },
  chipRow: { marginBottom: 24 },
  chip: { width: 42, height: 32, background: "linear-gradient(135deg,#fbbf24,#f59e0b)", borderRadius: 6, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" },
  cardNumBig: { fontSize: 19, fontFamily: "monospace", letterSpacing: 3, color: "#fff", marginBottom: 24, textShadow: "0 2px 10px #0006" },
  cardBot: { display: "flex", alignItems: "flex-end", gap: 24 },
  cardMiniLabel: { fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 },
  cardMiniVal: { fontSize: 13, color: "#fff", fontWeight: 600, marginTop: 2 },
  cardVisaBig: { marginLeft: "auto", fontSize: 22, fontStyle: "italic", fontWeight: 900, color: "#fff", textShadow: "0 2px 10px #0006" },
  infoRow: { display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: "1px solid rgba(255,255,255,0.04)" },
  infoKey: { color: "#6b7280", fontSize: 14 },
  infoVal: { color: "#f3f4f6", fontWeight: 600, fontSize: 14 },

  nav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "rgba(13,1,24,0.9)", borderTop: "1px solid rgba(255,255,255,0.06)", display: "flex", zIndex: 100, boxSizing: "border-box", backdropFilter: "blur(20px)", paddingBottom: "env(safe-area-inset-bottom)" },
  navBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 12px", background: "none", border: "none", cursor: "pointer" },
  navBtnOn: { borderTop: "2px solid #c084fc" },
  navIc: { fontSize: 20 },
  navLb: { fontSize: 10, fontWeight: 500 },

  tabRow: { display: "flex", gap: 8, marginBottom: 16 },
  tabBtn: { flex: 1, padding: "11px", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 12, color: "#6b7280", fontSize: 14, cursor: "pointer", fontWeight: 600 },
  tabOn: { background: "linear-gradient(135deg,#7c3aed22,#3b82f622)", border: "1px solid rgba(192,132,252,0.3)", color: "#c084fc" },
  adminActBtn: { flex: 1, minWidth: "30%", padding: "11px 8px", borderRadius: 10, fontSize: 13, cursor: "pointer", marginBottom: 8, fontWeight: 600 },
  divider: { height: 1, background: "rgba(255,255,255,0.06)", margin: "14px 0" },

  userList: { background: "rgba(255,255,255,0.02)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 20, overflow: "hidden" },
  userRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid rgba(255,255,255,0.04)", position: "relative" },
  uAva: { width: 40, height: 40, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 16, color: "#fff", flexShrink: 0 },
  uName: { fontSize: 14, fontWeight: 600, color: "#e5e7eb" },
  uMeta: { fontSize: 11, color: "#4b5563", marginTop: 2 },
  uBal: { fontSize: 13, fontWeight: 700, color: "#c084fc", flexShrink: 0 },
  adminPill2: { background: "linear-gradient(135deg,#f59e0b,#ef4444)", color: "#fff", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20, marginLeft: 4, verticalAlign: "middle" },
  dotsBtn: { background: "none", border: "none", color: "#4b5563", fontSize: 22, cursor: "pointer", padding: "0 4px", flexShrink: 0 },
  drop: { position: "absolute", right: 12, top: 52, background: "#1a0533", border: "1px solid rgba(255,255,255,0.1)", borderRadius: 16, zIndex: 10, minWidth: 200, overflow: "hidden", boxShadow: "0 20px 60px #000a", backdropFilter: "blur(20px)" },
  dropItem: { display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", fontSize: 14, cursor: "pointer", textAlign: "left", borderBottom: "1px solid rgba(255,255,255,0.04)" },
};
