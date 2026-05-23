/* eslint-disable */
import { useState, useEffect, useCallback, useRef } from "react";

const API = "/api";
const ADMIN_USERNAME = "MrSovaYT";
const SUPABASE_URL = process.env.REACT_APP_SUPABASE_URL;
const SUPABASE_KEY = process.env.REACT_APP_SUPABASE_KEY;

const sb = async (path, opts = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: { apikey: SUPABASE_KEY, Authorization: `Bearer ${SUPABASE_KEY}`, "Content-Type": "application/json", Prefer: opts.prefer || "return=representation", ...opts.headers },
    ...opts,
  });
  if (!res.ok) { const e = await res.json().catch(() => ({})); throw new Error(e.message || "DB Error"); }
  const t = await res.text();
  return t ? JSON.parse(t) : [];
};

const apiFetch = async (path, options = {}, token = null) => {
  const headers = { "Content-Type": "application/json" };
  if (token) headers["Authorization"] = `Bearer ${token}`;
  const res = await fetch(`${API}${path}`, { ...options, headers: { ...headers, ...options.headers } });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || "Ошибка сервера");
  return data;
};

const fmt = (n) => new Intl.NumberFormat("kk-KZ", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n || 0) + " ₸";
const nowStr = () => new Date().toLocaleString("ru-RU");
const genId = () => Math.random().toString(36).slice(2, 10).toUpperCase();
const isOnline = (lastSeen) => { if (!lastSeen) return false; return (Date.now() - new Date(lastSeen).getTime()) < 2 * 60 * 1000; };
const parseDepDate = (d) => { if (!d) return new Date(); if (d.includes("T")) return new Date(d); const p = d.split(", "); const dp = p[0].split("."); return new Date(`${dp[2]}-${dp[1]}-${dp[0]}T${p[1] || "00:00:00"}`); };

// ── COLORS ────────────────────────────────────────────────────────────────────
const BG = "#050408";
const BG2 = "#0a0810";
const BG3 = "#0f0c18";
const SURFACE = "#130f20";
const SURFACE2 = "#1a1530";
const BORDER = "#241d3a";
const BORDER2 = "#332a55";
const ACCENT = "#7c3aed";
const ACCENT2 = "#9f6bf5";
const ACCENT3 = "#c4b5fd";
const PINK = "#ec4899";
const BLUE = "#3b82f6";
const GREEN = "#10b981";
const RED = "#ef4444";
const YELLOW = "#f59e0b";
const TEXT = "#f0ebff";
const TEXT2 = "#9d8fc4";
const TEXT3 = "#4a4070";

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  input, select, textarea, button { font-family: 'Space Grotesk', sans-serif; }
  input:focus, select:focus, textarea:focus { outline: none; }
  button { cursor: pointer; }
  ::-webkit-scrollbar { width: 3px; height: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #332a55; border-radius: 2px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes slideUp { from { opacity:0; transform:translateY(100%); } to { opacity:1; transform:translateY(0); } }
  @keyframes shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.5;} }
  @keyframes glow { 0%,100%{box-shadow:0 0 20px #7c3aed30;} 50%{box-shadow:0 0 40px #7c3aed60;} }
  @keyframes cardShine { 0%{transform:translateX(-100%) rotate(45deg);} 100%{transform:translateX(300%) rotate(45deg);} }
  @keyframes numberPop { 0%{transform:scale(1);} 50%{transform:scale(1.15);} 100%{transform:scale(1);} }
  @keyframes shake { 0%,100%{transform:translateX(0);} 25%{transform:translateX(-8px);} 75%{transform:translateX(8px);} }
`;

// ── TOAST ─────────────────────────────────────────────────────────────────────
function Toast({ n }) {
  return (
    <div style={{
      position: "fixed", top: 20, left: "50%", transform: "translateX(-50%)", zIndex: 9999,
      padding: "12px 24px", borderRadius: 50,
      background: n.type === "err" ? `linear-gradient(135deg, #dc2626, ${RED})` : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`,
      color: "#fff", fontWeight: 600, fontSize: 14,
      boxShadow: "0 8px 32px rgba(0,0,0,0.5)", whiteSpace: "nowrap",
      animation: "fadeUp 0.3s ease", fontFamily: "'Space Grotesk', sans-serif",
    }}>{n.msg}</div>
  );
}

