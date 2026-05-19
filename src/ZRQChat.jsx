import { useState, useEffect, useRef } from "react";
import ZRQSplash from "./ZRQSplash";

const SUPABASE_URL = "https://gvorwmwsurbkdlozxnel.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imd2b3J3bXdzdXJia2Rsb3p4bmVsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDA5MjEsImV4cCI6MjA5NDUxNjkyMX0.Z4P9uDa0UmlTb8aWS5uEWjZqRMwNCY96dMhG6KeV3uM";

const api = async (path, options = {}) => {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${path}`, {
    headers: {
      apikey: SUPABASE_KEY,
      Authorization: `Bearer ${SUPABASE_KEY}`,
      "Content-Type": "application/json",
      Prefer: options.prefer || "return=representation",
      ...options.headers,
    },
    ...options,
  });
  if (!res.ok) return null;
  const text = await res.text();
  return text ? JSON.parse(text) : null;
};

const C = {
  bg: "#08060f",
  surface: "#100d1a",
  surfaceHigh: "#161222",
  border: "#2a2040",
  borderHigh: "#3d2f6a",
  accent: "#8b5cf6",
  accentHigh: "#a78bfa",
  accentGlow: "#8b5cf620",
  text: "#ede9fe",
  textMid: "#a89fc8",
  textLow: "#5a4f7a",
  sent: "#4c1d95",
  sentBorder: "#6d28d9",
};

const css = `
  @import url('https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@400;500&display=swap');
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { background: ${C.bg}; color: ${C.text}; font-family: 'Syne', sans-serif; overflow: hidden; }
  ::-webkit-scrollbar { width: 3px; }
  ::-webkit-scrollbar-track { background: transparent; }
  ::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 2px; }
  input:focus, textarea:focus { outline: none; }
  @keyframes fadeUp { from { opacity:0; transform:translateY(10px); } to { opacity:1; transform:translateY(0); } }
  @keyframes fadeIn { from { opacity:0; } to { opacity:1; } }
  @keyframes msgIn { from { opacity:0; transform:translateY(8px) scale(0.97); } to { opacity:1; transform:translateY(0) scale(1); } }
  @keyframes pulse { 0%,100%{opacity:1;} 50%{opacity:0.4;} }
  @keyframes glow { 0%,100%{box-shadow:0 0 20px #8b5cf630;} 50%{box-shadow:0 0 40px #8b5cf660;} }
  @keyframes typingDot { 0%,80%,100%{transform:scale(0.6);opacity:0.4;} 40%{transform:scale(1);opacity:1;} }
`;

// ─── AUTH ────────────────────────────────────────────────────────────────────
function AuthScreen({ onLogin }) {
  const [mode, setMode] = useState("login");
  const [form, setForm] = useState({ username: "", password: "", name: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handle = async () => {
    setError(""); setLoading(true);
    if (!form.username || !form.password) { setError("Заполни все поля"); setLoading(false); return; }

    if (mode === "login") {
      const users = await api(`users?username=eq.${encodeURIComponent(form.username)}&select=*`);
      if (!users?.length || users[0].password !== form.password) {
        setError("Неверный логин или пароль"); setLoading(false); return;
      }
      localStorage.setItem("zrq_chat_user", JSON.stringify(users[0]));
      onLogin(users[0]);
    } else {
      const exists = await api(`users?username=eq.${encodeURIComponent(form.username)}&select=id`);
      if (exists?.length) { setError("Логин занят"); setLoading(false); return; }
      const newUser = await api("users", {
        method: "POST",
        body: JSON.stringify({ username: form.username, password: form.password, name: form.name || form.username, balance: 0 }),
      });
      if (!newUser?.length) { setError("Ошибка при регистрации"); setLoading(false); return; }
      localStorage.setItem("zrq_chat_user", JSON.stringify(newUser[0]));
      onLogin(newUser[0]);
    }
    setLoading(false);
  };

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", padding: 20, background: C.bg }}>
      <div style={{ width: "100%", maxWidth: 380, animation: "fadeUp 0.4s ease" }}>

        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{
            width: 64, height: 64, borderRadius: 20, margin: "0 auto 16px",
            background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 26, fontWeight: 900, color: "#fff",
            fontFamily: "'DM Mono', monospace", animation: "glow 3s ease-in-out infinite",
          }}>Z</div>
          <div style={{ fontSize: 22, fontWeight: 800, color: C.text }}>ZRQ Chat</div>
          <div style={{ fontSize: 12, color: C.textLow, fontFamily: "'DM Mono', monospace", marginTop: 4 }}>by ZRQ Corp.</div>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", background: C.surface, borderRadius: 12, padding: 4, marginBottom: 24, border: `1px solid ${C.border}` }}>
          {["login", "register"].map(m => (
            <button key={m} onClick={() => { setMode(m); setError(""); }} style={{
              flex: 1, padding: "9px", border: "none", borderRadius: 9, cursor: "pointer",
              background: mode === m ? C.accent : "transparent",
              color: mode === m ? "#fff" : C.textMid,
              fontSize: 13, fontWeight: 700, fontFamily: "'Syne', sans-serif",
              transition: "all 0.2s",
            }}>{m === "login" ? "Войти" : "Регистрация"}</button>
          ))}
        </div>

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {mode === "register" && (
            <input placeholder="Имя (необязательно)" value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              style={{ padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: "'Syne', sans-serif" }} />
          )}
          <input placeholder="Логин" value={form.username}
            onChange={e => setForm(f => ({ ...f, username: e.target.value }))}
            style={{ padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: "'Syne', sans-serif" }} />
          <input type="password" placeholder="Пароль" value={form.password}
            onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
            onKeyDown={e => e.key === "Enter" && handle()}
            style={{ padding: "12px 14px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 10, color: C.text, fontSize: 14, fontFamily: "'Syne', sans-serif" }} />
        </div>

        {error && <div style={{ marginTop: 12, color: "#f87171", fontSize: 13, textAlign: "center" }}>{error}</div>}

        <button onClick={handle} disabled={loading} style={{
          width: "100%", marginTop: 20, padding: "13px",
          background: loading ? C.border : "linear-gradient(135deg, #8b5cf6, #6d28d9)",
          border: "none", borderRadius: 12, color: "#fff",
          fontSize: 15, fontWeight: 700, cursor: loading ? "default" : "pointer",
          fontFamily: "'Syne', sans-serif", transition: "all 0.2s",
        }}>{loading ? "..." : mode === "login" ? "Войти" : "Создать аккаунт"}</button>

        <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, color: C.textLow }}>
          Используй аккаунт от QazaqBank
        </div>
      </div>
    </div>
  );
}

// ─── NEW CHAT MODAL ──────────────────────────────────────────────────────────
function NewChatModal({ currentUser, onClose, onCreated }) {
  const [search, setSearch] = useState("");
  const [results, setResults] = useState([]);
  const [groupMode, setGroupMode] = useState(false);
  const [groupName, setGroupName] = useState("");
  const [selected, setSelected] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!search.trim()) { setResults([]); return; }
    const t = setTimeout(async () => {
      const users = await api(`users?username=ilike.*${search}*&select=username,name&limit=8`);
      setResults((users || []).filter(u => u.username !== currentUser.username));
    }, 300);
    return () => clearTimeout(t);
  }, [search, currentUser.username]);

  const toggleUser = (u) => {
    setSelected(s => s.find(x => x.username === u.username) ? s.filter(x => x.username !== u.username) : [...s, u]);
  };

  const create = async () => {
    setLoading(true);
    const targets = groupMode ? selected : [selected[0]];
    if (!targets?.length) { setLoading(false); return; }

    const isGroup = groupMode && selected.length > 1;
    const name = isGroup ? groupName || selected.map(u => u.username).join(", ") : targets[0].username;

    const room = await api("zrq_rooms", { method: "POST", body: JSON.stringify({ name, is_group: isGroup }) });
    if (!room?.length) { setLoading(false); return; }
    const roomId = room[0].id;

    const members = [currentUser.username, ...targets.map(u => u.username)];
    await api("zrq_room_members", {
      method: "POST",
      body: JSON.stringify(members.map(username => ({ room_id: roomId, username }))),
    });

    onCreated(room[0]);
    setLoading(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "#00000080", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={e => e.target === e.currentTarget && onClose()}>
      <div style={{ width: "100%", maxWidth: 400, background: C.surfaceHigh, borderRadius: 16, border: `1px solid ${C.border}`, padding: 24, animation: "fadeUp 0.2s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
          <h3 style={{ fontSize: 16, fontWeight: 800 }}>Новый чат</h3>
          <button onClick={onClose} style={{ background: "none", border: "none", color: C.textLow, cursor: "pointer", fontSize: 20 }}>✕</button>
        </div>

        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          {["Личный", "Группа"].map((label, i) => (
            <button key={i} onClick={() => setGroupMode(i === 1)} style={{
              flex: 1, padding: "8px", border: `1px solid ${(i === 1) === groupMode ? C.accent : C.border}`,
              borderRadius: 8, background: (i === 1) === groupMode ? C.accentGlow : "transparent",
              color: (i === 1) === groupMode ? C.accentHigh : C.textMid,
              fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "'Syne', sans-serif",
            }}>{label}</button>
          ))}
        </div>

        {groupMode && (
          <input placeholder="Название группы" value={groupName} onChange={e => setGroupName(e.target.value)}
            style={{ width: "100%", padding: "10px 12px", marginBottom: 12, background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "'Syne', sans-serif" }} />
        )}

        <input placeholder="Поиск по логину..." value={search} onChange={e => setSearch(e.target.value)}
          style={{ width: "100%", padding: "10px 12px", background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8, color: C.text, fontSize: 13, fontFamily: "'Syne', sans-serif" }} />

        {selected.length > 0 && (
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
            {selected.map(u => (
              <div key={u.username} onClick={() => toggleUser(u)} style={{
                padding: "4px 10px", background: C.accentGlow, border: `1px solid ${C.borderHigh}`,
                borderRadius: 20, fontSize: 12, color: C.accentHigh, cursor: "pointer",
              }}>{u.username} ✕</div>
            ))}
          </div>
        )}

        <div style={{ marginTop: 10, maxHeight: 200, overflowY: "auto" }}>
          {results.map(u => {
            const isSelected = selected.find(x => x.username === u.username);
            return (
              <div key={u.username} onClick={() => groupMode ? toggleUser(u) : setSelected([u])}
                style={{
                  padding: "10px 12px", borderRadius: 8, cursor: "pointer", display: "flex", alignItems: "center", gap: 10,
                  background: isSelected ? C.accentGlow : "transparent",
                  border: `1px solid ${isSelected ? C.borderHigh : "transparent"}`,
                  marginBottom: 4, transition: "all 0.1s",
                }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #8b5cf6, #6d28d9)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, fontWeight: 700, color: "#fff" }}>
                  {u.username[0].toUpperCase()}
                </div>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: C.text }}>{u.username}</div>
                  {u.name && u.name !== u.username && <div style={{ fontSize: 11, color: C.textLow }}>{u.name}</div>}
                </div>
              </div>
            );
          })}
        </div>

        <button onClick={create} disabled={loading || selected.length === 0} style={{
          width: "100%", marginTop: 16, padding: "12px",
          background: selected.length ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : C.border,
          border: "none", borderRadius: 10, color: "#fff",
          fontSize: 14, fontWeight: 700, cursor: selected.length ? "pointer" : "default",
          fontFamily: "'Syne', sans-serif",
        }}>{loading ? "..." : "Создать чат"}</button>
      </div>
    </div>
  );
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function ZRQChat() {
  const [splash, setSplash] = useState(true);
  const [user, setUser] = useState(null);
  const [rooms, setRooms] = useState([]);
  const [activeRoom, setActiveRoom] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [newChat, setNewChat] = useState(false);
  const [lastMsgs, setLastMsgs] = useState({});
  const bottomRef = useRef(null);
  const wsRef = useRef(null);

  // Check saved session
  useEffect(() => {
    const saved = localStorage.getItem("zrq_chat_user");
    if (saved) setUser(JSON.parse(saved));
  }, []);

  // Load rooms
  useEffect(() => {
    if (!user) return;
    loadRooms();
  }, [user]);

  const loadRooms = async () => {
    if (!user) return;
    const members = await api(`zrq_room_members?username=eq.${user.username}&select=room_id`);
    if (!members?.length) { setRooms([]); return; }
    const ids = members.map(m => m.room_id).join(",");
    const roomList = await api(`zrq_rooms?id=in.(${ids})&order=created_at.desc`);
    setRooms(roomList || []);

    // Load last message for each room
    for (const room of roomList || []) {
      const msgs = await api(`zrq_messages?room_id=eq.${room.id}&order=created_at.desc&limit=1`);
      if (msgs?.length) setLastMsgs(p => ({ ...p, [room.id]: msgs[0] }));
    }
  };

  // Load messages for active room
  useEffect(() => {
    if (!activeRoom) return;
    loadMessages();
    subscribeRealtime();
    return () => wsRef.current?.close();
  }, [activeRoom]);

  const loadMessages = async () => {
    const msgs = await api(`zrq_messages?room_id=eq.${activeRoom.id}&order=created_at.asc&limit=100`);
    setMessages(msgs || []);
    setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
  };

  const subscribeRealtime = () => {
    wsRef.current?.close();
    const url = `${SUPABASE_URL.replace("https", "wss")}/realtime/v1/websocket?apikey=${SUPABASE_KEY}&vsn=1.0.0`;
    const ws = new WebSocket(url);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ topic: "realtime:public:zrq_messages", event: "phx_join", payload: {}, ref: "1" }));
    };
    ws.onmessage = (e) => {
      const data = JSON.parse(e.data);
      if (data.event === "INSERT" && data.payload?.record?.room_id === activeRoom?.id) {
        const msg = data.payload.record;
        setMessages(prev => [...prev, msg]);
        setLastMsgs(p => ({ ...p, [msg.room_id]: msg }));
        setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: "smooth" }), 50);
      }
    };
    const ping = setInterval(() => ws.readyState === 1 && ws.send(JSON.stringify({ topic: "phoenix", event: "heartbeat", payload: {}, ref: "hb" })), 25000);
    ws.onclose = () => clearInterval(ping);
  };

  const send = async () => {
    if (!text.trim() || !activeRoom || !user) return;
    const msg = { room_id: activeRoom.id, sender: user.username, text: text.trim() };
    setText("");
    await api("zrq_messages", { method: "POST", body: JSON.stringify(msg) });
  };

  const getRoomDisplay = (room) => {
    if (room.is_group) return { name: room.name, avatar: room.name[0].toUpperCase(), color: "#8b5cf6" };
    const colors = ["#8b5cf6","#6366f1","#ec4899","#f59e0b","#10b981","#3b82f6"];
    const c = colors[room.name.charCodeAt(0) % colors.length];
    return { name: room.name, avatar: room.name[0].toUpperCase(), color: c };
  };

  const formatTime = (ts) => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleTimeString("ru", { hour: "2-digit", minute: "2-digit" });
  };

  if (splash) return <ZRQSplash onDone={() => setSplash(false)} />;
  if (!user) return <AuthScreen onLogin={u => setUser(u)} />;

  return (
    <>
      <style>{css}</style>
      <div style={{ display: "flex", height: "100vh", background: C.bg, overflow: "hidden" }}>

        {/* Sidebar */}
        <div style={{
          width: activeRoom ? "0px" : "100%",
          maxWidth: 360,
          flexShrink: 0,
          borderRight: `1px solid ${C.border}`,
          display: "flex", flexDirection: "column",
          background: C.surface,
          transition: "width 0.25s ease",
          overflow: "hidden",
          // On wide screens always show
          ...(typeof window !== "undefined" && window.innerWidth >= 768 ? { width: 320 } : {}),
        }}>
          {/* Header */}
          <div style={{ padding: "16px 16px 12px", borderBottom: `1px solid ${C.border}` }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <div style={{
                  width: 36, height: 36, borderRadius: 10,
                  background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: 15, fontWeight: 900, color: "#fff", fontFamily: "'DM Mono', monospace",
                  animation: "glow 3s ease-in-out infinite",
                }}>Z</div>
                <div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: C.text }}>ZRQ Chat</div>
                  <div style={{ fontSize: 10, color: C.textLow, fontFamily: "'DM Mono', monospace" }}>{user.username}</div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => setNewChat(true)} style={{
                  width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
                  background: C.accentGlow, color: C.accentHigh, cursor: "pointer", fontSize: 18,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>✦</button>
                <button onClick={() => { localStorage.removeItem("zrq_chat_user"); setUser(null); setActiveRoom(null); }} style={{
                  width: 36, height: 36, borderRadius: 10, border: `1px solid ${C.border}`,
                  background: "transparent", color: C.textLow, cursor: "pointer", fontSize: 14,
                  display: "flex", alignItems: "center", justifyContent: "center",
                }}>⏻</button>
              </div>
            </div>
          </div>

          {/* Rooms */}
          <div style={{ flex: 1, overflowY: "auto" }}>
            {rooms.length === 0 && (
              <div style={{ padding: 32, textAlign: "center", color: C.textLow }}>
                <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>💬</div>
                <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 6 }}>Нет чатов</div>
                <div style={{ fontSize: 12 }}>Нажми ✦ чтобы начать</div>
              </div>
            )}
            {rooms.map(room => {
              const disp = getRoomDisplay(room);
              const last = lastMsgs[room.id];
              const isActive = activeRoom?.id === room.id;
              return (
                <div key={room.id} onClick={() => setActiveRoom(room)} style={{
                  padding: "14px 16px", cursor: "pointer", borderBottom: `1px solid ${C.border}`,
                  background: isActive ? C.accentGlow : "transparent",
                  borderLeft: `2px solid ${isActive ? C.accent : "transparent"}`,
                  display: "flex", alignItems: "center", gap: 12, transition: "all 0.1s",
                  animation: "fadeIn 0.3s ease",
                }}>
                  <div style={{
                    width: 44, height: 44, borderRadius: room.is_group ? 12 : "50%",
                    background: disp.color, flexShrink: 0,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 17, fontWeight: 700, color: "#fff",
                  }}>{disp.avatar}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 14, fontWeight: 700, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{disp.name}</span>
                      {last && <span style={{ fontSize: 10, color: C.textLow, fontFamily: "'DM Mono', monospace", flexShrink: 0 }}>{formatTime(last.created_at)}</span>}
                    </div>
                    <div style={{ fontSize: 12, color: C.textLow, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {last ? `${last.sender === user.username ? "Вы: " : ""}${last.text}` : "Нет сообщений"}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Chat area */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", minWidth: 0 }}>
          {activeRoom ? (
            <>
              {/* Chat header */}
              <div style={{ padding: "12px 16px", borderBottom: `1px solid ${C.border}`, display: "flex", alignItems: "center", gap: 12, background: C.surface }}>
                <button onClick={() => setActiveRoom(null)} style={{ background: "none", border: "none", color: C.textLow, cursor: "pointer", fontSize: 20, padding: "0 4px" }}>←</button>
                {(() => { const d = getRoomDisplay(activeRoom); return (
                  <>
                    <div style={{ width: 38, height: 38, borderRadius: activeRoom.is_group ? 10 : "50%", background: d.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15, fontWeight: 700, color: "#fff" }}>{d.avatar}</div>
                    <div>
                      <div style={{ fontSize: 15, fontWeight: 700, color: C.text }}>{d.name}</div>
                      <div style={{ fontSize: 11, color: C.textLow }}>{activeRoom.is_group ? "Группа" : "Личный чат"}</div>
                    </div>
                  </>
                ); })()}
              </div>

              {/* Messages */}
              <div style={{ flex: 1, overflowY: "auto", padding: "16px", display: "flex", flexDirection: "column", gap: 8 }}>
                {messages.length === 0 && (
                  <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: C.textLow, fontSize: 13 }}>Начните общение!</div>
                )}
                {messages.map((msg, i) => {
                  const isMine = msg.sender === user.username;
                  const showSender = !isMine && activeRoom.is_group && (i === 0 || messages[i-1].sender !== msg.sender);
                  return (
                    <div key={msg.id || i} style={{ display: "flex", justifyContent: isMine ? "flex-end" : "flex-start", animation: "msgIn 0.2s ease" }}>
                      <div style={{ maxWidth: "72%" }}>
                        {showSender && <div style={{ fontSize: 11, color: C.accentHigh, marginBottom: 3, marginLeft: 4 }}>{msg.sender}</div>}
                        <div style={{
                          padding: "10px 14px", borderRadius: isMine ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
                          background: isMine ? C.sent : C.surfaceHigh,
                          border: `1px solid ${isMine ? C.sentBorder : C.border}`,
                          fontSize: 14, color: C.text, lineHeight: 1.5, wordBreak: "break-word",
                        }}>
                          {msg.text}
                        </div>
                        <div style={{ fontSize: 10, color: C.textLow, marginTop: 3, textAlign: isMine ? "right" : "left", fontFamily: "'DM Mono', monospace" }}>
                          {formatTime(msg.created_at)}
                        </div>
                      </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>

              {/* Input */}
              <div style={{ padding: "12px 16px", borderTop: `1px solid ${C.border}`, display: "flex", gap: 10, background: C.surface }}>
                <input
                  value={text}
                  onChange={e => setText(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && send()}
                  placeholder="Написать сообщение..."
                  style={{
                    flex: 1, padding: "11px 16px", background: C.surfaceHigh,
                    border: `1px solid ${C.border}`, borderRadius: 24,
                    color: C.text, fontSize: 14, fontFamily: "'Syne', sans-serif",
                  }}
                />
                <button onClick={send} disabled={!text.trim()} style={{
                  width: 44, height: 44, borderRadius: "50%", flexShrink: 0,
                  background: text.trim() ? "linear-gradient(135deg, #8b5cf6, #6d28d9)" : C.border,
                  border: "none", color: "#fff", fontSize: 18, cursor: text.trim() ? "pointer" : "default",
                  display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s",
                }}>↑</button>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", gap: 12 }}>
              <div style={{ fontSize: 52, opacity: 0.1 }}>💬</div>
              <div style={{ fontSize: 16, color: C.textLow, fontWeight: 600 }}>Выбери чат</div>
              <div style={{ fontSize: 13, color: C.textLow, opacity: 0.6 }}>или создай новый через ✦</div>
            </div>
          )}
        </div>
      </div>

      {newChat && (
        <NewChatModal
          currentUser={user}
          onClose={() => setNewChat(false)}
          onCreated={(room) => { setNewChat(false); loadRooms(); setActiveRoom(room); }}
        />
      )}
    </>
  );
}
