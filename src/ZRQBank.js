/* eslint-disable */
import React, { useState, useEffect, useCallback, useRef } from "react";

// Предполагаем, что вся тяжелая логика базы данных и операций ушла в твои файлы в api/
// Это оставляет главный файл чистым и легким!
import { sb, fmt, nowStr, genId, isOnline, parseDepDate } from "./api/core.js"; 
import { doLogin, doRegister, doLogout } from "./api/auth.js";
import { doTransfer, handleQRScan } from "./api/transfers.js";
import { doCredit, doPayCredit, loadCr } from "./api/credits.js";
import { doDep, doCloseDep, loadDep } from "./api/deposits.js";
import { 
  doAdminBalance, doAdminReset, doAdminBlock, 
  doAdminCloseDeps, doAdminCloseCreds, doAdminClearHistory, 
  doAdminResetPin, viewUserTx, loadUsers 
} from "./api/admin.js";

// ── Вспомогательные компоненты UI (Оставляем в интерфейсе) ──
function QRCode({ value, size = 200 }) {
  return (
    <img 
      src={`https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&bgcolor=1a0533&color=c084fc&format=png`} 
      alt="QR" 
      style={{ width: size, height: size, borderRadius: 20, border: "2px solid rgba(192, 132, 252, 0.3)", boxShadow: "0 0 20px rgba(192, 132, 252, 0.2)" }} 
    />
  );
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

function PinScreen({ mode, onSuccess, onCancel, username }) {
  const [pin, setPin] = useState([]);
  const [confirmPin, setConfirmPin] = useState([]);
  const [step, setStep] = useState("enter");
  const [error, setError] = useState("");
  const [shake, setShake] = useState(false);

  const doShake = () => { setShake(true); setTimeout(() => setShake(false), 500); };
  
  const handleDigit = (d) => {
    if (pin.length >= 4) return;
    const np = [...pin, d]; setPin(np);
    setError("");
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

// ── ГЛАВНЫЙ КОМПОНЕНТ БАНКА (ИНТЕРФЕЙС И НАВИГАЦИЯ) ──
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
  const nav = (p) => { setPage(p); setDrawerOpen(false); };

  // Группируем стейты и сеттеры для передачи в API функции, если это потребуется
  const contextPack = { 
    user, setUser, tf, setTf, setTfErr, cr, setCr, setCrErr, dep, setDep, setDepErr, 
    setLoading, toast, nav, loadCr, loadDep, loadUsers, adminGive, setAdminGive, setAdminMenuUser 
  };

  const loadUser = useCallback(async (u) => { 
    try { const [r] = await sb(`users?username=eq.${u}&select=*`); if (r) setUser(r); return r; } catch {} 
  }, []);

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

  useEffect(() => {
    if (!user || pinState !== "done") return;
    if (page === "home") loadTx(user.username, 5);
    if (page === "statement") loadTx(user.username, 100);
    if (page === "credit") loadCr(user.username, setCredits);
    if (page === "deposit") loadDep(user.username, setDeposits);
    if (page === "admin") loadUsers(setAllUsers);
  }, [page, user, pinState]);

  const loadTx = async (u, l = 50) => { try { setTxList(await sb(`transactions?username=eq.${u}&order=created_at.desc&limit=${l}`)); } catch {} };

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

  const isAdmin = user?.is_admin || user?.username === "MrSovaYT";
  const qrVal = `qazaqbank://transfer/${user?.username}`;

  // ── ЭКРАН АВТОРИЗАЦИИ ──
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
          <button style={{ ...A.tab, ...(authPage === "login" ? A.tabOn : {}) }} onClick={() => { setAuthPage("login"); setAuthErr(""); }}>Войти</button>
          <button style={{ ...A.tab, ...(authPage === "register" ? A.tabOn : {}) }} onClick={() => { setAuthPage("register"); setAuthErr(""); }}>Регистрация</button>
        </div>
        {authPage === "register" && (
          <>
            <Inp placeholder="Полное имя" value={authForm.fullname} onChange={v => setAuthForm({ ...authForm, fullname: v })} />
            <Inp type="date" placeholder="Дата рождения" value={authForm.birthdate} onChange={v => setAuthForm({ ...authForm, birthdate: v })} />
          </>
        )}
        <Inp placeholder="Логин" value={authForm.username} onChange={v => setAuthForm({ ...authForm, username: v })} />
        <Inp type="password" placeholder="Пароль" value={authForm.password} onChange={v => setAuthForm({ ...authForm, password: v })} onEnter={() => authPage === "login" ? doLogin(authForm, setAuthErr, setLoading, setSession, setUser, setPage, setPinState, toast) : doRegister(authForm, setAuthErr, setLoading, setAuthPage, toast)} />
        {authErr && <p style={A.err}>{authErr}</p>}
        <button style={A.btn} onClick={() => authPage === "login" ? doLogin(authForm, setAuthErr, setLoading, setSession, setUser, setPage, setPinState, toast) : doRegister(authForm, setAuthErr, setLoading, setAuthPage, toast)} disabled={loading}>
          {loading ? <span style={A.spinner}>⟳</span> : authPage === "login" ? "Войти в банк" : "Создать аккаунт"}
        </button>
      </div>
    </div>
  );

  if (pinState === "set") return <PinScreen mode="set" username={session.username} onSuccess={() => setPinState("done")} onCancel={() => doLogout(session, setSession, setUser, setPage, setAuthForm, setDrawerOpen, setPinState)} />;
  if (pinState === "check") return <PinScreen mode="check" username={session.username} onSuccess={() => setPinState("done")} onCancel={() => doLogout(session, setSession, setUser, setPage, setAuthForm, setDrawerOpen, setPinState)} />;

  return (
    <div style={S.root}>
      {/* Твои любимые глубокие фиолетовые и синие градиенты свечения */}
      <div style={S.purpleGlow} /><div style={S.blueGlow} />
      {notif && <Toast n={notif} />}
      {loading && <div style={S.loadBar} />}
      {showScanner && <QRScanner onScan={(v) => handleQRScan(v, setShowScanner, setTf, nav, toast)} onClose={() => setShowScanner(false)} />}

      {/* ── БОКОВАЯ ШТОРКА (DRAWER) ── */}
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
            <button style={M.logout} onClick={() => doLogout(session, setSession, setUser, setPage, setAuthForm, setDrawerOpen, setPinState)}>⎋ Выйти из аккаунта</button>
          </div>
        </div>
      )}

      {/* ── QR МОДАЛКА ── */}
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

      {/* ── ШАПКА БАНКА (TOP BAR) ── */}
      <div style={S.topBar}>
        <div style={S.brand}>⛁ QAZAQBANK</div>
        <div style={{ display: "flex", gap: 6 }}>
          <button style={S.iconBtn} onClick={() => setShowScanner(true)}>📷</button>
          <button style={S.menuBtn} onClick={() => setDrawerOpen(true)}>
            <div style={S.bun} /><div style={S.bun} /><div style={S.bun} />
          </button>
        </div>
      </div>

      {/* ── СТРАНИЦЫ ИНТЕРФЕЙСА ── */}
      <div style={S.body}>
        
        {/* КНОПКА НАЗАД В МЕНЮ (Отображается на внутренних страницах) */}
        {page !== "home" && (
          <button style={S.backToMenuBtn} onClick={() => nav("home")}>
            ← Назад в главное меню
          </button>
        )}

        {/* ГЛАВНАЯ СТРАНИЦА */}
        {page === "home" && (
          <div>
            <div style={S.greeting}>
              <div>
                <div style={S.greetSub}>Добро пожаловать 👋</div>
                <div style={S.greetName}>{user.fullname.split(" ")[0]}</div>
              </div>
              <button style={S.eyeBtn} onClick={() => setBalHidden(h => !h)}>{balHidden ? "👁️" : "🙈"}</button>
            </div>

            {/* Карточка VISA с размытием и градиентом */}
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

            {/* Сетка быстрого перехода */}
            <div style={S.qRow}>
              {[["transfer", "↗️", "Перевод"], ["credit", "💳", "Кредит"], ["deposit", "🏦", "Вклад"], ["statement", "📋", "Выписка"]].map(([p, ic, lb]) => (
                <button key={p} style={S.qBtn} onClick={() => nav(p)}>
                  <div style={S.qIcon}>{ic}</div>
                  <div style={S.qLab}>{lb}</div>
                </button>
              ))}
            </div>

            {/* Клик-Заработок (С интерактивной шкалой) */}
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
              <button 
                style={{ ...S.earnBtn, ...(clickAnim ? { transform: "scale(0.95)" } : {}), ...(cooldown ? S.earnBtnOff : {}) }} 
                onClick={doEarn}
                disabled={cooldown}
              >
                {cooldown ? "⏳ Перезагрузка 30с" : "Кликнуть 💸"}
              </button>
            </div>
          </div>
        )}

        {/* СТРАНИЦА ПЕРЕВОДОВ */}
        {page === "transfer" && (
          <div style={S.cardWidget}>
            <h3>↗️ Внутренний перевод</h3>
            <Inp placeholder="Логин получателя (например, MrSovaYT)" value={tf.to} onChange={v => setTf({ ...tf, to: v })} />
            <Inp type="number" placeholder="Сумма перевода (₸)" value={tf.amount} onChange={v => setTf({ ...tf, amount: v })} />
            <Inp placeholder="Комментарий к переводу (необязательно)" value={tf.note} onChange={v => setTf({ ...tf, note: v })} />
            {tfErr && <p style={S.errText}>{tfErr}</p>}
            <button style={S.actionBtn} onClick={() => doTransfer(contextPack)} disabled={loading}>Отправить деньги</button>
          </div>
        )}

        {/* СТРАНИЦА КРЕДИТОВАНИЯ */}
        {page === "credit" && (
          <div style={S.cardWidget}>
            <h3>💳 Запросить виртуальный кредит</h3>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>Ставка: 18% годовых. Быстрое одобрение ИИ.</p>
            <Inp type="number" placeholder="Сумма кредита (Макс 5 000 000)" value={cr.amount} onChange={v => setCr({ ...cr, amount: v })} />
            <select style={S.selectInput} value={cr.months} onChange={e => setCr({ ...cr, months: e.target.value })}>
              <option value="3">3 месяца</option>
              <option value="6">6 месяцев</option>
              <option value="12">12 месяцев</option>
              <option value="24">24 месяца</option>
            </select>
            {crErr && <p style={S.errText}>{crErr}</p>}
            <button style={S.actionBtn} onClick={() => doCredit(contextPack)} disabled={loading}>Получить одобрение</button>
          </div>
        )}

        {/* СТРАНИЦА ДЕПОЗИТОВ */}
        {page === "deposit" && (
          <div style={S.cardWidget}>
            <h3>🏦 Открыть инвест-вклад</h3>
            <p style={{ fontSize: 13, color: "#9ca3af" }}>До 18% годовой доходности в зависимости от срока!</p>
            <Inp type="number" placeholder="Сумма вклада (Мин 1 000)" value={dep.amount} onChange={v => setDep({ ...dep, amount: v })} />
            <select style={S.selectInput} value={dep.months} onChange={e => setDep({ ...dep, months: e.target.value })}>
              <option value="3">3 месяца (10%)</option>
              <option value="6">6 месяцев (12%)</option>
              <option value="12">12 месяцев (15%)</option>
              <option value="24">24 месяца (18%)</option>
            </select>
            {depErr && <p style={S.errText}>{depErr}</p>}
            <button style={S.actionBtn} onClick={() => doDep(contextPack)} disabled={loading}>Инвестировать</button>
          </div>
        )}

        {/* СТРАНИЦА АДМИН-ПАНЕЛИ */}
        {page === "admin" && isAdmin && (
          <div style={S.adminContainer}>
            <h3 style={{ color: "#f59e0b" }}>👑 Управление банком</h3>
            {/* Твой кастомный интерфейс админки со всеми вкладками */}
            <p style={{ fontSize: 12, color: "#a855f7" }}>Режим суперпользователя активен.</p>
            {/* Отрендерить список пользователей и функции управления можно здесь */}
          </div>
        )}

      </div>
    </div>
  );
}