// ── PIN SCREEN ────────────────────────────────────────────────────────────────
function PinScreen({ mode, onSuccess, onCancel, username }) {
  const [pin, setPin] = useState([]);
  const [confirmPin, setConfirmPin] = useState([]);
  const [step, setStep] = useState("enter");
  const [error, setError] = useState("");
  const [shaking, setShaking] = useState(false);
  const [attempts, setAttempts] = useState(0);
  const [locked, setLocked] = useState(false);
  const [lockTimer, setLockTimer] = useState(0);

  useEffect(() => {
    if (!locked || lockTimer <= 0) return;
    const t = setInterval(() => setLockTimer(p => { if (p <= 1) { setLocked(false); clearInterval(t); return 0; } return p - 1; }), 1000);
    return () => clearInterval(t);
  }, [locked, lockTimer]);

  const doShake = () => { setShaking(true); setTimeout(() => setShaking(false), 500); };

  const handleDigit = (d) => {
    if (locked || pin.length >= 4) return;
    const np = [...pin, d]; setPin(np); setError("");
    if (np.length === 4) setTimeout(() => {
      if (mode === "set") {
        if (step === "enter") { setConfirmPin(np); setStep("confirm"); setPin([]); }
        else if (np.join("") === confirmPin.join("")) { localStorage.setItem(`pin_${username}`, np.join("")); onSuccess(); }
        else { setError("PIN не совпадает"); doShake(); setPin([]); setStep("enter"); setConfirmPin([]); }
      } else {
        if (np.join("") === localStorage.getItem(`pin_${username}`)) { setAttempts(0); onSuccess(); }
        else {
          const a = attempts + 1; setAttempts(a);
          if (a >= 5) { setLocked(true); setLockTimer(30); setError("Слишком много попыток. Подождите 30 сек."); }
          else setError(`Неверный PIN · Осталось ${5 - a} попытки`);
          doShake(); setPin([]);
        }
      }
    }, 150);
  };

  const title = mode === "set" ? (step === "enter" ? "Придумайте PIN-код" : "Повторите PIN-код") : "Введите PIN-код";

  return (
    <div style={{ position: "fixed", inset: 0, background: BG, display: "flex", alignItems: "center", justifyContent: "center", zIndex: 9999, fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{css}</style>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 30% 20%, ${ACCENT}18 0%, transparent 60%), radial-gradient(ellipse at 70% 80%, ${PINK}12 0%, transparent 60%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 340, padding: "48px 28px 40px", display: "flex", flexDirection: "column", alignItems: "center", animation: "fadeUp 0.4s ease" }}>
        <div style={{ width: 56, height: 56, borderRadius: 18, background: `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 16, animation: "glow 3s ease-in-out infinite", boxShadow: `0 8px 32px ${ACCENT}40` }}>
          <span style={{ fontSize: 24, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#fff" }}>Q</span>
        </div>
        <div style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: TEXT3, letterSpacing: 3, textTransform: "uppercase", marginBottom: 4 }}>QazaqBank</div>
        {username && <div style={{ fontSize: 13, color: TEXT2, marginBottom: 28 }}>@{username}</div>}
        <div style={{ fontSize: 16, fontWeight: 600, color: TEXT, marginBottom: 28, textAlign: "center" }}>{title}</div>

        <div style={{ display: "flex", gap: 16, marginBottom: 12, animation: shaking ? "shake 0.4s ease" : "none" }}>
          {[0,1,2,3].map(i => (
            <div key={i} style={{ width: 14, height: 14, borderRadius: "50%", background: i < pin.length ? `linear-gradient(135deg, ${ACCENT2}, ${ACCENT3})` : "transparent", border: `2px solid ${i < pin.length ? ACCENT2 : BORDER2}`, boxShadow: i < pin.length ? `0 0 12px ${ACCENT2}60` : "none", transition: "all 0.2s" }} />
          ))}
        </div>

        {error && <div style={{ color: RED, fontSize: 13, marginBottom: 12, textAlign: "center" }}>{error}</div>}
        {locked && <div style={{ color: YELLOW, fontSize: 13, marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>🔒 {lockTimer}с</div>}

        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 12, width: "100%", maxWidth: 260, marginTop: 16 }}>
          {[1,2,3,4,5,6,7,8,9].map(d => (
            <button key={d} onClick={() => handleDigit(d)} disabled={locked} style={{ aspectRatio: "1", borderRadius: "50%", background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 22, fontWeight: 600, transition: "all 0.15s", opacity: locked ? 0.4 : 1 }}>{d}</button>
          ))}
          <div />
          <button onClick={() => handleDigit(0)} disabled={locked} style={{ aspectRatio: "1", borderRadius: "50%", background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT, fontSize: 22, fontWeight: 600, opacity: locked ? 0.4 : 1 }}>0</button>
          <button onClick={() => setPin(p => p.slice(0,-1))} style={{ aspectRatio: "1", borderRadius: "50%", background: "transparent", border: `1px solid ${BORDER}`, color: RED, fontSize: 20 }}>⌫</button>
        </div>
        {onCancel && <button onClick={onCancel} style={{ marginTop: 32, background: "none", border: "none", color: TEXT3, fontSize: 14 }}>Выйти из аккаунта</button>}
      </div>
    </div>
  );
}

// ── QR ────────────────────────────────────────────────────────────────────────
function QRCode({ value, size = 200 }) {
  return <img src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=050408&color=c4b5fd&format=png`} alt="QR" style={{ width: size, height: size, borderRadius: 16, border: `1px solid ${BORDER2}` }} />;
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
    <div style={{ position: "fixed", inset: 0, background: "#000000cc", zIndex: 200, display: "flex", alignItems: "flex-end" }}>
      <div style={{ background: SURFACE, borderRadius: "24px 24px 0 0", padding: "20px 24px 40px", width: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
          <span style={{ fontWeight: 700, color: TEXT }}>📷 Сканировать QR</span>
          <button onClick={onClose} style={{ background: "none", border: "none", color: TEXT3, fontSize: 20 }}>✕</button>
        </div>
        {error ? <p style={{ color: RED, textAlign: "center" }}>{error}</p> : <video ref={videoRef} style={{ width: "100%", borderRadius: 16 }} muted playsInline />}
      </div>
    </div>
  );
}

// ── AUTH ──────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", fullname: "", birthdate: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    try {
      if (mode === "login") {
        const data = await apiFetch("/auth/login", { method: "POST", body: JSON.stringify({ username: form.username, password: form.password }) });
        localStorage.setItem("zrq_token", data.token);
        onLogin(data.user, data.token);
      } else {
        if (!form.username || !form.password || !form.fullname || !form.birthdate) { setError("Заполните все поля"); setLoading(false); return; }
        const data = await apiFetch("/auth/register", { method: "POST", body: JSON.stringify(form) });
        localStorage.setItem("zrq_token", data.token);
        onLogin(data.user, data.token);
      }
    } catch (e) { setError(e.message); }
    setLoading(false);
  };

  const inp = { width: "100%", padding: "13px 16px", background: BG2, border: `1px solid ${BORDER}`, borderRadius: 12, color: TEXT, fontSize: 14, marginBottom: 4 };

  return (
    <div style={{ minHeight: "100vh", background: BG, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden", fontFamily: "'Space Grotesk', sans-serif" }}>
      <style>{css}</style>
      <div style={{ position: "absolute", inset: 0, background: `radial-gradient(ellipse at 20% 30%, ${ACCENT}15 0%, transparent 50%), radial-gradient(ellipse at 80% 70%, ${PINK}10 0%, transparent 50%)`, pointerEvents: "none" }} />
      <div style={{ position: "relative", width: "100%", maxWidth: 400, animation: "fadeUp 0.5s ease" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
            <div style={{ width: 44, height: 44, borderRadius: 14, background: `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, display: "flex", alignItems: "center", justifyContent: "center", animation: "glow 3s ease-in-out infinite" }}>
              <span style={{ fontSize: 20, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#fff" }}>Q</span>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 18, fontWeight: 700, letterSpacing: 2, background: `linear-gradient(135deg, ${ACCENT3}, ${ACCENT2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QAZAQBANK</div>
              <div style={{ fontSize: 10, color: TEXT3, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>by ZRQ Corp.</div>
            </div>
          </div>
          <p style={{ fontSize: 13, color: TEXT2 }}>Виртуальный банк нового поколения</p>
        </div>

        {/* Card */}
        <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 24, padding: "32px 28px", boxShadow: "0 24px 64px rgba(0,0,0,0.6)" }}>
          {/* Tabs */}
          <div style={{ display: "flex", background: BG2, borderRadius: 14, padding: 4, marginBottom: 28, gap: 4 }}>
            {["login","register"].map(m => (
              <button key={m} onClick={() => { setMode(m); setError(""); }} style={{ flex: 1, padding: "10px", borderRadius: 10, border: "none", background: mode === m ? `linear-gradient(135deg, ${ACCENT}, #4c1d95)` : "transparent", color: mode === m ? "#fff" : TEXT2, fontSize: 13, fontWeight: 600, transition: "all 0.2s", boxShadow: mode === m ? `0 4px 12px ${ACCENT}40` : "none" }}>
                {m === "login" ? "Войти" : "Регистрация"}
              </button>
            ))}
          </div>

          {mode === "register" && <>
            <input placeholder="Полное имя" value={form.fullname} onChange={e => setForm(f => ({...f, fullname: e.target.value}))} style={inp} />
            <input type="date" value={form.birthdate} onChange={e => setForm(f => ({...f, birthdate: e.target.value}))} style={{ ...inp, colorScheme: "dark" }} />
          </>}
          <input placeholder="Логин (латиница, цифры)" value={form.username} onChange={e => setForm(f => ({...f, username: e.target.value}))} style={inp} />
          <input type="password" placeholder="Пароль (мин. 6 символов)" value={form.password} onChange={e => setForm(f => ({...f, password: e.target.value}))} onKeyDown={e => e.key === "Enter" && handle()} style={inp} />

          {error && <p style={{ color: RED, fontSize: 13, margin: "8px 0", textAlign: "center" }}>{error}</p>}

          <button onClick={handle} disabled={loading} style={{ width: "100%", marginTop: 16, padding: "14px", background: loading ? SURFACE2 : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, transition: "all 0.2s", boxShadow: loading ? "none" : `0 8px 24px ${ACCENT}40`, animation: loading ? "pulse 1s infinite" : "none" }}>
            {loading ? "..." : mode === "login" ? "Войти в банк" : "Создать аккаунт"}
          </button>
        </div>
      </div>
    </div>
  );
}

// ── BOTTOM SHEET ──────────────────────────────────────────────────────────────
function Sheet({ onClose, children }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", zIndex: 300, display: "flex", alignItems: "flex-end" }} onClick={onClose}>
      <div style={{ background: SURFACE, borderRadius: "28px 28px 0 0", padding: "20px 24px 48px", width: "100%", maxHeight: "90vh", overflowY: "auto", animation: "slideUp 0.3s ease", fontFamily: "'Space Grotesk', sans-serif" }} onClick={e => e.stopPropagation()}>
        <div style={{ width: 36, height: 3, borderRadius: 2, background: BORDER2, margin: "0 auto 24px" }} />
        {children}
      </div>
    </div>
  );
}

// ── MAIN APP ──────────────────────────────────────────────────────────────────
export default function ZRQBank() {
  const [token, setToken] = useState(() => localStorage.getItem("zrq_token"));
  const [user, setUser] = useState(null);
  const [page, setPage] = useState("home");
  const [pinState, setPinState] = useState("idle");
  const [notif, setNotif] = useState(null);
  const [loading, setLoading] = useState(false);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [showQR, setShowQR] = useState(false);
  const [showScanner, setShowScanner] = useState(false);
  const [balHidden, setBalHidden] = useState(false);
  const [txList, setTxList] = useState([]);
  const [credits, setCredits] = useState([]);
  const [deposits, setDeposits] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [tf, setTf] = useState({ to: "", amount: "", note: "" });
  const [tfErr, setTfErr] = useState("");
  const [cr, setCr] = useState({ amount: "", months: "12" });
  const [crErr, setCrErr] = useState("");
  const [dep, setDep] = useState({ amount: "", months: "6" });
  const [depErr, setDepErr] = useState("");
  const [adminGive, setAdminGive] = useState({ username: "", amount: "" });
  const [adminTab, setAdminTab] = useState("users");
  const [adminMenuUser, setAdminMenuUser] = useState(null);
  const [selUser, setSelUser] = useState(null);
  const [adminUserTx, setAdminUserTx] = useState([]);
  const [pwForm, setPwForm] = useState({ old: "", new1: "", new2: "" });
  const [pwErr, setPwErr] = useState("");
  const [clicks, setClicks] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const [clickAnim, setClickAnim] = useState(false);
  const lastClickRef = useRef(0);

  const toast = (msg, type = "ok") => { setNotif({ msg, type }); setTimeout(() => setNotif(null), 3500); };

  const loadUser = useCallback(async () => {
    if (!token) return;
    try { const d = await apiFetch("/auth/me", {}, token); setUser(d.user); return d.user; }
    catch { doLogout(); }
  }, [token]);

  useEffect(() => {
    if (!user || pinState !== "done") return;
    const tick = () => sb(`users?username=eq.${user.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date().toISOString() }) }).catch(() => {});
    tick(); const iv = setInterval(tick, 30000); return () => clearInterval(iv);
  }, [user, pinState]);

  useEffect(() => {
    if (token) loadUser().then(u => { if (u) setPinState(localStorage.getItem(`pin_${u.username}`) ? "check" : "set"); });
  }, [token, loadUser]);

  useEffect(() => {
    const fn = () => { if (document.hidden && user && pinState === "done") setPinState("check"); };
    document.addEventListener("visibilitychange", fn);
    return () => document.removeEventListener("visibilitychange", fn);
  }, [user, pinState]);

  const nav = (p) => { setPage(p); setDrawerOpen(false); };

  useEffect(() => {
    if (!user || pinState !== "done") return;
    if (page === "home") loadTx(5);
    if (page === "statement") loadTx(100);
    if (page === "credit") loadCr();
    if (page === "deposit") loadDep();
    if (page === "admin") loadUsers();
  }, [page, user, pinState]);

  useEffect(() => {
    if (page !== "admin") return;
    const iv = setInterval(loadUsers, 30000); return () => clearInterval(iv);
  }, [page]);

  const loadTx = async (limit = 50) => { try { setTxList(await sb(`transactions?username=eq.${user.username}&order=created_at.desc&limit=${limit}`)); } catch {} };
  const loadCr = async () => { try { setCredits(await sb(`credits?username=eq.${user.username}&active=eq.true&order=created_at.desc`)); } catch {} };
  const loadDep = async () => { try { setDeposits(await sb(`deposits?username=eq.${user.username}&active=eq.true&order=created_at.desc`)); } catch {} };
  const loadUsers = async () => { try { setAllUsers(await sb("users?select=*&order=created_at.desc")); } catch {} };

  const doLogout = () => {
    if (user) sb(`users?username=eq.${user.username}`, { method: "PATCH", prefer: "return=minimal", body: JSON.stringify({ last_seen: new Date(0).toISOString() }) }).catch(() => {});
    localStorage.removeItem("zrq_token");
    setToken(null); setUser(null); setPinState("idle");
  };

  const doEarn = async () => {
    if (cooldown || !user || clicks >= 1000) return;
    const now = Date.now();
    if (now - lastClickRef.current < 80) return;
    lastClickRef.current = now;
    try {
      await sb(`users?username=eq.${user.username}`, { method: "PATCH", body: JSON.stringify({ balance: user.balance + 1 }) });
      await sb("transactions", { method: "POST", prefer: "return=minimal", body: JSON.stringify({ username: user.username, type: "earn", amount: 1, description: "💰 Клик-заработок", date: nowStr() }) });
      setUser(u => ({ ...u, balance: u.balance + 1 }));
      setClickAnim(true); setTimeout(() => setClickAnim(false), 150);
      setClicks(c => { const n = c + 1; if (n >= 1000) { setCooldown(true); setTimeout(() => { setCooldown(false); setClicks(0); }, 60000); toast("1000 кликов! Отдых 60 сек 🎉"); } return n; });
    } catch {}
  };

  const doTransfer = async () => {
    setTfErr(""); const amt = parseFloat(tf.amount);
    if (!tf.to || !amt) return setTfErr("Заполните получателя и сумму");
    if (tf.to === user.username) return setTfErr("Нельзя переводить себе");
    if (amt <= 0 || amt > user.balance) return setTfErr(amt <= 0 ? "Сумма должна быть больше 0" : "Недостаточно средств");
    setLoading(true);
    try { const d = await apiFetch("/bank/transfer", { method: "POST", body: JSON.stringify({ to: tf.to, amount: amt, note: tf.note }) }, token); setUser(u => ({ ...u, balance: d.newBalance })); setTf({ to: "", amount: "", note: "" }); toast(`Переведено ${fmt(amt)}`); nav("home"); }
    catch (e) { setTfErr(e.message); }
    setLoading(false);
  };

  const doCredit = async () => {
    setCrErr(""); const amt = parseFloat(cr.amount); const mo = parseInt(cr.months);
    if (!amt || amt <= 0) return setCrErr("Введите сумму");
    if (amt > 5000000) return setCrErr("Максимум 5 000 000 ₸");
    setLoading(true);
    try { const d = await apiFetch("/bank/credit", { method: "POST", body: JSON.stringify({ action: "create", amount: amt, months: mo }) }, token); setUser(u => ({ ...u, balance: d.newBalance })); setCr({ amount: "", months: "12" }); toast(`Кредит одобрен! ${fmt(amt)} 💳`); loadCr(); }
    catch (e) { setCrErr(e.message); }
    setLoading(false);
  };

  const doPayCredit = async (c) => {
    setLoading(true);
    try { const d = await apiFetch("/bank/credit", { method: "POST", body: JSON.stringify({ action: "pay", creditId: c.id }) }, token); setUser(u => ({ ...u, balance: d.newBalance })); toast(`Оплачено ${fmt(Math.min(c.monthly, c.remaining))}`); loadCr(); }
    catch (e) { toast(e.message, "err"); }
    setLoading(false);
  };

  const doDep = async () => {
    setDepErr(""); const amt = parseFloat(dep.amount); const mo = parseInt(dep.months);
    if (!amt || amt <= 0) return setDepErr("Введите сумму");
    if (amt < 1000) return setDepErr("Минимум 1 000 ₸");
    setLoading(true);
    try { const d = await apiFetch("/bank/deposit", { method: "POST", body: JSON.stringify({ action: "create", amount: amt, months: mo }) }, token); setUser(u => ({ ...u, balance: d.newBalance })); setDep({ amount: "", months: "6" }); toast(`Вклад открыт! +${fmt(d.profit)} 🏦`); loadDep(); }
    catch (e) { setDepErr(e.message); }
    setLoading(false);
  };

  const doCloseDep = async (d) => {
    setLoading(true);
    try { const r = await apiFetch("/bank/deposit", { method: "POST", body: JSON.stringify({ action: "close", depositId: d.id }) }, token); setUser(u => ({ ...u, balance: r.newBalance })); toast(r.early ? `⚠️ Досрочно: ${fmt(d.amount)}` : `🎉 Получено ${fmt(r.total)}!`); loadDep(); }
    catch (e) { toast(e.message, "err"); }
    setLoading(false);
  };

  const doChangePw = async () => {
    setPwErr("");
    if (!pwForm.old || !pwForm.new1 || !pwForm.new2) return setPwErr("Заполните все поля");
    if (pwForm.new1 !== pwForm.new2) return setPwErr("Пароли не совпадают");
    if (pwForm.new1.length < 6) return setPwErr("Минимум 6 символов");
    setLoading(true);
    try { await apiFetch("/bank/password", { method: "POST", body: JSON.stringify({ oldPassword: pwForm.old, newPassword: pwForm.new1 }) }, token); setPwForm({ old: "", new1: "", new2: "" }); toast("Пароль изменён 🔐"); setDrawerOpen(false); }
    catch (e) { setPwErr(e.message); }
    setLoading(false);
  };

  const doAdmin = async (action, username, amount) => {
    try { await apiFetch("/admin/action", { method: "POST", body: JSON.stringify({ action, username, amount }) }, token); toast("✅ Готово"); setAdminMenuUser(null); loadUsers(); }
    catch (e) { toast(e.message, "err"); }
  };

  const viewUserTx = async (username) => {
    const txs = await sb(`transactions?username=eq.${username}&order=created_at.desc&limit=30`);
    setAdminUserTx(txs); setSelUser(username); setAdminMenuUser(null);
  };

  const handleQRScan = (v) => {
    setShowScanner(false);
    if (v.startsWith("qazaqbank://transfer/")) { const u = v.replace("qazaqbank://transfer/", ""); setTf(f => ({ ...f, to: u })); nav("transfer"); toast(`QR: @${u}`); }
  };

  const isAdmin = user?.is_admin || user?.username === ADMIN_USERNAME;

  if (!token || !user) return <AuthScreen onLogin={(u, t) => { setToken(t); setUser(u); setPinState(localStorage.getItem(`pin_${u.username}`) ? "check" : "set"); }} />;
  if (pinState === "set") return <><style>{css}</style><PinScreen mode="set" username={user.username} onSuccess={() => setPinState("done")} onCancel={doLogout} /></>;
  if (pinState === "check") return <><style>{css}</style><PinScreen mode="check" username={user.username} onSuccess={() => setPinState("done")} onCancel={doLogout} /></>;

  const qrVal = `qazaqbank://transfer/${user.username}`;
  const tabs = [["home","⌂","Главная"],["transfer","↗","Перевод"],["statement","≡","Выписка"],["credit","◈","Кредит"],["deposit","◎","Вклад"]];

  const inp = (extra = {}) => ({ width: "100%", padding: "12px 14px", background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 14, marginBottom: 4, ...extra });
  const sel = { width: "100%", padding: "12px 14px", background: BG2, border: `1px solid ${BORDER}`, borderRadius: 10, color: TEXT, fontSize: 14, marginBottom: 4, colorScheme: "dark" };

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: BG, color: TEXT, fontFamily: "'Space Grotesk', sans-serif", maxWidth: 480, margin: "0 auto", position: "relative", paddingBottom: 80 }}>

        {/* BG glow */}
        <div style={{ position: "fixed", inset: 0, background: `radial-gradient(ellipse at 0% 0%, ${ACCENT}12 0%, transparent 50%), radial-gradient(ellipse at 100% 100%, ${BLUE}0a 0%, transparent 50%)`, pointerEvents: "none", zIndex: 0 }} />

        {notif && <Toast n={notif} />}
        {loading && <div style={{ position: "fixed", top: 0, left: 0, right: 0, height: 2, background: `linear-gradient(90deg, ${ACCENT}, ${PINK}, ${BLUE})`, zIndex: 9999, animation: "shimmer 1.5s infinite", backgroundSize: "200% auto" }} />}
        {showScanner && <QRScanner onScan={handleQRScan} onClose={() => setShowScanner(false)} />}

        {/* DRAWER */}
        {drawerOpen && (
          <Sheet onClose={() => setDrawerOpen(false)}>
            <div style={{ display: "flex", gap: 14, alignItems: "center", marginBottom: 24, padding: 16, background: BG2, borderRadius: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: "50%", background: isAdmin ? `linear-gradient(135deg, ${YELLOW}, ${RED})` : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 20, color: "#fff", flexShrink: 0 }}>{user.fullname[0]}</div>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15, color: TEXT }}>{user.fullname}{isAdmin && <span style={{ fontSize: 9, background: `linear-gradient(135deg, ${YELLOW}, ${RED})`, color: "#fff", padding: "2px 7px", borderRadius: 20, marginLeft: 6 }}>ADMIN</span>}</div>
                <div style={{ fontSize: 12, color: TEXT3, fontFamily: "'JetBrains Mono', monospace" }}>@{user.username}</div>
                <div style={{ fontSize: 15, fontWeight: 700, background: `linear-gradient(135deg, ${ACCENT3}, ${ACCENT2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", marginTop: 2 }}>{fmt(user.balance)}</div>
              </div>
            </div>

            {[
              [() => { setShowQR(true); setDrawerOpen(false); }, "📱", "Мой QR-код"],
              [() => nav("cards"), "💳", "Мои карты"],
              ...(isAdmin ? [[() => nav("admin"), "👑", "Админ панель"]] : []),
              [() => { setPinState("set"); setDrawerOpen(false); }, "🔐", "Изменить PIN"],
            ].map(([fn, icon, label], i) => (
              <button key={i} onClick={fn} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 4px", border: "none", background: "transparent", color: TEXT, fontSize: 15, width: "100%", borderBottom: `1px solid ${BORDER}` }}>
                <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>{icon}</span>{label}
              </button>
            ))}

            {/* Change password */}
            <div style={{ marginTop: 16, padding: 16, background: BG2, borderRadius: 16 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: TEXT2, marginBottom: 12 }}>🔑 Изменить пароль</div>
              {["old","new1","new2"].map((k, i) => (
                <input key={k} type="password" placeholder={["Текущий пароль","Новый пароль","Повторите новый пароль"][i]} value={pwForm[k]} onChange={e => setPwForm(f => ({...f, [k]: e.target.value}))} style={{ ...inp(), marginBottom: 8 }} />
              ))}
              {pwErr && <p style={{ color: RED, fontSize: 12, marginBottom: 8 }}>{pwErr}</p>}
              <button onClick={doChangePw} style={{ width: "100%", padding: "11px", background: `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, border: "none", borderRadius: 10, color: "#fff", fontSize: 13, fontWeight: 600 }}>Сохранить пароль</button>
            </div>

            <button onClick={doLogout} style={{ display: "flex", alignItems: "center", gap: 14, padding: "16px 4px", border: "none", background: "transparent", color: RED, fontSize: 15, width: "100%", marginTop: 8 }}>
              <span style={{ fontSize: 20, width: 28, textAlign: "center" }}>⎋</span>Выйти из аккаунта
            </button>
          </Sheet>
        )}

        {/* QR MODAL */}
        {showQR && (
          <Sheet onClose={() => setShowQR(false)}>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
              <div style={{ fontSize: 16, fontWeight: 700, color: TEXT }}>📱 Мой QR-код</div>
              <QRCode value={qrVal} size={220} />
              <div style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, fontSize: 16, color: ACCENT3 }}>@{user.username}</div>
              <div style={{ fontSize: 13, color: TEXT3, textAlign: "center" }}>Попроси друга отсканировать для перевода</div>
            </div>
          </Sheet>
        )}

        {/* TOP BAR */}
        <div style={{ position: "sticky", top: 0, background: `${BG}ee`, backdropFilter: "blur(20px)", borderBottom: `1px solid ${BORDER}`, display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", zIndex: 100 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 32, height: 32, borderRadius: 10, background: `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 14, fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, color: "#fff" }}>Q</span>
            </div>
            <span style={{ fontSize: 14, fontWeight: 700, letterSpacing: 2, background: `linear-gradient(135deg, ${ACCENT3}, ${ACCENT2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>QAZAQBANK</span>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button onClick={() => setShowScanner(true)} style={{ width: 36, height: 36, borderRadius: 10, background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>📷</button>
            <button onClick={() => setDrawerOpen(true)} style={{ width: 36, height: 36, borderRadius: 10, background: SURFACE, border: `1px solid ${BORDER}`, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 4 }}>
              {[0,1,2].map(i => <div key={i} style={{ width: 16, height: 2, background: TEXT2, borderRadius: 1 }} />)}
            </button>
          </div>
        </div>

        {/* PAGES */}
        <div style={{ padding: "20px 16px", position: "relative", zIndex: 1 }}>

          {/* HOME */}
          {page === "home" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
                <div>
                  <div style={{ fontSize: 12, color: TEXT3, letterSpacing: 1, marginBottom: 4, fontFamily: "'JetBrains Mono', monospace" }}>ДОБРО ПОЖАЛОВАТЬ</div>
                  <div style={{ fontSize: 26, fontWeight: 700 }}>{user.fullname.split(" ")[0]} 👋</div>
                </div>
                <button onClick={() => setBalHidden(h => !h)} style={{ width: 36, height: 36, borderRadius: 10, background: SURFACE, border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>{balHidden ? "👁" : "🙈"}</button>
              </div>

              {/* Balance Card */}
              <div style={{ position: "relative", background: "linear-gradient(135deg, #1a0a3d, #2d1060, #0f1640)", borderRadius: 24, padding: "28px 24px", marginBottom: 16, overflow: "hidden", boxShadow: `0 20px 60px ${ACCENT}30` }}>
                <div style={{ position: "absolute", top: "-50%", left: "-20%", width: "40%", height: "200%", background: "linear-gradient(90deg, transparent, rgba(255,255,255,0.05), transparent)", transform: "rotate(45deg)", animation: "cardShine 4s ease-in-out infinite", pointerEvents: "none" }} />
                <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT3}15, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ fontSize: 10, color: "#c4b5fd80", letterSpacing: 3, textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>Основной счёт</div>
                <div style={{ fontSize: 36, fontWeight: 700, color: "#fff", marginBottom: 20 }}>{balHidden ? "••••••" : fmt(user.balance)}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div>
                    <div style={{ fontSize: 12, color: "#c4b5fd60", fontFamily: "'JetBrains Mono', monospace", marginBottom: 4 }}>**** **** **** {user.card_number?.slice(-4)}</div>
                    <div style={{ fontSize: 11, color: "#c4b5fd40", fontFamily: "'JetBrains Mono', monospace" }}>12/29</div>
                  </div>
                  <div style={{ fontSize: 18, fontStyle: "italic", fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>VISA</div>
                </div>
              </div>

              {/* Quick actions */}
              <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8, marginBottom: 20 }}>
                {[["transfer","↗","Перевод",ACCENT],["credit","◈","Кредит",PINK],["deposit","◎","Вклад",GREEN],["statement","≡","Выписка",BLUE]].map(([p,ic,lb,cl]) => (
                  <button key={p} onClick={() => nav(p)} style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, padding: "14px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6 }}>
                    <div style={{ width: 36, height: 36, borderRadius: 10, background: `${cl}22`, border: `1px solid ${cl}44`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16, color: cl }}>{ic}</div>
                    <div style={{ fontSize: 10, color: TEXT2, fontWeight: 500 }}>{lb}</div>
                  </button>
                ))}
              </div>

              {/* Earn */}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20, marginBottom: 20, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT}18, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div>
                    <div style={{ fontSize: 15, fontWeight: 700, marginBottom: 2, color: TEXT }}>💰 Клик-заработок</div>
                    <div style={{ fontSize: 12, color: TEXT3 }}>1 клик = 1 ₸</div>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <div style={{ fontSize: 28, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", background: `linear-gradient(135deg, ${ACCENT3}, ${ACCENT2})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", animation: clickAnim ? "numberPop 0.15s ease" : "none" }}>{clicks}</div>
                    <div style={{ fontSize: 11, color: TEXT3, fontFamily: "'JetBrains Mono', monospace" }}>/1000</div>
                  </div>
                </div>
                <div style={{ height: 4, background: BG2, borderRadius: 2, marginBottom: 14, overflow: "hidden" }}>
                  <div style={{ height: "100%", width: `${(clicks/1000)*100}%`, background: `linear-gradient(90deg, ${ACCENT}, ${ACCENT3})`, borderRadius: 2, transition: "width 0.3s" }} />
                </div>
                <button onClick={doEarn} disabled={cooldown || clicks >= 1000} style={{ width: "100%", padding: "14px", background: (cooldown || clicks >= 1000) ? SURFACE2 : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, border: "none", borderRadius: 14, color: "#fff", fontSize: 14, fontWeight: 700, transform: clickAnim ? "scale(0.97)" : "scale(1)", boxShadow: (cooldown || clicks >= 1000) ? "none" : `0 4px 20px ${ACCENT}40`, opacity: (cooldown || clicks >= 1000) ? 0.5 : 1, transition: "all 0.1s" }}>
                  {cooldown ? "⏳ Перерыв 60 сек..." : clicks >= 1000 ? "✅ Лимит 1000 кликов" : "💰 НАЖМИ И ЗАРАБОТАЙ!"}
                </button>
              </div>

              {/* Recent tx */}
              <div style={{ fontSize: 11, color: TEXT3, letterSpacing: 2, textTransform: "uppercase", marginBottom: 12, fontFamily: "'JetBrains Mono', monospace" }}>Последние операции</div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                {txList.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: TEXT3, fontSize: 13 }}>Нет операций</div>
                  : txList.slice(0,5).map((tx, i) => <TxRow key={tx.id || i} tx={tx} />)}
              </div>
            </div>
          )}

          {/* TRANSFER */}
          {page === "transfer" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Перевод" icon="↗" />
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
                <Lbl>Получатель</Lbl>
                <div style={{ display: "flex", gap: 8, marginBottom: 4 }}>
                  <input placeholder="логин получателя" value={tf.to} onChange={e => setTf(f => ({...f, to: e.target.value}))} style={{ ...inp(), flex: 1, marginBottom: 0 }} />
                  <button onClick={() => setShowScanner(true)} style={{ width: 44, height: 44, borderRadius: 10, background: BG2, border: `1px solid ${BORDER}`, color: TEXT2, fontSize: 16, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>📷</button>
                </div>
                <Lbl>Сумма (₸)</Lbl>
                <input type="number" placeholder="0.00" value={tf.amount} onChange={e => setTf(f => ({...f, amount: e.target.value}))} style={inp()} />
                <Lbl>Примечание</Lbl>
                <input placeholder="За что..." value={tf.note} onChange={e => setTf(f => ({...f, note: e.target.value}))} style={inp()} />
                {tfErr && <p style={{ color: RED, fontSize: 13, margin: "6px 0" }}>{tfErr}</p>}
                <div style={{ fontSize: 12, color: TEXT3, margin: "8px 0 12px" }}>Доступно: <b style={{ color: ACCENT3 }}>{fmt(user.balance)}</b></div>
                <Btn onClick={doTransfer} loading={loading}>↗ Отправить перевод</Btn>
              </div>
            </div>
          )}

          {/* STATEMENT */}
          {page === "statement" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Выписка" icon="≡" />
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT3, marginBottom: 12 }}>
                <span>Операций: {txList.length}</span>
                <span style={{ color: ACCENT3, fontWeight: 700 }}>{fmt(user.balance)}</span>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "hidden" }}>
                {txList.length === 0 ? <div style={{ padding: 24, textAlign: "center", color: TEXT3 }}>Нет операций</div>
                  : txList.map((tx, i) => <TxRow key={tx.id || i} tx={tx} full />)}
              </div>
            </div>
          )}

          {/* CREDIT */}
          {page === "credit" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Кредиты" icon="◈" />
              {credits.map(c => (
                <div key={c.id} style={{ background: "linear-gradient(135deg, #1f0a0a, #2d1515)", border: `1px solid ${RED}30`, borderRadius: 20, padding: 20, marginBottom: 14, position: "relative", overflow: "hidden" }}>
                  <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${RED}18, transparent 70%)`, pointerEvents: "none" }} />
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                    <span style={{ fontSize: 11, color: TEXT3, fontFamily: "'JetBrains Mono', monospace" }}>#{c.id}</span>
                    <span style={{ fontSize: 11, background: `${RED}22`, color: RED, padding: "2px 10px", borderRadius: 20 }}>Активный</span>
                  </div>
                  <div style={{ fontSize: 26, fontWeight: 700, color: TEXT, marginBottom: 12 }}>{fmt(c.amount)}</div>
                  {[["Остаток",fmt(c.remaining),RED],["Ежемесячно",fmt(c.monthly),TEXT],["Срок",`${c.months} мес. (оплачено ${c.paid})`,TEXT2]].map(([k,v,cl]) => (
                    <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT2, marginBottom: 6 }}><span>{k}</span><b style={{ color: cl }}>{v}</b></div>
                  ))}
                  <div style={{ height: 4, background: BG2, borderRadius: 2, margin: "12px 0" }}>
                    <div style={{ height: "100%", width: `${Math.min(100,(c.paid/c.months)*100)}%`, background: `linear-gradient(90deg, ${RED}, #f87171)`, borderRadius: 2 }} />
                  </div>
                  <button onClick={() => doPayCredit(c)} style={{ width: "100%", padding: 12, background: `${RED}22`, border: `1px solid ${RED}44`, borderRadius: 12, color: RED, fontSize: 13, fontWeight: 600 }}>Погасить взнос · {fmt(Math.min(c.monthly, c.remaining))}</button>
                </div>
              ))}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT2, marginBottom: 14 }}>Оформить кредит</div>
                <Lbl>Сумма (₸)</Lbl>
                <input type="number" placeholder="100 000" value={cr.amount} onChange={e => setCr(f => ({...f, amount: e.target.value}))} style={inp()} />
                <Lbl>Срок</Lbl>
                <select value={cr.months} onChange={e => setCr(f => ({...f, months: e.target.value}))} style={sel}>
                  {[6,12,24,36,60].map(m => <option key={m} value={m}>{m} месяцев</option>)}
                </select>
                {cr.amount > 0 && <div style={{ background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: "10px 14px", margin: "8px 0 12px", fontSize: 13, color: ACCENT3 }}>Ставка: 18% · Платёж: {fmt(parseFloat(cr.amount)*(0.18/12)/(1-Math.pow(1+0.18/12,-parseInt(cr.months))))}/мес</div>}
                {crErr && <p style={{ color: RED, fontSize: 13, margin: "6px 0" }}>{crErr}</p>}
                <Btn onClick={doCredit} loading={loading}>Оформить кредит</Btn>
              </div>
            </div>
          )}

          {/* DEPOSIT */}
          {page === "deposit" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Вклады" icon="◎" />
              {deposits.map(d => {
                const dh = (new Date() - parseDepDate(d.date)) / 86400000;
                const dr = d.months * 30; const ok = dh >= dr;
                return (
                  <div key={d.id} style={{ background: "linear-gradient(135deg, #052017, #053322)", border: `1px solid ${GREEN}30`, borderRadius: 20, padding: 20, marginBottom: 14, position: "relative", overflow: "hidden" }}>
                    <div style={{ position: "absolute", top: -20, right: -20, width: 100, height: 100, borderRadius: "50%", background: `radial-gradient(circle, ${GREEN}18, transparent 70%)`, pointerEvents: "none" }} />
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8 }}>
                      <span style={{ fontSize: 11, color: TEXT3, fontFamily: "'JetBrains Mono', monospace" }}>#{d.id}</span>
                      <span style={{ fontSize: 11, background: `${GREEN}22`, color: GREEN, padding: "2px 10px", borderRadius: 20 }}>Активный</span>
                    </div>
                    <div style={{ fontSize: 26, fontWeight: 700, color: GREEN, marginBottom: 12 }}>{fmt(d.amount)}</div>
                    {[["Ставка",`${d.rate}%`,GREEN],["Доход",`+${fmt(d.profit)}`,GREEN]].map(([k,v,cl]) => (
                      <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: TEXT2, marginBottom: 6 }}><span>{k}</span><b style={{ color: cl }}>{v}</b></div>
                    ))}
                    <div style={{ fontSize: 13, color: ok ? GREEN : TEXT3, marginBottom: 8 }}>{ok ? "✅ Готов к закрытию" : `⏳ Осталось ${Math.ceil(dr-dh)} дн.`}</div>
                    <div style={{ height: 4, background: BG2, borderRadius: 2, margin: "12px 0" }}>
                      <div style={{ height: "100%", width: `${Math.min(100,(dh/dr)*100)}%`, background: `linear-gradient(90deg, ${GREEN}, #34d399)`, borderRadius: 2 }} />
                    </div>
                    <button onClick={() => doCloseDep(d)} style={{ width: "100%", padding: 12, background: ok ? `${GREEN}22` : "#6b728022", border: `1px solid ${ok ? GREEN+"44" : "#37415144"}`, borderRadius: 12, color: ok ? GREEN : TEXT3, fontSize: 13, fontWeight: 600 }}>
                      {ok ? `✅ Закрыть +${fmt(d.profit)}` : "⚠️ Досрочно (без процентов)"}
                    </button>
                  </div>
                );
              })}
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: TEXT2, marginBottom: 14 }}>Открыть вклад</div>
                <Lbl>Сумма (₸)</Lbl>
                <input type="number" placeholder="10 000" value={dep.amount} onChange={e => setDep(f => ({...f, amount: e.target.value}))} style={inp()} />
                <Lbl>Срок</Lbl>
                <select value={dep.months} onChange={e => setDep(f => ({...f, months: e.target.value}))} style={sel}>
                  {[["3","3 мес. — 10%"],["6","6 мес. — 12%"],["12","12 мес. — 15%"],["24","24 мес. — 18%"]].map(([v,l]) => <option key={v} value={v}>{l}</option>)}
                </select>
                {dep.amount > 0 && <div style={{ background: BG2, border: `1px solid ${BORDER2}`, borderRadius: 10, padding: "10px 14px", margin: "8px 0 12px", fontSize: 13, color: GREEN }}>Доход: +{fmt(parseFloat(dep.amount||0)*(dep.months<=3?0.10:dep.months<=6?0.12:dep.months<=12?0.15:0.18)*parseInt(dep.months)/12)}</div>}
                <div style={{ fontSize: 12, color: TEXT3, margin: "4px 0 12px" }}>Доступно: <b style={{ color: ACCENT3 }}>{fmt(user.balance)}</b></div>
                {depErr && <p style={{ color: RED, fontSize: 13, margin: "6px 0" }}>{depErr}</p>}
                <Btn onClick={doDep} loading={loading} green>Открыть вклад</Btn>
              </div>
            </div>
          )}

          {/* CARDS */}
          {page === "cards" && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Мои карты" icon="💳" />
              <div style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81, #0f172a)", borderRadius: 24, padding: "28px 24px", marginBottom: 20, position: "relative", overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                <div style={{ position: "absolute", top: -60, right: -60, width: 200, height: 200, borderRadius: "50%", background: `radial-gradient(circle, ${ACCENT3}15, transparent 70%)`, pointerEvents: "none" }} />
                <div style={{ width: 42, height: 32, background: `linear-gradient(135deg, ${YELLOW}, #f59e0b)`, borderRadius: 6, marginBottom: 24, boxShadow: "inset 0 1px 0 rgba(255,255,255,0.3)" }} />
                <div style={{ fontSize: 18, fontFamily: "'JetBrains Mono', monospace", letterSpacing: 3, color: "#fff", marginBottom: 24 }}>{user.card_number?.match(/.{1,4}/g)?.join("  ")}</div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
                  <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Владелец</div><div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>{user.fullname.toUpperCase()}</div></div>
                  <div><div style={{ fontSize: 9, color: "rgba(255,255,255,0.4)", textTransform: "uppercase", letterSpacing: 1 }}>Срок</div><div style={{ fontSize: 13, color: "#fff", fontWeight: 600 }}>12/29</div></div>
                  <div style={{ fontSize: 22, fontStyle: "italic", fontWeight: 900, color: "rgba(255,255,255,0.8)" }}>VISA</div>
                </div>
              </div>
              <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
                {[["Номер",user.card_number?.match(/.{1,4}/g)?.join(" ")],["CVV","•••"],["Срок","12/29"],["Статус","✅ Активна"],["Тип","VISA Virtual"]].map(([k,v]) => (
                  <div key={k} style={{ display: "flex", justifyContent: "space-between", padding: "12px 0", borderBottom: `1px solid ${BORDER}` }}>
                    <span style={{ color: TEXT3, fontSize: 14 }}>{k}</span>
                    <span style={{ fontWeight: 600, fontSize: 14, fontFamily: k === "Номер" ? "'JetBrains Mono', monospace" : "inherit", color: TEXT }}>{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ADMIN */}
          {page === "admin" && isAdmin && (
            <div style={{ animation: "fadeUp 0.4s ease" }}>
              <PTitle title="Админ панель" icon="👑" />
              <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                {["users","actions"].map(t => (
                  <button key={t} onClick={() => setAdminTab(t)} style={{ flex: 1, padding: 11, background: adminTab === t ? `${ACCENT}22` : SURFACE, border: `1px solid ${adminTab === t ? ACCENT : BORDER}`, borderRadius: 12, color: adminTab === t ? ACCENT3 : TEXT2, fontSize: 13, fontWeight: 600 }}>
                    {t === "users" ? "👥 Пользователи" : "⚙️ Действия"}
                  </button>
                ))}
              </div>

              {adminTab === "actions" && (
                <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20, padding: 20 }}>
                  <Lbl>Логин пользователя</Lbl>
                  <input placeholder="username" value={adminGive.username} onChange={e => setAdminGive(f => ({...f, username: e.target.value}))} style={inp()} />
                  <Lbl>Сумма (₸)</Lbl>
                  <input type="number" placeholder="0" value={adminGive.amount} onChange={e => setAdminGive(f => ({...f, amount: e.target.value}))} style={inp()} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginTop: 8 }}>
                    {[[`➕ Начислить`,ACCENT,"addBalance"],[`➖ Списать`,RED,"subtractBalance"],[`🎯 Установить`,BLUE,"setBalance"]].map(([lb,cl,ac]) => (
                      <button key={ac} onClick={() => doAdmin(ac, adminGive.username, adminGive.amount)} style={{ flex: 1, minWidth: "30%", padding: "11px 8px", background: `${cl}22`, border: `1px solid ${cl}44`, borderRadius: 10, color: cl, fontSize: 12, fontWeight: 600 }}>{lb}</button>
                    ))}
                  </div>
                  <div style={{ height: 1, background: BORDER, margin: "16px 0" }} />
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                    {[["🚫 Заблок.",RED,"block"],["✅ Разблок.",GREEN,"unblock"],["🔴 Сброс",RED,"reset"],["📋 История",BLUE,"clearHistory"],["🏦 Закрыть вклады",YELLOW,"closeDeposits"],["💳 Закрыть кредиты","#f97316","closeCredits"]].map(([lb,cl,ac]) => (
                      <button key={ac} onClick={() => doAdmin(ac, adminGive.username)} style={{ flex: 1, minWidth: "45%", padding: "10px 8px", background: `${cl}22`, border: `1px solid ${cl}44`, borderRadius: 10, color: cl, fontSize: 12, fontWeight: 600 }}>{lb}</button>
                    ))}
                  </div>
                </div>
              )}

              {adminTab === "users" && (
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12, fontSize: 13, color: TEXT3 }}>
                    <span>Всего: {allUsers.length}</span>
                    <button onClick={loadUsers} style={{ background: "none", border: "none", color: ACCENT3, fontSize: 13 }}>🔄 Обновить</button>
                  </div>
                  <div style={{ background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 16, overflow: "visible" }}>
                    {allUsers.map(u => {
                      const on = isOnline(u.last_seen);
                      return (
                        <div key={u.username} style={{ display: "flex", alignItems: "center", gap: 12, padding: "13px 16px", borderBottom: `1px solid ${BORDER}`, position: "relative" }}>
                          <div style={{ position: "relative", flexShrink: 0 }}>
                            <div style={{ width: 40, height: 40, borderRadius: "50%", background: u.is_admin ? `linear-gradient(135deg, ${YELLOW}, ${RED})` : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 16, color: "#fff" }}>{u.fullname[0]}</div>
                            <div style={{ position: "absolute", bottom: 0, right: 0, width: 10, height: 10, borderRadius: "50%", background: u.is_blocked ? "#6b7280" : on ? GREEN : RED, border: `2px solid ${SURFACE}` }} />
                          </div>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div style={{ fontSize: 13, fontWeight: 600, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{u.fullname}</div>
                            <div style={{ fontSize: 11, color: on ? GREEN : TEXT3, fontFamily: "'JetBrains Mono', monospace" }}>@{u.username} · {u.is_blocked ? "заблокирован" : on ? "онлайн" : "офлайн"}</div>
                          </div>
                          <div style={{ fontSize: 12, fontWeight: 700, color: ACCENT3, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{fmt(u.balance)}</div>
                          <button onClick={() => setAdminMenuUser(adminMenuUser === u.username ? null : u.username)} style={{ background: "none", border: "none", color: TEXT3, fontSize: 20, padding: "0 4px" }}>⋮</button>
                          {adminMenuUser === u.username && (
                            <div style={{ position: "absolute", right: 12, top: 52, background: SURFACE2, border: `1px solid ${BORDER}`, borderRadius: 16, zIndex: 10, minWidth: 200, overflow: "hidden", boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
                              {[["📋 История",() => viewUserTx(u.username),"#e5e7eb"],["➕ Начислить",() => doAdmin("addBalance",u.username,adminGive.amount),ACCENT3],["➖ Списать",() => doAdmin("subtractBalance",u.username,adminGive.amount),"#f87171"],["🚫 Заблок.",() => doAdmin("block",u.username),"#f87171"],["✅ Разблок.",() => doAdmin("unblock",u.username),"#34d399"],["🔴 Сброс",() => doAdmin("reset",u.username),"#f87171"]].map(([lb,fn,cl]) => (
                                <button key={lb} onClick={fn} style={{ display: "block", width: "100%", padding: "11px 16px", background: "none", border: "none", color: cl, fontSize: 13, textAlign: "left", borderBottom: `1px solid ${BORDER}` }}>{lb}</button>
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
        </div>

        {/* BOTTOM NAV */}
        <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 480, background: `${BG}ee`, backdropFilter: "blur(20px)", borderTop: `1px solid ${BORDER}`, display: "flex", zIndex: 100, paddingBottom: "env(safe-area-inset-bottom)" }}>
          {tabs.map(([p,ic,lb]) => (
            <button key={p} onClick={() => nav(p)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, padding: "10px 4px 12px", background: "none", border: "none", borderTop: page === p ? `2px solid ${ACCENT2}` : "2px solid transparent", transition: "all 0.2s" }}>
              <span style={{ fontSize: 18, color: page === p ? ACCENT3 : TEXT3 }}>{ic}</span>
              <span style={{ fontSize: 10, fontWeight: 500, color: page === p ? ACCENT3 : TEXT3 }}>{lb}</span>
            </button>
          ))}
        </div>

        {/* USER TX MODAL */}
        {selUser && (
          <Sheet onClose={() => setSelUser(null)}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 16 }}>
              <span style={{ fontWeight: 700, fontSize: 16, color: TEXT }}>История @{selUser}</span>
              <button onClick={() => setSelUser(null)} style={{ background: "none", border: "none", color: TEXT3, fontSize: 20 }}>✕</button>
            </div>
            {adminUserTx.map((tx, i) => <TxRow key={tx.id || i} tx={tx} full />)}
            {!adminUserTx.length && <p style={{ color: TEXT3, textAlign: "center" }}>Нет операций</p>}
          </Sheet>
        )}
      </div>
    </>
  );
}

// ── MICRO COMPONENTS ──────────────────────────────────────────────────────────
function TxRow({ tx, full }) {
  const pos = tx.amount > 0;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 12, padding: "14px 16px", borderBottom: `1px solid ${BORDER}`, fontFamily: "'Space Grotesk', sans-serif" }}>
      <div style={{ width: 38, height: 38, borderRadius: "50%", background: pos ? `${GREEN}22` : `${RED}22`, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, color: pos ? GREEN : RED, flexShrink: 0 }}>{pos ? "↙" : "↗"}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, color: TEXT, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tx.description}</div>
        <div style={{ fontSize: 11, color: TEXT3, marginTop: 2, fontFamily: "'JetBrains Mono', monospace" }}>{full && `#${tx.id} · `}{tx.date}</div>
      </div>
      <div style={{ fontSize: 13, fontWeight: 700, color: pos ? GREEN : RED, flexShrink: 0, fontFamily: "'JetBrains Mono', monospace" }}>{pos ? "+" : ""}{new Intl.NumberFormat("kk-KZ",{minimumFractionDigits:2}).format(Math.abs(tx.amount))} ₸</div>
    </div>
  );
}

function PTitle({ title, icon }) {
  return <div style={{ fontSize: 22, fontWeight: 700, marginBottom: 20, marginTop: 4, display: "flex", alignItems: "center", gap: 10, color: TEXT, fontFamily: "'Space Grotesk', sans-serif" }}><span>{icon}</span>{title}</div>;
}

function Lbl({ children }) {
  return <div style={{ fontSize: 10, color: TEXT3, marginBottom: 6, marginTop: 10, textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'JetBrains Mono', monospace" }}>{children}</div>;
}

function Btn({ children, onClick, loading, green }) {
  return (
    <button onClick={onClick} disabled={loading} style={{ width: "100%", padding: 14, background: loading ? SURFACE2 : green ? `linear-gradient(135deg, #059669, ${GREEN})` : `linear-gradient(135deg, ${ACCENT}, #4c1d95)`, border: "none", borderRadius: 14, color: "#fff", fontSize: 15, fontWeight: 700, transition: "all 0.2s", boxShadow: loading ? "none" : green ? `0 4px 20px ${GREEN}30` : `0 4px 20px ${ACCENT}30`, marginTop: 4, fontFamily: "'Space Grotesk', sans-serif" }}>
      {loading ? "⟳" : children}
    </button>
  );
}
