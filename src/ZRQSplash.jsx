import { useEffect, useState } from "react";

/*
  ZRQSplash — анимированная заставка ZRQ Corp.
  
  Использование:
  
  import ZRQSplash from "./ZRQSplash";
  
  function App() {
    const [splash, setSplash] = useState(true);
    if (splash) return <ZRQSplash onDone={() => setSplash(false)} />;
    return <ВашПриложение />;
  }
  
  Props:
    onDone — callback когда анимация завершена (необязательно)
    duration — длительность в мс (по умолчанию 3200)
*/

export default function ZRQSplash({ onDone, duration = 3200 }) {
  const [phase, setPhase] = useState("enter"); // enter | hold | exit | done

  useEffect(() => {
    const t1 = setTimeout(() => setPhase("hold"), 400);
    const t2 = setTimeout(() => setPhase("exit"), duration - 700);
    const t3 = setTimeout(() => {
      setPhase("done");
      onDone?.();
    }, duration);
    return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); };
  }, [duration, onDone]);

  if (phase === "done") return null;

  const exiting = phase === "exit";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Orbitron:wght@700;900&family=Rajdhani:wght@300;400&display=swap');

        @keyframes waveLeft {
          0%   { opacity: 0; transform: translateX(-120%) rotate(-8deg) scaleY(0.6); }
          60%  { opacity: 1; transform: translateX(0%) rotate(-8deg) scaleY(1); }
          100% { opacity: 1; transform: translateX(0%) rotate(-8deg) scaleY(1); }
        }
        @keyframes waveRight {
          0%   { opacity: 0; transform: translateX(120%) rotate(-8deg) scaleY(0.6); }
          60%  { opacity: 1; transform: translateX(0%) rotate(-8deg) scaleY(1); }
          100% { opacity: 1; transform: translateX(0%) rotate(-8deg) scaleY(1); }
        }
        @keyframes logoIn {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); filter: blur(24px); }
          100% { opacity: 1; transform: translate(-50%, -50%) scale(1);   filter: blur(0px); }
        }
        @keyframes corpIn {
          0%   { opacity: 0; letter-spacing: 0.6em; }
          100% { opacity: 1; letter-spacing: 0.35em; }
        }
        @keyframes glowPulse {
          0%,100% { text-shadow: 0 0 40px #a78bfa80, 0 0 80px #8b5cf640; }
          50%      { text-shadow: 0 0 60px #a78bfacc, 0 0 120px #8b5cf680, 0 0 200px #6d28d940; }
        }
        @keyframes splashExit {
          0%   { opacity: 1; transform: scale(1); }
          100% { opacity: 0; transform: scale(1.04); }
        }
        @keyframes bgEnter {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes shimmer {
          0%   { background-position: -200% center; }
          100% { background-position: 200% center; }
        }
        @keyframes particleFloat {
          0%,100% { transform: translateY(0px) translateX(0px); opacity: 0.3; }
          33%      { transform: translateY(-20px) translateX(10px); opacity: 0.7; }
          66%      { transform: translateY(10px) translateX(-8px); opacity: 0.4; }
        }
      `}</style>

      <div style={{
        position: "fixed", inset: 0, zIndex: 9999,
        display: "flex", alignItems: "center", justifyContent: "center",
        overflow: "hidden",
        animation: exiting ? "splashExit 0.7s ease-in forwards" : "bgEnter 0.5s ease forwards",
      }}>

        {/* Background gradient */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 70% 30%, #3b1d6e 0%, #1a0a3d 35%, #060818 70%, #020510 100%)",
        }} />

        {/* Extra depth layer */}
        <div style={{
          position: "absolute", inset: 0,
          background: "radial-gradient(ellipse at 20% 80%, #1e3a8a40 0%, transparent 50%)",
        }} />

        {/* Subtle particles */}
        {[...Array(12)].map((_, i) => (
          <div key={i} style={{
            position: "absolute",
            width: i % 3 === 0 ? 3 : 2,
            height: i % 3 === 0 ? 3 : 2,
            borderRadius: "50%",
            background: i % 2 === 0 ? "#8b5cf6" : "#ec4899",
            left: `${8 + i * 7.5}%`,
            top: `${15 + (i * 37) % 70}%`,
            opacity: 0.4,
            animation: `particleFloat ${2.5 + (i % 3) * 0.8}s ease-in-out ${i * 0.2}s infinite`,
          }} />
        ))}

        {/* Left wave — blue */}
        <svg
          viewBox="0 0 900 500"
          style={{
            position: "absolute", left: "-5%", top: "10%",
            width: "65%", height: "80%", pointerEvents: "none",
            animation: "waveLeft 1.2s cubic-bezier(0.22,1,0.36,1) 0.1s both",
          }}
        >
          <defs>
            <linearGradient id="waveGradL" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#60a5fa" stopOpacity="0" />
              <stop offset="40%" stopColor="#818cf8" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#a78bfa" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <filter id="blurL">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          {/* Glow path */}
          <path d="M0,350 Q200,100 500,200 T900,150" stroke="url(#waveGradL)" strokeWidth="18" fill="none" filter="url(#blurL)" opacity="0.5" />
          {/* Sharp path */}
          <path d="M0,350 Q200,100 500,200 T900,150" stroke="url(#waveGradL)" strokeWidth="3" fill="none" />
          {/* Bright core */}
          <path d="M0,350 Q200,100 500,200 T900,150" stroke="#c4b5fd" strokeWidth="1.5" fill="none" opacity="0.8" />
        </svg>

        {/* Right wave — pink/purple */}
        <svg
          viewBox="0 0 900 500"
          style={{
            position: "absolute", right: "-5%", top: "15%",
            width: "65%", height: "80%", pointerEvents: "none",
            animation: "waveRight 1.2s cubic-bezier(0.22,1,0.36,1) 0.2s both",
          }}
        >
          <defs>
            <linearGradient id="waveGradR" x1="100%" y1="0%" x2="0%" y2="0%">
              <stop offset="0%" stopColor="#f472b6" stopOpacity="0" />
              <stop offset="40%" stopColor="#e879f9" stopOpacity="0.9" />
              <stop offset="70%" stopColor="#c084fc" stopOpacity="0.6" />
              <stop offset="100%" stopColor="#8b5cf6" stopOpacity="0" />
            </linearGradient>
            <filter id="blurR">
              <feGaussianBlur stdDeviation="3" />
            </filter>
          </defs>
          <path d="M900,350 Q700,100 400,200 T0,150" stroke="url(#waveGradR)" strokeWidth="18" fill="none" filter="url(#blurR)" opacity="0.5" />
          <path d="M900,350 Q700,100 400,200 T0,150" stroke="url(#waveGradR)" strokeWidth="3" fill="none" />
          <path d="M900,350 Q700,100 400,200 T0,150" stroke="#f0abfc" strokeWidth="1.5" fill="none" opacity="0.8" />
        </svg>

        {/* Center glow behind logo */}
        <div style={{
          position: "absolute",
          width: 320, height: 320,
          borderRadius: "50%",
          background: "radial-gradient(circle, #8b5cf620 0%, #6d28d910 40%, transparent 70%)",
          filter: "blur(30px)",
          animation: phase === "hold" ? "glowPulse 2s ease-in-out infinite" : undefined,
        }} />

        {/* Logo container */}
        <div style={{
          position: "absolute",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
          textAlign: "center",
          animation: "logoIn 0.9s cubic-bezier(0.22,1,0.36,1) 0.5s both",
        }}>
          {/* ZRQ text */}
          <div style={{
            fontFamily: "'Orbitron', monospace",
            fontSize: "clamp(72px, 12vw, 120px)",
            fontWeight: 900,
            lineHeight: 1,
            background: "linear-gradient(135deg, #c4b5fd 0%, #a78bfa 25%, #818cf8 50%, #c084fc 75%, #e879f9 100%)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            backgroundClip: "text",
            animation: phase === "hold" ? "shimmer 3s linear infinite, glowPulse 2s ease-in-out infinite" : "shimmer 3s linear infinite",
            filter: "drop-shadow(0 0 30px #8b5cf660)",
            letterSpacing: "0.05em",
          }}>
            ZRQ
          </div>

          {/* CORP text */}
          <div style={{
            fontFamily: "'Rajdhani', sans-serif",
            fontSize: "clamp(14px, 2.5vw, 22px)",
            fontWeight: 300,
            color: "#c4b5fd",
            letterSpacing: "0.35em",
            marginTop: 8,
            opacity: 0,
            animation: "corpIn 0.8s ease 1.1s forwards",
            textTransform: "uppercase",
          }}>
            CORP
          </div>

          {/* Loading dots */}
          <div style={{
            display: "flex", gap: 6, justifyContent: "center",
            marginTop: 32, opacity: 0,
            animation: "corpIn 0.5s ease 1.6s forwards",
          }}>
            {[0, 1, 2].map(i => (
              <div key={i} style={{
                width: 5, height: 5, borderRadius: "50%",
                background: "#8b5cf6",
                animation: `particleFloat 1s ease-in-out ${i * 0.2}s infinite`,
              }} />
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <div style={{
          position: "absolute", bottom: 40, left: "50%",
          transform: "translateX(-50%)",
          fontFamily: "'Rajdhani', sans-serif",
          fontSize: 12, color: "#6d28d9",
          letterSpacing: "0.2em", opacity: 0,
          animation: "corpIn 0.6s ease 1.8s forwards",
          whiteSpace: "nowrap",
        }}>
          BUILDING THE FUTURE
        </div>

      </div>
    </>
  );
        }
