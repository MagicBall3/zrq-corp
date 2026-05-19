import { useState } from "react";
import ZRQSplash from "./ZRQSplash";
import ZRQBank from "./ZRQBank";
import ZRQChat from "./ZRQChat";

const APPS = [
  {
    id: "bank",
    name: "QazaqBank",
    tagline: "Виртуальный банк нового поколения",
    icon: "⛁",
    color: "#7c3aed",
    color2: "#3b82f6",
    category: "Финансы",
    version: "1.0.0",
    size: "2.4 MB",
    rating: 4.8,
    reviews: 128,
    free: true,
    description: "Полноценный виртуальный банк. Переводы, кредиты, вклады, виртуальная карта VISA, клик-заработок и многое другое.",
    features: ["Переводы между пользователями", "Кредиты и вклады", "Виртуальная карта VISA", "QR-платежи", "Клик-заработок"],
    component: ZRQBank,
  },
  {
    id: "chat",
    name: "ZRQ Chat",
    tagline: "Мессенджер от ZRQ Corp.",
    icon: "💬",
    color: "#8b5cf6",
    color2: "#ec4899",
    category: "Общение",
    version: "1.0.0",
    size: "1.8 MB",
    rating: 4.6,
    reviews: 64,
    free: true,
    description: "Современный мессенджер с поддержкой личных и групповых чатов. Работает в реальном времени.",
    features: ["Личные чаты", "Групповые чаты", "Realtime сообщения", "Поиск пользователей", "Единый аккаунт ZRQ"],
    component: ZRQChat,
  },
  {
    id: "coming1",
    name: "ZRQ Drive",
    tagline: "Облачное хранилище",
    icon: "☁",
    color: "#0ea5e9",
    color2: "#6366f1",
    category: "Хранилище",
    version: null,
    size: null,
    rating: null,
    reviews: null,
    free: true,
    description: "Облачное хранилище файлов от ZRQ Corp. Скоро!",
    features: [],
    component: null,
    soon: true,
  },
  {
    id: "coming2",
    name: "ZRQ News",
    tagline: "Новости корпорации",
    icon: "📰",
    color: "#f59e0b",
    color2: "#ef4444",
    category: "Новости",
    version: null,
    size: null,
    rating: null,
    reviews: null,
    free: true,
    description: "Новостной агрегатор ZRQ Corp. Скоро!",
    features: [],
    component: null,
    soon: true,
  },
];

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800;900&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body, #root { height: 100%; }
  body { background: #08060f; color: #ede9fe; font-family: 'Syne', sans-serif; overflow-x: hidden; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: #2a2040; border-radius: 2px; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(16px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes glow { 0%,100%{box-shadow:0 0 20px #8b5cf630;} 50%{box-shadow:0 0 40px #8b5cf660;} }
  @keyframes shimmer { 0%{background-position:-200% center;} 100%{background-position:200% center;} }
  @keyframes float { 0%,100%{transform:translateY(0);} 50%{transform:translateY(-6px);} }
  @keyframes slideIn { from{opacity:0;transform:translateX(100%);} to{opacity:1;transform:translateX(0);} }
  @keyframes slideOut { from{opacity:1;transform:translateX(0);} to{opacity:0;transform:translateX(100%);} }
`;

function Stars({ rating }) {
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 3 }}>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ fontSize: 11, color: i <= Math.round(rating) ? "#fbbf24" : "#3a3060" }}>★</span>
      ))}
    </div>
  );
}

function AppCard({ app, onOpen, onDetails }) {
  const [pressed, setPressed] = useState(false);
  return (
    <div style={{
      background: "linear-gradient(135deg, #100d1a, #0d0a18)",
      border: "1px solid #2a2040",
      borderRadius: 20,
      padding: 18,
      display: "flex",
      alignItems: "center",
      gap: 14,
      animation: "fadeUp 0.4s ease",
      opacity: app.soon ? 0.6 : 1,
      transition: "transform 0.15s, box-shadow 0.15s",
      transform: pressed ? "scale(0.98)" : "scale(1)",
    }}
      onTouchStart={() => !app.soon && setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={() => !app.soon && onDetails(app)}
    >
      {/* Icon */}
      <div style={{
        width: 58, height: 58, borderRadius: 16, flexShrink: 0,
        background: `linear-gradient(135deg, ${app.color}, ${app.color2})`,
        display: "flex", alignItems: "center", justifyContent: "center",
        fontSize: 26, boxShadow: `0 8px 24px ${app.color}44`,
        animation: app.soon ? "none" : "glow 3s ease-in-out infinite",
      }}>{app.icon}</div>

      {/* Info */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 15, fontWeight: 800, color: "#ede9fe", marginBottom: 2 }}>{app.name}</div>
        <div style={{ fontSize: 11, color: "#5a4f7a", marginBottom: 6, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{app.tagline}</div>
        {app.rating ? (
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Stars rating={app.rating} />
            <span style={{ fontSize: 10, color: "#5a4f7a", fontFamily: "'DM Mono', monospace" }}>{app.rating}</span>
          </div>
        ) : (
          <span style={{ fontSize: 10, color: "#5a4f7a" }}>Скоро</span>
        )}
      </div>

      {/* Button */}
      <button
        onClick={e => { e.stopPropagation(); !app.soon && onOpen(app); }}
        style={{
          padding: "8px 18px", borderRadius: 20, border: "none",
          background: app.soon ? "#2a2040" : `linear-gradient(135deg, ${app.color}, ${app.color2})`,
          color: app.soon ? "#5a4f7a" : "#fff",
          fontSize: 13, fontWeight: 700, cursor: app.soon ? "default" : "pointer",
          fontFamily: "'Syne', sans-serif", flexShrink: 0,
          boxShadow: app.soon ? "none" : `0 4px 12px ${app.color}44`,
        }}
      >{app.soon ? "Скоро" : "Открыть"}</button>
    </div>
  );
}

function AppDetail({ app, onOpen, onBack }) {
  return (
    <div style={{
      position: "fixed", inset: 0, background: "#08060f", zIndex: 50,
      overflowY: "auto", animation: "slideIn 0.3s ease",
    }}>
      {/* Header */}
      <div style={{
        padding: "16px 20px", display: "flex", alignItems: "center", gap: 12,
        borderBottom: "1px solid #2a2040", background: "#08060f",
        position: "sticky", top: 0, zIndex: 10,
      }}>
        <button onClick={onBack} style={{ background: "none", border: "none", color: "#a89fc8", cursor: "pointer", fontSize: 22, padding: "0 4px" }}>←</button>
        <span style={{ fontSize: 15, fontWeight: 700, color: "#ede9fe" }}>{app.name}</span>
      </div>

      <div style={{ padding: "24px 20px" }}>
        {/* App hero */}
        <div style={{ display: "flex", gap: 16, marginBottom: 24, alignItems: "center" }}>
          <div style={{
            width: 80, height: 80, borderRadius: 22, flexShrink: 0,
            background: `linear-gradient(135deg, ${app.color}, ${app.color2})`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 36, boxShadow: `0 12px 40px ${app.color}55`,
            animation: "float 3s ease-in-out infinite",
          }}>{app.icon}</div>
          <div>
            <div style={{ fontSize: 22, fontWeight: 900, color: "#ede9fe", marginBottom: 4 }}>{app.name}</div>
            <div style={{ fontSize: 12, color: "#5a4f7a", marginBottom: 8 }}>ZRQ Corp. · {app.category}</div>
            {app.rating && (
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                <Stars rating={app.rating} />
                <span style={{ fontSize: 12, color: "#a89fc8", fontFamily: "'DM Mono', monospace" }}>{app.rating} ({app.reviews} отзывов)</span>
              </div>
            )}
          </div>
        </div>

        {/* Open button */}
        <button onClick={() => onOpen(app)} style={{
          width: "100%", padding: "15px", marginBottom: 24,
          background: `linear-gradient(135deg, ${app.color}, ${app.color2})`,
          border: "none", borderRadius: 14, color: "#fff",
          fontSize: 16, fontWeight: 800, cursor: "pointer",
          fontFamily: "'Syne', sans-serif",
          boxShadow: `0 8px 32px ${app.color}55`,
        }}>Открыть приложение</button>

        {/* Stats */}
        <div style={{ display: "flex", gap: 10, marginBottom: 24 }}>
          {[
            ["Версия", app.version || "—"],
            ["Размер", app.size || "—"],
            ["Цена", app.free ? "Бесплатно" : "Платно"],
          ].map(([k, v]) => (
            <div key={k} style={{
              flex: 1, background: "#100d1a", border: "1px solid #2a2040",
              borderRadius: 12, padding: "12px 8px", textAlign: "center",
            }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#ede9fe", marginBottom: 3 }}>{v}</div>
              <div style={{ fontSize: 10, color: "#5a4f7a", textTransform: "uppercase", letterSpacing: 1 }}>{k}</div>
            </div>
          ))}
        </div>

        {/* Description */}
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 16, fontWeight: 800, color: "#ede9fe", marginBottom: 10 }}>Описание</div>
          <div style={{ fontSize: 14, color: "#a89fc8", lineHeight: 1.7 }}>{app.description}</div>
        </div>

        {/* Features */}
        {app.features.length > 0 && (
          <div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#ede9fe", marginBottom: 12 }}>Возможности</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {app.features.map((f, i) => (
                <div key={i} style={{
                  display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", background: "#100d1a",
                  border: "1px solid #2a2040", borderRadius: 12,
                }}>
                  <div style={{ width: 6, height: 6, borderRadius: "50%", background: app.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 13, color: "#a89fc8" }}>{f}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div style={{ height: 40 }} />
      </div>
    </div>
  );
}

export default function App() {
  const [splash, setSplash] = useState(true);
  const [activeApp, setActiveApp] = useState(null);
  const [detailApp, setDetailApp] = useState(null);
  const [search, setSearch] = useState("");

  if (splash) return <ZRQSplash duration={4000} onDone={() => setSplash(false)} />;

  // Запущено приложение
  if (activeApp) {
    const Component = activeApp.component;
    return (
      <div style={{ position: "fixed", inset: 0, zIndex: 100, animation: "slideIn 0.3s ease" }}>
        {/* Кнопка назад в магазин */}
        <div style={{
          position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 200,
          display: "flex", alignItems: "center",
          padding: "10px 16px",
          background: "rgba(8,6,15,0.85)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid #2a2040",
        }}>
          <button onClick={() => setActiveApp(null)} style={{
            display: "flex", alignItems: "center", gap: 6,
            background: "none", border: "none", color: "#a78bfa",
            cursor: "pointer", fontSize: 13, fontWeight: 700,
            fontFamily: "'Syne', sans-serif", padding: "4px 8px",
          }}>
            ← ZRQ Store
          </button>
          <div style={{ flex: 1, textAlign: "center", fontSize: 13, fontWeight: 700, color: "#ede9fe" }}>
            {activeApp.icon} {activeApp.name}
          </div>
          <div style={{ width: 80 }} />
        </div>
        <div style={{ paddingTop: 44, height: "100%" }}>
          <Component />
        </div>
      </div>
    );
  }

  const filtered = APPS.filter(a =>
    !search || a.name.toLowerCase().includes(search.toLowerCase()) || a.category.toLowerCase().includes(search.toLowerCase())
  );
  const available = filtered.filter(a => !a.soon);
  const coming = filtered.filter(a => a.soon);

  return (
    <>
      <style>{css}</style>
      <div style={{ minHeight: "100vh", background: "#08060f", paddingBottom: 40 }}>

        {/* Detail screen */}
        {detailApp && (
          <AppDetail
            app={detailApp}
            onOpen={app => { setDetailApp(null); setActiveApp(app); }}
            onBack={() => setDetailApp(null)}
          />
        )}

        {/* Header */}
        <div style={{
          padding: "20px 20px 0",
          background: "linear-gradient(180deg, #100d1a 0%, transparent 100%)",
        }}>
          {/* Logo row */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{
                width: 38, height: 38, borderRadius: 12,
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 16, fontWeight: 900, color: "#fff",
                fontFamily: "'DM Mono', monospace",
                animation: "glow 3s ease-in-out infinite",
              }}>Z</div>
              <div>
                <div style={{ fontSize: 16, fontWeight: 900, letterSpacing: 1, color: "#ede9fe" }}>ZRQ Store</div>
                <div style={{ fontSize: 10, color: "#5a4f7a", fontFamily: "'DM Mono', monospace" }}>by ZRQ Corp.</div>
              </div>
            </div>
            <div style={{
              fontSize: 10, color: "#8b5cf6", fontFamily: "'DM Mono', monospace",
              background: "#8b5cf610", border: "1px solid #8b5cf630",
              padding: "4px 10px", borderRadius: 20,
            }}>{APPS.filter(a => !a.soon).length} приложений</div>
          </div>

          {/* Hero */}
          <div style={{
            background: "linear-gradient(135deg, #1a0a3d, #0f1640, #1a0a3d)",
            border: "1px solid #3d2f6a",
            borderRadius: 20, padding: "24px 20px", marginBottom: 20,
            position: "relative", overflow: "hidden",
          }}>
            <div style={{
              position: "absolute", width: 200, height: 200, borderRadius: "50%",
              background: "radial-gradient(circle, #8b5cf630, transparent 70%)",
              top: -60, right: -60, pointerEvents: "none",
            }} />
            <div style={{ fontSize: 11, color: "#8b5cf6", letterSpacing: 2, textTransform: "uppercase", fontFamily: "'DM Mono', monospace", marginBottom: 8 }}>ZRQ Corp. · 2026</div>
            <div style={{
              fontSize: 24, fontWeight: 900, color: "#ede9fe", marginBottom: 8, lineHeight: 1.2,
              background: "linear-gradient(135deg, #ede9fe, #a78bfa)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>Все приложения<br />в одном месте</div>
            <div style={{ fontSize: 13, color: "#5a4f7a", lineHeight: 1.6 }}>
              Экосистема ZRQ Corp. — банк, мессенджер и многое другое
            </div>
          </div>

          {/* Search */}
          <div style={{ position: "relative", marginBottom: 24 }}>
            <span style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "#5a4f7a", fontSize: 16 }}>⌕</span>
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Поиск приложений..."
              style={{
                width: "100%", padding: "12px 14px 12px 38px",
                background: "#100d1a", border: "1px solid #2a2040",
                borderRadius: 14, color: "#ede9fe", fontSize: 14,
                fontFamily: "'Syne', sans-serif",
              }}
            />
          </div>
        </div>

        {/* App list */}
        <div style={{ padding: "0 20px" }}>

          {/* Available */}
          <div style={{ fontSize: 13, fontWeight: 700, color: "#5a4f7a", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
            Доступно
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 28 }}>
            {available.map(app => (
              <AppCard key={app.id} app={app} onOpen={setActiveApp} onDetails={setDetailApp} />
            ))}
          </div>

          {/* Coming soon */}
          {coming.length > 0 && (
            <>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#5a4f7a", textTransform: "uppercase", letterSpacing: 1.5, fontFamily: "'DM Mono', monospace", marginBottom: 12 }}>
                Скоро
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {coming.map(app => (
                  <AppCard key={app.id} app={app} onOpen={setActiveApp} onDetails={setDetailApp} />
                ))}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div style={{ textAlign: "center", marginTop: 40, padding: "0 20px" }}>
          <div style={{ fontSize: 12, color: "#2a2040", fontFamily: "'DM Mono', monospace" }}>ZRQ Corp. · 2026 · All rights reserved</div>
        </div>
      </div>
    </>
  );
}