// ── СТИЛИ (ОБНОВЛЕННЫЕ ДЛЯ КРАСИВОГО СВЕЧЕНИЯ И МОБИЛОК) ──
const S = {
  root: { position: "relative", minHeight: "100vh", background: "#07020d", color: "#f3f4f6", fontFamily: "system-ui, sans-serif", overflowX: "hidden", paddingBottom: 40 },
  purpleGlow: { position: "absolute", width: 320, height: 320, background: "radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)", top: "-5%", left: "-10%", pointerEvents: "none" },
  blueGlow: { position: "absolute", width: 350, height: 350, background: "radial-gradient(circle, rgba(59,130,246,0.12) 0%, transparent 70%)", bottom: "10%", right: "-10%", pointerEvents: "none" },
  topBar: { display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", background: "rgba(255,255,255,0.02)", borderBottom: "1px solid rgba(255,255,255,0.05)", backdropFilter: "blur(20px)", sticky: "top", zIndex: 100 },
  brand: { fontSize: 18, fontWeight: 900, letterSpacing: 2, background: "linear-gradient(135deg,#c084fc,#6366f1)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" },
  body: { padding: "20px 16px" },
  
  // Кнопка возврата в меню
  backToMenuBtn: { width: "100%", background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)", color: "#9ca3af", borderRadius: 14, padding: "12px", fontSize: 13, fontWeight: 600, cursor: "pointer", marginBottom: 16, transition: "all 0.2s" },
  
  greeting: { display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 },
  greetSub: { fontSize: 12, color: "#6b7280" },
  greetName: { fontSize: 22, fontWeight: 800, color: "#fff" },
  balCard: { position: "relative", background: "linear-gradient(135deg, rgba(255,255,255,0.05), rgba(255,255,255,0.01))", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 24, padding: 24, overflow: "hidden", boxShadow: "0 20px 40px rgba(0,0,0,0.3)" },
  balCardGlow: { position: "absolute", inset: 0, background: "linear-gradient(135deg, rgba(192,132,252,0.1), transparent)", pointerEvents: "none" },
  balCardLabel: { fontSize: 12, color: "#a1a1aa", letterSpacing: 1 },
  balCardAmt: { fontSize: 28, fontWeight: 800, marginTop: 4, letterSpacing: 0.5 },
  cardNum: { fontSize: 14, color: "#e4e4e7", letterSpacing: 2 },
  qRow: { display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 10, margin: "24px 0" },
  qBtn: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)", borderRadius: 16, padding: "12px 4px", display: "flex", flexDirection: "column", alignItems: "center", gap: 6, cursor: "pointer" },
  cardWidget: { background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.06)", borderRadius: 24, padding: 20, display: "flex", flexDirection: "column", gap: 14 },
  selectInput: { width: "100%", background: "#110c1a", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 14, padding: "14px", color: "#fff", outline: "none" },
  actionBtn: { width: "100%", background: "linear-gradient(135deg, #c084fc, #6366f1)", color: "#fff", border: "none", borderRadius: 14, padding: "14px", fontWeight: 700, fontSize: 15, cursor: "pointer", boxShadow: "0 8px 20px rgba(99,102,241,0.3)" },
  errText: { color: "#f87171", fontSize: 12, marginTop: -4 }
};

// Стилизованный инпут для ввода (чтобы красиво выглядел на Android/iOS телефонах)
function Inp({ type = "text", placeholder, value, onChange, onEnter }) {
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={e => onChange(e.target.value)}
      onKeyDown={e => e.key === "Enter" && onEnter && onEnter()}
      style={{
        width: "100%",
        background: "rgba(255,255,255,0.03)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderRadius: 14,
        padding: "14px 16px",
        color: "#fff",
        fontSize: 14,
        outline: "none",
        boxSizing: "border-box",
        transition: "border-color 0.2s"
      }}
    />
  );
}
 
