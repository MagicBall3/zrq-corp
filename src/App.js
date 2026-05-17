import React, { useState, useEffect, useCallback, useRef } from "react";

// ─── Supabase ─────────────────────────────────────────────────────────────────
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
const isOnline = (lastSeen) => {
  if (!lastSeen) return false;
  return (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000;
};
// ─── QR Code Generator (pure JS, no library) ─────────────────────────────────
function QRCode({ value, size = 200 }) {
  const url = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=111827&color=00d68f&format=png`;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
      <img src={url} alt="QR" style={{ width: size, height: size, borderRadius: 12, border: "2px solid #00d68f33" }} />
    </div>
  );
}

// ─── QR Scanner ──────────────────────────────────────────────────────────────
function QRScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const [error, setError] = useState("");
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    let stream = null;
    const start = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play();
          setScanning(true);
        }
      } catch (e) {
        setError("Нет доступа к камере");
      }
    };
    start();
    return () => { if (stream) stream.getTracks().forEach(t => t.stop()); };
  }, []);

  // Use BarcodeDetector if available
  useEffect(() => {
    if (!scanning) return;
    if (!("BarcodeDetector" in window)) {
      setError("Сканер недоступен в этом браузере. Введите логин вручную.");
      return;
    }
    const detector = new window.BarcodeDetector({ formats: ["qr_code"] });
    const interval = setInterval(async () => {
      if (!videoRef.current) return;
      try {
        const barcodes = await detector.detect(videoRef.current);
        if (barcodes.length > 0) {
          const val = barcodes[0].rawValue;
          clearInterval(interval);
          onScan(val);
        }
      } catch (e) {}
    }, 500);
    return () => clearInterval(interval);
  }, [scanning, onScan]);

  return (
    <div style={SC.overlay}>
      <div style={SC.card}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
          <b style={{ color: "#e8eaf0", fontSize: 16 }}>📷 Сканировать QR</b>
          <button style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 22, cursor: "pointer" }} onClick={onClose}>✕</button>
        </div>
        {error ? (
          <p style={{ color: "#ff6b6b", textAlign: "center", fontSize: 14 }}>{error}</p>
        ) : (
          <video ref={videoRef} style={{ width: "100%", borderRadius: 12, background: "#000" }} muted playsInline />
        )}
        <p style={{ color: "#5a6a80", fontSize: 12, textAlign: "center", marginTop: 12 }}>Наведи камеру на QR-код пользователя</p>
      </div>
    </div>
  );
}

const SC = {
  overlay: { position: "fixed", inset: 0, background: "#000d", zIndex: 500, display: "flex", alignItems: "flex-end" },
  card: { background: "#111827", border: "1px solid #1f2d44", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "80vh" },
};

// ─── PIN Screen ───────────────────────────────────────────────────────────────
function PinScreen({ mode, onSuccess, onCancel, username }) {
  const [pin, setPin] = useState([]);
  const [confirmPin, setConfirmPin] = useState([]);
  const [step, setStep] = useState("enter");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const triggerShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };

  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const newPin = [...pin, d];
    setPin(newPin);
    setError("");
    if (newPin.length === 4) {
      setTimeout(() => {
        if (mode === "set") {
          if (step === "enter") { setConfirmPin(newPin); setStep("confirm"); setPin([]); }
          else {
            if (newPin.join("") === confirmPin.join("")) { localStorage.setItem(`pin_${username}`, newPin.join("")); onSuccess(); }
            else { setError("PIN не совпадает"); triggerShake(); setPin([]); setStep("enter"); setConfirmPin([]); }
          }
        } else {
          const saved = localStorage.getItem(`pin_${username}`);
          if (newPin.join("") === saved) onSuccess();
          else { setError("Неверный PIN"); triggerShake(); setPin([]); }
        }
      }, 150);
    }
  };

  const title = mode === "set" ? (step === "enter" ? "Создайте PIN-код" : "Повторите PIN-код") : "Введите PIN-код";

  return (
    <div style={PS.root}>
      <div style={PS.card}>
        <div style={PS.logo}>⛁</div>
        <div style={PS.title}>QAZAQBANK</div>
        {username && <div style={PS.subtitle}>@{username}</div>}
        <div style={PS.pinTitle}>{title}</div>
        <div style={{ ...PS.dots, ...(shake ? { animation: "none", transform: "translateX(0)" } : {}) }}>
          {[0,1,2,3].map(i => <div key={i} style={{ ...PS.dot, ...(i < pin.length ? PS.dotFilled : {}) }} />)}
        </div>
        {error && <div style={PS.error}>{error}</div>}
        <div style={PS.numpad}>
          {[1,2,3,4,5,6,7,8,9].map(d => <button key={d} style={PS.numBtn} onClick={() => handleDigit(d)}>{d}</button>)}
          <div style={PS.numBtn} />
          <button style={PS.numBtn} onClick={() => handleDigit(0)}>0</button>
          <button style={{ ...PS.numBtn, color: "#ff6b6b" }} onClick={() => setPin(p => p.slice(0, -1))}>⌫</button>
        </div>
        {onCancel && <button style={PS.cancelBtn} onClick={onCancel}>Выйти из аккаунта</button>}
      </div>
    </div>
  );
}

const PS = {
  root: { position: "fixed", inset: 0, background: "#0a0d14", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999 },
  card: { width: "100%", maxWidth: 360, padding: "40px 24px", display: "flex", flexDirection: "column", alignItems: "center" },
  logo: { fontSize: 48, marginBottom: 8 },
  title: { fontSize: 18, fontWeight: 800, letterSpacing: 3, color: "#00d68f", marginBottom: 4 },
  subtitle: { fontSize: 13, color: "#5a6a80", marginBottom: 32 },
  pinTitle: { fontSize: 16, color: "#c8d0dc", marginBottom: 28, fontWeight: 500 },
  dots: { display: "flex", gap: 20, marginBottom: 16 },
  dot: { width: 18, height: 18, borderRadius: "50%", border: "2px solid #2a3a4a", background: "transparent", transition: "all .15s" },
  dotFilled: { background: "#00d68f", border: "2px solid #00d68f", transform: "scale(1.1)" },
  error: { color: "#ff6b6b", fontSize: 13, marginBottom: 16, textAlign: "center" },
  numpad: { display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16, width: "100%", maxWidth: 280, marginTop: 16 },
  numBtn: { width: "100%", aspectRatio: "1", borderRadius: "50%", background: "#111827", border: "1px solid #1f2d44", color: "#e8eaf0", fontSize: 24, fontWeight: 600, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" },
  cancelBtn: { marginTop: 32, background: "none", border: "none", color: "#ff6b6b", fontSize: 14, cursor: "pointer" },
};

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [session, setSession] = useState(() => { try { return JSON.parse(localStorage.getItem("qb_session")); } catch { return null; } });
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [notification, setNotification] = useState(null);
  const [loading, setLoading] = useState(false);
  const [pinState, setPinState] = useState("idle");
  const [allUsers, setAllUsers] = useState([]);
  const [txList, setTxList] = useState([]);
  const [credits, setCredits] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [adminUserTx, setAdminUserTx] = useState([]);
  const [adminMenuUser, setAdminMenuUser] = useState(null);
  const [clickCount, setClickCount] = useState(0);
  const [earnCooldown, setEarnCooldown] = useState(false);
  const [clickAnim, setClickAnim] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [authPage, setAuthPage] = useState("login");
  const [authForm, setAuthForm] = useState({ username: "", password: "", fullname: "", birthdate: "" });
  const [authError, setAuthError] = useState("");
  const [tfForm, setTfForm] = useState({ to: "", amount: "", note: "" });
  const [tfError, setTfError] = useState("");
  const [crForm, setCrForm] = useState({ amount: "", months: "12" });
  const [crError, setCrError] = useState("");
  const [depForm, setDepForm] = useState({ amount: "", months: "6" });
  const [depError, setDepError] = useState("");
  const [adminGive, setAdminGive] = useState({ username: "", amount: "" });

  const notify = (msg, type = "success") => { setNotification({ msg, type }); setTimeout(() => setNotification(null), 3500); };

  const loadUser = useCallback(async (username) => {
    try { const [u] = await sb(`users?username=eq.${username}&select=*`); if (u) setUser(u); return u; }
    catch (e) { console.error(e); }
  }, []);

  // Update last_seen every 2 minutes
  useEffect(() => {
    if (!session?.username || pinState !== "done") return;
    const updateSeen = () => sb(`users?username=eq.${session.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date().toISOString() }) }).catch(() => {});
    updateSeen();
    const interval = setInterval(updateSeen, 30 * 1000);
    return () => clearInterval(interval);
  }, [session, pinState]);

  useEffect(() => {
    if (session?.username) {
      loadUser(session.username).then(() => {
        const hasPin = !!localStorage.getItem(`pin_${session.username}`);
        setPinState(hasPin ? "check" : "set");
      });
    }
  }, [session, loadUser]);

  useEffect(() => {
    const handleVisibility = () => {
      if (document.hidden && session?.username && pinState === "done") setPinState("check");
    };
    document.addEventListener("visibilitychange", handleVisibility);
    return () => document.removeEventListener("visibilitychange", handleVisibility);
  }, [session, pinState]);

  const navigate = (p) => { setPage(p); setDrawerOpen(false); };

  useEffect(() => {
    if (!user || pinState !== "done") return;
    if (page === "home") { loadTx(user.username, 5); }
    if (page === "statement") loadTx(user.username, 100);
    if (page === "credit") loadCredits();
    if (page === "deposit") loadDeposits();
    if (page === "admin") loadAllUsers();
  }, [page, user, pinState]);

  // Refresh admin users list every 30 seconds
  useEffect(() => {
    if (page !== "admin" || !user?.is_admin) return;
    const interval = setInterval(loadAllUsers, 30000);
    return () => clearInterval(interval);
  }, [page, user]);

  const loadTx = async (username, limit = 50) => {
    try { const txs = await sb(`transactions?username=eq.${username}&order=created_at.desc&limit=${limit}`); setTxList(txs); }
    catch (e) { console.error(e); }
  };
  const loadCredits = async () => {
    try { const cr = await sb(`credits?username=eq.${user.username}&active=eq.true&order=created_at.desc`); setCredits(cr); }
    catch (e) { console.error(e); }
  };
  const loadDeposits = async () => {
    try { const dep = await sb(`deposits?username=eq.${user.username}&active=eq.true&order=created_at.desc`); setDeposits(dep); }
    catch (e) { console.error(e); }
  };
  const loadAllUsers = async () => {
    try { const users = await sb("users?select=*&order=created_at.desc"); setAllUsers(users); }
    catch (e) { console.error(e); }
  };

  // ── AUTH ──────────────────────────────────────────────────────────────────
  const handleRegister = async () => {
    const { username, password, fullname, birthdate } = authForm;
    if (!username || !password || !fullname || !birthdate) return setAuthError("Заполните все поля");
    if (password.length < 4) return setAuthError("Пароль минимум 4 символа");
    setLoading(true);
    try {
      const exists = await sb(`users?username=eq.${username}&select=id`);
      if (exists.length > 0) { setLoading(false); return setAuthError("Логин занят"); }
      const bonus = Math.floor(Math.random() * 40001) + 10000;
      const cardNumber = "4" + Array(15).fill(0).map(() => Math.floor(Math.random() * 10)).join("");
      await sb("users", { method: "POST", body: JSON.stringify({ username, password, fullname, birthdate, balance: bonus, card_number: cardNumber, is_admin: username === ADMIN_USERNAME, last_seen: new Date().toISOString() }) });
      await sb("transactions", { method: "POST", body: JSON.stringify({ id: genId(), username, type: "bonus", amount: bonus, description: "🎉 Приветственный бонус", date: nowStr() }) });
      setLoading(false); setAuthError("");
      notify(`Аккаунт создан! Бонус ${fmt(bonus)}! 🎉`);
      setAuthPage("login");
    } catch (e) { setLoading(false); setAuthError(e.message); }
  };

  const handleLogin = async () => {
    const { username, password } = authForm;
    if (!username || !password) return setAuthError("Введите логин и пароль");
    setLoading(true);
    try {
      const [u] = await sb(`users?username=eq.${username}&select=*`);
      if (!u) { setLoading(false); return setAuthError("Пользователь не найден"); }
      if (u.password !== password) { setLoading(false); return setAuthError("Неверный пароль"); }
      await sb(`users?username=eq.${username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date().toISOString() }) });
      const today = new Date(); const bday = new Date(u.birthdate);
      if (bday.getDate() === today.getDate() && bday.getMonth() === today.getMonth()) {
        const lastBday = localStorage.getItem(`bday_${username}`);
        if (lastBday !== today.toDateString()) {
          const bdayBonus = Math.floor(Math.random() * 40001) + 10000;
          await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ balance: u.balance + bdayBonus }) });
          await sb("transactions", { method: "POST", body: JSON.stringify({ id: genId(), username, type: "bonus", amount: bdayBonus, description: "🎂 С Днём рождения! Подарок от QazaqBank", date: nowStr() }) });
          localStorage.setItem(`bday_${username}`, today.toDateString());
          u.balance += bdayBonus;
          notify(`🎂 С Днём рождения! +${fmt(bdayBonus)}!`);
        }
      }
      localStorage.setItem("qb_session", JSON.stringify({ username: u.username }));
      setSession({ username: u.username }); setUser(u); setPage("home"); setAuthError(""); setLoading(false);
      const hasPin = !!localStorage.getItem(`pin_${username}`);
      setPinState(hasPin ? "check" : "set");
    } catch (e) { setLoading(false); setAuthError(e.message); }
  };

  const handleLogout = () => {
    if (session?.username) sb(`users?username=eq.${session.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date(0).toISOString() }) }).catch(() => {});
    localStorage.removeItem("qb_session");
    setSession(null); setUser(null); setPage("home");
    setAuthForm({ username: "", password: "", fullname: "", birthdate: "" });
    setDrawerOpen(false); setPinState("idle");
  };

  // ── EARN ──────────────────────────────────────────────────────────────────
  const handleEarn = async () => {
    if (earnCooldown || !user) return;
    try {
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + 1 }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "earn", amount: 1, description: "💰 Клик-заработок", date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + 1 }));
      setClickAnim(true); setTimeout(() => setClickAnim(false), 200);
      setClickCount(c => { const next = c + 1; if (next >= 100) { setEarnCooldown(true); setTimeout(() => { setEarnCooldown(false); setClickCount(0); }, 30000); } return next; });
    } catch (e) { console.error(e); }
  };

  // ── TRANSFER ──────────────────────────────────────────────────────────────
  const handleTransfer = async () => {
    const { to, amount, note } = tfForm;
    const amt = parseFloat(amount);
    if (!to || !amt) return setTfError("Заполните получателя и сумму");
    if (to === user.username) return setTfError("Нельзя переводить себе");
    if (amt <= 0) return setTfError("Сумма должна быть больше 0");
    if (amt > user.balance) return setTfError("Недостаточно средств");
    setLoading(true);
    try {
      const [recipient] = await sb(`users?username=eq.${to}&select=*`);
      if (!recipient) { setLoading(false); return setTfError("Получатель не найден"); }
      const txId = genId();
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance - amt }) });
      await sb(`users?username=eq.${to}`, { method: "PATCH", body: JSON.stringify({ balance: recipient.balance + amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify([
        { id: txId + "S", username: user.username, type: "out", amount: -amt, description: `↗ Перевод → ${recipient.fullname}${note ? ": " + note : ""}`, date: nowStr() },
        { id: txId + "R", username: to, type: "in", amount: amt, description: `↙ Перевод ← ${user.fullname}${note ? ": " + note : ""}`, date: nowStr() },
      ]) });
      setUser(u => ({ ...u, balance: u.balance - amt }));
      setTfForm({ to: "", amount: "", note: "" }); setTfError(""); setLoading(false);
      notify(`Переведено ${fmt(amt)} → ${recipient.fullname}`); navigate("home");
    } catch (e) { setLoading(false); setTfError(e.message); }
  };

  // ── CREDIT ────────────────────────────────────────────────────────────────
  const handleCredit = async () => {
    const amt = parseFloat(crForm.amount); const months = parseInt(crForm.months);
    if (!amt || amt <= 0) return setCrError("Введите сумму");
    if (amt > 5000000) return setCrError("Максимум 5 000 000 ₸");
    setLoading(true);
    try {
      // Проверка: только 1 активный кредит
      const existing = await sb(`credits?username=eq.${user.username}&active=eq.true`);
      if (existing.length > 0) {
        setLoading(false);
        return setCrError("У вас уже есть активный кредит. Погасите его перед оформлением нового.");
      }
      const rate = 0.18;
      const monthly = parseFloat((amt * (rate / 12) / (1 - Math.pow(1 + rate / 12, -months))).toFixed(2));
      const id = genId();
      await sb("credits", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id, username: user.username, amount: amt, remaining: parseFloat((monthly * months).toFixed(2)), monthly, months, paid: 0, active: true, date: nowStr() }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "credit", amount: amt, description: `💳 Кредит на ${months} мес.`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + amt }));
      setCrForm({ amount: "", months: "12" }); setCrError(""); setLoading(false);
      notify(`Кредит одобрен! ${fmt(amt)} зачислено`); loadCredits();
    } catch (e) { setLoading(false); setCrError(e.message); }
  };
  const handlePayCredit = async (credit) => {
    const pay = Math.min(credit.monthly, credit.remaining);
    if (user.balance < pay) return notify("Недостаточно средств", "error");
    setLoading(true);
    try {
      const newRemaining = parseFloat((credit.remaining - pay).toFixed(2));
      await sb(`credits?id=eq.${credit.id}`, { method: "PATCH", body: JSON.stringify({ remaining: newRemaining, paid: credit.paid + 1, active: newRemaining > 0 }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance - pay }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "out", amount: -pay, description: `💳 Оплата кредита #${credit.id}`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance - pay }));
      setLoading(false); notify(`Оплачено ${fmt(pay)}`); loadCredits();
    } catch (e) { setLoading(false); notify(e.message, "error"); }
  };

  // ── DEPOSIT ───────────────────────────────────────────────────────────────
  const handleDeposit = async () => {
    const amt = parseFloat(depForm.amount); const months = parseInt(depForm.months);
    if (!amt || amt <= 0) return setDepError("Введите сумму");
    if (amt < 1000) return setDepError("Минимум 1 000 ₸");
    setLoading(true);
    try {
      // Свежий баланс из базы
      const [freshUser] = await sb(`users?username=eq.${user.username}&select=balance`);
      if (amt > freshUser.balance) {
        setLoading(false);
        return setDepError("Недостаточно средств");
      }
      // Проверка: максимум 3 активных вклада
      const existing = await sb(`deposits?username=eq.${user.username}&active=eq.true`);
      if (existing.length >= 3) {
        setLoading(false);
        return setDepError("Максимум 3 активных вклада одновременно");
      }
      const rate = months <= 3 ? 0.10 : months <= 6 ? 0.12 : months <= 12 ? 0.15 : 0.18;
      const profit = parseFloat((amt * rate * months / 12).toFixed(2));
      const id = genId();
      await sb("deposits", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id, username: user.username, amount: amt, months, rate: rate * 100, profit, active: true, date: nowStr() }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: freshUser.balance - amt }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "out", amount: -amt, description: `🏦 Вклад на ${months} мес.`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: freshUser.balance - amt }));
      setDepForm({ amount: "", months: "6" }); setDepError(""); setLoading(false);
      notify(`Вклад открыт! Доход: +${fmt(profit)}`); loadDeposits();
    } catch (e) { setLoading(false); setDepError(e.message); }
  };

  const handleCloseDeposit = async (dep) => {
    const total = dep.amount + dep.profit;
    setLoading(true);
    try {
      await sb(`deposits?id=eq.${dep.id}`, { method: "PATCH", body: JSON.stringify({ active: false }) });
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + total }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username: user.username, type: "in", amount: total, description: `🏦 Закрытие вклада #${dep.id}`, date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + total }));
      setLoading(false); notify(`Получено ${fmt(total)}`); loadDeposits();
    } catch (e) { setLoading(false); notify(e.message, "error"); }
  };

  // ── ADMIN ─────────────────────────────────────────────────────────────────
  const handleAdminAction = async (username, subtract = false) => {
    const amt = parseFloat(adminGive.amount);
    if (!amt) return notify("Введите сумму", "error");
    try {
      const [target] = await sb(`users?username=eq.${username}&select=*`);
      if (!target) return notify("Пользователь не найден", "error");
      const newBal = subtract ? Math.max(0, target.balance - amt) : target.balance + amt;
      await sb(`users?username=eq.${username}`, { method: "PATCH", body: JSON.stringify({ balance: newBal }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ id: genId(), username, type: subtract ? "out" : "bonus", amount: subtract ? -amt : amt, description: `👑 ${subtract ? "Списано" : "Начислено"} администратором`, date: nowStr() }) });
      notify(`${subtract ? "Списано" : "Начислено"} ${fmt(amt)} у ${target.fullname}`);
      setAdminGive({ username: "", amount: "" }); setAdminMenuUser(null); loadAllUsers();
    } catch (e) { notify(e.message, "error"); }
  };

  const viewUserTx = async (username) => {
    const txs = await sb(`transactions?username=eq.${username}&order=created_at.desc&limit=20`);
    setAdminUserTx(txs); setSelectedUser(username); setAdminMenuUser(null);
  };

  const handleQRScan = (value) => {
    setShowScanner(false);
    if (value.startsWith("qazaqbank://transfer/")) {
      const username = value.replace("qazaqbank://transfer/", "");
      setTfForm(f => ({ ...f, to: username }));
      navigate("transfer");
      notify(`QR отсканирован: @${username}`);
    }
  };

  const isAdmin = user?.is_admin || user?.username === ADMIN_USERNAME;

  // ── AUTH SCREEN ───────────────────────────────────────────────────────────
  if (!session || !user) {
    return (
      <div style={S.root}>
        {notification && <Notif n={notification} />}
        <div style={S.authWrap}>
          <div style={S.authCard}>
            <div style={S.logo}><span style={S.logoIcon}>⛁</span><span style={S.logoText}>QAZAQ<b>BANK</b></span></div>
            <p style={S.tagline}>Виртуальный банк • Реальный опыт</p>
            {authPage === "register" && <>
              <input style={S.inp} placeholder="Полное имя" value={authForm.fullname} onChange={e => setAuthForm({ ...authForm, fullname: e.target.value })} />
              <input style={S.inp} type="date" value={authForm.birthdate} onChange={e => setAuthForm({ ...authForm, birthdate: e.target.value })} />
            </>}
            <input style={S.inp} placeholder="Логин" value={authForm.username} onChange={e => setAuthForm({ ...authForm, username: e.target.value })} />
            <input style={S.inp} type="password" placeholder="Пароль" value={authForm.password} onChange={e => setAuthForm({ ...authForm, password: e.target.value })}
              onKeyDown={e => e.key === "Enter" && (authPage === "login" ? handleLogin() : handleRegister())} />
            {authError && <p style={S.err}>{authError}</p>}
            <button style={S.btnPrimary} onClick={authPage === "login" ? handleLogin : handleRegister} disabled={loading}>
              {loading ? "Загрузка..." : authPage === "login" ? "Войти" : "Создать аккаунт"}
            </button>
            <button style={S.btnGhost} onClick={() => { setAuthPage(authPage === "login" ? "register" : "login"); setAuthError(""); }}>
              {authPage === "login" ? "Нет аккаунта? Зарегистрироваться" : "Уже есть аккаунт? Войти"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (pinState === "set") return <PinScreen mode="set" username={session.username} onSuccess={() => setPinState("done")} onCancel={handleLogout} />;
  if (pinState === "check") return <PinScreen mode="check" username={session.username} onSuccess={() => setPinState("done")} onCancel={handleLogout} />;

  const qrValue = `qazaqbank://transfer/${user.username}`;
  const bottomNav = [["home","🏠","Главная"],["transfer","↗️","Перевод"],["statement","📋","Выписка"],["credit","💳","Кредиты"],["deposit","🏦","Вклады"]];

  return (
    <div style={S.root}>
      {notification && <Notif n={notification} />}
      {loading && <div style={S.loadBar} />}
      {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

      {/* Drawer */}
      {drawerOpen && (
        <div style={S.overlay} onClick={() => setDrawerOpen(false)}>
          <div style={S.drawer} onClick={e => e.stopPropagation()}>
            <div style={S.drawerHeader}>
              <div style={{ ...S.avatar, background: isAdmin ? "linear-gradient(135deg,#f9ca24,#f0932b)" : "linear-gradient(135deg,#00b894,#00d68f)" }}>{user.fullname[0]}</div>
              <div>
                <div style={S.drawerName}>{user.fullname} {isAdmin && <span style={S.adminBadge}>ADMIN</span>}</div>
                <div style={S.drawerLogin}>@{user.username}</div>
                <div style={S.drawerBal}>{fmt(user.balance)}</div>
              </div>
            </div>
            <div style={S.drawerDivider} />
            <button style={S.drawerBtn} onClick={() => { setShowQR(true); setDrawerOpen(false); }}><span style={S.drawerBtnIcon}>📱</span> Мой QR-код</button>
            <button style={S.drawerBtn} onClick={() => navigate("cards")}><span style={S.drawerBtnIcon}>💠</span> Мои карты</button>
            {isAdmin && <button style={S.drawerBtn} onClick={() => navigate("admin")}><span style={S.drawerBtnIcon}>👑</span> Админ панель</button>}
            <button style={S.drawerBtn} onClick={() => { setPinState("set"); setDrawerOpen(false); }}><span style={S.drawerBtnIcon}>🔐</span> Изменить PIN</button>
            <div style={S.drawerDivider} />
            <button style={S.drawerBtnLogout} onClick={handleLogout}>⎋ Выйти из аккаунта</button>
          </div>
        </div>
      )}

      {/* My QR Modal */}
      {showQR && (
        <div style={S.modalOverlay} onClick={() => setShowQR(false)}>
          <div style={S.modal} onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <b style={{ color: "#e8eaf0", fontSize: 16 }}>📱 Мой QR-код</b>
              <button style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 22, cursor: "pointer" }} onClick={() => setShowQR(false)}>✕</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
              <QRCode value={qrValue} size={200} />
              <div style={{ color: "#00d68f", fontWeight: 700, fontSize: 16 }}>@{user.username}</div>
              <div style={{ color: "#5a6a80", fontSize: 13, textAlign: "center" }}>Попроси друга отсканировать этот QR чтобы перевести тебе деньги</div>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <div style={S.topLogo}>⛁ QAZAQBANK</div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <button style={S.iconBtn} onClick={() => setShowScanner(true)} title="Сканировать QR">
            <span style={{ fontSize: 20 }}>📷</span>
          </button>
          <button style={S.menuBtn} onClick={() => setDrawerOpen(true)}>
            <div style={S.burger} /><div style={S.burger} /><div style={S.burger} />
          </button>
        </div>
      </div>

      {/* Content */}
      <div style={S.pageWrap}>

        {page === "home" && (
          <div>
            <h2 style={S.greeting}>Привет, {user.fullname.split(" ")[0]}! 👋</h2>
            <div style={S.balCard}>
              <div style={S.balLabel}>ОСНОВНОЙ СЧЁТ</div>
              <div style={S.balAmt}>{fmt(user.balance)}</div>
              <div style={S.balRow}><span>**** **** **** {user.card_number?.slice(-4)}</span><span>VISA</span></div>
            </div>
            <div style={S.quickRow}>
              {[["transfer","↗️","Перевод"],["credit","💳","Кредит"],["deposit","🏦","Вклад"],["statement","📋","Выписка"]].map(([p,icon,label])=>(
                <button key={p} style={S.quickBtn} onClick={() => navigate(p)}>
                  <span style={S.quickIcon}>{icon}</span>
                  <span style={S.quickLabel}>{label}</span>
                </button>
              ))}
            </div>
            <div style={S.earnCard}>
              <div style={S.earnTop}>
                <div><div style={S.secTitle}>💰 Клик-заработок</div><div style={S.earnDesc}>1 клик = 1 ₸ • лимит 100 кликов</div></div>
                <div style={S.earnCounter}>{clickCount}<span style={S.earnMax}>/100</span></div>
              </div>
              <button style={{ ...S.earnBtn, ...(clickAnim ? { transform: "scale(0.93)" } : {}), ...(earnCooldown ? S.earnOff : {}) }}
                onClick={handleEarn} disabled={earnCooldown}>
                {earnCooldown ? "⏳ Перерыв 30 сек..." : "💰  НАЖМИ И ЗАРАБОТАЙ!"}
              </button>
            </div>
            <div style={S.secTitle}>Последние операции</div>
            <div style={S.txCard}>
              {txList.length === 0 && <p style={S.empty}>Операций нет</p>}
              {txList.slice(0, 5).map(tx => <TxRow key={tx.id} tx={tx} />)}
            </div>
          </div>
        )}

        {page === "transfer" && (
          <div>
            <div style={S.pageTitle}>↗️ Перевод денег</div>
            <div style={S.card}>
              <Label>Получатель (логин)</Label>
              <div style={{ display: "flex", gap: 8 }}>
                <input style={{ ...S.inp2, flex: 1 }} placeholder="username" value={tfForm.to} onChange={e => setTfForm({ ...tfForm, to: e.target.value })} />
                <button style={S.qrBtn} onClick={() => setShowScanner(true)}>📷</button>
              </div>
              <Label>Сумма (₸)</Label>
              <input style={S.inp2} type="number" placeholder="0.00" value={tfForm.amount} onChange={e => setTfForm({ ...tfForm, amount: e.target.value })} />
              <Label>Примечание</Label>
              <input style={S.inp2} placeholder="За ужин..." value={tfForm.note} onChange={e => setTfForm({ ...tfForm, note: e.target.value })} />
              {tfError && <p style={S.err}>{tfError}</p>}
              <p style={S.hint}>Доступно: <b style={{ color: "#00d68f" }}>{fmt(user.balance)}</b></p>
              <button style={S.btnPrimary} onClick={handleTransfer} disabled={loading}>Отправить перевод</button>
            </div>
          </div>
        )}

        {page === "statement" && (
          <div>
            <div style={S.pageTitle}>📋 Выписка</div>
            <div style={S.stmtBar}><span>Операций: {txList.length}</span><span style={{ color: "#00d68f", fontWeight: 700 }}>{fmt(user.balance)}</span></div>
            <div style={S.txCard}>
              {txList.length === 0 && <p style={S.empty}>Операций нет</p>}
              {txList.map(tx => <TxRow key={tx.id} tx={tx} full />)}
            </div>
          </div>
        )}

        {page === "credit" && (
          <div>
            <div style={S.pageTitle}>💳 Кредиты</div>
            {credits.map(c => (
              <div key={c.id} style={S.creditCard}>
                <div style={S.cardTopRow}><span style={S.cid}>#{c.id}</span><span style={S.badge}>Активный</span></div>
                <div style={S.bigAmt}>{fmt(c.amount)}</div>
                <div style={S.cinfo}><span>Остаток: <b style={{ color: "#ff6b6b" }}>{fmt(c.remaining)}</b></span><span>Взнос: {fmt(c.monthly)}/мес</span></div>
                <div style={S.cinfo}><span>Срок: {c.months} мес.</span><span>Выплат: {c.paid}</span></div>
                <button style={S.btnRed} onClick={() => handlePayCredit(c)}>Погасить • {fmt(Math.min(c.monthly, c.remaining))}</button>
              </div>
            ))}
            <div style={S.card}>
              <div style={S.secTitle}>Оформить кредит</div>
              <Label>Сумма (₸)</Label>
              <input style={S.inp2} type="number" placeholder="100 000" value={crForm.amount} onChange={e => setCrForm({ ...crForm, amount: e.target.value })} />
              <Label>Срок</Label>
              <select style={S.sel} value={crForm.months} onChange={e => setCrForm({ ...crForm, months: e.target.value })}>
                {[6,12,24,36,60].map(m => <option key={m} value={m}>{m} месяцев</option>)}
              </select>
              {crForm.amount > 0 && <div style={S.calcBox}>Ставка: <b>18%</b> • Платёж: <b>{fmt(parseFloat(crForm.amount) * (0.18/12) / (1-Math.pow(1+0.18/12,-parseInt(crForm.months))))}</b>/мес</div>}
              {crError && <p style={S.err}>{crError}</p>}
              <button style={S.btnPrimary} onClick={handleCredit} disabled={loading}>Оформить кредит</button>
            </div>
          </div>
        )}

        {page === "deposit" && (
          <div>
            <div style={S.pageTitle}>🏦 Вклады</div>
            {deposits.map(d => (
              <div key={d.id} style={{ ...S.creditCard, borderColor: "#00d68f33" }}>
                <div style={S.cardTopRow}><span style={S.cid}>#{d.id}</span><span style={{ ...S.badge, background: "#00d68f22", color: "#00d68f" }}>Активный</span></div>
                <div style={S.bigAmt}>{fmt(d.amount)}</div>
                <div style={S.cinfo}><span>Ставка: <b style={{ color: "#00d68f" }}>{d.rate}%</b></span><span>Срок: {d.months} мес.</span></div>
                <div style={S.cinfo}><span>Доход: <b style={{ color: "#00d68f" }}>+{fmt(d.profit)}</b></span></div>
                <button style={S.btnGreen} onClick={() => handleCloseDeposit(d)}>Закрыть и получить +{fmt(d.profit)}</button>
              </div>
            ))}
            <div style={S.card}>
              <div style={S.secTitle}>Открыть вклад</div>
              <Label>Сумма (₸)</Label>
              <input style={S.inp2} type="number" placeholder="10 000" value={depForm.amount} onChange={e => setDepForm({ ...depForm, amount: e.target.value })} />
              <Label>Срок</Label>
              <select style={S.sel} value={depForm.months} onChange={e => setDepForm({ ...depForm, months: e.target.value })}>
                <option value="3">3 мес. — 10%</option>
                <option value="6">6 мес. — 12%</option>
                <option value="12">12 мес. — 15%</option>
                <option value="24">24 мес. — 18%</option>
              </select>
              {depForm.amount > 0 && <div style={S.calcBox}>Доход: <b style={{ color: "#00d68f" }}>+{fmt(parseFloat(depForm.amount||0)*(depForm.months<=3?0.10:depForm.months<=6?0.12:depForm.months<=12?0.15:0.18)*parseInt(depForm.months)/12)}</b></div>}
              <p style={S.hint}>Доступно: <b style={{ color: "#00d68f" }}>{fmt(user.balance)}</b></p>
              {depError && <p style={S.err}>{depError}</p>}
              <button style={S.btnPrimary} onClick={handleDeposit} disabled={loading}>Открыть вклад</button>
            </div>
          </div>
        )}

        {page === "cards" && (
          <div>
            <div style={S.pageTitle}>💠 Мои карты</div>
            <div style={S.virtualCard}>
              <div style={S.vcChip}>▬▬</div>
              <div style={S.vcNum}>{user.card_number?.match(/.{1,4}/g)?.join("  ")}</div>
              <div style={S.vcRow}>
                <div><div style={S.vcLbl}>Владелец</div><div style={S.vcName}>{user.fullname.toUpperCase()}</div></div>
                <div><div style={S.vcLbl}>Срок</div><div style={S.vcName}>12/29</div></div>
                <div style={S.vcVisa}>VISA</div>
              </div>
            </div>
            <div style={S.card}>
              {[["Номер",user.card_number?.match(/.{1,4}/g)?.join(" ")],["CVV","•••"],["Срок","12/29"],["Статус","✅ Активна"],["Тип","VISA Virtual"]].map(([k,v])=>(
                <div key={k} style={{ color: "#aaa", fontSize: 15, marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "#5a6a80" }}>{k}</span><b style={{ color: "#e8eaf0" }}>{v}</b>
                </div>
              ))}
            </div>
          </div>
        )}

        {page === "admin" && isAdmin && (
          <div>
            <div style={S.pageTitle}>👑 Админ панель</div>

            {/* Quick action form */}
            <div style={S.card}>
              <div style={S.secTitle}>Управление балансом</div>
              <Label>Логин пользователя</Label>
              <input style={S.inp2} placeholder="username" value={adminGive.username} onChange={e => setAdminGive({ ...adminGive, username: e.target.value })} />
              <Label>Сумма (₸)</Label>
              <input style={S.inp2} type="number" placeholder="0" value={adminGive.amount} onChange={e => setAdminGive({ ...adminGive, amount: e.target.value })} />
              <div style={{ display: "flex", gap: 10 }}>
                <button style={{ ...S.btnPrimary, flex: 1 }} onClick={() => handleAdminAction(adminGive.username, false)}>➕ Начислить</button>
                <button style={{ ...S.btnPrimary, flex: 1, background: "linear-gradient(135deg,#ff4d4d,#ff6b6b)" }} onClick={() => handleAdminAction(adminGive.username, true)}>➖ Списать</button>
              </div>
            </div>

            {/* Users list */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={S.secTitle}>Пользователи ({allUsers.length})</div>
              <button style={{ background: "none", border: "none", color: "#00d68f", fontSize: 13, cursor: "pointer" }} onClick={loadAllUsers}>🔄 Обновить</button>
            </div>
            <div style={S.txCard}>
              {allUsers.map(u => {
                const online = isOnline(u.last_seen);
                return (
                  <div key={u.username} style={{ ...S.txRow, flexWrap: "wrap", position: "relative" }}>
                    <div style={{ position: "relative", flexShrink: 0 }}>
                      <div style={{ ...S.avatar, width: 40, height: 40, fontSize: 16, background: u.is_admin ? "linear-gradient(135deg,#f9ca24,#f0932b)" : "linear-gradient(135deg,#00b894,#00d68f)" }}>{u.fullname[0]}</div>
                      {/* Online indicator */}
                      <div style={{ position: "absolute", bottom: 0, right: 0, width: 11, height: 11, borderRadius: "50%", background: online ? "#00d68f" : "#ff6b6b", border: "2px solid #111827" }} />
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={S.txDesc}>{u.fullname} {u.is_admin && <span style={S.adminBadge}>ADMIN</span>}</div>
                      <div style={S.txDate}>@{u.username} • <span style={{ color: online ? "#00d68f" : "#ff6b6b" }}>{online ? "онлайн" : "офлайн"}</span></div>
                    </div>
                    <div style={{ color: "#00d68f", fontWeight: 700, fontSize: 13 }}>{fmt(u.balance)}</div>
                    {/* Three dots menu */}
                    <button style={S.dotsBtn} onClick={() => setAdminMenuUser(adminMenuUser === u.username ? null : u.username)}>⋮</button>

                    {/* Dropdown menu */}
                    {adminMenuUser === u.username && (
                      <div style={S.adminDropdown}>
                        <button style={S.adminDropItem} onClick={() => { setAdminGive(g => ({ ...g, username: u.username })); setAdminMenuUser(null); }}>
                          ✏️ Вставить логин
                        </button>
                        <button style={S.adminDropItem} onClick={() => viewUserTx(u.username)}>
                          📋 История операций
                        </button>
                        <button style={{ ...S.adminDropItem, color: "#00d68f" }} onClick={() => { setAdminGive({ username: u.username, amount: adminGive.amount }); handleAdminAction(u.username, false); }}>
                          ➕ Начислить
                        </button>
                        <button style={{ ...S.adminDropItem, color: "#ff6b6b" }} onClick={() => { setAdminGive({ username: u.username, amount: adminGive.amount }); handleAdminAction(u.username, true); }}>
                          ➖ Списать
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div style={{ height: 90 }} />
      </div>

      {/* Bottom nav */}
      <div style={S.bottomNav}>
        {bottomNav.map(([p,icon,label]) => (
          <button key={p} style={{ ...S.bottomBtn, ...(page === p ? S.bottomBtnActive : {}) }} onClick={() => navigate(p)}>
            <span style={S.bottomIcon}>{icon}</span>
            <span style={S.bottomLabel}>{label}</span>
          </button>
        ))}
      </div>

      {/* User tx modal */}
      {selectedUser && (
        <div style={S.modalOverlay}>
          <div style={S.modal}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
              <b style={{ color: "#e8eaf0" }}>История @{selectedUser}</b>
              <button style={{ background: "none", border: "none", color: "#ff6b6b", fontSize: 22, cursor: "pointer" }} onClick={() => setSelectedUser(null)}>✕</button>
            </div>
            <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
              {adminUserTx.map(tx => <TxRow key={tx.id} tx={tx} full />)}
              {adminUserTx.length === 0 && <p style={S.empty}>Нет операций</p>}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function TxRow({ tx, full }) {
  const pos = tx.amount > 0;
  return (
    <div style={S.txRow}>
      <div style={{ ...S.txBadge, background: pos ? "#00d68f22" : "#ff6b6b22", color: pos ? "#00d68f" : "#ff6b6b" }}>{pos ? "+" : "−"}</div>
      <div style={S.txMeta}>
        <div style={S.txDesc}>{tx.description}</div>
        <div style={S.txDate}>{full && `#${tx.id} • `}{tx.date}</div>
      </div>
      <div style={{ ...S.txAmt, color: pos ? "#00d68f" : "#ff6b6b" }}>{pos ? "+" : ""}{new Intl.NumberFormat("kk-KZ",{minimumFractionDigits:2}).format(Math.abs(tx.amount))} ₸</div>
    </div>
  );
}
function Label({ children }) { return <div style={{ fontSize: 11, color: "#5a6a80", marginBottom: 6, marginTop: 14, textTransform: "uppercase", letterSpacing: 1 }}>{children}</div>; }
function Notif({ n }) { return <div style={{ ...S.notif, background: n.type === "error" ? "#ff4d4d" : "#00d68f" }}>{n.msg}</div>; }

const S = {
  root: { minHeight: "100vh", background: "#0a0d14", color: "#e8eaf0", fontFamily: "'Segoe UI', system-ui, sans-serif", maxWidth: 480, margin: "0 auto", position: "relative" },
  notif: { position: "fixed", top: 16, left: "50%", transform: "translateX(-50%)", zIndex: 9999, padding: "12px 24px", borderRadius: 30, color: "#fff", fontWeight: 600, fontSize: 14, boxShadow: "0 4px 20px #0008", whiteSpace: "nowrap" },
  loadBar: { position: "fixed", top: 0, left: 0, right: 0, height: 3, background: "linear-gradient(90deg,#00b894,#00d68f)", zIndex: 9999 },
  authWrap: { display: "flex", alignItems: "center", justifyContent: "center", minHeight: "100vh", padding: 24 },
  authCard: { background: "#111827", border: "1px solid #1f2d44", borderRadius: 24, padding: "40px 28px", width: "100%", boxShadow: "0 20px 80px #000a" },
  logo: { display: "flex", alignItems: "center", gap: 10, marginBottom: 6 },
  logoIcon: { fontSize: 30 }, logoText: { fontSize: 20, letterSpacing: 2 },
  tagline: { color: "#5a6a80", fontSize: 13, marginBottom: 24 },
  inp: { width: "100%", padding: "14px 16px", background: "#0d1929", border: "1px solid #1f2d44", borderRadius: 12, color: "#e8eaf0", fontSize: 16, marginBottom: 12, boxSizing: "border-box", outline: "none" },
  err: { color: "#ff6b6b", fontSize: 13, margin: "4px 0 10px" },
  btnPrimary: { width: "100%", padding: 15, background: "linear-gradient(135deg,#00b894,#00d68f)", border: "none", borderRadius: 14, color: "#000", fontSize: 16, fontWeight: 700, cursor: "pointer", marginBottom: 10, marginTop: 6 },
  btnGhost: { width: "100%", padding: 13, background: "transparent", border: "1px solid #1f2d44", borderRadius: 14, color: "#5a6a80", fontSize: 14, cursor: "pointer" },
  topBar: { position: "fixed", top: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d1117", borderBottom: "1px solid #1f2d44", display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", zIndex: 100, boxSizing: "border-box" },
  topLogo: { fontSize: 14, fontWeight: 800, letterSpacing: 2, color: "#00d68f" },
  iconBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, fontSize: 20 },
  menuBtn: { background: "none", border: "none", cursor: "pointer", padding: 6, display: "flex", flexDirection: "column", gap: 5 },
  burger: { width: 24, height: 2, background: "#e8eaf0", borderRadius: 2 },
  overlay: { position: "fixed", inset: 0, background: "#000a", zIndex: 200 },
  drawer: { position: "absolute", right: 0, top: 0, bottom: 0, width: 280, background: "#0d1117", borderLeft: "1px solid #1f2d44", padding: 24, display: "flex", flexDirection: "column", gap: 6 },
  drawerHeader: { display: "flex", gap: 14, alignItems: "center", marginBottom: 8 },
  avatar: { width: 48, height: 48, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900, fontSize: 20, color: "#000", flexShrink: 0 },
  drawerName: { fontSize: 15, fontWeight: 700, color: "#e8eaf0" },
  drawerLogin: { fontSize: 12, color: "#5a6a80" },
  drawerBal: { fontSize: 16, fontWeight: 800, color: "#00d68f", marginTop: 4 },
  drawerDivider: { height: 1, background: "#1f2d44", margin: "10px 0" },
  drawerBtn: { display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12, border: "none", background: "transparent", color: "#c8d0dc", fontSize: 15, cursor: "pointer" },
  drawerBtnIcon: { fontSize: 20 },
  drawerBtnLogout: { display: "flex", alignItems: "center", gap: 12, padding: "13px 14px", borderRadius: 12, border: "none", background: "transparent", color: "#ff6b6b", fontSize: 15, cursor: "pointer", marginTop: "auto" },
  adminBadge: { background: "linear-gradient(135deg,#f9ca24,#f0932b)", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 6px", borderRadius: 20, marginLeft: 4 },
  pageWrap: { paddingTop: 70, padding: "70px 16px 20px" },
  pageTitle: { fontSize: 22, fontWeight: 800, marginBottom: 18, marginTop: 8 },
  greeting: { fontSize: 20, fontWeight: 700, margin: "8px 0 16px" },
  secTitle: { fontSize: 16, fontWeight: 700, margin: "16px 0 10px", color: "#c8d0dc" },
  balCard: { background: "linear-gradient(135deg,#0a2a1e,#0d3326)", border: "1px solid #00d68f33", borderRadius: 20, padding: "24px 22px", marginBottom: 18 },
  balLabel: { fontSize: 10, color: "#00d68f88", letterSpacing: 2, textTransform: "uppercase", marginBottom: 8 },
  balAmt: { fontSize: 36, fontWeight: 900, color: "#00d68f", marginBottom: 14 },
  balRow: { display: "flex", justifyContent: "space-between", color: "#5a8a70", fontSize: 13 },
  quickRow: { display: "flex", gap: 10, marginBottom: 18 },
  quickBtn: { flex: 1, background: "#111827", border: "1px solid #1f2d44", borderRadius: 14, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" },
  quickIcon: { fontSize: 22 }, quickLabel: { fontSize: 11, color: "#8899aa" },
  earnCard: { background: "#111827", border: "1px solid #1f2d44", borderRadius: 18, padding: 18, marginBottom: 18 },
  earnTop: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 },
  earnDesc: { fontSize: 12, color: "#5a6a80", marginTop: 4 },
  earnCounter: { fontSize: 28, fontWeight: 900, color: "#f9ca24" },
  earnMax: { fontSize: 14, color: "#5a6a80" },
  earnBtn: { width: "100%", padding: "15px", background: "linear-gradient(135deg,#f9ca24,#f0932b)", border: "none", borderRadius: 14, fontSize: 16, fontWeight: 800, cursor: "pointer", color: "#000", transition: "transform .1s" },
  earnOff: { background: "#1f2d44", color: "#5a6a80", cursor: "not-allowed" },
  txCard: { background: "#111827", border: "1px solid #1f2d44", borderRadius: 16, overflow: "hidden", marginBottom: 16 },
  txRow: { display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: "1px solid #1a2130", position: "relative" },
  txBadge: { width: 36, height: 36, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, fontWeight: 900, flexShrink: 0 },
  txMeta: { flex: 1, minWidth: 0 },
  txDesc: { fontSize: 14, color: "#c8d0dc", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" },
  txDate: { fontSize: 11, color: "#5a6a80", marginTop: 2 },
  txAmt: { fontSize: 13, fontWeight: 700, flexShrink: 0 },
  empty: { color: "#5a6a80", padding: "20px", textAlign: "center", margin: 0 },
  card: { background: "#111827", border: "1px solid #1f2d44", borderRadius: 18, padding: 20, marginBottom: 16 },
  inp2: { width: "100%", padding: "13px 14px", background: "#0d1929", border: "1px solid #1f2d44", borderRadius: 10, color: "#e8eaf0", fontSize: 15, boxSizing: "border-box", outline: "none", marginBottom: 4 },
  sel: { width: "100%", padding: "13px 14px", background: "#0d1929", border: "1px solid #1f2d44", borderRadius: 10, color: "#e8eaf0", fontSize: 15, outline: "none" },
  hint: { fontSize: 13, color: "#5a6a80", margin: "10px 0 4px" },
  calcBox: { background: "#0d1929", border: "1px solid #1f2d44", borderRadius: 10, padding: "11px 14px", margin: "10px 0", fontSize: 14, color: "#8899aa" },
  stmtBar: { display: "flex", justifyContent: "space-between", color: "#5a6a80", fontSize: 13, marginBottom: 10 },
  qrBtn: { padding: "13px 16px", background: "#1f2d44", border: "1px solid #2a3d54", borderRadius: 10, color: "#e8eaf0", fontSize: 18, cursor: "pointer", flexShrink: 0 },
  creditCard: { background: "#111827", border: "1px solid #ff6b6b33", borderRadius: 16, padding: 18, marginBottom: 14 },
  cardTopRow: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 },
  cid: { fontSize: 11, color: "#5a6a80", fontFamily: "monospace" },
  badge: { fontSize: 11, background: "#ff6b6b22", color: "#ff6b6b", padding: "3px 8px", borderRadius: 20 },
  bigAmt: { fontSize: 24, fontWeight: 900, margin: "8px 0" },
  cinfo: { display: "flex", justifyContent: "space-between", fontSize: 13, color: "#8899aa", marginBottom: 5 },
  btnRed: { width: "100%", padding: "11px", background: "#ff6b6b22", border: "1px solid #ff6b6b44", borderRadius: 10, color: "#ff6b6b", fontSize: 14, cursor: "pointer", marginTop: 10 },
  btnGreen: { width: "100%", padding: "11px", background: "#00d68f22", border: "1px solid #00d68f44", borderRadius: 10, color: "#00d68f", fontSize: 14, cursor: "pointer", marginTop: 10 },
  virtualCard: { background: "linear-gradient(135deg,#1a1a2e,#16213e,#0f3460)", borderRadius: 20, padding: "24px 22px", marginBottom: 18, border: "1px solid #ffffff11" },
  vcChip: { fontSize: 20, color: "#f9ca24", marginBottom: 16 },
  vcNum: { fontSize: 18, fontFamily: "monospace", letterSpacing: 3, color: "#fff", marginBottom: 20 },
  vcRow: { display: "flex", alignItems: "flex-end", gap: 20 },
  vcLbl: { fontSize: 9, color: "#ffffff66", textTransform: "uppercase", letterSpacing: 1 },
  vcName: { fontSize: 13, color: "#fff", fontWeight: 600 },
  vcVisa: { marginLeft: "auto", fontSize: 18, fontStyle: "italic", fontWeight: 900, color: "#fff" },
  bottomNav: { position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: "#0d1117", borderTop: "1px solid #1f2d44", display: "flex", zIndex: 100, boxSizing: "border-box" },
  bottomBtn: { flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 14px", background: "none", border: "none", cursor: "pointer" },
  bottomBtnActive: { borderTop: "2px solid #00d68f" },
  bottomIcon: { fontSize: 20 },
  bottomLabel: { fontSize: 10, color: "#5a6a80" },
  modalOverlay: { position: "fixed", inset: 0, background: "#000c", zIndex: 300, display: "flex", alignItems: "flex-end" },
  modal: { background: "#111827", border: "1px solid #1f2d44", borderRadius: "20px 20px 0 0", padding: 24, width: "100%", maxHeight: "80vh", overflowY: "auto" },
  dotsBtn: { background: "none", border: "none", color: "#5a6a80", fontSize: 22, cursor: "pointer", padding: "0 4px", flexShrink: 0 },
  adminDropdown: { position: "absolute", right: 12, top: 50, background: "#1a2535", border: "1px solid #2a3d54", borderRadius: 12, zIndex: 10, minWidth: 180, overflow: "hidden" },
  adminDropItem: { display: "block", width: "100%", padding: "12px 16px", background: "none", border: "none", color: "#c8d0dc", fontSize: 14, cursor: "pointer", textAlign: "left" },
};
