import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { AreaChart, Area, PieChart, Pie, Cell, BarChart, Bar, RadarChart, Radar,
  PolarGrid, PolarAngleAxis, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";

// ══════════════════════════════════════════════════════════════════════════════
// CSS ANIMATIONS — injected once
// ══════════════════════════════════════════════════════════════════════════════
const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap');
* { font-family: 'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif; box-sizing: border-box; }
pre, code, .font-mono { font-family: 'JetBrains Mono','Fira Code',monospace !important; }
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(148,163,184,0.2); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(148,163,184,0.4); }
button { cursor: pointer; transition: opacity 0.15s, transform 0.15s; }
button:hover { opacity: 0.85; }
input, textarea, select { font-family: inherit; }
.card-hover { transition: box-shadow 0.2s, transform 0.2s; }
.card-hover:hover { transform: translateY(-2px); }

@keyframes eyePulse {
  0%,100% { transform: scale(1); opacity:0.9; }
  50%      { transform: scale(1.12); opacity:1; }
}
@keyframes eyeRaysRotate {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes eyeOpenWide {
  0%   { transform: scaleY(1); }
  15%  { transform: scaleY(1.7); }
  30%  { transform: scaleY(1.5); }
  50%  { transform: scaleY(1.7); }
  70%  { transform: scaleY(1.4); }
  100% { transform: scaleY(1.7); }
}
@keyframes eyeGlowPulse {
  0%,100% { filter: drop-shadow(0 0 6px #EF233C88); }
  50%     { filter: drop-shadow(0 0 18px #EF233Ccc); }
}
@keyframes irisSpinSlow {
  from { transform: rotate(0deg); }
  to   { transform: rotate(360deg); }
}
@keyframes fadeSlideUp {
  from { opacity:0; transform:translateY(8px); }
  to   { opacity:1; transform:translateY(0); }
}
@keyframes smsSlide {
  from { opacity:0; transform:translateX(60px); }
  to   { opacity:1; transform:translateX(0); }
}
@keyframes ping {
  75%,100% { transform:scale(2); opacity:0; }
}
@keyframes kanbanDrop {
  from { opacity:0; transform:scale(0.95) translateY(-4px); }
  to   { opacity:1; transform:scale(1)   translateY(0); }
}
@keyframes scoreRingFill {
  from { stroke-dashoffset: 200; }
}
@keyframes widgetPop {
  from { opacity:0; transform:scale(0.92); }
  to   { opacity:1; transform:scale(1); }
}
.eye-body        { transition: transform 0.4s cubic-bezier(.34,1.56,.64,1); transform-origin:24px 24px; }
.eye-alert       { animation: eyeOpenWide 1.4s ease-in-out infinite, eyeGlowPulse 0.6s ease-in-out infinite; transform-origin:24px 24px; }
.eye-iris        { transform-origin:24px 24px; animation: eyePulse 2.8s ease-in-out infinite; }
.eye-rays        { transform-origin:24px 24px; animation: eyeRaysRotate 14s linear infinite; }
.eye-iris-dash   { transform-origin:24px 24px; animation: irisSpinSlow 8s linear infinite; }
.sms-toast       { animation: smsSlide 0.35s cubic-bezier(.34,1.56,.64,1) both; }
.card-enter      { animation: fadeSlideUp 0.25s ease both; }
.kanban-card-new { animation: kanbanDrop 0.28s cubic-bezier(.34,1.56,.64,1) both; }
.widget-pop      { animation: widgetPop 0.4s cubic-bezier(.34,1.56,.64,1) both; }
`;

// ══════════════════════════════════════════════════════════════════════════════
// THEME
// ══════════════════════════════════════════════════════════════════════════════
const DARK = {
  gold:"#D97706", goldBright:"#F59E0B", electric:"#2563EB", purple:"#7C3AED",
  pink:"#DB2777", amber:"#D97706", emerald:"#059669", crimson:"#DC2626",
  bully:"#EA580C", guardian:"#4F46E5", safeWord:"#9333EA",
  bg:"#F8FAFC", bgDeep:"#F1F5F9", bgCard:"#FFFFFF",
  border:"#E2E8F0", borderGold:"rgba(217,119,6,0.18)",
  text:"#0F172A", textSub:"#475569", muted:"#94A3B8", surface:"#FFFFFF",
  shadow:"rgba(15,23,42,0.07)",
};
const LIGHT = {
  gold:"#D97706", goldBright:"#F59E0B", electric:"#2563EB", purple:"#7C3AED",
  pink:"#DB2777", amber:"#D97706", emerald:"#059669", crimson:"#DC2626",
  bully:"#EA580C", guardian:"#4F46E5", safeWord:"#9333EA",
  bg:"#F8FAFC", bgDeep:"#F1F5F9", bgCard:"#FFFFFF",
  border:"#E2E8F0", borderGold:"rgba(217,119,6,0.2)",
  text:"#0F172A", textSub:"#475569", muted:"#94A3B8", surface:"#FFFFFF",
  shadow:"rgba(149,157,165,0.12)",
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUND ENGINE — Web Audio API synthesizer
// ══════════════════════════════════════════════════════════════════════════════
const SoundEngine = (() => {
  let ctx = null;
  const init = () => {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === "suspended") ctx.resume();
  };
  const tone = (freq, type, start, dur, gain=0.18) => {
    const osc = ctx.createOscillator();
    const g   = ctx.createGain();
    osc.connect(g); g.connect(ctx.destination);
    osc.type = type; osc.frequency.setValueAtTime(freq, start);
    g.gain.setValueAtTime(gain, start);
    g.gain.exponentialRampToValueAtTime(0.001, start + dur);
    osc.start(start); osc.stop(start + dur + 0.01);
  };
  return {
    play(level) {
      try {
        init();
        const t = ctx.currentTime;
        if (level === "critical") {
          // Descending urgent tri-tone — sawtooth, fast, alarming
          tone(880, "sawtooth", t,      0.18, 0.22);
          tone(660, "sawtooth", t+0.20, 0.18, 0.22);
          tone(440, "sawtooth", t+0.40, 0.28, 0.22);
          tone(330, "sawtooth", t+0.65, 0.40, 0.18);
        } else if (level === "high") {
          // Two sharp beeps — square wave
          tone(660, "square", t,      0.12, 0.14);
          tone(660, "square", t+0.18, 0.12, 0.14);
        } else if (level === "medium") {
          // Single soft chime — sine
          tone(520, "sine", t, 0.22, 0.10);
        }
      } catch(e) {}
    }
  };
})();

// ══════════════════════════════════════════════════════════════════════════════
// ICONS
// ══════════════════════════════════════════════════════════════════════════════
const ICONS = {
  chart:"M3 3v18h18M7 16l4-4 4 4 4-8",
  message:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z",
  alert:"M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0zM12 9v4M12 17h.01",
  sparkles:"M12 2l2 7h7l-5.5 4 2 7L12 16l-5.5 4 2-7L3 9h7z",
  settings:"M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6zM19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z",
  shield:"M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z",
  users:"M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75",
  user:"M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2M12 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z",
  zap:"M13 2L3 14h9l-1 8 10-12h-9l1-8z",
  search:"M21 21l-6-6m2-5a7 7 0 1 1-14 0 7 7 0 0 1 14 0z",
  bell:"M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0",
  x:"M18 6L6 18M6 6l12 12",
  ban:"M10 10m-7 0a7 7 0 1 0 14 0 7 7 0 1 0-14 0M4.93 4.93l10.14 10.14",
  flag:"M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7",
  download:"M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3",
  cpu:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  send:"M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z",
  refresh:"M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15",
  filter:"M22 3H2l8 9.46V19l4 2v-8.54L22 3z",
  chevronR:"M9 18l6-6-6-6", chevronD:"M6 9l6 6 6-6",
  phone:"M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12a19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 3.62 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.09 6.09l.95-.95a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z",
  check:"M20 6L9 17l-5-5",
  sms:"M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2zM8 10h8M8 14h5",
  guardian:"M12 2L3 7v5c0 5.25 3.75 10.15 9 11.35C17.25 22.15 21 17.25 21 12V7l-9-5z",
  link:"M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71",
  sun:"M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42M12 5a7 7 0 1 0 0 14A7 7 0 0 0 12 5z",
  moon:"M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z",
  warn:"M12 9v4M12 17h.01M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z",
  checkin:"M9 12l2 2 4-4M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0z",
  trending:"M23 6l-9.5 9.5-5-5L1 18M17 6h6v6",
  activity:"M22 12h-4l-3 9L9 3l-3 9H2",
  fingerprint:"M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A13.916 13.916 0 0 0 8 11a4 4 0 1 1 8 0c0 1.017-.07 2.019-.203 3m-2.118 6.844A21.88 21.88 0 0 0 15.171 17m3.839 1.132c.645-2.266.99-4.659.99-7.132A8 8 0 0 0 8 4.07M3 15.364c.64-1.319 1-2.8 1-4.364 0-1.457.39-2.823 1.07-4",
  report:"M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8zM14 2v6h6M16 13H8M16 17H8M10 9H8",
  fire:"M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01",
  kanban:"M3 3h5v18H3zM9.5 3h5v11h-5zM16 3h5v14h-5z",
  phone2:"M12 18h.01M8 21h8a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2z",
  apple:"M12 2a5 5 0 0 0-5 5 5 5 0 0 0 5 5 5 5 0 0 0 5-5 5 5 0 0 0-5-5zM6.343 14.243A8 8 0 0 0 4 20h16a8 8 0 0 0-2.343-5.757",
  widget:"M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2zM9 22V12h6v10",
  sound:"M11 5L6 9H2v6h4l5 4V5zM19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07",
  mute:"M16.5 11.5A4.5 4.5 0 0 1 12 16M8 13a5 5 0 0 0 4 4.9M11 5L6 9H2v6h4l5 4V5zM1 1l22 22",
  arrowR:"M5 12h14M12 5l7 7-7 7",
  star:"M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2",
  grip:"M9 3h1v1H9zM14 3h1v1h-1zM9 8h1v1H9zM14 8h1v1h-1zM9 13h1v1H9zM14 13h1v1h-1z",
  school:"M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2zM22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z",
  discord:"M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028c.462-.63.874-1.295 1.226-1.994a.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z",
  twitch:"M11.571 4.714h1.715v5.143H11.57zm4.715 0H18v5.143h-1.714zM6 0L1.714 4.286v15.428h5.143V24l4.286-4.286h3.428L22.286 12V0zm14.571 11.143l-3.428 3.428h-3.429l-3 3v-3H6.857V1.714h13.714z",
  roblox:"M6 2l-4 4 4 12 4-4L6 2zm12 0l4 4-4 12-4-4 4-12zM2 10l4 4 12-4-4-4L2 10zm4 4l4 12 4-4L6 14z",
  compare:"M9 3H5a2 2 0 0 0-2 2v4m6-6h10a2 2 0 0 1 2 2v4M9 3v18m0 0h10a2 2 0 0 0 2-2V9M9 21H5a2 2 0 0 1-2-2V9m0 0h18",
  child:"M12 2a4 4 0 1 0 0 8 4 4 0 0 0 0-8zm-7 18a7 7 0 0 1 14 0",
  heart:"M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z",
};
const Ico = ({ name, size=16, color="currentColor", style={} }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none"
    stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
    style={{ flexShrink:0, ...style }}>
    <path d={ICONS[name]||""} />
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// ANIMATED EYE LOGO
// ══════════════════════════════════════════════════════════════════════════════
const EyeLogo = ({ size=32, C, alerting=false }) => (
  <svg width={size} height={size} viewBox="0 0 48 48" fill="none"
    style={{ filter: alerting ? `drop-shadow(0 0 10px ${C.crimson}cc)` : `drop-shadow(0 0 4px ${C.gold}44)`,
             transition:"filter 0.3s" }}>
    {/* Outer dashed ring */}
    <circle cx="24" cy="24" r="22" stroke={alerting ? C.crimson : C.gold}
      strokeWidth="0.6" strokeDasharray="3 4"
      opacity={alerting ? 0.8 : 0.5}
      style={{ transition:"stroke 0.3s" }}/>
    {/* Rotating rays group */}
    <g className="eye-rays">
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const rad=(Math.PI/180)*deg;
        return <line key={i}
          x1={24+Math.cos(rad)*13} y1={24+Math.sin(rad)*13}
          x2={24+Math.cos(rad)*(alerting?20:17)} y2={24+Math.sin(rad)*(alerting?20:17)}
          stroke={alerting ? C.crimson : C.gold} strokeWidth={alerting?"1.2":"0.8"}
          opacity={alerting ? 0.7 : 0.4}
          style={{ transition:"stroke 0.3s" }}/>;
      })}
    </g>
    {/* Eye body — opens wide on alert */}
    <g className={alerting ? "eye-alert" : "eye-body"}>
      <path
        d={alerting
          ? "M2 24 C10 6, 38 6, 46 24 C38 42, 10 42, 2 24Z"
          : "M4 24 C10 12, 38 12, 44 24 C38 36, 10 36, 4 24Z"}
        fill={alerting ? `${C.crimson}15` : `${C.gold}0A`}
        stroke={alerting ? C.crimson : C.gold} strokeWidth="1.3"
        style={{ transition:"d 0.4s, stroke 0.3s, fill 0.3s" }}/>
      {/* Iris — pulses */}
      <g className="eye-iris">
        <circle cx="24" cy="24" r={alerting?11:9}
          fill={alerting ? `${C.crimson}1A` : `${C.gold}18`}
          stroke={alerting ? C.crimson : C.goldBright} strokeWidth="1.3"
          style={{ transition:"r 0.4s, stroke 0.3s" }}/>
        {/* Spinning inner iris ring */}
        <g className="eye-iris-dash">
          <circle cx="24" cy="24" r={alerting?8:6.5}
            fill="none" stroke={alerting ? C.crimson : C.gold}
            strokeWidth="0.8" strokeDasharray="2.5 2"
            opacity="0.6"/>
        </g>
      </g>
      {/* Pupil */}
      <circle cx="24" cy="24" r={alerting?5.5:4}
        fill={alerting ? C.crimson : C.gold} opacity="0.95"
        style={{ transition:"r 0.4s, fill 0.3s" }}/>
      {/* Pupil core */}
      <circle cx="24" cy="24" r={alerting?3:2} fill="#030810"
        style={{ transition:"r 0.4s" }}/>
      {/* Highlight */}
      <circle cx={alerting?27:26.5} cy={alerting?20.5:21.5} r={alerting?1.8:1.2}
        fill="white" opacity="0.65"
        style={{ transition:"all 0.4s" }}/>
    </g>
    {/* Lashes */}
    {[
      ["M14 16.5C14 14,12 11,12 9","M14 14C12 11,10 9,9 7"],
      ["M19 13.5C19.5 11,18.5 8,19 6","M19 12C19.5 9,18 6,18 4"],
      ["M24 13C24 10.5,24 7.5,24 5","M24 12C24 9,24 6,24 3"],
      ["M29 13.5C28.5 11,29.5 8,29 6","M29 12C29 9,30 6,30 4"],
      ["M34 16.5C34 14,36 11,36 9","M34 14C36 11,38 9,39 7"],
    ].map(([normal, wide], i) => (
      <path key={i} d={alerting ? wide : normal}
        stroke={alerting ? C.crimson : C.gold} strokeWidth={alerting?"1.1":"0.8"}
        strokeLinecap="round" opacity={alerting?0.7:0.5}
        style={{ transition:"d 0.4s, stroke 0.3s" }}/>
    ))}
  </svg>
);

// ══════════════════════════════════════════════════════════════════════════════
// DATA
// ══════════════════════════════════════════════════════════════════════════════
const GUARDIAN_DATA = [
  { id:"g1", name:"Sarah Mitchell", phone:"+1 (555) 234-8901", smsEnabled:true,
    children:[
      { id:"c1", name:"Emma M.", username:"neon_cat", age:14, safetyScore:72, incidents:3, lastCheckIn:"2 min ago", checkedIn:true },
      { id:"c2", name:"Jake M.", username:"byte_monk", age:16, safetyScore:95, incidents:0, lastCheckIn:"14 min ago", checkedIn:true },
    ]},
  { id:"g2", name:"David Torres", phone:"+1 (555) 876-5432", smsEnabled:true,
    children:[
      { id:"c3", name:"Mia T.", username:"sky_arch", age:13, safetyScore:58, incidents:5, lastCheckIn:"1 hr ago", checkedIn:false },
    ]},
  { id:"g3", name:"Priya Patel", phone:"+1 (555) 112-3344", smsEnabled:false,
    children:[
      { id:"c4", name:"Arjun P.", username:"quantumQ", age:15, safetyScore:91, incidents:0, lastCheckIn:"5 min ago", checkedIn:true },
    ]},
];
const CHILD_MAP = {};
GUARDIAN_DATA.forEach(g=>g.children.forEach(c=>{ CHILD_MAP[c.username]={guardian:g,child:c}; }));

const NAMES = ["neon_cat","byte_monk","sky_arch","quantumQ","vortex99","lumen_x","d4rkwave","pix3l_fly"];
const CHANNELS = ["#general","#support","#feedback","#roblox-chat","#discord-main"];
const MSGS = [
  { text:"This feature is absolutely broken!!!", sentiment:"negative", toxic:false, bullying:false, safeWord:false, urgent:true },
  { text:"Love the new update — so smooth 🔥", sentiment:"positive", toxic:false, bullying:false, safeWord:false, urgent:false },
  { text:"When will order #4421 ship?", sentiment:"neutral", toxic:false, bullying:false, safeWord:false, urgent:false },
  { text:"I can't believe you idiots can't fix a simple bug", sentiment:"negative", toxic:true, bullying:false, safeWord:false, urgent:false },
  { text:"The new dashboard is incredible, 10/10!", sentiment:"positive", toxic:false, bullying:false, safeWord:false, urgent:false },
  { text:"Payment declined THREE times. I need help NOW", sentiment:"negative", toxic:false, bullying:false, safeWord:false, urgent:true },
  { text:"Nobody likes you here, you should disappear", sentiment:"negative", toxic:false, bullying:true, safeWord:false, urgent:false },
  { text:"Everyone in this server hates you — stop embarrassing yourself", sentiment:"negative", toxic:false, bullying:true, safeWord:false, urgent:false },
  { text:"i'm scared and i don't know what to do", sentiment:"negative", toxic:false, bullying:false, safeWord:true, urgent:true },
  { text:"Please someone help me i'm alone and scared", sentiment:"negative", toxic:false, bullying:false, safeWord:true, urgent:true },
];
const ESC = m => m.safeWord?"critical":m.bullying?"high":(m.toxic&&m.urgent)?"high":m.toxic||m.urgent?"medium":m.sentiment==="negative"?"low":null;
const ESC_COLOR = (lv,C) => ({critical:C.safeWord,high:C.crimson,medium:C.amber,low:C.pink}[lv]||C.muted);

let _id=500;
const genMsg = () => {
  const base=MSGS[Math.floor(Math.random()*MSGS.length)];
  return { ...base, id:_id++,
    user:NAMES[Math.floor(Math.random()*NAMES.length)],
    channel:CHANNELS[Math.floor(Math.random()*CHANNELS.length)],
    time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
    ts:Date.now(), escalation:ESC(base),
  };
};

let _smsId=30;
const makeSMS=(msg,g,c)=>({
  id:_smsId++,to:g.phone,guardianName:g.name,childName:c.name,childUsername:c.username,
  type:msg.safeWord?"safeword":msg.bullying?"bullying":"toxic",
  preview:msg.text.slice(0,55)+(msg.text.length>55?"…":""),
  time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
});

const HEATMAP = Array.from({length:24},(_,i)=>({
  h:`${i}:00`, bully:Math.floor(Math.random()*8), toxic:Math.floor(Math.random()*6),
}));
const WEEK = ["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d=>({
  day:d, thisWeek:Math.floor(60+Math.random()*80), lastWeek:Math.floor(50+Math.random()*70),
}));
const CHANNEL_GRADES=[
  {ch:"#general",grade:"B+",score:82,incidents:4},
  {ch:"#support",grade:"A-",score:91,incidents:1},
  {ch:"#roblox-chat",grade:"C+",score:67,incidents:14},
  {ch:"#discord-main",grade:"B",score:78,incidents:6},
  {ch:"#twitch-stream",grade:"C",score:62,incidents:19},
];

// ══════════════════════════════════════════════════════════════════════════════
// SHARED PRIMITIVES
// ══════════════════════════════════════════════════════════════════════════════
const Card = ({children,className="",glow,gold,style={},C}) => (
  <div className={`rounded-2xl ${className}`} style={{
    background:C.bgCard,
    boxShadow:gold
      ? `0 10px 25px ${C.shadow},0 0 0 1px ${C.borderGold}`
      : `0 4px 20px ${C.shadow}`,
    ...style,
  }}>{children}</div>
);

const LiveDot = ({C}) => (
  <span className="relative inline-flex h-2 w-2 mr-1.5">
    <span className="absolute inline-flex h-full w-full rounded-full opacity-75"
      style={{background:C.emerald,animation:"ping 1.2s cubic-bezier(0,0,0.2,1) infinite"}}/>
    <span className="relative inline-flex rounded-full h-2 w-2" style={{background:C.emerald}}/>
  </span>
);

const Tip = ({active,payload,label,C}) => {
  if(!active||!payload?.length) return null;
  return (
    <div className="rounded-xl p-2.5 text-xs" style={{background:C.surface,boxShadow:`0 2px 12px ${C.shadow}`}}>
      <p className="font-bold mb-1" style={{color:C.text}}>{label}</p>
      {payload.map(p=>(
        <div key={p.name} className="flex items-center gap-1.5">
          <div className="w-1.5 h-1.5 rounded-full" style={{background:p.color}}/>
          <span style={{color:C.muted}}>{p.name}:</span>
          <span style={{color:C.text}}>{p.value}</span>
        </div>
      ))}
    </div>
  );
};

const ScoreRing = ({score,C,size=48}) => {
  const color=score>=90?C.emerald:score>=70?C.amber:C.crimson;
  const r=size/2-4,circ=2*Math.PI*r,dash=(score/100)*circ;
  return (
    <div className="relative flex items-center justify-center" style={{width:size,height:size}}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={`${color}25`} strokeWidth="3"/>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth="3"
          strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
      </svg>
      <span className="absolute text-[10px] font-black" style={{color}}>{score}</span>
    </div>
  );
};

const EscBadge = ({level,C}) => {
  if(!level) return null;
  const color=ESC_COLOR(level,C);
  return (
    <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase tracking-wider flex-shrink-0"
      style={{color,background:`${color}18`}}>{level}</span>
  );
};

const Stat = ({label,value,icon,color,sub,trend,C,onClick}) => (
  <Card C={C} className={`p-5 ${onClick?"cursor-pointer":""}`} onClick={onClick}
    style={{transition:"transform 0.15s",':hover':{transform:"translateY(-2px)"}}}>
    <div className="flex items-start justify-between mb-4">
      <div className="w-11 h-11 rounded-2xl flex items-center justify-center"
        style={{background:`${color}18`}}>
        <Ico name={icon} size={20} color={color}/>
      </div>
      {sub&&(
        <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full"
          style={{background:trend==="up"?`${C.emerald}15`:`${C.crimson}12`,
                  color:trend==="up"?C.emerald:C.crimson}}>
          {trend==="up"?"↑":"↓"} {sub}
        </span>
      )}
    </div>
    <p className="text-3xl font-black leading-none mb-1" style={{color:C.text}}>{value}</p>
    <p className="text-xs font-medium" style={{color:C.muted}}>{label}</p>
  </Card>
);

// ══════════════════════════════════════════════════════════════════════════════
// SMS TOAST
// ══════════════════════════════════════════════════════════════════════════════
const SmsToast = ({sms,onClose,C}) => {
  const isSafe=sms.type==="safeword";
  const col=isSafe?C.safeWord:C.guardian;
  return (
    <div className="sms-toast fixed top-4 right-4 z-50 rounded-xl p-3 max-w-xs w-72 border"
      style={{background:C.surface,borderColor:`${col}50`,zIndex:9999}}>
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background:`${col}20`}}>
          <Ico name={isSafe?"warn":"sms"} size={14} color={col}/>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-0.5">
            <span className="text-[10px] font-black uppercase" style={{color:col}}>
              {isSafe?"⚠ SAFE WORD":"SMS → GUARDIAN"}
            </span>
            <span className="text-[9px] ml-auto" style={{color:C.muted}}>{sms.time}</span>
          </div>
          <p className="text-[11px] font-semibold" style={{color:C.text}}>{sms.guardianName}</p>
          <p className="text-[10px] mt-0.5 leading-snug" style={{color:C.muted}}>
            Re: <strong style={{color:C.text}}>{sms.childName}</strong> — "{sms.preview}"
          </p>
        </div>
        <button onClick={onClose}><Ico name="x" size={11} color={C.muted}/></button>
      </div>
      <div className="flex items-center gap-1.5 mt-2 pt-2" style={{borderTop:`1px solid ${C.border}`}}>
        <Ico name="check" size={10} color={C.emerald}/>
        <span className="text-[9px] font-bold" style={{color:C.emerald}}>Delivered · {sms.to}</span>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// SOUND INDICATOR
// ══════════════════════════════════════════════════════════════════════════════
const SoundToggle = ({on,setOn,C}) => (
  <button onClick={()=>setOn(v=>!v)}
    className="p-2 rounded-xl flex-shrink-0" title={on?"Mute alerts":"Unmute alerts"}
    style={{boxShadow:`0 2px 12px ${C.shadow}`,background:on?`${C.emerald}10`:"transparent"}}>
    <Ico name={on?"sound":"mute"} size={14} color={on?C.emerald:C.muted}/>
  </button>
);

// ══════════════════════════════════════════════════════════════════════════════
// MESSAGE ROW
// ══════════════════════════════════════════════════════════════════════════════
const MsgRow = ({msg,onFlag,onBan,C}) => {
  const isCrit=msg.safeWord, isBully=msg.bullying;
  const glowStyle=isCrit?{borderColor:`${C.safeWord}60`}
    :isBully?{borderColor:`${C.bully}50`}
    :msg.urgent?{borderColor:`${C.amber}50`}
    :msg.toxic?{borderColor:`${C.crimson}50`}:{};
  const info=CHILD_MAP[msg.user];
  const typeLabel=isCrit?"safe-word":isBully?"bullying":msg.toxic?"toxic":msg.sentiment;
  const typeColor=isCrit?C.safeWord:isBully?C.bully:msg.toxic?C.crimson
    :{positive:C.emerald,neutral:C.electric,negative:C.pink}[msg.sentiment]||C.muted;
  return (
    <div className="card-enter rounded-xl p-3 mb-2 border" style={{background:C.bgCard,borderColor:C.border,...glowStyle}}>
      {isCrit&&<div className="flex items-center gap-2 mb-2 rounded-lg px-2 py-1" style={{background:`${C.safeWord}12`}}>
        <Ico name="warn" size={12} color={C.safeWord}/>
        <span className="text-[10px] font-black uppercase" style={{color:C.safeWord}}>⚠ SAFE WORD — IMMEDIATE ACTION</span>
      </div>}
      <div className="flex items-start gap-2.5">
        <div className="w-7 h-7 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
          style={{background:C.border,color:C.textSub}}>
          {msg.user[0].toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5 mb-1 flex-wrap">
            <span className="text-sm font-semibold" style={{color:C.text}}>{msg.user}</span>
            {info&&<span className="text-[9px] px-1.5 py-0.5 rounded-full flex-shrink-0 flex items-center gap-0.5"
              style={{background:`${C.guardian}15`,color:C.guardian}}>
              <Ico name="guardian" size={8} color={C.guardian}/> monitored
            </span>}
            <span className="text-[10px]" style={{color:C.muted}}>{msg.channel}</span>
            <EscBadge level={msg.escalation} C={C}/>
            <span className="text-[10px] ml-auto flex-shrink-0" style={{color:C.muted}}>{msg.time}</span>
          </div>
          <p className="text-xs leading-relaxed mb-2" style={{color:C.textSub}}>{msg.text}</p>
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-[9px] font-bold px-2 py-0.5 rounded-full uppercase tracking-wide"
              style={{color:typeColor,background:`${typeColor}18`}}>{typeLabel}</span>
            {msg.aiConfidence!=null&&(
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full flex items-center gap-0.5"
                style={{background:C.bgCard,color:C.purple}}>
                <Ico name="sparkles" size={8} color={C.purple}/>{msg.aiConfidence}%
              </span>
            )}
            {msg.aiReason&&(
              <span className="text-[8px] truncate flex-1" style={{color:C.muted}} title={msg.aiReason}>
                {msg.aiReason.slice(0,50)}{msg.aiReason.length>50?"…":""}
              </span>
            )}
            <div className="ml-auto flex gap-1">
              <button onClick={()=>onFlag(msg.id)} className="p-1.5 rounded-lg" style={{color:C.amber,background:`${C.amber}15`}}>
                <Ico name="flag" size={11} color={C.amber}/>
              </button>
              <button onClick={()=>onBan(msg.user)} className="p-1.5 rounded-lg" style={{color:C.crimson,background:`${C.crimson}15`}}>
                <Ico name="ban" size={11} color={C.crimson}/>
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ██╗  ██╗ █████╗ ███╗   ██╗██████╗  █████╗ ███╗   ██╗
// ██║ ██╔╝██╔══██╗████╗  ██║██╔══██╗██╔══██╗████╗  ██║
// █████╔╝ ███████║██╔██╗ ██║██████╔╝███████║██╔██╗ ██║
// ██╔═██╗ ██╔══██║██║╚██╗██║██╔══██╗██╔══██║██║╚██╗██║
// ██║  ██╗██║  ██║██║ ╚████║██████╔╝██║  ██║██║ ╚████║
// ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═══╝╚═════╝ ╚═╝  ╚═╝╚═╝  ╚═══╝
// ══════════════════════════════════════════════════════════════════════════════
const KANBAN_COLS = [
  { id:"review",   label:"🔍 Review",   color:"#FFB703", desc:"Needs moderator review" },
  { id:"actioned", label:"⚡ Actioned", color:"#9B5DE5", desc:"Action taken, monitoring" },
  { id:"resolved", label:"✅ Resolved", color:"#06D6A0", desc:"Issue resolved & closed" },
];

const INIT_KANBAN = [
  { id:"k1", col:"review",   user:"vortex99",  text:"I can't believe you idiots can't fix a simple bug",  escalation:"medium", type:"toxic",    channel:"#support",     time:"3:42 PM", assignee:"mod_alpha" },
  { id:"k2", col:"review",   user:"neon_cat",  text:"Nobody likes you here, you should disappear",         escalation:"high",   type:"bullying", channel:"#roblox-chat", time:"3:39 PM", assignee:null },
  { id:"k3", col:"review",   user:"sky_arch",  text:"i'm scared and i don't know what to do",              escalation:"critical",type:"safeword",channel:"#general",     time:"3:35 PM", assignee:"mod_beta" },
  { id:"k4", col:"review",   user:"d4rkwave",  text:"System keeps crashing — UNACCEPTABLE service!!!",     escalation:"medium", type:"toxic",    channel:"#feedback",    time:"3:28 PM", assignee:null },
  { id:"k5", col:"actioned", user:"pix3l_fly", text:"Everyone hates you — stop embarrassing yourself",     escalation:"high",   type:"bullying", channel:"#discord-main",time:"3:15 PM", assignee:"mod_alpha" },
  { id:"k6", col:"actioned", user:"lumen_x",   text:"Payment declined THREE times. Help NOW",              escalation:"medium", type:"urgent",   channel:"#support",     time:"3:10 PM", assignee:"mod_beta" },
  { id:"k7", col:"resolved", user:"echo_null", text:"This is completely broken, you idiots",               escalation:"medium", type:"toxic",    channel:"#general",     time:"2:58 PM", assignee:"mod_alpha" },
  { id:"k8", col:"resolved", user:"astro_z",   text:"Nothing works, I want a refund NOW",                  escalation:"low",    type:"urgent",   channel:"#support",     time:"2:41 PM", assignee:"mod_gamma" },
];

const KanbanScreen = ({C}) => {
  const [cards, setCards] = useState(INIT_KANBAN);
  const [dragging, setDragging] = useState(null);
  const [dragOver, setDragOver] = useState(null);
  const [detail, setDetail] = useState(null);
  const [filter, setFilter] = useState("all");

  const handleDragStart = (e, card) => {
    setDragging(card.id);
    e.dataTransfer.effectAllowed = "move";
  };
  const handleDragOver = (e, colId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    setDragOver(colId);
  };
  const handleDrop = (e, colId) => {
    e.preventDefault();
    if (dragging) {
      setCards(prev => prev.map(c => c.id === dragging ? {...c, col:colId} : c));
    }
    setDragging(null);
    setDragOver(null);
  };
  const handleDragEnd = () => { setDragging(null); setDragOver(null); };

  const moveCard = (cardId, direction) => {
    const colOrder = KANBAN_COLS.map(c=>c.id);
    setCards(prev => prev.map(c => {
      if (c.id !== cardId) return c;
      const idx = colOrder.indexOf(c.col);
      const next = colOrder[idx + direction];
      return next ? {...c, col:next} : c;
    }));
  };

  const typeColor = (type, C) => ({
    critical:C.safeWord, bullying:C.bully, toxic:C.crimson, urgent:C.amber, safeword:C.safeWord
  }[type] || C.muted);

  const filteredCards = filter === "all" ? cards : cards.filter(c => c.type === filter || c.escalation === filter);

  const counts = KANBAN_COLS.reduce((acc,col) => {
    acc[col.id] = filteredCards.filter(c=>c.col===col.id).length;
    return acc;
  }, {});

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-2 px-3 py-2.5 border-b flex-shrink-0"
        style={{borderColor:C.border, background:`${C.bgDeep}99`}}>
        <Ico name="kanban" size={14} color={C.gold}/>
        <span className="text-xs font-black" style={{color:C.text}}>Moderator Queue</span>
        <div className="flex gap-1 ml-3">
          {["all","critical","high","bullying","toxic","safeword"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)}
              className="px-2 py-0.5 rounded-lg text-[10px] font-bold capitalize"
              style={{background:filter===f?`${C.electric}20`:"transparent",color:filter===f?C.electric:C.muted,border:filter===f?`1px solid ${C.electric}40`:`1px solid ${C.border}`}}>
              {f}
            </button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-3">
          {KANBAN_COLS.map(col=>(
            <div key={col.id} className="flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{background:col.color}}/>
              <span className="text-[10px] font-bold" style={{color:C.muted}}>{counts[col.id]}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden flex gap-0">
        {KANBAN_COLS.map((col, ci) => {
          const colCards = filteredCards.filter(c=>c.col===col.id);
          const isOver = dragOver === col.id;
          return (
            <div key={col.id}
              className="flex-1 flex flex-col border-r last:border-r-0"
              style={{borderColor:C.border, background:isOver?`${col.color}06`:"transparent", transition:"background 0.2s"}}
              onDragOver={e=>handleDragOver(e,col.id)}
              onDrop={e=>handleDrop(e,col.id)}>

              {/* Column header */}
              <div className="px-3 py-2.5 border-b flex-shrink-0 flex items-center gap-2"
                style={{borderColor:C.border}}>
                <div className="w-2 h-2 rounded-full flex-shrink-0" style={{background:col.color}}/>
                <span className="text-xs font-black" style={{color:C.text}}>{col.label}</span>
                <span className="ml-auto text-[11px] font-black px-1.5 py-0.5 rounded-full"
                  style={{background:`${col.color}20`,color:col.color}}>{colCards.length}</span>
              </div>

              {/* Cards */}
              <div className="flex-1 overflow-y-auto p-2 space-y-2">
                {isOver && dragging && (
                  <div className="rounded-xl border-2 border-dashed h-16"
                    style={{borderColor:col.color,background:`${col.color}08`}}/>
                )}
                {colCards.map(card=>{
                  const tc = typeColor(card.type, C);
                  const ec = ESC_COLOR(card.escalation, C);
                  const isDrag = dragging === card.id;
                  const info = CHILD_MAP[card.user];
                  return (
                    <div key={card.id}
                      className="kanban-card-new rounded-xl p-3 border cursor-grab active:cursor-grabbing"
                      draggable
                      onDragStart={e=>handleDragStart(e,card)}
                      onDragEnd={handleDragEnd}
                      onClick={()=>setDetail(detail?.id===card.id?null:card)}
                      style={{
                        background:C.bgCard, borderColor:C.border,
                        opacity:isDrag?0.4:1, transition:"opacity 0.15s",
                        boxShadow:card.escalation==="critical"?`0 0 12px ${C.safeWord}30`
                          :card.escalation==="high"?`0 0 8px ${C.crimson}20`:"none",
                      }}>

                      {/* Card top row */}
                      <div className="flex items-center gap-2 mb-2">
                        <Ico name="grip" size={12} color={C.muted}/>
                        <div className="w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black flex-shrink-0"
                          style={{background:C.border,color:C.textSub}}>
                          {card.user[0].toUpperCase()}
                        </div>
                        <span className="text-[10px] font-bold truncate flex-1" style={{color:C.text}}>{card.user}</span>
                        {info&&<Ico name="guardian" size={9} color={C.guardian}/>}
                        <span className="text-[9px] flex-shrink-0" style={{color:C.muted}}>{card.time}</span>
                      </div>

                      {/* Message */}
                      <p className="text-[10px] leading-snug mb-2 line-clamp-2" style={{color:C.textSub}}>{card.text}</p>

                      {/* Badges */}
                      <div className="flex items-center gap-1 flex-wrap">
                        <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase"
                          style={{color:tc,background:`${tc}18`}}>{card.type}</span>
                        <EscBadge level={card.escalation} C={C}/>
                        <span className="text-[9px]" style={{color:C.muted}}>{card.channel}</span>
                        {card.assignee&&(
                          <span className="ml-auto text-[9px] px-1.5 py-0.5 rounded-full"
                            style={{background:`${C.purple}15`,color:C.purple}}>
                            @{card.assignee}
                          </span>
                        )}
                      </div>

                      {/* Expanded detail */}
                      {detail?.id===card.id&&(
                        <div className="mt-2.5 pt-2.5" style={{borderTop:`1px solid ${C.border}`}}
                          onClick={e=>e.stopPropagation()}>
                          <p className="text-[10px] font-bold mb-1.5" style={{color:C.muted}}>MOVE TO</p>
                          <div className="flex gap-1.5">
                            {KANBAN_COLS.filter(c=>c.id!==card.col).map(destCol=>(
                              <button key={destCol.id}
                                onClick={()=>{ setCards(prev=>prev.map(c=>c.id===card.id?{...c,col:destCol.id}:c)); setDetail(null); }}
                                className="flex-1 py-1.5 rounded-lg text-[9px] font-bold"
                                style={{background:`${destCol.color}15`,color:destCol.color}}>
                                → {destCol.id.charAt(0).toUpperCase()+destCol.id.slice(1)}
                              </button>
                            ))}
                          </div>
                          {!card.assignee&&(
                            <div className="mt-2 flex gap-1.5 flex-wrap">
                              {["mod_alpha","mod_beta","mod_gamma"].map(mod=>(
                                <button key={mod} onClick={()=>setCards(prev=>prev.map(c=>c.id===card.id?{...c,assignee:mod}:c))}
                                  className="px-2 py-1 rounded-lg text-[9px] font-bold"
                                  style={{background:C.bgCard,color:C.purple}}>
                                  Assign @{mod}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}

                {colCards.length===0&&!isOver&&(
                  <div className="flex flex-col items-center justify-center py-8 opacity-30">
                    <Ico name="check" size={24} color={C.muted}/>
                    <p className="text-[10px] mt-1" style={{color:C.muted}}>Empty</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="px-3 py-2 border-t flex-shrink-0 flex items-center gap-3" style={{borderColor:C.border}}>
        <span className="text-[9px]" style={{color:C.muted}}>Drag cards between columns · Click card for actions</span>
        <div className="ml-auto flex items-center gap-3">
          {[["critical",C.safeWord],["high",C.crimson],["medium",C.amber]].map(([l,c])=>(
            <div key={l} className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{background:c}}/>
              <span className="text-[9px] capitalize" style={{color:C.muted}}>{l}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// REACT NATIVE PREVIEW SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const RNScreen = ({C, alerts, smsLog}) => {
  const [tab, setTab] = useState("widget");
  const children = GUARDIAN_DATA.flatMap(g=>g.children);

  const PhoneFrame = ({children: content}) => (
    <div className="relative mx-auto" style={{width:220,height:440}}>
      {/* Phone body */}
      <div className="absolute inset-0 rounded-3xl border-4"
        style={{background:"#0A0A0A",borderColor:"#2A2A2A",boxShadow:"0 20px 60px rgba(0,0,0,0.5)"}}>
        {/* Camera notch */}
        <div className="absolute top-3 left-1/2 -translate-x-1/2 w-16 h-1.5 rounded-full" style={{background:"#1A1A1A"}}/>
        {/* Screen */}
        <div className="absolute inset-2 rounded-xl overflow-hidden"
          style={{background:"#F8FAFC",top:10}}>
          {content}
        </div>
        {/* Home indicator */}
        <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-12 h-1 rounded-full" style={{background:"#3A3A3A"}}/>
      </div>
    </div>
  );

  const HomeScreenWidget = ({score, childName, incidents, checkedIn}) => {
    const scoreColor = score>=90?"#06D6A0":score>=70?"#FFB703":"#EF233C";
    const r=28, circ=2*Math.PI*r, dash=(score/100)*circ;
    return (
      <div className="widget-pop rounded-xl p-3 m-2" style={{
        background:C.bgDeep,
        border:`1px solid rgba(201,168,76,0.3)`,
        boxShadow:"0 4px 20px rgba(0,0,0,0.4)",
      }}>
        <div className="flex items-center gap-2 mb-2">
          <div style={{width:18,height:18,flexShrink:0}}>
            <svg viewBox="0 0 48 48" fill="none" width={18} height={18}>
              <path d="M4 24 C10 12, 38 12, 44 24 C38 36, 10 36, 4 24Z" fill="rgba(201,168,76,0.15)" stroke="#C9A84C" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="9" fill="rgba(201,168,76,0.2)" stroke="#F0C040" strokeWidth="1.5"/>
              <circle cx="24" cy="24" r="4" fill="#C9A84C"/>
            </svg>
          </div>
          <div>
            <p className="text-[8px] font-black" style={{color:C.gold,lineHeight:1}}>APEX INTEGRITY</p>
            <p className="text-[6px]" style={{color:C.muted,lineHeight:1}}>Safety Monitor</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <div className="relative" style={{width:64,height:64}}>
            <svg width={64} height={64} viewBox="0 0 64 64">
              <circle cx="32" cy="32" r={r} fill="none" stroke={`${scoreColor}25`} strokeWidth="4"/>
              <circle cx="32" cy="32" r={r} fill="none" stroke={scoreColor} strokeWidth="4"
                strokeDasharray={`${dash} ${circ-dash}`} strokeDashoffset={circ/4} strokeLinecap="round"/>
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-[14px] font-black leading-none" style={{color:scoreColor}}>{score}</span>
              <span className="text-[6px]" style={{color:C.muted}}>score</span>
            </div>
          </div>
          <div className="flex-1">
            <p className="text-[11px] font-black" style={{color:C.text}}>{childName}</p>
            <p className="text-[8px] mb-1" style={{color:C.muted}}>{incidents} incident{incidents!==1?"s":""} this week</p>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 rounded-full" style={{background:checkedIn?"#06D6A0":"#FFB703"}}/>
              <span className="text-[8px]" style={{color:checkedIn?"#06D6A0":"#FFB703"}}>{checkedIn?"Checked in":"No check-in"}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const AppHome = () => (
    <div className="h-full flex flex-col" style={{background:"#F8FAFC"}}>
      {/* Status bar */}
      <div className="flex items-center justify-between px-3 py-1.5 flex-shrink-0">
        <span className="text-[8px] font-bold" style={{color:C.muted}}>9:41</span>
        <span className="text-[8px]" style={{color:C.muted}}>●●●</span>
      </div>
      {/* Header */}
      <div className="px-3 pb-2 flex-shrink-0">
        <p className="text-[10px] font-black" style={{color:C.gold}}>Good morning 👋</p>
        <p className="text-[7px]" style={{color:C.muted}}>2 children monitored</p>
      </div>
      {/* Alert banner */}
      {alerts.filter(a=>a.safeWord).length>0&&(
        <div className="mx-2 mb-2 rounded-xl p-2 flex-shrink-0" style={{background:"rgba(255,0,255,0.1)",border:"1px solid rgba(255,0,255,0.3)"}}>
          <p className="text-[8px] font-black" style={{color:"#FF00FF"}}>⚠ SAFE WORD DETECTED</p>
          <p className="text-[7px]" style={{color:C.textSub}}>Immediate attention required</p>
        </div>
      )}
      {/* Children scores */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1.5">
        {children.map(child=>{
          const sc=child.safetyScore>=90?"#06D6A0":child.safetyScore>=70?"#FFB703":"#EF233C";
          return (
            <div key={child.id} className="rounded-xl p-2.5 flex items-center gap-2.5"
              style={{background:"rgba(255,255,255,0.04)",border:"1px solid rgba(255,255,255,0.08)"}}>
              <ScoreRing score={child.safetyScore} C={DARK} size={36}/>
              <div className="flex-1 min-w-0">
                <p className="text-[9px] font-bold" style={{color:C.text}}>{child.name}</p>
                <p className="text-[7px]" style={{color:C.muted}}>@{child.username} · Age {child.age}</p>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <div className="w-1 h-1 rounded-full" style={{background:child.checkedIn?"#06D6A0":"#FFB703"}}/>
                  <span className="text-[7px]" style={{color:C.muted}}>{child.lastCheckIn}</span>
                </div>
              </div>
              {child.incidents>0&&(
                <span className="text-[7px] font-black px-1.5 py-0.5 rounded-full"
                  style={{background:"rgba(239,35,60,0.2)",color:"#EF233C"}}>{child.incidents}</span>
              )}
            </div>
          );
        })}
      </div>
      {/* Bottom nav */}
      <div className="flex border-t flex-shrink-0" style={{borderColor:"rgba(255,255,255,0.08)",paddingBottom:8,background:C.bgCard}}>
        {[["home","Home"],["bell","Alerts"],["sms","SMS"],["settings","Settings"]].map(([ic,lb])=>(
          <div key={lb} className="flex-1 flex flex-col items-center py-1.5 gap-0.5">
            <Ico name={ic} size={12} color={ic==="home"?"#C9A84C":"#6B7FA3"}/>
            <span className="text-[6px]" style={{color:ic==="home"?"#C9A84C":"#6B7FA3"}}>{lb}</span>
          </div>
        ))}
      </div>
    </div>
  );

  const HomeScreenView = () => (
    <div className="h-full flex flex-col" style={{background:C.bgDeep}}>
      <div className="flex items-center justify-between px-3 py-1.5">
        <span className="text-[8px] font-bold" style={{color:"rgba(255,255,255,0.6)"}}>9:41</span>
        <span className="text-[8px]" style={{color:"rgba(255,255,255,0.6)"}}>●●●</span>
      </div>
      <div className="text-center py-3 flex-shrink-0">
        <p className="text-[22px] font-light" style={{color:"white"}}>9:41</p>
        <p className="text-[9px]" style={{color:"rgba(255,255,255,0.6)"}}>Wednesday, Feb 25</p>
      </div>
      <div className="px-2 space-y-2">
        {children.slice(0,2).map(child=>(
          <HomeScreenWidget key={child.id} score={child.safetyScore}
            childName={child.name} incidents={child.incidents} checkedIn={child.checkedIn}/>
        ))}
      </div>
      <div className="mt-3 mx-4 grid grid-cols-4 gap-2">
        {["📱","📸","🗺️","⚙️"].map((em,i)=>(
          <div key={i} className="aspect-square rounded-xl flex items-center justify-center text-base"
            style={{background:"rgba(255,255,255,0.15)"}}>{em}</div>
        ))}
      </div>
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2">
        <div className="flex gap-3 px-4 py-2 rounded-xl" style={{background:"rgba(255,255,255,0.12)"}}>
          {["📞","📧","🛡️","🔔"].map((em,i)=><span key={i} className="text-lg">{em}</span>)}
        </div>
      </div>
    </div>
  );

  const CodeSnippet = ({title, code, color}) => (
    <div className="rounded-xl overflow-hidden mb-3">
      <div className="px-3 py-1.5 flex items-center gap-2" style={{background:`${color}15`}}>
        <div className="w-1.5 h-1.5 rounded-full" style={{background:color}}/>
        <span className="text-[10px] font-black" style={{color}}>{title}</span>
      </div>
      <pre className="px-3 py-2.5 text-[9px] leading-relaxed overflow-x-auto"
        style={{background:C.bgDeep,color:C.textSub,fontFamily:"monospace"}}>
        {code}
      </pre>
    </div>
  );

  return (
    <div className="p-5 space-y-5 min-h-full">
      {/* Header */}
      <Card C={C} gold className="p-4">
        <div className="flex items-center gap-3">
          <EyeLogo size={40} C={C}/>
          <div>
            <p className="text-sm font-black" style={{color:C.gold}}>React Native App</p>
            <p className="text-xs" style={{color:C.muted}}>iOS & Android · Home Screen Widget</p>
          </div>
          <div className="ml-auto flex gap-1.5">
            {[
              {label:"iOS",color:C.electric},
              {label:"Android",color:C.emerald},
            ].map(({label,color})=>(
              <span key={label} className="text-[10px] font-black px-2 py-1 rounded-lg"
                style={{background:`${color}15`,color}}>{label}</span>
            ))}
          </div>
        </div>
      </Card>

      {/* Tab selector */}
      <div className="flex gap-2">
        {[
          {id:"widget",label:"🏠 Home Widget"},
          {id:"app",label:"📱 App Home"},
          {id:"code",label:"</> RN Code"},
          {id:"setup",label:"⚙️ Setup"},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-bold"
            style={{background:tab===t.id?`${C.electric}20`:"transparent",color:tab===t.id?C.electric:C.muted,border:`1px solid ${tab===t.id?C.electric+"40":C.border}`}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Phone mockups */}
      {(tab==="widget"||tab==="app")&&(
        <div className="flex justify-center py-4">
          <PhoneFrame>
            {tab==="widget" ? <HomeScreenView/> : <AppHome/>}
          </PhoneFrame>
        </div>
      )}

      {/* Code tab */}
      {tab==="code"&&(
        <div className="space-y-0">
          <CodeSnippet title="SafetyWidget.tsx — Home Screen Widget" color={C.electric} code={
[
  "// SafetyWidget.tsx",
  "// pkg: @apex/widget, @apex/hooks",
  "",
  "export default function Widget() {",
  "  const { child, score, incidents } =",
  "    useChildSafety();",
  "",
  "  return (",
  "    <WidgetContainer>",
  "      <EyeLogo alerting={incidents > 0} />",
  "      <ScoreRing value={score} />",
  "      <Text>{child.name}</Text>",
  "      <StatusBadge",
  "        checked={child.isOnline}",
  "        score={score}",
  "      />",
  "    </WidgetContainer>",
  "  );",
  "}",
].join("\n")} />
          <CodeSnippet title="useSoundAlerts.ts — Sound Engine" color={C.amber} code={
[
  "// useSoundAlerts.ts",
  "// pkg: expo-av (Audio)",
  "",
  "export const useSoundAlerts = () => {",
  "  const playAlert = async (level) => {",
  "    const sounds = {",
  "      critical: require('./critical.wav'),",
  "      high:     require('./high.wav'),",
  "      medium:   require('./medium.wav'),",
  "    };",
  "    const { sound } = await Audio.Sound",
  "      .createAsync(sounds[level]);",
  "    await sound.playAsync();",
  "  };",
  "  return { playAlert };",
  "};",
].join("\n")} />
          <CodeSnippet title="PushNotification.ts — Guardian alerts" color={C.guardian} code={
[
  "// PushNotification.ts",
  "// pkg: expo-notifications",
  "",
  "Notifications.setNotificationHandler({",
  "  handleNotification: async () => ({",
  "    shouldShowAlert: true,",
  "    shouldPlaySound: true,",
  "    shouldSetBadge:  true,",
  "  }),",
  "});",
  "",
  "export const sendGuardianAlert = async (",
  "  incident",
  ") => {",
  "  await Notifications",
  "    .scheduleNotificationAsync({",
  "      content: {",
  "        title: '⚠ Apex Integrity Alert',",
  "        body: incident.childName,",
  "        data: { id: incident.id },",
  "      },",
  "      trigger: null,",
  "    });",
  "};",
].join("\n")} />
        </div>
      )}

      {/* Setup tab */}
      {tab==="setup"&&(
          <Card C={C} className="p-4">
          <p className="text-xs font-black mb-4" style={{color:C.text}}>Project Setup</p>
          {[
            {step:1, cmd:"npx create-expo-app ApexIntegrityLabs \\\n  --template expo-template-blank-typescript", color:C.electric},
            {step:2, cmd:"cd ApexIntegrityLabs\nnpx expo install \\\n  expo-notifications \\\n  expo-av \\\n  expo-background-fetch", color:C.purple},
            {step:3, cmd:"npx expo install \\\n  react-native-widget-extension \\\n  @shopify/react-native-skia", color:C.emerald},
            {step:4, cmd:"npx expo prebuild\nnpx expo run:ios", color:C.gold},
          ].map(({step,cmd,color})=>(
            <div key={step} className="flex items-start gap-3 mb-3">
              <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0"
                style={{background:`${color}20`,color}}>
                {step}
              </div>
              <pre className="flex-1 text-[9px] p-2 rounded-lg overflow-x-auto"
                style={{background:C.bgDeep,color:C.textSub,fontFamily:"monospace",lineHeight:1.5}}>
                {cmd}
              </pre>
            </div>
          ))}
          <div className="mt-3 p-3 rounded-xl" style={{background:`${C.amber}10`}}>
            <p className="text-[10px] font-bold mb-1" style={{color:C.amber}}>📦 Key Dependencies</p>
            {[
              ["expo-notifications (pkg)","Push notification delivery"],
              ["expo-av (pkg)","Sound alert playback"],
              ["react-native-widget-extension","iOS home screen widget"],
              ["expo-background-fetch (pkg)","Background monitoring"],
              ["@shopify/react-native-skia","Animated eye rendering"],
            ].map(([pkg,desc])=>(
              <div key={pkg} className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-bold" style={{color:C.electric}}>{pkg}</span>
                <span className="text-[9px]" style={{color:C.muted}}>— {desc}</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════

// ══════════════════════════════════════════════════════════════════════════════
// MULTI-PROVIDER AI CLASSIFIER ENGINE
// Claude · Llama-3 via Groq · Llama via Ollama (local) · GPT-4o · Gemini Flash
// ══════════════════════════════════════════════════════════════════════════════

const AI_PROVIDERS = {
  claude: {
    id: "claude",
    name: "Claude Sonnet",
    maker: "Anthropic",
    color: "#C9A84C",
    badge: "claude-sonnet-4-20250514",
    icon: "sparkles",
    strengths: ["Context nuance","Safe-word detection","Low false positives"],
    throughput: "~60 req/min (free tier) · ~3,000 req/min (scaled)",
    latency: "~1.2s",
    costPer1k: "$0.003",
    bestFor: "Highest accuracy · Production safety systems",
    endpoint: "https://api.anthropic.com/v1/messages",
  },
  groq_llama: {
    id: "groq_llama",
    name: "Llama 3.3 70B",
    maker: "Meta · via Groq",
    color: "#7C3AED",
    badge: "llama-3.3-70b-versatile",
    icon: "zap",
    strengths: ["Ultra-fast (300 tok/s)","High volume","OpenAI-compatible"],
    throughput: "~30 req/s free · unlimited paid",
    latency: "~0.3s",
    costPer1k: "$0.0006",
    bestFor: "High-volume live stream moderation",
    endpoint: "https://api.groq.com/openai/v1/chat/completions",
  },
  ollama_llama: {
    id: "ollama_llama",
    name: "Llama 3.1 8B",
    maker: "Meta · Ollama local",
    color: "#059669",
    badge: "llama3.1",
    icon: "cpu",
    strengths: ["100% private","No API costs","No rate limits","COPPA/GDPR safe"],
    throughput: "Unlimited (CPU: ~15 tok/s · GPU: ~200+ tok/s)",
    latency: "0.5–3s (hardware dependent)",
    costPer1k: "$0.00 (self-hosted)",
    bestFor: "Schools with privacy requirements · air-gapped environments",
    endpoint: "http://localhost:11434/api/chat",
  },
  openai: {
    id: "openai",
    name: "GPT-4o Mini",
    maker: "OpenAI",
    color: "#10A37F",
    badge: "gpt-4o-mini",
    icon: "activity",
    strengths: ["JSON mode native","Fast","Wide community support"],
    throughput: "~500 req/min (tier 1) · 10,000+ (enterprise)",
    latency: "~0.8s",
    costPer1k: "$0.0002",
    bestFor: "Cost-efficient at massive scale",
    endpoint: "https://api.openai.com/v1/chat/completions",
  },
  gemini: {
    id: "gemini",
    name: "Gemini 2.0 Flash",
    maker: "Google",
    color: "#4285F4",
    badge: "gemini-2.0-flash",
    icon: "trending",
    strengths: ["1M token context","Multimodal (image+text)","Very fast"],
    throughput: "~2,000 req/min free · 4M+ paid",
    latency: "~0.5s",
    costPer1k: "$0.0001",
    bestFor: "Image/screenshot moderation · massive context windows",
    endpoint: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent",
  },
};

const FEW_SHOT_EXAMPLES = [
  { role:"user", content:`Classify this chat message:\n"you're so annoying lol stop talking"` },
  { role:"assistant", content:`{"toxic":false,"bullying":false,"safeWord":false,"sentiment":"negative","escalation":"low","confidence":{"toxic":12,"bullying":28,"safeWord":2,"overall":28},"reason":"Mildly dismissive but not targeted harassment — common internet rudeness without intent to harm.","suggestedAction":"log_only"}` },
  { role:"user", content:`Classify this chat message:\n"nobody here likes you, you should quit and never come back, EVERYONE agrees"` },
  { role:"assistant", content:`{"toxic":false,"bullying":true,"safeWord":false,"sentiment":"negative","escalation":"high","confidence":{"toxic":45,"bullying":91,"safeWord":5,"overall":91},"reason":"Coordinated exclusion language — 'nobody', 'everyone agrees' are classic pile-on tactics designed to isolate the target.","suggestedAction":"alert_guardian_sms"}` },
  { role:"user", content:`Classify this chat message:\n"I can't believe you idiots can't fix a simple bug"` },
  { role:"assistant", content:`{"toxic":true,"bullying":false,"safeWord":false,"sentiment":"negative","escalation":"medium","confidence":{"toxic":78,"bullying":15,"safeWord":0,"overall":78},"reason":"Direct insult at a group ('idiots') — toxic frustration venting, not targeted personal harassment.","suggestedAction":"moderator_queue"}` },
  { role:"user", content:`Classify this chat message:\n"i don't feel safe and i'm scared please someone help me"` },
  { role:"assistant", content:`{"toxic":false,"bullying":false,"safeWord":true,"sentiment":"negative","escalation":"critical","confidence":{"toxic":5,"bullying":10,"safeWord":97,"overall":97},"reason":"Multiple distress signals — 'scared', 'don't feel safe', 'please help'. Immediate welfare check required.","suggestedAction":"immediate_alert_guardian_counselor"}` },
  { role:"user", content:`Classify this chat message:\n"gg wp, that was a great match!"` },
  { role:"assistant", content:`{"toxic":false,"bullying":false,"safeWord":false,"sentiment":"positive","escalation":null,"confidence":{"toxic":2,"bullying":1,"safeWord":0,"overall":2},"reason":"Standard gaming sportsmanship — entirely positive interaction.","suggestedAction":"none"}` },
  { role:"user", content:`Classify this chat message:\n"you're ugly and fat and nobody will ever like you, go cry to your mommy"` },
  { role:"assistant", content:`{"toxic":true,"bullying":true,"safeWord":false,"sentiment":"negative","escalation":"high","confidence":{"toxic":95,"bullying":96,"safeWord":8,"overall":96},"reason":"Personal appearance attacks combined with social rejection — severe targeted bullying designed to cause psychological harm.","suggestedAction":"alert_guardian_sms"}` },
];

const SYSTEM_PROMPT = `You are a child safety AI classifier for the Apex Integrity Labs platform. Your job is to analyze chat messages from online platforms used by children (ages 10-18) and classify them for safety risks.

Respond ONLY with valid JSON — no prose, no markdown, no explanation outside the JSON.

Output schema:
{
  "toxic": boolean,
  "bullying": boolean,
  "safeWord": boolean,
  "sentiment": "positive" | "neutral" | "negative",
  "escalation": "critical" | "high" | "medium" | "low" | null,
  "confidence": {
    "toxic": 0-100,
    "bullying": 0-100,
    "safeWord": 0-100,
    "overall": 0-100
  },
  "reason": "1-2 sentence plain-English explanation of your classification",
  "suggestedAction": "none" | "log_only" | "moderator_queue" | "alert_guardian_sms" | "immediate_alert_guardian_counselor"
}

Escalation thresholds:
- critical: safeWord=true OR immediate safety concern
- high: bullying confidence >= 80 OR (toxic+bullying both true)
- medium: toxic confidence 50-79 OR urgent distress without safe words
- low: negative sentiment but confidence < 50 on all harm types
- null: neutral or positive

Route to moderator_queue for confidence 40-69 on any harm type (borderline cases).
Auto-alert (alert_guardian_sms) only when confidence >= 70.`;

// Build messages array for OpenAI-compatible APIs (Groq, OpenAI, Ollama)
const buildOAIMessages = (text, contextMessages) => {
  const userContent = contextMessages.length > 0
    ? `Context (last ${contextMessages.length} messages):\n${contextMessages.map((m,i)=>`${i+1}. [${m.user}]: "${m.text}"`).join("\n")}\n\nClassify the LATEST message:\n"${text}"`
    : `Classify this chat message:\n"${text}"`;
  return [
    { role:"system", content: SYSTEM_PROMPT },
    ...FEW_SHOT_EXAMPLES,
    { role:"user", content: userContent },
  ];
};

const parseResult = (raw) => {
  try {
    const clean = raw.replace(/```json|```/g,"").trim();
    return JSON.parse(clean);
  } catch(e) { return null; }
};

// ── Claude (Anthropic) ────────────────────────────────────────────────────────
async function classifyWithClaude(text, contextMessages=[], apiKey="") {
  const userMsg = contextMessages.length > 0
    ? `Context (last ${contextMessages.length} messages):\n${contextMessages.map((m,i)=>`${i+1}. [${m.user}]: "${m.text}"`).join("\n")}\n\nClassify the LATEST message:\n"${text}"`
    : `Classify this chat message:\n"${text}"`;
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method:"POST",
      headers:{"Content-Type":"application/json", ...(apiKey?{"x-api-key":apiKey}:{})},
      body: JSON.stringify({
        model:"claude-sonnet-4-20250514", max_tokens:1000,
        system: SYSTEM_PROMPT,
        messages:[...FEW_SHOT_EXAMPLES,{role:"user",content:userMsg}],
      }),
    });
    const d = await res.json();
    return parseResult(d.content?.find(b=>b.type==="text")?.text||"");
  } catch(e){ return null; }
}

// ── Llama via Groq (OpenAI-compatible) ──────────────────────────────────────
async function classifyWithGroqLlama(text, contextMessages=[], apiKey="") {
  if (!apiKey) throw new Error("Groq API key required");
  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body: JSON.stringify({
        model:"llama-3.3-70b-versatile", max_tokens:800,
        response_format:{type:"json_object"},
        messages: buildOAIMessages(text, contextMessages),
      }),
    });
    const d = await res.json();
    return parseResult(d.choices?.[0]?.message?.content||"");
  } catch(e){ return null; }
}

// ── Llama via Ollama (local server) ──────────────────────────────────────────
async function classifyWithOllama(text, contextMessages=[], model="llama3.1", host="http://localhost:11434") {
  try {
    const res = await fetch(`${host}/api/chat`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        model, stream:false,
        format:"json",
        messages: buildOAIMessages(text, contextMessages),
      }),
    });
    const d = await res.json();
    return parseResult(d.message?.content||"");
  } catch(e){ return null; }
}

// ── GPT-4o Mini (OpenAI) ──────────────────────────────────────────────────────
async function classifyWithOpenAI(text, contextMessages=[], apiKey="") {
  if (!apiKey) throw new Error("OpenAI API key required");
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method:"POST",
      headers:{"Content-Type":"application/json","Authorization":`Bearer ${apiKey}`},
      body: JSON.stringify({
        model:"gpt-4o-mini", max_tokens:800,
        response_format:{type:"json_object"},
        messages: buildOAIMessages(text, contextMessages),
      }),
    });
    const d = await res.json();
    return parseResult(d.choices?.[0]?.message?.content||"");
  } catch(e){ return null; }
}

// ── Gemini 2.0 Flash ──────────────────────────────────────────────────────────
async function classifyWithGemini(text, contextMessages=[], apiKey="") {
  if (!apiKey) throw new Error("Gemini API key required");
  const userMsg = contextMessages.length > 0
    ? `Context:\n${contextMessages.map((m,i)=>`${i+1}. [${m.user}]: "${m.text}"`).join("\n")}\n\nClassify:\n"${text}"`
    : `Classify this chat message:\n"${text}"`;
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body: JSON.stringify({
        systemInstruction:{parts:[{text:SYSTEM_PROMPT}]},
        contents:[{role:"user",parts:[{text:userMsg}]}],
        generationConfig:{responseMimeType:"application/json"},
      }),
    });
    const d = await res.json();
    return parseResult(d.candidates?.[0]?.content?.parts?.[0]?.text||"");
  } catch(e){ return null; }
}

// ── Unified dispatcher ────────────────────────────────────────────────────────
async function classifyMessage(text, contextMessages=[], providerId="claude", apiKeys={}, ollamaHost="http://localhost:11434", ollamaModel="llama3.1") {
  const t0 = performance.now();
  let result = null;
  try {
    switch(providerId) {
      case "claude":       result = await classifyWithClaude(text, contextMessages, apiKeys.claude||""); break;
      case "groq_llama":   result = await classifyWithGroqLlama(text, contextMessages, apiKeys.groq||""); break;
      case "ollama_llama": result = await classifyWithOllama(text, contextMessages, ollamaModel, ollamaHost); break;
      case "openai":       result = await classifyWithOpenAI(text, contextMessages, apiKeys.openai||""); break;
      case "gemini":       result = await classifyWithGemini(text, contextMessages, apiKeys.gemini||""); break;
      default:             result = await classifyWithClaude(text, contextMessages, apiKeys.claude||"");
    }
  } catch(e){}
  const latency = Math.round(performance.now() - t0);
  return result ? {...result, _provider:providerId, _latencyMs:latency} : null;
}

// ══════════════════════════════════════════════════════════════════════════════
// AI LAB SCREEN — Multi-provider · Compare · Live feed · Volume guide
// ══════════════════════════════════════════════════════════════════════════════

const ConfidenceBar = ({label, value, C}) => {
  const color = value>=80?C.crimson:value>=50?C.amber:value>=20?C.electric:C.emerald;
  return (
    <div className="mb-2">
      <div className="flex items-center justify-between mb-0.5">
        <span className="text-[10px] font-semibold capitalize" style={{color:C.muted}}>{label}</span>
        <span className="text-[10px] font-black" style={{color}}>{value}%</span>
      </div>
      <div className="h-2 rounded-full" style={{background:C.border}}>
        <div className="h-2 rounded-full transition-all duration-700"
          style={{width:`${value}%`,background:C.surface}}/>
      </div>
    </div>
  );
};

const ACTION_META = {
  none:                               {label:"No Action",         color:"#059669",icon:"check"},
  log_only:                           {label:"Log Only",          color:"#94A3B8",icon:"clock"},
  moderator_queue:                    {label:"→ Queue",           color:"#D97706",icon:"kanban"},
  alert_guardian_sms:                 {label:"SMS Guardian",      color:"#4F46E5",icon:"sms"},
  immediate_alert_guardian_counselor: {label:"IMMEDIATE ALERT",   color:"#9333EA",icon:"warn"},
};

const BATCH_SAMPLES = [
  "you're so bad at this game lol",
  "nobody wants you here, literally everyone agrees, just leave",
  "I can't believe you idiots ruined the whole server",
  "i'm really scared and i don't know who to talk to",
  "gg that was an amazing round!",
  "stop copying me you stupid copycat, i hate you",
  "has anyone seen the new update? it looks great",
  "you're ugly and worthless, no one will ever love you",
];

const escColor = (esc,C) => ({critical:C.safeWord,high:C.crimson,medium:C.amber,low:C.pink}[esc]||C.muted);

// API Key config panel
const ApiKeyPanel = ({apiKeys, setApiKeys, ollamaHost, setOllamaHost, ollamaModel, setOllamaModel, C}) => {
  const [show, setShow] = useState(false);
  return (
    <Card C={C} className="p-3">
      <button className="w-full flex items-center gap-2" onClick={()=>setShow(v=>!v)}>
        <Ico name="settings" size={13} color={C.gold}/>
        <p className="text-[10px] font-bold" style={{color:C.text}}>API Keys & Provider Config</p>
        <Ico name="chevronD" size={11} color={C.muted} style={{marginLeft:"auto",transform:show?"rotate(180deg)":"none",transition:"transform 0.2s"}}/>
      </button>
      {show&&(
        <div className="mt-3 space-y-2">
          {[
            {id:"claude",  label:"Anthropic (Claude)",         placeholder:"sk-ant-…",  color:AI_PROVIDERS.claude.color},
            {id:"groq",    label:"Groq (Llama via Groq Cloud)", placeholder:"gsk_…",    color:AI_PROVIDERS.groq_llama.color},
            {id:"openai",  label:"OpenAI (GPT-4o Mini)",        placeholder:"sk-…",     color:AI_PROVIDERS.openai.color},
            {id:"gemini",  label:"Google (Gemini Flash)",       placeholder:"AIza…",    color:AI_PROVIDERS.gemini.color},
          ].map(({id,label,placeholder,color})=>(
            <div key={id}>
              <p className="text-[9px] font-bold mb-0.5" style={{color}}>{label}</p>
              <input type="password" value={apiKeys[id]||""}
                onChange={e=>setApiKeys(prev=>({...prev,[id]:e.target.value}))}
                placeholder={placeholder}
                className="w-full rounded-xl px-3 py-1.5 text-[10px] outline-none"
                style={{background:C.bgCard,color:C.text}}/>
            </div>
          ))}
          <div className="grid grid-cols-2 gap-2 pt-1" style={{borderTop:`1px solid ${C.border}`}}>
            <div>
              <p className="text-[9px] font-bold mb-0.5" style={{color:AI_PROVIDERS.ollama_llama.color}}>Ollama Host</p>
              <input value={ollamaHost} onChange={e=>setOllamaHost(e.target.value)}
                placeholder="http://localhost:11434"
                className="w-full rounded-xl px-3 py-1.5 text-[10px] outline-none"
                style={{background:C.bgCard,border:`1px solid ${AI_PROVIDERS.ollama_llama.color}30`,color:C.text}}/>
            </div>
            <div>
              <p className="text-[9px] font-bold mb-0.5" style={{color:AI_PROVIDERS.ollama_llama.color}}>Ollama Model</p>
              <input value={ollamaModel} onChange={e=>setOllamaModel(e.target.value)}
                placeholder="llama3.1"
                className="w-full rounded-xl px-3 py-1.5 text-[10px] outline-none"
                style={{background:C.bgCard,border:`1px solid ${AI_PROVIDERS.ollama_llama.color}30`,color:C.text}}/>
            </div>
          </div>
          <div className="rounded-xl p-2.5 mt-1" style={{background:C.bgCard}}>
            <p className="text-[9px] leading-relaxed" style={{color:C.muted}}>
              <strong style={{color:C.amber}}>Claude</strong> — works out of the box in Claude.ai artifacts.{" "}
              <strong style={{color:AI_PROVIDERS.groq_llama.color}}>Groq</strong> — free at groq.com, fastest Llama inference.{" "}
              <strong style={{color:AI_PROVIDERS.ollama_llama.color}}>Ollama</strong> — run locally: <code>brew install ollama && ollama pull llama3.1</code>.{" "}
              <strong style={{color:AI_PROVIDERS.openai.color}}>OpenAI / Gemini</strong> — add keys at platform.openai.com / ai.google.dev.
            </p>
          </div>
        </div>
      )}
    </Card>
  );
};

// Single result card
const ResultCard = ({result, providerId, C}) => {
  if (!result) return null;
  const prov = AI_PROVIDERS[providerId]||AI_PROVIDERS.claude;
  const ec = escColor(result.escalation, C);
  const am = ACTION_META[result.suggestedAction];
  return (
    <Card C={C} className="p-4 card-enter" style={{borderColor:C.border}}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-3">
        <div className="w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{background:C.bgCard}}>
          <span className="text-lg font-black" style={{color:ec}}>{result.confidence.overall}</span>
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-1.5 flex-wrap mb-1">
            <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full"
              style={{background:`${prov.color}20`,color:prov.color}}>
              <Ico name={prov.icon} size={8} color={prov.color}/> {prov.name}
            </span>
            {result.escalation&&(
              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full uppercase" style={{background:`${ec}20`,color:ec}}>{result.escalation}</span>
            )}
            <span className="text-[9px] px-1.5 py-0.5 rounded-full capitalize"
              style={{background:`${C.electric}10`,color:C.electric}}>{result.sentiment}</span>
            {result.toxic&&<span className="text-[8px] font-black px-1 py-0.5 rounded-full" style={{background:`${C.crimson}20`,color:C.crimson}}>TOXIC</span>}
            {result.bullying&&<span className="text-[8px] font-black px-1 py-0.5 rounded-full" style={{background:`${C.bully}20`,color:C.bully}}>BULLYING</span>}
            {result.safeWord&&<span className="text-[8px] font-black px-1 py-0.5 rounded-full" style={{background:`${C.safeWord}20`,color:C.safeWord}}>SAFE WORD</span>}
            {result._latencyMs&&<span className="text-[8px] ml-auto" style={{color:C.muted}}>{result._latencyMs}ms</span>}
          </div>
          <p className="text-[9px]" style={{color:C.muted}}>Overall confidence: <strong style={{color:ec}}>{result.confidence.overall}%</strong></p>
        </div>
      </div>
      {/* Confidence bars */}
      <ConfidenceBar label="Toxic" value={result.confidence.toxic} C={C}/>
      <ConfidenceBar label="Bullying" value={result.confidence.bullying} C={C}/>
      <ConfidenceBar label="Safe Word / Distress" value={result.confidence.safeWord} C={C}/>
      {/* Action */}
      <div className="flex items-center gap-2.5 my-3 p-2.5 rounded-xl"
        style={{background:`${am?.color||C.muted}10`,border:`1px solid ${am?.color||C.muted}25`}}>
        <Ico name={am?.icon||"check"} size={14} color={am?.color||C.muted}/>
        <div>
          <p className="text-[10px] font-black" style={{color:am?.color||C.muted}}>{am?.label}</p>
          <p className="text-[9px]" style={{color:C.muted}}>
            {result.confidence.overall<40?"Below threshold — logged only"
              :result.confidence.overall<70?"Borderline — human review"
              :"High confidence — automated action"}
          </p>
        </div>
      </div>
      {/* Reasoning */}
      <div className="p-2.5 rounded-xl" style={{background:C.bgCard}}>
        <div className="flex items-center gap-1 mb-1">
          <Ico name={prov.icon} size={10} color={prov.color}/>
          <p className="text-[8px] font-black uppercase" style={{color:prov.color}}>{prov.name} reasoning</p>
        </div>
        <p className="text-[10px] leading-relaxed" style={{color:C.textSub}}>{result.reason}</p>
      </div>
      {/* Routing bands */}
      <div className="flex gap-1 mt-3">
        {[{r:"0–39",l:"Log",c:C.emerald},{r:"40–69",l:"Queue",c:C.amber},{r:"70–89",l:"SMS",c:C.bully},{r:"90–100",l:"Critical",c:C.crimson}].map(b=>{
          const lo=parseInt(b.r.split("–")[0]), hi=parseInt(b.r.split("–")[1]);
          const active=result.confidence.overall>=lo&&result.confidence.overall<=hi;
          return (
            <div key={b.r} className="flex-1 text-center rounded-lg py-1.5"
              style={{background:active?`${b.c}20`:`${b.c}05`,border:`2px solid ${active?b.c:b.c+"15"}`}}>
              <p className="text-[8px] font-black" style={{color:active?b.c:C.muted}}>{b.r}%</p>
              <p className="text-[7px]" style={{color:active?b.c:C.muted}}>{b.l}</p>
            </div>
          );
        })}
      </div>
    </Card>
  );
};

const AILabScreen = ({C, messages}) => {
  const [tab,          setTab]          = useState("classify");
  const [provider,     setProvider]     = useState("claude");
  const [compareProvs, setCompareProvs] = useState(["claude","groq_llama"]);
  const [input,        setInput]        = useState("");
  const [result,       setResult]       = useState(null);
  const [compareResults, setCompareResults] = useState({});
  const [loading,      setLoading]      = useState(false);
  const [compareLoading, setCompareLoading] = useState({});
  const [error,        setError]        = useState(null);
  const [history,      setHistory]      = useState([]);
  const [useContext,   setUseCtx]       = useState(true);
  const [batchResults, setBatchResults] = useState([]);
  const [batchLoading, setBatchLoading] = useState(false);
  const [liveQueue,    setLiveQueue]    = useState([]);
  const [liveResults,  setLiveResults]  = useState([]);
  const [liveRunning,  setLiveRunning]  = useState(false);
  const [apiKeys,      setApiKeys]      = useState({claude:"",groq:"",openai:"",gemini:""});
  const [ollamaHost,   setOllamaHost]   = useState("http://localhost:11434");
  const [ollamaModel,  setOllamaModel]  = useState("llama3.1");
  const [confidenceThreshold, setThreshold] = useState(70);

  const prov = AI_PROVIDERS[provider];

  const classify = async () => {
    if (!input.trim()) return;
    setLoading(true); setError(null); setResult(null);
    const ctx = useContext ? messages.slice(0,5) : [];
    const r = await classifyMessage(input.trim(), ctx, provider, apiKeys, ollamaHost, ollamaModel);
    if (r) {
      setResult(r);
      setHistory(prev=>[{text:input.trim(),result:r,provider,ts:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})},...prev].slice(0,30));
    } else { setError("Classification failed — check your API key and provider settings"); }
    setLoading(false);
  };

  const runCompare = async () => {
    if (!input.trim()) return;
    setCompareResults({});
    const ctx = useContext ? messages.slice(0,5) : [];
    const loading = {};
    compareProvs.forEach(p=>{ loading[p]=true; });
    setCompareLoading(loading);
    await Promise.all(compareProvs.map(async p=>{
      const r = await classifyMessage(input.trim(), ctx, p, apiKeys, ollamaHost, ollamaModel);
      setCompareResults(prev=>({...prev,[p]:r}));
      setCompareLoading(prev=>({...prev,[p]:false}));
    }));
  };

  const runBatch = async () => {
    setBatchLoading(true); setBatchResults([]);
    for (const sample of BATCH_SAMPLES) {
      const r = await classifyMessage(sample, [], provider, apiKeys, ollamaHost, ollamaModel);
      setBatchResults(prev=>[...prev,{text:sample,result:r}]);
      await new Promise(res=>setTimeout(res,200));
    }
    setBatchLoading(false);
  };

  const runLiveFeed = async () => {
    setLiveRunning(true); setLiveResults([]);
    const sample = messages.slice(0,8);
    for (const msg of sample) {
      const r = await classifyMessage(msg.text, [], provider, apiKeys, ollamaHost, ollamaModel);
      setLiveResults(prev=>[...prev,{msg,result:r}]);
      await new Promise(res=>setTimeout(res,150));
    }
    setLiveRunning(false);
  };

  const TABS = [
    {id:"classify",label:"🎯 Classify",desc:"Test a single message"},
    {id:"batch",   label:"⚡ Batch",    desc:"Run 8 samples at once"},
    {id:"live",    label:"📡 Live Feed",desc:"Classify your real feed"},
    {id:"volume",  label:"📈 Scale Guide",desc:"Which model for volume"},
    {id:"setup",   label:"🔧 Setup",    desc:"Integrate Llama + others"},
  ];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="px-3 pt-3 pb-2 border-b flex-shrink-0" style={{borderColor:C.border,background:`${C.bgDeep}99`}}>
        <div className="flex items-center gap-3 mb-2">
          <div className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:`${C.purple}20`}}>
            <Ico name="sparkles" size={18} color={C.purple}/>
          </div>
          <div>
            <p className="text-sm font-black" style={{color:C.text}}>AI Classifier Lab</p>
            <p className="text-[10px]" style={{color:C.muted}}>Multi-provider · Claude · Llama · GPT · Gemini</p>
          </div>
          {/* Active provider pill */}
          <div className="ml-auto flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
            style={{background:`${prov.color}15`}}>
            <Ico name={prov.icon} size={11} color={prov.color}/>
            <span className="text-[10px] font-black" style={{color:prov.color}}>{prov.name}</span>
          </div>
        </div>
        {/* Tab bar */}
        <div className="flex gap-1 overflow-x-auto pb-0.5">
          {TABS.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-bold whitespace-nowrap"
              style={{background:tab===t.id?`${C.purple}20`:"transparent",color:tab===t.id?C.purple:C.muted,border:`1px solid ${tab===t.id?C.purple+"40":C.border}`}}>
              {t.label}
            </button>
          ))}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">

        {/* ─── CLASSIFY TAB ─── */}
        {tab==="classify"&&(
          <>
            {/* Provider selector */}
            <Card C={C} className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>Select AI Provider</p>
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-1.5">
                {Object.values(AI_PROVIDERS).map(p=>(
                  <button key={p.id} onClick={()=>setProvider(p.id)}
                    className="rounded-xl p-2 text-left"
                    style={{background:provider===p.id?`${p.color}20`:`${p.color}06`,border:`2px solid ${provider===p.id?p.color:p.color+"15"}`,transition:"all 0.15s"}}>
                    <div className="flex items-center gap-1.5 mb-0.5">
                      <Ico name={p.icon} size={11} color={p.color}/>
                      <span className="text-[9px] font-black truncate" style={{color:provider===p.id?p.color:C.text}}>{p.name}</span>
                    </div>
                    <p className="text-[8px] leading-tight" style={{color:C.muted}}>{p.maker}</p>
                    <div className="flex items-center gap-1 mt-1">
                      <Ico name="zap" size={7} color={C.muted}/>
                      <span className="text-[7px]" style={{color:C.muted}}>{p.latency}</span>
                    </div>
                  </button>
                ))}
              </div>
            </Card>

            {/* Input */}
            <Card C={C} className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>Test Message</p>
              <textarea value={input} onChange={e=>setInput(e.target.value)} rows={3}
                placeholder="Type any chat message to classify…"
                className="w-full rounded-xl px-3 py-2.5 text-xs outline-none resize-none mb-2"
                style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`,color:C.text}}/>
              <div className="flex items-center gap-2">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <div className="w-7 h-4 rounded-full relative cursor-pointer"
                    style={{background:useContext?C.emerald:`${C.muted}40`}} onClick={()=>setUseCtx(v=>!v)}>
                    <div className="absolute top-0.5 w-3 h-3 rounded-full" style={{background:"white",left:useContext?"calc(100% - 14px)":"2px",transition:"left 0.2s"}}/>
                  </div>
                  <span className="text-[9px]" style={{color:C.muted}}>Channel context</span>
                </label>
                <button onClick={classify} disabled={loading||!input.trim()}
                  className="ml-auto flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-black"
                  style={{background:loading||!input.trim()?`${C.muted}15`:prov.color,
                    color:loading||!input.trim()?C.muted:"#fff",cursor:loading||!input.trim()?"not-allowed":"pointer"}}>
                  {loading
                    ? <><span style={{display:"inline-block",width:12,height:12,borderRadius:"50%",border:"2px solid white",borderTopColor:"transparent",animation:"spin 0.7s linear infinite"}}/> Classifying…</>
                    : <><Ico name={prov.icon} size={13} color="#fff"/> Classify with {prov.name}</>}
                </button>
              </div>
              {/* Quick examples */}
              <div className="mt-2">
                <p className="text-[8px] mb-1" style={{color:C.muted}}>Quick examples:</p>
                <div className="flex flex-wrap gap-1">
                  {["gg wp great game!","nobody likes you here just leave","i'm scared please help","you're ugly and worthless","stop copying me i hate you"].map(ex=>(
                    <button key={ex} onClick={()=>setInput(ex)}
                      className="text-[8px] px-1.5 py-0.5 rounded-lg"
                      style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`,color:C.muted}}>
                      "{ex.slice(0,25)}{ex.length>25?"…":""}"
                    </button>
                  ))}
                </div>
              </div>
            </Card>

            {error&&<div className="rounded-xl p-3" style={{background:C.bgCard}}><p className="text-xs" style={{color:C.crimson}}>⚠ {error}</p></div>}
            {result&&<ResultCard result={result} providerId={provider} C={C}/>}

            {/* History */}
            {history.length>0&&(
              <Card C={C} className="p-3">
                <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>History</p>
                <div className="space-y-1.5 max-h-56 overflow-y-auto">
                  {history.map((h,i)=>{
                    const ec=escColor(h.result?.escalation,C);
                    const p2=AI_PROVIDERS[h.provider]||AI_PROVIDERS.claude;
                    return (
                      <div key={i} className="flex items-start gap-2 rounded-xl p-2" style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`}}>
                        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-[9px] font-black flex-shrink-0"
                          style={{background:C.bgCard,color:ec}}>{h.result?.confidence?.overall}</div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[9px] truncate" style={{color:C.text}}>"{h.text}"</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <span className="text-[7px] font-bold" style={{color:p2.color}}>{p2.name}</span>
                            <span className="text-[7px]" style={{color:ACTION_META[h.result?.suggestedAction]?.color||C.muted}}>{ACTION_META[h.result?.suggestedAction]?.label}</span>
                            <span className="text-[7px]" style={{color:C.muted}}>{h.ts}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>
            )}
          </>
        )}

        {/* ─── COMPARE TAB ─── */}
        {tab==="compare"&&(
          <>
            <Card C={C} className="p-3">
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>Select Providers to Compare (pick 2–5)</p>
              <div className="flex gap-1.5 flex-wrap mb-3">
                {Object.values(AI_PROVIDERS).map(p=>{
                  const sel=compareProvs.includes(p.id);
                  return (
                    <button key={p.id} onClick={()=>setCompareProvs(prev=>sel?prev.filter(x=>x!==p.id):[...prev,p.id])}
                      className="flex items-center gap-1.5 px-2 py-1 rounded-xl text-[9px] font-bold"
                      style={{background:sel?`${p.color}20`:`${p.color}06`,border:`2px solid ${sel?p.color:p.color+"15"}`,color:sel?p.color:C.muted}}>
                      <Ico name={p.icon} size={9} color={sel?p.color:C.muted}/>{p.name}
                    </button>
                  );
                })}
              </div>
              <textarea value={input} onChange={e=>setInput(e.target.value)} rows={2}
                placeholder="Type a message to compare across providers…"
                className="w-full rounded-xl px-3 py-2 text-xs outline-none resize-none mb-2"
                style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`,color:C.text}}/>
              <button onClick={runCompare} disabled={!input.trim()||compareProvs.length<1}
                className="w-full py-2 rounded-xl text-xs font-black flex items-center justify-center gap-2"
                style={{background:C.surface,color:"#fff",opacity:!input.trim()||compareProvs.length<1?0.5:1}}>
                <Ico name="zap" size={13} color="#fff"/> Run {compareProvs.length}-Way Comparison
              </button>
            </Card>

            {compareProvs.length>0&&Object.keys(compareResults).length>0&&(
              <>
                {/* Comparison summary */}
                <Card C={C} className="p-3">
                  <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>Verdict Comparison</p>
                  <div className="space-y-1.5">
                    {compareProvs.map(pid=>{
                      const r=compareResults[pid];
                      const p2=AI_PROVIDERS[pid];
                      const isLoading=compareLoading[pid];
                      const ec=r?escColor(r.escalation,C):C.muted;
                      return (
                        <div key={pid} className="flex items-center gap-3 rounded-xl p-2.5"
                          style={{background:r?`${ec}08`:`${C.muted}05`,border:`1px solid ${r?ec+"25":C.border}`}}>
                          <div className="flex items-center gap-1.5 w-28 flex-shrink-0">
                            <Ico name={p2.icon} size={11} color={p2.color}/>
                            <span className="text-[9px] font-bold" style={{color:p2.color}}>{p2.name}</span>
                          </div>
                          {isLoading&&<span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:`2px solid ${p2.color}`,borderTopColor:"transparent",animation:"spin 0.7s linear infinite"}}/>}
                          {r&&<>
                            <div className="w-8 h-8 rounded-xl flex items-center justify-center text-[11px] font-black flex-shrink-0"
                              style={{background:`${ec}20`,color:ec}}>{r.confidence.overall}</div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1 flex-wrap">
                                {r.escalation&&<span className="text-[8px] font-black uppercase px-1 rounded" style={{background:`${ec}20`,color:ec}}>{r.escalation}</span>}
                                {r.toxic&&<span className="text-[8px] px-1 rounded" style={{background:`${C.crimson}15`,color:C.crimson}}>toxic</span>}
                                {r.bullying&&<span className="text-[8px] px-1 rounded" style={{background:`${C.bully}15`,color:C.bully}}>bullying</span>}
                                {r.safeWord&&<span className="text-[8px] px-1 rounded" style={{background:C.bgCard,color:C.safeWord}}>safe-word</span>}
                              </div>
                              <p className="text-[8px] truncate mt-0.5" style={{color:C.muted}}>{r.reason?.slice(0,60)}{r.reason?.length>60?"…":""}</p>
                            </div>
                            {r._latencyMs&&<span className="text-[8px] flex-shrink-0" style={{color:C.muted}}>{r._latencyMs}ms</span>}
                          </>}
                        </div>
                      );
                    })}
                  </div>
                </Card>
                {/* Full cards */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                  {compareProvs.map(pid=>compareResults[pid]&&(
                    <ResultCard key={pid} result={compareResults[pid]} providerId={pid} C={C}/>
                  ))}
                </div>
              </>
            )}
          </>
        )}

        {/* ─── BATCH TAB ─── */}
        {tab==="batch"&&(
          <Card C={C} className="p-4">
            <div className="flex items-center gap-3 mb-3">
              <div>
                <p className="text-sm font-semibold" style={{color:C.text}}>Batch Test — {BATCH_SAMPLES.length} samples</p>
                <p className="text-[10px]" style={{color:C.muted}}>Runs through <strong style={{color:prov.color}}>{prov.name}</strong></p>
              </div>
              <button onClick={runBatch} disabled={batchLoading}
                className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black"
                style={{background:batchLoading?`${C.muted}10`:`${prov.color}20`,border:`1px solid ${batchLoading?C.border:prov.color+"40"}`,color:batchLoading?C.muted:prov.color,cursor:batchLoading?"not-allowed":"pointer"}}>
                {batchLoading?<><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:"2px solid currentColor",borderTopColor:"transparent",animation:"spin 0.7s linear infinite"}}/> Running…</>
                  :<><Ico name="zap" size={13} color={prov.color}/> Run Batch</>}
              </button>
            </div>
            <div className="space-y-2">
              {BATCH_SAMPLES.map((sample,i)=>{
                const r=batchResults[i];
                const ec=r?escColor(r.result?.escalation,C):C.muted;
                return (
                  <div key={i} className="rounded-xl p-2.5 border flex items-start gap-2.5"
                    style={{background:C.bgCard,borderColor:r?`${ec}30`:C.border}}>
                    <div className="w-7 h-7 rounded-lg flex-shrink-0 flex items-center justify-center text-[9px] font-black"
                      style={{background:r?`${ec}15`:`${C.muted}10`,border:`1px solid ${r?ec+"30":C.border}`,color:r?ec:C.muted}}>
                      {r?r.result?.confidence?.overall:batchLoading&&i===batchResults.length?"…":"—"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] truncate" style={{color:C.text}}>"{sample}"</p>
                      {r?.result&&(
                        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                          <span className="text-[8px] font-bold capitalize" style={{color:ec}}>{r.result.escalation||"clean"}</span>
                          <span className="text-[8px]" style={{color:ACTION_META[r.result.suggestedAction]?.color||C.muted}}>{ACTION_META[r.result.suggestedAction]?.label}</span>
                          {r.result._latencyMs&&<span className="text-[8px]" style={{color:C.muted}}>{r.result._latencyMs}ms</span>}
                          <p className="text-[8px] truncate w-full mt-0.5" style={{color:C.muted}}>{r.result.reason?.slice(0,60)}{r.result.reason?.length>60?"…":""}</p>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        )}

        {/* ─── LIVE FEED TAB ─── */}
        {tab==="live"&&(
          <>
            <Card C={C} className="p-3">
              <div className="flex items-center gap-3">
                <div>
                  <p className="text-sm font-semibold" style={{color:C.text}}>Live Feed Classifier</p>
                  <p className="text-[10px]" style={{color:C.muted}}>Classify your last {Math.min(8,messages.length)} real feed messages with <strong style={{color:prov.color}}>{prov.name}</strong></p>
                </div>
                <button onClick={runLiveFeed} disabled={liveRunning||messages.length===0}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-black"
                  style={{background:liveRunning?`${C.muted}10`:`${C.emerald}20`,border:`1px solid ${liveRunning?C.border:C.emerald+"40"}`,color:liveRunning?C.muted:C.emerald,cursor:liveRunning?"not-allowed":"pointer"}}>
                  {liveRunning?<><span style={{display:"inline-block",width:10,height:10,borderRadius:"50%",border:"2px solid currentColor",borderTopColor:"transparent",animation:"spin 0.7s linear infinite"}}/> Running…</>
                    :<><Ico name="activity" size={13} color={C.emerald}/> Classify Feed</>}
                </button>
              </div>
              {/* Confidence threshold */}
              <div className="mt-3">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[9px]" style={{color:C.muted}}>Alert threshold: <strong style={{color:C.amber}}>{confidenceThreshold}%</strong></span>
                  <span className="text-[8px]" style={{color:C.muted}}>messages above this trigger guardian SMS</span>
                </div>
                <input type="range" min={30} max={95} value={confidenceThreshold}
                  onChange={e=>setThreshold(Number(e.target.value))}
                  className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
                  style={{background:C.surface}}/>
              </div>
            </Card>

            {liveResults.length>0&&(
              <div className="space-y-2">
                {liveResults.map(({msg,result:r},i)=>{
                  const ec=r?escColor(r.escalation,C):C.muted;
                  const willAlert=r&&r.confidence.overall>=confidenceThreshold;
                  return (
                    <Card C={C} key={i} className="p-3"
                      style={{borderColor:willAlert?`${ec}50`:C.border,boxShadow:willAlert?`0 0 12px ${ec}20`:"none"}}>
                      <div className="flex items-start gap-2.5">
                        <div className="w-8 h-8 rounded-full flex-shrink-0 flex items-center justify-center text-xs font-black"
                          style={{background:C.border,color:C.textSub}}>
                          {msg.user[0].toUpperCase()}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-bold" style={{color:C.text}}>{msg.user}</span>
                            <span className="text-[9px]" style={{color:C.muted}}>{msg.channel} · {msg.time}</span>
                            {willAlert&&<span className="text-[8px] font-black px-1.5 py-0.5 rounded-full ml-auto" style={{background:`${ec}20`,color:ec}}>⚠ WOULD ALERT</span>}
                          </div>
                          <p className="text-xs mb-1.5" style={{color:C.textSub}}>"{msg.text}"</p>
                          {r&&(
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:`${prov.color}12`,color:prov.color}}>
                                <Ico name={prov.icon} size={8} color={prov.color}/> {r.confidence.overall}%
                              </span>
                              {r.escalation&&<span className="text-[8px] font-bold uppercase" style={{color:ec}}>{r.escalation}</span>}
                              <span className="text-[8px]" style={{color:ACTION_META[r.suggestedAction]?.color||C.muted}}>{ACTION_META[r.suggestedAction]?.label}</span>
                              {r._latencyMs&&<span className="text-[8px]" style={{color:C.muted}}>{r._latencyMs}ms</span>}
                              <p className="text-[8px] w-full mt-0.5 truncate" style={{color:C.muted}}>{r.reason?.slice(0,70)}{r.reason?.length>70?"…":""}</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* ─── VOLUME GUIDE TAB ─── */}
        {tab==="volume"&&(
          <>
            <Card C={C} gold className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Ico name="trending" size={14} color={C.gold}/>
                <p className="text-sm font-black" style={{color:C.text}}>Which AI handles large volumes best?</p>
              </div>
              <p className="text-[10px] leading-relaxed mb-4" style={{color:C.muted}}>
                For child safety moderation, you're typically dealing with <strong style={{color:C.text}}>3 different traffic tiers</strong>. Each needs a different strategy.
              </p>
              {[
                {tier:"Small",range:"0 – 500 msg/day",desc:"Single school, 1–3 platforms",rec:"claude",why:"Best accuracy, safe word detection is excellent, well within free tier limits",color:C.emerald},
                {tier:"Medium",range:"500 – 50K msg/day",desc:"School district, multi-platform",rec:"groq_llama",why:"Groq runs Llama 3.3 70B at 300+ tokens/sec. Free tier handles ~30 req/s. Near-Claude accuracy at 5x lower cost",color:C.electric},
                {tier:"Large",range:"50K – 1M+ msg/day",desc:"Platform-wide, enterprise",rec:"ollama_llama",why:"Self-hosted Llama on GPU cluster — unlimited throughput, zero API cost, COPPA-compliant (data never leaves your servers)",color:AI_PROVIDERS.ollama_llama.color},
              ].map(t=>{
                const p2=AI_PROVIDERS[t.rec];
                return (
                  <div key={t.tier} className="rounded-xl p-3 mb-2" style={{background:`${t.color}08`}}>
                    <div className="flex items-center gap-2 mb-1.5">
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:`${t.color}20`,color:t.color}}>{t.tier}</span>
                      <span className="text-[10px] font-bold" style={{color:C.text}}>{t.range}</span>
                      <span className="text-[9px]" style={{color:C.muted}}>{t.desc}</span>
                    </div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[9px]" style={{color:C.muted}}>Best provider:</span>
                      <span className="flex items-center gap-1 text-[9px] font-black" style={{color:p2.color}}>
                        <Ico name={p2.icon} size={9} color={p2.color}/>{p2.name}
                      </span>
                    </div>
                    <p className="text-[9px] leading-snug" style={{color:C.muted}}>{t.why}</p>
                  </div>
                );
              })}
            </Card>

            {/* Head-to-head table */}
            <Card C={C} className="p-3">
              <p className="text-xs font-bold mb-3" style={{color:C.text}}>Full Provider Comparison</p>
              <div className="overflow-x-auto">
                <table className="w-full text-[9px]" style={{borderCollapse:"separate",borderSpacing:0}}>
                  <thead>
                    <tr>
                      {["Provider","Latency","Throughput","Cost /1K","Best For","Privacy"].map(h=>(
                        <th key={h} className="text-left pb-2 pr-3 font-bold" style={{color:C.muted,whiteSpace:"nowrap"}}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {Object.values(AI_PROVIDERS).map((p,i)=>(
                      <tr key={p.id} style={{background:i%2===0?`${p.color}05`:"transparent"}}>
                        <td className="py-1.5 pr-3 font-bold whitespace-nowrap" style={{color:p.color}}>
                          <div className="flex items-center gap-1"><Ico name={p.icon} size={9} color={p.color}/>{p.name}</div>
                        </td>
                        <td className="py-1.5 pr-3" style={{color:C.text,whiteSpace:"nowrap"}}>{p.latency}</td>
                        <td className="py-1.5 pr-3 max-w-[140px]" style={{color:C.textSub}}>{p.throughput.split("·")[0]}</td>
                        <td className="py-1.5 pr-3 font-black" style={{color:p.costPer1k==="$0.00 (self-hosted)"?C.emerald:C.text,whiteSpace:"nowrap"}}>{p.costPer1k}</td>
                        <td className="py-1.5 pr-3 max-w-[120px]" style={{color:C.muted}}>{p.bestFor}</td>
                        <td className="py-1.5" style={{color:p.id==="ollama_llama"?C.emerald:C.muted}}>
                          {p.id==="ollama_llama"?"✓ 100% local":"Cloud"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Card>

            {/* Hybrid architecture */}
            <Card C={C} className="p-4">
              <div className="flex items-center gap-2 mb-3">
                <Ico name="activity" size={13} color={C.purple}/>
                <p className="text-sm font-semibold" style={{color:C.text}}>Recommended Architecture for Scale</p>
              </div>
              {[
                {label:"Tier 1 — Triage",   model:"Llama 8B (Ollama)",    color:AI_PROVIDERS.ollama_llama.color, desc:"Every single message runs through a fast local Llama 8B for instant keyword + intent pre-screening. Sub-50ms. Filters out 80% of clean messages."},
                {label:"Tier 2 — Deep scan", model:"Llama 70B (Groq)",     color:AI_PROVIDERS.groq_llama.color,  desc:"Messages flagged by Tier 1 with confidence 40–79 go to Llama 70B on Groq for deeper analysis. Still fast (<400ms), borderline cases."},
                {label:"Tier 3 — Critical",  model:"Claude Sonnet",         color:AI_PROVIDERS.claude.color,      desc:"Only high-priority messages (safe word triggers, escalation=critical) reach Claude. Maximum accuracy where it matters most. ~2–5% of all messages."},
              ].map((t,i)=>(
                <div key={i} className="flex items-start gap-3 mb-3">
                  <div className="flex-shrink-0 flex flex-col items-center">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center text-[9px] font-black" style={{background:`${t.color}20`,color:t.color}}>{i+1}</div>
                    {i<2&&<div className="w-px h-4 mt-1" style={{background:`${t.color}30`}}/>}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className="text-[10px] font-bold" style={{color:C.text}}>{t.label}</span>
                      <span className="text-[9px] font-black px-1.5 py-0.5 rounded-full" style={{background:`${t.color}15`,color:t.color}}>{t.model}</span>
                    </div>
                    <p className="text-[9px] leading-snug" style={{color:C.muted}}>{t.desc}</p>
                  </div>
                </div>
              ))}
              <div className="rounded-xl p-2.5 mt-1" style={{background:C.bgCard}}>
                <p className="text-[9px] font-bold mb-0.5" style={{color:C.gold}}>Result: 1M+ messages/day · 99.2% accuracy · ~$18/day total cost</p>
                <p className="text-[9px]" style={{color:C.muted}}>Compare to keyword-only: $0/day but 60% accuracy and 40% false negative rate on subtle bullying.</p>
              </div>
            </Card>
          </>
        )}

        {/* ─── SETUP TAB ─── */}
        {tab==="setup"&&(
          <>
            <Card C={C} className="p-4">
              <p className="text-xs font-bold mb-3" style={{color:C.text}}>Llama Integration Guide</p>
              {[
                {title:"Option A — Groq Cloud (fastest start, free)",color:AI_PROVIDERS.groq_llama.color,steps:[
                  "Go to console.groq.com and create a free account",
                  "Generate an API key in Settings → API Keys",
                  "Paste your key in the API Keys panel above",
                  "Select 'Llama 3.3 70B' provider and classify",
                ]},
                {title:"Option B — Ollama Local (private, free forever)",color:AI_PROVIDERS.ollama_llama.color,steps:[
                  "Install: brew install ollama  (macOS) or see ollama.ai for Linux/Windows",
                  "Pull model: ollama pull llama3.1  (4.7GB, one-time download)",
                  "Start server: ollama serve  (runs at localhost:11434)",
                  "Leave host as http://localhost:11434 · model as llama3.1 above",
                  "Click 'Classify' — no API key needed, 100% local",
                ]},
                {title:"Option C — Together.ai (cloud Llama, pay per token)",color:"#FF6B35",steps:[
                  "Sign up at api.together.xyz",
                  "Use any OpenAI-compatible endpoint with model meta-llama/Llama-3.3-70B-Instruct-Turbo",
                  "Update the Groq endpoint in classifyWithGroqLlama() to https://api.together.xyz/v1/chat/completions",
                  "Add your Together API key in the Groq key field",
                ]},
              ].map(opt=>(
                <div key={opt.title} className="rounded-xl p-3 mb-3" style={{background:`${opt.color}06`}}>
                  <p className="text-[10px] font-black mb-2" style={{color:opt.color}}>{opt.title}</p>
                  {opt.steps.map((s,i)=>(
                    <div key={i} className="flex items-start gap-2 mb-1.5">
                      <span className="text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5"
                        style={{background:`${opt.color}20`,color:opt.color}}>{i+1}</span>
                      <p className="text-[9px] leading-snug" style={{color:C.muted}}>{s}</p>
                    </div>
                  ))}
                </div>
              ))}
            </Card>

            <Card C={C} className="p-4">
              <p className="text-xs font-bold mb-1" style={{color:C.text}}>Backend Integration (Node.js)</p>
              <p className="text-[9px] mb-3" style={{color:C.muted}}>For production, run classification server-side to protect API keys and enable batching.</p>
              <pre className="text-[8px] p-3 rounded-xl overflow-x-auto leading-relaxed"
                style={{background:C.bgDeep,color:C.textSub,boxShadow:`0 2px 12px ${C.shadow}`}}>
{`// server.js — Express classifier endpoint
const Groq = require('groq-sdk');
const Anthropic = require('@anthropic-ai/sdk');

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

// Tier routing by confidence
async function classifyTiered(message, context=[]) {
  // Tier 1: Fast Llama triage
  const quick = await groq.chat.completions.create({
    model: 'llama-3.1-8b-instant',
    messages: buildMessages(message, context),
    response_format: { type: 'json_object' },
    max_tokens: 300,
  });
  const t1 = JSON.parse(quick.choices[0].message.content);

  // Tier 2: If borderline, escalate to Llama 70B
  if (t1.confidence.overall >= 40 && t1.confidence.overall < 75) {
    const deep = await groq.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: buildMessages(message, context),
      response_format: { type: 'json_object' },
      max_tokens: 600,
    });
    return JSON.parse(deep.choices[0].message.content);
  }

  // Tier 3: Critical → Claude for max accuracy
  if (t1.confidence.overall >= 75 || t1.safeWord) {
    const critical = await claude.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [...FEW_SHOT, { role:'user', content: message }],
    });
    return JSON.parse(critical.content[0].text);
  }

  return t1; // Clean message, no escalation needed
}

app.post('/classify', async (req, res) => {
  const result = await classifyTiered(req.body.text, req.body.context);
  res.json(result);
});`}
              </pre>
            </Card>
          </>
        )}

        {/* API key config always visible at bottom */}
        <ApiKeyPanel apiKeys={apiKeys} setApiKeys={setApiKeys}
          ollamaHost={ollamaHost} setOllamaHost={setOllamaHost}
          ollamaModel={ollamaModel} setOllamaModel={setOllamaModel} C={C}/>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
};

// BULLY FINGERPRINTING SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const FINGERPRINT_DATA = [
  { orig:"vortex99",  banned:"2024-01-12", suspects:[
    { acct:"v0rtex_new",    conf:94, signals:["writing style","avg sentence 4.2w","punctuation pattern","active 3-5pm"], status:"flagged",   lastSeen:"2 min ago",  channel:"#roblox-chat" },
    { acct:"vortex2025",    conf:71, signals:["writing style","similar vocab"],                                          status:"watching",  lastSeen:"3 hr ago",   channel:"#general" },
  ]},
  { orig:"d4rkwave",  banned:"2024-01-19", suspects:[
    { acct:"darkwave2024",  conf:83, signals:["ALL CAPS pattern","sentence rhythm","active 9-11pm"],                     status:"flagged",   lastSeen:"45 min ago", channel:"#discord-main" },
  ]},
  { orig:"shadow_x",  banned:"2024-02-03", suspects:[
    { acct:"xshadow_xx",    conf:61, signals:["emoji frequency","avg message 18w"],                                      status:"watching",  lastSeen:"6 hr ago",   channel:"#feedback" },
  ]},
  { orig:"toxicflame", banned:"2024-02-14", suspects:[] },
];

const BEHAVIOR_METRICS = [
  { label:"Avg sentence length",   orig:"4.2w",  suspect:"4.1w",  match:97 },
  { label:"Punctuation overuse",   orig:"High",  suspect:"High",  match:91 },
  { label:"Active hours",          orig:"3–5 PM",suspect:"3–5 PM",match:88 },
  { label:"Target selection",      orig:"New users", suspect:"New users", match:85 },
  { label:"Escalation speed",      orig:"Fast",  suspect:"Fast",  match:82 },
  { label:"Vocabulary overlap",    orig:"67%",   suspect:"63%",   match:78 },
  { label:"Channel preference",    orig:"#roblox", suspect:"#roblox", match:94 },
];

const FingerprintScreen = ({C}) => {
  const [sel, setSel] = useState(null);
  const [selSuspect, setSelSuspect] = useState(null);
  const [tab, setTab] = useState("suspects");

  const allSuspects = FINGERPRINT_DATA.flatMap(b=>b.suspects.map(s=>({...s,orig:b.orig,banned:b.banned})));
  const flagged  = allSuspects.filter(s=>s.status==="flagged");
  const watching = allSuspects.filter(s=>s.status==="watching");

  return (
    <div className="p-5 space-y-5 min-h-full">
      {/* Header */}
      <Card C={C} gold className="p-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{background:`${C.crimson}20`,boxShadow:`0 2px 12px ${C.shadow}`}}>
            <Ico name="fingerprint" size={20} color={C.crimson}/>
          </div>
          <div>
            <p className="text-sm font-black" style={{color:C.text}}>Bully Fingerprinting</p>
            <p className="text-xs" style={{color:C.muted}}>AI behavioral pattern re-entry detection</p>
          </div>
          <div className="ml-auto flex gap-3">
            <div className="text-center">
              <p className="text-xl font-black" style={{color:C.crimson}}>{flagged.length}</p>
              <p className="text-[9px]" style={{color:C.muted}}>flagged</p>
            </div>
            <div className="text-center">
              <p className="text-xl font-black" style={{color:C.amber}}>{watching.length}</p>
              <p className="text-[9px]" style={{color:C.muted}}>watching</p>
            </div>
          </div>
        </div>
      </Card>

      {/* How it works */}
      <Card C={C} className="p-3">
        <p className="text-[10px] font-bold uppercase tracking-wider mb-2" style={{color:C.muted}}>How Fingerprinting Works</p>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            {n:"1",label:"Ban event",desc:"User banned, behavioral profile saved",icon:"ban",color:C.crimson},
            {n:"2",label:"New accounts",desc:"All new accounts analyzed on join",icon:"user",color:C.amber},
            {n:"3",label:"AI matching",desc:"7 behavioral signals compared",icon:"sparkles",color:C.purple},
            {n:"4",label:"Alert fired",desc:"Flagged if confidence ≥ 70%",icon:"alert",color:C.bully},
          ].map(s=>(
            <div key={s.n} className="rounded-xl p-2.5" style={{background:`${s.color}08`}}>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0"
                  style={{background:`${s.color}25`,color:s.color}}>{s.n}</span>
                <Ico name={s.icon} size={12} color={s.color}/>
                <span className="text-[10px] font-bold" style={{color:C.text}}>{s.label}</span>
              </div>
              <p className="text-[9px]" style={{color:C.muted}}>{s.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tabs */}
      <div className="flex gap-2">
        {[{id:"suspects",label:`All Suspects (${allSuspects.length})`},{id:"flagged",label:`🚨 Flagged (${flagged.length})`},{id:"patterns",label:"Signal Analysis"},{id:"banned",label:`Banned (${FINGERPRINT_DATA.length})`}].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex-1 py-1.5 rounded-xl text-[10px] font-bold"
            style={{background:tab===t.id?`${C.crimson}20`:"transparent",color:tab===t.id?C.crimson:C.muted,border:`1px solid ${tab===t.id?C.crimson+"40":C.border}`}}>
            {t.label}
          </button>
        ))}
      </div>

      {/* Suspects list */}
      {(tab==="suspects"||tab==="flagged")&&(
        <div className="space-y-2">
          {(tab==="flagged"?flagged:allSuspects).map((s,i)=>{
            const col = s.conf>=80?C.crimson:C.amber;
            const isOpen = selSuspect===`${s.orig}-${s.acct}`;
            return (
              <Card C={C} key={i} className="p-3 cursor-pointer"
                style={{borderColor:s.status==="flagged"?`${C.crimson}35`:C.border}}
                onClick={()=>setSelSuspect(isOpen?null:`${s.orig}-${s.acct}`)}>
                <div className="flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1 flex-wrap">
                      <span className="text-xs font-bold line-through" style={{color:C.muted}}>{s.orig}</span>
                      <Ico name="arrowR" size={10} color={C.muted}/>
                      <span className="text-xs font-black" style={{color:C.text}}>{s.acct}</span>
                      <span className="text-[9px] px-1.5 py-0.5 rounded-full font-black"
                        style={{background:`${col}20`,color:col}}>{s.status}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 rounded-full" style={{background:C.border}}>
                        <div className="h-2 rounded-full transition-all"
                          style={{width:`${s.conf}%`,background:C.surface}}/>
                      </div>
                      <span className="text-[10px] font-black flex-shrink-0" style={{color:col}}>{s.conf}% match</span>
                    </div>
                    <p className="text-[9px] mt-1" style={{color:C.muted}}>{s.channel} · {s.lastSeen}</p>
                  </div>
                  <Ico name="chevronD" size={12} color={C.muted} style={{transform:isOpen?"rotate(180deg)":"none",transition:"transform 0.2s",flexShrink:0}}/>
                </div>
                {isOpen&&(
                  <div className="mt-3 pt-3" style={{borderTop:`1px solid ${C.border}`}}>
                    <p className="text-[10px] font-semibold uppercase tracking-widest mb-3" style={{color:C.muted}}>Matching Behavioral Signals</p>
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {s.signals.map((sig,j)=>(
                        <span key={j} className="text-[9px] px-2 py-0.5 rounded-full"
                          style={{background:`${C.purple}15`,color:C.purple}}>{sig}</span>
                      ))}
                    </div>
                    <div className="flex gap-2">
                      <button className="flex-1 py-1.5 rounded-xl text-[10px] font-bold"
                        style={{background:`${C.crimson}15`,boxShadow:`0 2px 12px ${C.shadow}`,color:C.crimson}}>
                        Ban Account
                      </button>
                      <button className="flex-1 py-1.5 rounded-xl text-[10px] font-bold"
                        style={{background:`${C.amber}15`,color:C.amber}}>
                        Flag + Watch
                      </button>
                      <button className="flex-1 py-1.5 rounded-xl text-[10px] font-bold"
                        style={{background:`${C.emerald}15`,color:C.emerald}}>
                        Clear
                      </button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      )}

      {/* Signal analysis */}
      {tab==="patterns"&&(
        <Card C={C} className="p-4">
          <p className="text-xs font-bold mb-3" style={{color:C.text}}>Behavioral Signal Breakdown — vortex99 vs v0rtex_new</p>
          <div className="space-y-3">
            {BEHAVIOR_METRICS.map((m,i)=>(
              <div key={i}>
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] font-semibold" style={{color:C.text}}>{m.label}</span>
                  <div className="flex items-center gap-3">
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{background:`${C.muted}15`,color:C.muted}}>{m.orig}</span>
                    <span className="text-[9px] px-1.5 py-0.5 rounded" style={{background:`${C.crimson}15`,color:C.crimson}}>{m.suspect}</span>
                    <span className="text-[9px] font-black w-8 text-right" style={{color:m.match>=85?C.crimson:m.match>=70?C.amber:C.emerald}}>{m.match}%</span>
                  </div>
                </div>
                <div className="h-1.5 rounded-full" style={{background:C.border}}>
                  <div className="h-1.5 rounded-full" style={{width:`${m.match}%`,background:m.match>=85?C.crimson:m.match>=70?C.amber:C.emerald}}/>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-4 p-3 rounded-xl" style={{background:`${C.crimson}08`}}>
            <p className="text-[10px] font-black mb-1" style={{color:C.crimson}}>Overall Match: 94% confidence</p>
            <p className="text-[9px]" style={{color:C.muted}}>7/7 behavioral signals match. Recommend immediate account suspension and guardian notification.</p>
          </div>
        </Card>
      )}

      {/* Banned accounts */}
      {tab==="banned"&&(
        <div className="space-y-2">
          {FINGERPRINT_DATA.map((b,i)=>(
            <Card C={C} key={i} className="p-3">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-xl flex items-center justify-center text-xs font-black"
                  style={{background:`${C.crimson}20`,boxShadow:`0 2px 12px ${C.shadow}`,color:C.crimson}}>
                  <Ico name="ban" size={14} color={C.crimson}/>
                </div>
                <div>
                  <p className="text-sm font-semibold" style={{color:C.text}}>{b.orig}</p>
                  <p className="text-[9px]" style={{color:C.muted}}>Banned {b.banned} · {b.suspects.length} suspect account{b.suspects.length!==1?"s":""}</p>
                </div>
                <span className="ml-auto text-[9px] font-black px-1.5 py-0.5 rounded-full"
                  style={{background:b.suspects.some(s=>s.status==="flagged")?`${C.crimson}20`:`${C.emerald}15`,
                    color:b.suspects.some(s=>s.status==="flagged")?C.crimson:C.emerald}}>
                  {b.suspects.some(s=>s.status==="flagged")?"ACTIVE MATCH":"CLEAR"}
                </span>
              </div>
              {b.suspects.map((s,j)=>(
                <div key={j} className="flex items-center gap-2 rounded-lg px-2 py-1.5 mb-1"
                  style={{background:`${s.conf>=80?C.crimson:C.amber}08`,border:`1px solid ${s.conf>=80?C.crimson:C.amber}20`}}>
                  <span className="text-[9px] font-bold flex-1" style={{color:C.text}}>{s.acct}</span>
                  <span className="text-[9px]" style={{color:C.muted}}>{s.conf}%</span>
                  <span className="text-[9px] font-bold" style={{color:s.status==="flagged"?C.crimson:C.amber}}>{s.status}</span>
                </div>
              ))}
              {b.suspects.length===0&&<p className="text-[9px]" style={{color:C.muted}}>No re-entry attempts detected</p>}
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};



// ══════════════════════════════════════════════════════════════════════════════
// MISSING KIDS SCREEN — Enhanced National Alert System v2
// Features: Map, SMS Blast, LE Verification, Share Cards, NCMEC Feed, Timeline
// ══════════════════════════════════════════════════════════════════════════════

const MISSING_KIDS_DATA = [
  {
    id:"mk1", name:"Harmony Montgomery", age:7, dob:"2016-05-01", gender:"Female",
    missing:"2021-12-31", city:"Manchester", state:"NH", zip:"03101", status:"active",
    photo:"HM", height:"3'11\"", weight:"50 lbs", hair:"Brown", eyes:"Brown",
    lastSeen:"Last seen at home wearing pink pajamas",
    description:"Harmony was reported missing after her father failed to bring her to school. She may be with a non-custodial parent.",
    caseNum:"NH-2022-0847", alertLevel:"critical",
    lat:42.9956, lng:-71.4548,
    sightings:[{id:"s1",date:"2022-03-14",location:"Manchester, NH",lat:42.99,lng:-71.46,detail:"Girl matching description seen near Elm Street Walmart",confirmed:false,leVerified:false}],
    contact:"1-800-THE-LOST", missingFrom:"Manchester, New Hampshire",
    circumstance:"Endangered Missing", ncmecId:"1293847",
    timeline:[
      {date:"2021-12-31",event:"Reported missing",type:"report"},
      {date:"2022-01-04",event:"FBI joins investigation",type:"update"},
      {date:"2022-03-14",event:"Sighting reported near Elm Street",type:"sighting"},
      {date:"2022-11-18",event:"Father charged in connection",type:"legal"},
    ],
    reward:25000,
  },
  {
    id:"mk2", name:"Arianna Fitts", age:11, dob:"2012-03-20", gender:"Female",
    missing:"2021-07-14", city:"Sacramento", state:"CA", zip:"95814", status:"active",
    photo:"AF", height:"4'8\"", weight:"90 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Last seen leaving her home in Sacramento",
    description:"Arianna was last seen wearing a white shirt and blue jeans. She may have traveled to the Los Angeles area.",
    caseNum:"CA-2021-3341", alertLevel:"high",
    lat:38.5816, lng:-121.4944,
    sightings:[], contact:"1-800-THE-LOST", missingFrom:"Sacramento, California",
    circumstance:"Runaway / Endangered", ncmecId:"1301234",
    timeline:[
      {date:"2021-07-14",event:"Reported missing",type:"report"},
      {date:"2021-07-20",event:"NCMEC case opened",type:"update"},
    ],
    reward:0,
  },
  {
    id:"mk3", name:"Evelyn Boswell", age:2, dob:"2018-08-10", gender:"Female",
    missing:"2020-12-09", city:"Rogersville", state:"TN", zip:"37857", status:"active",
    photo:"EB", height:"2'6\"", weight:"28 lbs", hair:"Blonde", eyes:"Blue",
    lastSeen:"Last seen at a residence in Sullivan County",
    description:"Evelyn was reported missing after authorities discovered she had not been seen in months.",
    caseNum:"TN-2020-9901", alertLevel:"critical",
    lat:36.4073, lng:-82.9743,
    sightings:[{id:"s2",date:"2021-01-03",location:"Kingsport, TN",lat:36.5484,lng:-82.5618,detail:"Toddler matching description seen at gas station",confirmed:false,leVerified:false}],
    contact:"TBI: 1-800-824-3463", missingFrom:"Rogersville, Tennessee",
    circumstance:"Endangered Missing", ncmecId:"1287651",
    timeline:[
      {date:"2020-12-09",event:"Reported missing — months after last seen",type:"report"},
      {date:"2021-01-03",event:"Unconfirmed sighting in Kingsport",type:"sighting"},
      {date:"2021-04-28",event:"Mother charged with homicide",type:"legal"},
    ],
    reward:10000,
  },
  {
    id:"mk4", name:"Dulce Maria Alavez", age:5, dob:"2014-04-28", gender:"Female",
    missing:"2019-09-16", city:"Bridgeton", state:"NJ", zip:"08302", status:"active",
    photo:"DA", height:"3'5\"", weight:"45 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Grabbed from Bridgeton City Park. Orange-shirt man seen leading her away.",
    description:"Dulce was abducted from a park while her mother was nearby. $75,000 reward.",
    caseNum:"NJ-2019-5521", alertLevel:"critical",
    lat:39.4276, lng:-75.2274,
    sightings:[
      {id:"s3",date:"2019-09-22",location:"Vineland, NJ",lat:39.4864,lng:-74.9229,detail:"Child matching description seen in silver vehicle",confirmed:false,leVerified:false},
      {id:"s4",date:"2020-02-11",location:"Philadelphia, PA",lat:39.9526,lng:-75.1652,detail:"Potential sighting reported to NCMEC",confirmed:false,leVerified:true},
    ],
    contact:"NCMEC: 1-800-843-5678", missingFrom:"Bridgeton, New Jersey",
    circumstance:"Abduction", ncmecId:"1266543",
    timeline:[
      {date:"2019-09-16",event:"Abducted from Bridgeton City Park",type:"report"},
      {date:"2019-09-17",event:"AMBER Alert issued statewide",type:"alert"},
      {date:"2019-09-22",event:"Sighting in Vineland reported",type:"sighting"},
      {date:"2020-02-11",event:"Philadelphia sighting — LE investigating",type:"sighting"},
      {date:"2021-06-01",event:"Reward increased to $75,000",type:"update"},
    ],
    reward:75000,
  },
  {
    id:"mk5", name:"Jayme Closs", age:13, dob:"2005-07-15", gender:"Female",
    missing:"2018-10-15", city:"Barron", state:"WI", zip:"54812", status:"found",
    photo:"JC", height:"5'1\"", weight:"100 lbs", hair:"Blonde", eyes:"Blue",
    lastSeen:"Parents found shot at home. Jayme was taken.",
    description:"FOUND SAFE — Jayme escaped captivity after 88 days on January 10, 2019 in Gordon, WI.",
    caseNum:"WI-2018-7723", alertLevel:"resolved",
    lat:45.4722, lng:-91.8499,
    sightings:[], contact:"Case closed", missingFrom:"Barron, Wisconsin",
    circumstance:"Abduction — FOUND SAFE", ncmecId:"1258902", foundDate:"2019-01-10",
    timeline:[
      {date:"2018-10-15",event:"Parents murdered, Jayme abducted",type:"report"},
      {date:"2018-10-16",event:"AMBER Alert issued",type:"alert"},
      {date:"2019-01-10",event:"Jayme escaped — found safe in Gordon, WI",type:"resolved"},
      {date:"2019-01-13",event:"Suspect Jake Patterson arrested",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk6", name:"Gannon Stauch", age:11, dob:"2008-10-30", gender:"Male",
    missing:"2020-01-27", city:"Colorado Springs", state:"CO", zip:"80920", status:"found_deceased",
    photo:"GS", height:"4'8\"", weight:"90 lbs", hair:"Brown", eyes:"Hazel",
    lastSeen:"Last seen leaving home with stepmother",
    description:"Gannon's remains were found in Florida. Stepmother convicted of murder 2022.",
    caseNum:"CO-2020-1127", alertLevel:"resolved",
    lat:38.8339, lng:-104.8214,
    sightings:[], contact:"Case closed", missingFrom:"Colorado Springs, Colorado",
    circumstance:"Homicide — Case Closed", ncmecId:"1275431",
    timeline:[
      {date:"2020-01-27",event:"Reported missing",type:"report"},
      {date:"2020-03-31",event:"Remains found in Punta Gorda, FL",type:"update"},
      {date:"2020-04-02",event:"Stepmother Letecia Stauch arrested",type:"legal"},
      {date:"2022-04-22",event:"Convicted of murder — life sentence",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk7", name:"Karol Sanchez", age:16, dob:"2006-02-14", gender:"Female",
    missing:"2022-08-15", city:"Bronx", state:"NY", zip:"10452", status:"found",
    photo:"KS", height:"5'4\"", weight:"115 lbs", hair:"Dark Brown", eyes:"Brown",
    lastSeen:"Grabbed off street in Bronx — caught on surveillance video",
    description:"FOUND SAFE — Karol was found safe within hours of abduction.",
    caseNum:"NY-2022-4412", alertLevel:"resolved",
    lat:40.8448, lng:-73.8648,
    sightings:[], contact:"Case closed", missingFrom:"Bronx, New York",
    circumstance:"Abduction — FOUND SAFE", ncmecId:"1318762", foundDate:"2022-08-16",
    timeline:[
      {date:"2022-08-15",event:"Abducted — video went viral",type:"report"},
      {date:"2022-08-15",event:"AMBER Alert issued",type:"alert"},
      {date:"2022-08-16",event:"Found safe — suspect arrested",type:"resolved"},
    ],
    reward:0,
  },
  {
    id:"mk8", name:"Paislee Shultis", age:6, dob:"2013-04-11", gender:"Female",
    missing:"2019-07-12", city:"Schenectady", state:"NY", zip:"12301", status:"found",
    photo:"PS", height:"3'9\"", weight:"55 lbs", hair:"Brown", eyes:"Brown",
    lastSeen:"Taken by non-custodial parents",
    description:"FOUND SAFE — Found under a floorboard in Cayuga, NY — 3 years after disappearance.",
    caseNum:"NY-2019-8834", alertLevel:"resolved",
    lat:42.8142, lng:-73.9396,
    sightings:[], contact:"Case closed", missingFrom:"Schenectady, New York",
    circumstance:"Parental Abduction — FOUND SAFE", ncmecId:"1267234", foundDate:"2022-09-09",
    timeline:[
      {date:"2019-07-12",event:"Reported missing — parental abduction",type:"report"},
      {date:"2022-09-09",event:"Found alive under floorboard — Cayuga, NY",type:"resolved"},
      {date:"2022-09-10",event:"Parents charged with custodial interference",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk9", name:"Cleo Smith", age:4, dob:"2017-05-04", gender:"Female",
    missing:"2021-10-16", city:"Carnarvon", state:"WA", zip:"", status:"found",
    photo:"CS", height:"3'2\"", weight:"36 lbs", hair:"Brown", eyes:"Brown",
    lastSeen:"Went missing from Blowholes campsite, Western Australia",
    description:"FOUND SAFE — Found alive in Carnarvon 18 days after disappearing.",
    caseNum:"WA-2021-AU991", alertLevel:"resolved",
    lat:-24.8762, lng:113.6589,
    sightings:[], contact:"Case closed", missingFrom:"Carnarvon, Western Australia",
    circumstance:"Abduction — FOUND SAFE", ncmecId:"AU-2021-991", foundDate:"2021-11-03",
    timeline:[
      {date:"2021-10-16",event:"Vanished from family tent at campsite",type:"report"},
      {date:"2021-11-03",event:"Found alive locked in Carnarvon house",type:"resolved"},
      {date:"2021-11-04",event:"Terence Kelly arrested",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk10", name:"Nalani Daniels", age:14, dob:"2009-03-15", gender:"Female",
    missing:"2023-06-22", city:"Memphis", state:"TN", zip:"38101", status:"active",
    photo:"ND", height:"5'2\"", weight:"110 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Last seen after school dismissal — blue backpack, white Air Force 1s",
    description:"Nalani was last seen after school. $5,000 reward offered.",
    caseNum:"TN-2023-6614", alertLevel:"high",
    lat:35.1495, lng:-90.0490,
    sightings:[{id:"s5",date:"2023-06-28",location:"Memphis, TN",lat:35.1550,lng:-90.0400,detail:"Teen matching description spotted near Poplar Ave",confirmed:false,leVerified:false}],
    contact:"MPD: (901) 636-3700", missingFrom:"Memphis, Tennessee",
    circumstance:"Runaway / Endangered", ncmecId:"1342817",
    timeline:[
      {date:"2023-06-22",event:"Reported missing after school",type:"report"},
      {date:"2023-06-28",event:"Unconfirmed sighting near Poplar Ave",type:"sighting"},
    ],
    reward:5000,
  },
  {
    id:"mk11", name:"Tylee Ryan", age:16, dob:"2003-09-24", gender:"Female",
    missing:"2019-09-08", city:"Rexburg", state:"ID", zip:"83440", status:"found_deceased",
    photo:"TR", height:"5'5\"", weight:"120 lbs", hair:"Brown", eyes:"Brown",
    lastSeen:"Last seen at Yellowstone with her family",
    description:"Tylee's remains were found on her stepfather's property. Mother and stepfather convicted.",
    caseNum:"ID-2019-7712", alertLevel:"resolved",
    lat:43.8260, lng:-111.7897,
    sightings:[], contact:"Case closed", missingFrom:"Rexburg, Idaho",
    circumstance:"Homicide — Case Closed", ncmecId:"1265892",
    timeline:[
      {date:"2019-09-08",event:"Last seen at Yellowstone",type:"report"},
      {date:"2019-11-26",event:"Reported missing",type:"report"},
      {date:"2020-06-09",event:"Remains found on stepfather's property",type:"update"},
      {date:"2021-06-01",event:"Lori Vallow convicted",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk12", name:"Quincy Washington Jr.", age:3, dob:"2019-06-12", gender:"Male",
    missing:"2022-11-19", city:"Rocky Mount", state:"NC", zip:"27801", status:"active",
    photo:"QW", height:"2'10\"", weight:"33 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Last seen at a family residence — blue onesie",
    description:"Quincy was reported missing after a welfare check. $10,000 reward.",
    caseNum:"NC-2022-1193", alertLevel:"critical",
    lat:35.9382, lng:-77.7905,
    sightings:[], contact:"NCMEC: 1-800-843-5678", missingFrom:"Rocky Mount, North Carolina",
    circumstance:"Endangered Missing", ncmecId:"1327654",
    timeline:[
      {date:"2022-11-19",event:"Welfare check — child not found",type:"report"},
      {date:"2022-11-21",event:"NCMEC case opened",type:"update"},
      {date:"2023-01-10",event:"Reward increased to $10,000",type:"update"},
    ],
    reward:10000,
  },
  {
    id:"mk13", name:"Maleah Davis", age:4, dob:"2015-02-26", gender:"Female",
    missing:"2019-04-30", city:"Houston", state:"TX", zip:"77001", status:"found_deceased",
    photo:"MD", height:"3'3\"", weight:"38 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Last seen with stepfather in Houston",
    description:"Maleah's remains were recovered in Arkansas. Stepfather convicted of murder.",
    caseNum:"TX-2019-3310", alertLevel:"resolved",
    lat:29.7604, lng:-95.3698,
    sightings:[], contact:"Case closed", missingFrom:"Houston, Texas",
    circumstance:"Homicide — Case Closed", ncmecId:"1257341",
    timeline:[
      {date:"2019-04-30",event:"Reported missing",type:"report"},
      {date:"2019-05-11",event:"Remains found in Arkansas",type:"update"},
      {date:"2020-09-14",event:"Stepfather convicted of murder",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk14", name:"Amari Nicholson", age:4, dob:"2017-01-14", gender:"Female",
    missing:"2021-07-06", city:"Washington", state:"DC", zip:"20001", status:"found_deceased",
    photo:"AN", height:"3'2\"", weight:"35 lbs", hair:"Black", eyes:"Brown",
    lastSeen:"Last seen with her mother in Washington DC",
    description:"Amari's remains were found after an extensive search. Mother convicted.",
    caseNum:"DC-2021-4421", alertLevel:"resolved",
    lat:38.9072, lng:-77.0369,
    sightings:[], contact:"Case closed", missingFrom:"Washington, D.C.",
    circumstance:"Homicide — Case Closed", ncmecId:"1309871",
    timeline:[
      {date:"2021-07-06",event:"Reported missing",type:"report"},
      {date:"2021-07-22",event:"Remains discovered",type:"update"},
      {date:"2022-03-18",event:"Mother convicted",type:"legal"},
    ],
    reward:0,
  },
  {
    id:"mk15", name:"Zuri Banks", age:9, dob:"2014-05-30", gender:"Female",
    missing:"2023-09-11", city:"Chicago", state:"IL", zip:"60647", status:"active",
    photo:"ZB", height:"4'2\"", weight:"65 lbs", hair:"Black/Braids", eyes:"Brown",
    lastSeen:"Walking home from Parkman Elementary — yellow jacket, purple backpack",
    description:"Zuri was last seen walking home from school. Gray van spotted nearby. $25,000 reward.",
    caseNum:"IL-2023-8871", alertLevel:"critical",
    lat:41.9010, lng:-87.7087,
    sightings:[{id:"s6",date:"2023-09-13",location:"Humboldt Park, IL",lat:41.9003,lng:-87.7220,detail:"Child matching description seen entering a gray van",confirmed:false,leVerified:false}],
    contact:"CPD: (312) 744-8200", missingFrom:"Chicago, Illinois",
    circumstance:"Endangered Missing / Possible Abduction", ncmecId:"1351234",
    timeline:[
      {date:"2023-09-11",event:"Last seen leaving Parkman Elementary",type:"report"},
      {date:"2023-09-11",event:"AMBER Alert issued — Chicago metro",type:"alert"},
      {date:"2023-09-13",event:"Gray van sighting — Humboldt Park",type:"sighting"},
      {date:"2023-09-20",event:"Reward increased to $25,000",type:"update"},
    ],
    reward:25000,
  },
];

const STATUS_META = {
  active:         {label:"MISSING",       color:"#EF4444", bg:"rgba(239,68,68,0.08)"},
  found:          {label:"FOUND SAFE",    color:"#10B981", bg:"rgba(16,185,129,0.08)"},
  found_deceased: {label:"CASE CLOSED",  color:"#6B7280", bg:"rgba(107,114,128,0.08)"},
};
const ALERT_META = {
  critical:{label:"AMBER ALERT", color:"#EF4444"},
  high:    {label:"MISSING",     color:"#F97316"},
  resolved:{label:"RESOLVED",   color:"#10B981"},
};
const TIMELINE_ICONS = {report:"🚨", alert:"📢", sighting:"👁", update:"📋", legal:"⚖️", resolved:"✅"};
const TIMELINE_COLORS = {report:"#EF4444", alert:"#F97316", sighting:"#3B82F6", update:"#6B7280", legal:"#8B5CF6", resolved:"#10B981"};

const KidAvatar = ({initials, alertLevel, size=56, C}) => {
  const colors = {
    critical:["rgba(239,68,68,0.15)","#EF4444"],
    high:    ["rgba(249,115,22,0.15)","#F97316"],
    resolved:["rgba(16,185,129,0.12)","#10B981"],
    default: ["rgba(59,130,246,0.12)","#3B82F6"],
  };
  const [bg,fg] = colors[alertLevel]||colors.default;
  return (
    <div style={{
      width:size, height:size, borderRadius:size*0.28,
      background:bg, color:fg,
      display:"flex", alignItems:"center", justifyContent:"center",
      fontSize:size*0.28, fontWeight:900, flexShrink:0,
      boxShadow:`0 4px 14px ${C.shadow}`, letterSpacing:"0.5px",
    }}>{initials}</div>
  );
};

// ── Leaflet Map Component ─────────────────────────────────────────────────────
const SightingsMap = ({kids, onSelectKid, C}) => {
  const mapRef = React.useRef(null);
  const mapInstanceRef = React.useRef(null);
  const markersRef = React.useRef([]);

  React.useEffect(() => {
    // Load Leaflet CSS + JS dynamically
    if (!document.getElementById("leaflet-css")) {
      const link = document.createElement("link");
      link.id = "leaflet-css";
      link.rel = "stylesheet";
      link.href = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.css";
      document.head.appendChild(link);
    }

    const initMap = () => {
      if (!mapRef.current || mapInstanceRef.current) return;
      const L = window.L;
      if (!L) return;

      const map = L.map(mapRef.current, {
        center: [39.5, -98.35],
        zoom: 4,
        zoomControl: true,
      });

      L.tileLayer("https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png", {
        attribution: "© OpenStreetMap © CARTO",
        maxZoom: 18,
      }).addTo(map);

      mapInstanceRef.current = map;

      // Add markers for each kid + sightings
      kids.forEach(kid => {
        if (!kid.lat || !kid.lng) return;
        const isActive = kid.status === "active";
        const color = kid.alertLevel === "critical" ? "#EF4444" : kid.alertLevel === "high" ? "#F97316" : "#10B981";

        // Main missing location marker
        const icon = L.divIcon({
          html: `<div style="
            width:36px;height:36px;border-radius:10px;
            background:${color};
            color:#fff;font-size:11px;font-weight:900;
            display:flex;align-items:center;justify-content:center;
            box-shadow:0 4px 12px rgba(0,0,0,0.4);
            border:2px solid white;
            cursor:pointer;
            animation:${isActive&&kid.alertLevel==="critical"?"pulse 2s ease-in-out infinite":"none"};
          ">${kid.photo}</div>`,
          className: "",
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        });

        const marker = L.marker([kid.lat, kid.lng], {icon})
          .addTo(map)
          .bindPopup(`
            <div style="font-family:sans-serif;min-width:180px">
              <p style="margin:0 0 4px;font-size:14px;font-weight:800;color:#111">${kid.name}</p>
              <p style="margin:0 0 2px;font-size:11px;color:#666">${kid.age} yrs · ${kid.gender}</p>
              <p style="margin:0 0 6px;font-size:11px;color:#666">Missing: ${kid.missing}</p>
              <span style="font-size:9px;font-weight:700;padding:2px 7px;border-radius:99px;
                background:${color}20;color:${color};border:1px solid ${color}40">
                ${STATUS_META[kid.status]?.label||"MISSING"}
              </span>
            </div>
          `);

        marker.on("click", () => onSelectKid(kid.id));
        markersRef.current.push(marker);

        // Sighting markers
        kid.sightings.forEach(s => {
          if (!s.lat || !s.lng) return;
          const sIcon = L.divIcon({
            html: `<div style="
              width:22px;height:22px;border-radius:50%;
              background:${s.leVerified?"#10B981":"#F97316"};
              border:2px solid white;
              box-shadow:0 2px 8px rgba(0,0,0,0.3);
            "></div>`,
            className:"", iconSize:[22,22], iconAnchor:[11,11],
          });
          L.marker([s.lat, s.lng], {icon: sIcon})
            .addTo(map)
            .bindPopup(`
              <div style="font-family:sans-serif;min-width:160px">
                <p style="margin:0 0 2px;font-size:11px;font-weight:700;color:${s.leVerified?"#10B981":"#F97316"}">
                  ${s.leVerified?"✓ LE Verified Sighting":"Unconfirmed Sighting"}
                </p>
                <p style="margin:0 0 2px;font-size:11px;color:#333;font-weight:600">${kid.name}</p>
                <p style="margin:0 0 2px;font-size:10px;color:#666">${s.location} · ${s.date}</p>
                <p style="margin:0;font-size:10px;color:#666">${s.detail}</p>
              </div>
            `);
        });
      });
    };

    if (window.L) {
      initMap();
    } else {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/leaflet@1.9.4/dist/leaflet.js";
      script.onload = initMap;
      document.head.appendChild(script);
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  return (
    <div style={{position:"relative",width:"100%",height:"100%",borderRadius:16,overflow:"hidden"}}>
      <div ref={mapRef} style={{width:"100%",height:"100%"}}/>
      <div style={{
        position:"absolute",bottom:12,left:12,
        background:"rgba(15,23,42,0.85)",
        backdropFilter:"blur(8px)",
        borderRadius:10,padding:"8px 12px",
        display:"flex",gap:12,zIndex:1000,
      }}>
        {[
          {color:"#EF4444",label:"AMBER Alert"},
          {color:"#F97316",label:"Missing"},
          {color:"#10B981",label:"Found / Resolved"},
          {color:"#F97316",label:"Sighting",dot:true},
          {color:"#10B981",label:"LE Verified",dot:true},
        ].map(l=>(
          <div key={l.label} style={{display:"flex",alignItems:"center",gap:5}}>
            <div style={{
              width:l.dot?10:12, height:l.dot?10:12,
              borderRadius:l.dot?"50%":3,
              background:l.color,
            }}/>
            <span style={{fontSize:9,color:"rgba(255,255,255,0.8)",fontWeight:600}}>{l.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Share Alert Card Generator ─────────────────────────────────────────────────
const ShareCard = ({kid, C, onClose}) => {
  const canvasRef = React.useRef(null);
  const [generated, setGenerated] = React.useState(false);
  const sm = STATUS_META[kid.status]||STATUS_META.active;

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const W = 540, H = 540;
    canvas.width = W; canvas.height = H;

    // Background
    ctx.fillStyle = "#0F172A";
    ctx.fillRect(0, 0, W, H);

    // Red accent bar
    ctx.fillStyle = "#EF4444";
    ctx.fillRect(0, 0, W, 6);

    // Alert type banner
    ctx.fillStyle = "rgba(239,68,68,0.15)";
    ctx.fillRect(20, 24, W-40, 50);
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 11px Arial";
    ctx.letterSpacing = "3px";
    ctx.fillText("🚨  MISSING CHILD — PLEASE SHARE", 36, 54);

    // Avatar circle
    ctx.fillStyle = "rgba(239,68,68,0.2)";
    ctx.beginPath();
    ctx.roundRect(20, 92, 120, 120, 16);
    ctx.fill();
    ctx.fillStyle = "#EF4444";
    ctx.font = "bold 36px Arial";
    ctx.textAlign = "center";
    ctx.fillText(kid.photo, 80, 162);

    // Name
    ctx.textAlign = "left";
    ctx.fillStyle = "#F9FAFB";
    ctx.font = "bold 28px Arial";
    ctx.fillText(kid.name, 156, 130);

    ctx.fillStyle = "#9CA3AF";
    ctx.font = "14px Arial";
    ctx.fillText(`${kid.age} years old  ·  ${kid.gender}  ·  ${kid.missingFrom}`, 156, 155);
    ctx.fillText(`Missing since: ${kid.missing}`, 156, 178);
    ctx.fillText(`Case #${kid.caseNum}`, 156, 200);

    // Divider
    ctx.strokeStyle = "rgba(255,255,255,0.08)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(20, 228); ctx.lineTo(W-20, 228);
    ctx.stroke();

    // Description
    ctx.fillStyle = "#E5E7EB";
    ctx.font = "13px Arial";
    const words = kid.lastSeen.split(" ");
    let line = "", y = 254;
    for (const w of words) {
      const test = line + w + " ";
      if (ctx.measureText(test).width > W-50 && line) {
        ctx.fillText(line, 20, y); line = w + " "; y += 22;
      } else { line = test; }
    }
    ctx.fillText(line, 20, y);

    // Physical details
    y += 36;
    ctx.fillStyle = "rgba(255,255,255,0.06)";
    ctx.fillRect(20, y, W-40, 80);
    ctx.fillStyle = "#9CA3AF";
    ctx.font = "bold 10px Arial";
    ctx.fillText("PHYSICAL DESCRIPTION", 32, y+20);
    ctx.fillStyle = "#F9FAFB";
    ctx.font = "13px Arial";
    ctx.fillText(`Height: ${kid.height}  ·  Weight: ${kid.weight}  ·  Hair: ${kid.hair}  ·  Eyes: ${kid.eyes}`, 32, y+44);
    ctx.fillText(`Last seen: ${kid.lastSeen.slice(0,70)}`, 32, y+64);

    // CTA
    y += 108;
    ctx.fillStyle = "#EF4444";
    ctx.beginPath();
    ctx.roundRect(20, y, W-40, 52, 12);
    ctx.fill();
    ctx.fillStyle = "#fff";
    ctx.font = "bold 16px Arial";
    ctx.textAlign = "center";
    ctx.fillText(`If you have information call: ${kid.contact}`, W/2, y+30);

    // Footer
    ctx.fillStyle = "#6B7280";
    ctx.font = "11px Arial";
    ctx.fillText("Neural Sentry AI · Missing Children Registry · NCMEC Partner", W/2, H-16);

    setGenerated(true);
  }, [kid]);

  const download = () => {
    const canvas = canvasRef.current;
    const a = document.createElement("a");
    a.download = `missing_alert_${kid.name.replace(/\s/g,"_")}.png`;
    a.href = canvas.toDataURL("image/png");
    a.click();
  };

  const copyText = () => {
    const text = `🚨 MISSING CHILD ALERT 🚨\n\n${kid.name}, ${kid.age} years old, ${kid.gender}\nMissing from: ${kid.missingFrom}\nMissing since: ${kid.missing}\n\n${kid.lastSeen}\n\nHeight: ${kid.height} | Hair: ${kid.hair} | Eyes: ${kid.eyes}\n\nIf you have information: ${kid.contact}\n\nCase #${kid.caseNum} | NCMEC #${kid.ncmecId}\n\n#MissingChild #${kid.name.replace(/\s/g,"")} #AMBER`;
    navigator.clipboard.writeText(text);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.85)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
      <div style={{background:C.bgCard,borderRadius:24,padding:24,
        width:"100%",maxWidth:600,boxShadow:`0 24px 64px rgba(0,0,0,0.6)`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
          <div>
            <h3 style={{margin:0,fontSize:16,fontWeight:900,color:C.text}}>Share Alert Card</h3>
            <p style={{margin:0,fontSize:11,color:C.muted}}>Download image or copy text for social media</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:C.muted,cursor:"pointer"}}>×</button>
        </div>
        <canvas ref={canvasRef} style={{width:"100%",borderRadius:12,border:`1px solid ${C.border}`}}/>
        <div style={{display:"flex",gap:10,marginTop:16}}>
          <button onClick={copyText}
            style={{flex:1,padding:"10px",borderRadius:12,background:C.bg,
              border:`1px solid ${C.border}`,color:C.text,fontWeight:600,fontSize:12,cursor:"pointer"}}>
            📋 Copy Alert Text
          </button>
          <button onClick={download} disabled={!generated}
            style={{flex:2,padding:"10px",borderRadius:12,background:"#EF4444",
              border:"none",color:"#fff",fontWeight:700,fontSize:12,cursor:"pointer"}}>
            ⬇ Download Image
          </button>
        </div>
        <p style={{margin:"10px 0 0",fontSize:10,color:C.muted,textAlign:"center"}}>
          Share to Facebook, Instagram, Twitter/X, Nextdoor — every share could save a life
        </p>
      </div>
    </div>
  );
};

// ── NCMEC Live Feed Simulator ─────────────────────────────────────────────────
const NCMECFeed = ({C, onNewCase}) => {
  const [feed, setFeed] = React.useState([
    {id:"f1",type:"AMBER ALERT",msg:"AMBER Alert issued — Jane Doe, 8, Chicago Metro Area",time:"3 min ago",color:"#EF4444"},
    {id:"f2",type:"CASE UPDATE",msg:"Tip received on NCMEC #1293847 — investigators reviewing",time:"18 min ago",color:"#3B82F6"},
    {id:"f3",type:"FOUND SAFE",msg:"Child recovered safe — NCMEC #1301111 closed",time:"1 hr ago",color:"#10B981"},
    {id:"f4",type:"NEW CASE",msg:"New missing child report filed — Memphis, TN",time:"2 hr ago",color:"#F97316"},
    {id:"f5",type:"REWARD",msg:"Reward increased to $50,000 — Dulce Maria Alavez case",time:"4 hr ago",color:"#8B5CF6"},
  ]);
  const [syncing, setSyncing] = React.useState(false);

  const syncNow = () => {
    setSyncing(true);
    setTimeout(() => {
      setFeed(prev => [{
        id:`f_${Date.now()}`,type:"SYNC",
        msg:`NCMEC database synced — ${prev.length + 1} active cases in your region`,
        time:"just now",color:"#10B981",
      },...prev]);
      setSyncing(false);
    }, 2000);
  };

  return (
    <div style={{display:"flex",flexDirection:"column",gap:10}}>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:4}}>
        <div style={{display:"flex",alignItems:"center",gap:8}}>
          <div style={{width:8,height:8,borderRadius:"50%",background:"#10B981",
            animation:"ping 1.5s cubic-bezier(0,0,0.2,1) infinite"}}/>
          <p style={{margin:0,fontSize:13,fontWeight:700,color:C.text}}>NCMEC Live Feed</p>
        </div>
        <button onClick={syncNow} disabled={syncing}
          style={{padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:700,cursor:"pointer",
            background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",
            color:"#10B981",opacity:syncing?0.6:1}}>
          {syncing?"Syncing…":"↻ Sync Now"}
        </button>
      </div>
      {feed.map(f=>(
        <div key={f.id} style={{
          padding:"12px 14px",borderRadius:14,
          background:C.bgCard,boxShadow:`0 3px 12px ${C.shadow}`,
          borderLeft:`3px solid ${f.color}`,
        }}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
            <span style={{fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:99,
              background:`${f.color}12`,color:f.color,letterSpacing:"0.8px"}}>{f.type}</span>
            <span style={{fontSize:10,color:C.muted}}>{f.time}</span>
          </div>
          <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.5,fontWeight:500}}>{f.msg}</p>
        </div>
      ))}
    </div>
  );
};

// ── SMS Blast Component ───────────────────────────────────────────────────────
const SMSBlast = ({kids, guardians, C, onClose}) => {
  const [step,        setStep]        = React.useState(1);
  const [selectedKid, setSelectedKid] = React.useState("");
  const [radius,      setRadius]      = React.useState(25);
  const [msgType,     setMsgType]     = React.useState("amber");
  const [sending,     setSending]     = React.useState(false);
  const [sent,        setSent]        = React.useState(false);
  const [recipCount,  setRecipCount]  = React.useState(0);

  const kid = kids.find(k=>k.id===selectedKid);

  const templates = {
    amber: kid ? `🚨 AMBER ALERT — ${kid.name}, ${kid.age}yo ${kid.gender}, missing from ${kid.city} ${kid.state}. Last seen: ${kid.lastSeen?.slice(0,60)}. If seen call ${kid.contact} or 911. Case #${kid.caseNum}` : "",
    sighting: kid ? `📍 SIGHTING ALERT — ${kid.name} may have been spotted near your area. Please be on the lookout. ${kid.height}, ${kid.hair} hair, ${kid.eyes} eyes. Call ${kid.contact} with any info.` : "",
    update: kid ? `📋 CASE UPDATE — ${kid.name} (Case #${kid.caseNum}): New information has emerged in this case. Please review updated details at the missing children registry and contact ${kid.contact} with any tips.` : "",
  };

  const estimatedRecip = Math.floor(guardians.length * 0.7 + Math.floor(Math.random() * 40) + radius * 2);

  const sendBlast = async () => {
    setSending(true);
    setRecipCount(estimatedRecip);
    await new Promise(r => setTimeout(r, 2500));
    setSending(false);
    setSent(true);
  };

  return (
    <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",
      display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
      <div style={{background:C.bgCard,borderRadius:24,padding:28,
        width:"100%",maxWidth:480,boxShadow:`0 24px 64px rgba(0,0,0,0.6)`}}>
        <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:20}}>
          <div>
            <h3 style={{margin:0,fontSize:16,fontWeight:900,color:C.text}}>SMS Area Blast</h3>
            <p style={{margin:0,fontSize:11,color:C.muted}}>Alert all guardians within a radius</p>
          </div>
          <button onClick={onClose} style={{background:"none",border:"none",fontSize:20,color:C.muted,cursor:"pointer"}}>×</button>
        </div>

        {!sent ? (<>
          {/* Step 1: Choose child */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>1. Select Missing Child</label>
            <select value={selectedKid} onChange={e=>setSelectedKid(e.target.value)}
              style={{width:"100%",padding:"10px 12px",borderRadius:10,background:C.bg,
                border:`1px solid ${C.border}`,color:C.text,fontSize:12,outline:"none",fontFamily:"inherit"}}>
              <option value="">— Select —</option>
              {kids.filter(k=>k.status==="active").map(k=>(
                <option key={k.id} value={k.id}>{k.name} — {k.city}, {k.state}</option>
              ))}
            </select>
          </div>

          {/* Step 2: Radius */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>
              2. Alert Radius: <span style={{color:C.text}}>{radius} miles</span>
            </label>
            <input type="range" min={5} max={100} value={radius} onChange={e=>setRadius(+e.target.value)}
              style={{width:"100%",accentColor:"#EF4444"}}/>
            <div style={{display:"flex",justifyContent:"space-between"}}>
              <span style={{fontSize:10,color:C.muted}}>5 mi</span>
              <span style={{fontSize:10,color:C.muted}}>100 mi</span>
            </div>
          </div>

          {/* Step 3: Message type */}
          <div style={{marginBottom:14}}>
            <label style={{fontSize:11,fontWeight:700,color:C.muted,display:"block",marginBottom:6,textTransform:"uppercase",letterSpacing:"0.5px"}}>3. Alert Type</label>
            <div style={{display:"flex",gap:6}}>
              {[{id:"amber",label:"AMBER Alert"},{id:"sighting",label:"Sighting"},{id:"update",label:"Update"}].map(t=>(
                <button key={t.id} onClick={()=>setMsgType(t.id)}
                  style={{flex:1,padding:"8px 6px",borderRadius:10,fontSize:10,fontWeight:700,cursor:"pointer",
                    background:msgType===t.id?"#EF4444":"transparent",
                    color:msgType===t.id?"#fff":C.muted,
                    border:`1px solid ${msgType===t.id?"#EF4444":C.border}`}}>
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {kid&&(
            <div style={{padding:"12px",borderRadius:12,background:C.bg,marginBottom:14,
              border:`1px solid ${C.border}`}}>
              <p style={{margin:"0 0 6px",fontSize:9,fontWeight:700,color:C.muted,textTransform:"uppercase",letterSpacing:"0.5px"}}>Message Preview</p>
              <p style={{margin:0,fontSize:11,color:C.text,lineHeight:1.6}}>{templates[msgType]}</p>
              <p style={{margin:"8px 0 0",fontSize:10,color:C.muted}}>
                Est. recipients: <span style={{color:"#EF4444",fontWeight:700}}>{estimatedRecip} people</span> within {radius} miles
              </p>
            </div>
          )}

          <button onClick={sendBlast} disabled={!kid||sending}
            style={{width:"100%",padding:"12px",borderRadius:14,
              background:!kid?"rgba(239,68,68,0.3)":"#EF4444",border:"none",
              color:"#fff",fontWeight:700,fontSize:13,cursor:!kid?"not-allowed":"pointer",
              opacity:sending?0.8:1}}>
            {sending ? "Sending alerts…" : `🚨 Blast to ~${estimatedRecip} Guardians`}
          </button>
        </>) : (
          <div style={{textAlign:"center",padding:"20px 0"}}>
            <div style={{fontSize:48,marginBottom:12}}>✅</div>
            <h4 style={{margin:"0 0 8px",fontSize:18,fontWeight:900,color:"#10B981"}}>Blast Sent!</h4>
            <p style={{margin:"0 0 4px",fontSize:13,color:C.text}}>
              <strong>{recipCount}</strong> guardians within <strong>{radius} miles</strong> have been alerted
            </p>
            <p style={{margin:"0 0 20px",fontSize:11,color:C.muted}}>Replies will appear in the SMS two-way console</p>
            <button onClick={onClose}
              style={{padding:"10px 24px",borderRadius:12,background:C.bg,
                border:`1px solid ${C.border}`,color:C.text,fontWeight:600,fontSize:12,cursor:"pointer"}}>
              Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

// ── Main Screen ───────────────────────────────────────────────────────────────
const MissingKidsScreen = ({C}) => {
  const [kids,          setKids]          = React.useState(MISSING_KIDS_DATA);
  const [activeKid,     setActiveKid]     = React.useState(null);
  const [filter,        setFilter]        = React.useState("active");
  const [search,        setSearch]        = React.useState("");
  const [tab,           setTab]           = React.useState("grid");
  const [sightings,     setSightings]     = React.useState(
    MISSING_KIDS_DATA.flatMap(k=>k.sightings.map(s=>({...s,kidId:k.id,kidName:k.name})))
  );
  const [liveAlerts,    setLiveAlerts]    = React.useState([
    {id:"la1",type:"AMBER ALERT",msg:"New AMBER Alert issued for Zuri Banks — Chicago, IL",time:"2 min ago",kidId:"mk15",color:"#EF4444"},
    {id:"la2",type:"SIGHTING",   msg:"Unconfirmed sighting — Nalani Daniels near Memphis, TN",time:"14 min ago",kidId:"mk10",color:"#F97316"},
    {id:"la3",type:"LE VERIFIED",msg:"Sighting CONFIRMED by investigators — Dulce Maria Alavez, Philadelphia PA",time:"1 hr ago",kidId:"mk4",color:"#10B981"},
    {id:"la4",type:"UPDATE",     msg:"Tip received for Harmony Montgomery case — NH investigators reviewing",time:"2 hr ago",kidId:"mk1",color:"#3B82F6"},
  ]);
  const [showReport,     setShowReport]     = React.useState(false);
  const [showGoMissing,  setShowGoMissing]  = React.useState(false);
  const [showSMSBlast,   setShowSMSBlast]   = React.useState(false);
  const [showShareCard,  setShowShareCard]  = React.useState(false);
  const [reportKidId,    setReportKidId]    = React.useState("");
  const [reportForm,     setReportForm]     = React.useState({location:"",date:"",detail:"",contact:"",anonymous:true});
  const [newMissingForm, setNewMissingForm] = React.useState({name:"",age:"",city:"",state:"",lastSeen:"",description:"",contact:""});
  const [submitted,      setSubmitted]      = React.useState(false);
  const [alertBanner,    setAlertBanner]    = React.useState(true);
  const [lePin,          setLePin]          = React.useState("");
  const [leVerified,     setLeVerified]     = React.useState(false);
  const [lePinModal,     setLePinModal]     = React.useState(false);
  const [lePinError,     setLePinError]     = React.useState("");

  const activeCount   = kids.filter(k=>k.status==="active").length;
  const criticalCount = kids.filter(k=>k.alertLevel==="critical"&&k.status==="active").length;
  const foundCount    = kids.filter(k=>k.status==="found").length;

  const filtered = kids.filter(k=>{
    const mf = filter==="all" || k.status===filter ||
      (filter==="active"&&k.status==="active")||
      (filter==="found"&&(k.status==="found"||k.status==="found_deceased"));
    const ms = !search ||
      k.name.toLowerCase().includes(search.toLowerCase())||
      k.state.toLowerCase().includes(search.toLowerCase())||
      k.city.toLowerCase().includes(search.toLowerCase());
    return mf&&ms;
  });

  const kid = activeKid ? kids.find(k=>k.id===activeKid) : null;
  const sm  = kid ? STATUS_META[kid.status]||STATUS_META.active : null;

  const ageNow = (k) => {
    if (!k.dob) return k.age;
    const born = new Date(k.dob);
    const now  = new Date();
    return now.getFullYear() - born.getFullYear() -
      (now < new Date(now.getFullYear(), born.getMonth(), born.getDate()) ? 1 : 0);
  };

  const submitSighting = () => {
    if (!reportForm.location||!reportForm.detail||!reportKidId) return;
    const k = kids.find(x=>x.id===reportKidId);
    const ns = {
      id:`s_${Date.now()}`,date:new Date().toISOString().split("T")[0],
      location:reportForm.location,detail:reportForm.detail,
      confirmed:false,leVerified:false,kidId:reportKidId,kidName:k?.name||"",
      lat:null,lng:null,
      anonymous:reportForm.anonymous,
    };
    setSightings(prev=>[ns,...prev]);
    setKids(prev=>prev.map(x=>x.id===reportKidId?{...x,sightings:[ns,...x.sightings]}:x));
    setLiveAlerts(prev=>[{
      id:`la_${Date.now()}`,type:"SIGHTING",
      msg:`New sighting reported: ${k?.name} — ${reportForm.location}${reportForm.anonymous?" (anonymous)":""}`,
      time:"just now",kidId:reportKidId,color:"#F97316",
    },...prev]);
    setShowReport(false);
    setReportForm({location:"",date:"",detail:"",contact:"",anonymous:true});
    setSubmitted(true);
    setTimeout(()=>setSubmitted(false),3500);
  };

  const submitNewMissing = () => {
    if (!newMissingForm.name||!newMissingForm.city) return;
    const initials = newMissingForm.name.split(" ").map(w=>w[0]).join("").slice(0,2).toUpperCase();
    const nk = {
      id:`mk_${Date.now()}`,name:newMissingForm.name,
      age:parseInt(newMissingForm.age)||0,dob:null,gender:"Unknown",
      missing:new Date().toISOString().split("T")[0],
      city:newMissingForm.city,state:newMissingForm.state,status:"active",
      photo:initials,height:"Unknown",weight:"Unknown",hair:"Unknown",eyes:"Unknown",
      lastSeen:newMissingForm.lastSeen,description:newMissingForm.description,
      caseNum:`NEW-${Date.now()}`,alertLevel:"critical",sightings:[],
      contact:newMissingForm.contact||"1-800-THE-LOST",
      missingFrom:`${newMissingForm.city}, ${newMissingForm.state}`,
      circumstance:"Recently Reported",ncmecId:"Pending",
      timeline:[{date:new Date().toISOString().split("T")[0],event:"Reported missing",type:"report"}],
      reward:0,lat:null,lng:null,
    };
    setKids(prev=>[nk,...prev]);
    setLiveAlerts(prev=>[{
      id:`la_${Date.now()}`,type:"NEW CASE",
      msg:`New case filed: ${newMissingForm.name} — ${newMissingForm.city}, ${newMissingForm.state}`,
      time:"just now",kidId:nk.id,color:"#EF4444",
    },...prev]);
    setShowGoMissing(false);
    setNewMissingForm({name:"",age:"",city:"",state:"",lastSeen:"",description:"",contact:""});
  };

  const verifyLESighting = (sightingId, kidId) => {
    setKids(prev=>prev.map(k=>k.id===kidId?{
      ...k,sightings:k.sightings.map(s=>s.id===sightingId?{...s,leVerified:true,confirmed:true}:s)
    }:k));
    setSightings(prev=>prev.map(s=>s.id===sightingId?{...s,leVerified:true,confirmed:true}:s));
    setLiveAlerts(prev=>[{
      id:`la_${Date.now()}`,type:"LE VERIFIED",
      msg:`Sighting confirmed by Law Enforcement — ${kids.find(k=>k.id===kidId)?.name||""}`,
      time:"just now",kidId,color:"#10B981",
    },...prev]);
  };

  const tryLEVerify = () => {
    if (lePin==="LEONLY2024") { setLeVerified(true); setLePinModal(false); setLePinError(""); }
    else { setLePinError("Invalid PIN. Contact your administrator."); }
  };

  const inp = {
    width:"100%",padding:"9px 12px",borderRadius:10,
    background:C.bgDeep||C.bg,border:`1px solid ${C.border}`,
    color:C.text,fontSize:12,outline:"none",
    boxSizing:"border-box",marginBottom:8,fontFamily:"inherit",
  };

  return (
    <div style={{display:"flex",flexDirection:"column",height:"100%",background:C.bg,overflow:"hidden"}}>

      {/* ── AMBER BANNER ──────────────────────────────── */}
      {alertBanner&&criticalCount>0&&(
        <div style={{background:"#EF4444",color:"#fff",padding:"9px 20px",flexShrink:0,
          display:"flex",alignItems:"center",gap:12}}>
          <span>🚨</span>
          <span style={{fontWeight:900,fontSize:12,letterSpacing:"0.5px",flex:1}}>
            {criticalCount} ACTIVE AMBER ALERT{criticalCount>1?"S":""} — Neural Sentry AI · Call 1-800-THE-LOST immediately if you have information
          </span>
          <button onClick={()=>setAlertBanner(false)}
            style={{background:"none",border:"none",color:"rgba(255,255,255,0.8)",fontSize:18,cursor:"pointer"}}>×</button>
        </div>
      )}

      {/* ── HEADER ────────────────────────────────────── */}
      <div style={{padding:"14px 20px 12px",borderBottom:`1px solid ${C.border}`,
        background:C.bgCard,flexShrink:0,boxShadow:`0 2px 12px ${C.shadow}`}}>

        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:12}}>
          <div style={{width:42,height:42,borderRadius:13,background:"rgba(239,68,68,0.1)",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20,flexShrink:0}}>🔍</div>
          <div style={{flex:1}}>
            <h2 style={{margin:0,fontSize:15,fontWeight:900,color:C.text}}>Missing Children Registry</h2>
            <p style={{margin:0,fontSize:11,color:C.muted}}>NCMEC Partner Feed · Live Sighting Alerts · LE Verified</p>
          </div>
          {leVerified&&(
            <span style={{fontSize:10,fontWeight:700,padding:"4px 10px",borderRadius:99,
              background:"rgba(16,185,129,0.1)",color:"#10B981",border:"1px solid rgba(16,185,129,0.3)"}}>
              🔒 LE Access
            </span>
          )}
          <div style={{display:"flex",gap:6}}>
            {!leVerified&&(
              <button onClick={()=>setLePinModal(true)}
                style={{padding:"7px 12px",borderRadius:99,background:"rgba(139,92,246,0.1)",
                  border:"1px solid rgba(139,92,246,0.3)",color:"#8B5CF6",fontSize:10,fontWeight:700,cursor:"pointer"}}>
                🔒 LE Login
              </button>
            )}
            <button onClick={()=>setShowSMSBlast(true)}
              style={{padding:"7px 12px",borderRadius:99,background:"rgba(59,130,246,0.1)",
                border:"1px solid rgba(59,130,246,0.3)",color:"#3B82F6",fontSize:10,fontWeight:700,cursor:"pointer"}}>
              📲 SMS Blast
            </button>
            <button onClick={()=>setShowReport(true)}
              style={{padding:"7px 12px",borderRadius:99,background:"rgba(249,115,22,0.1)",
                border:"1px solid rgba(249,115,22,0.3)",color:"#F97316",fontSize:10,fontWeight:700,cursor:"pointer"}}>
              📍 Sighting
            </button>
            <button onClick={()=>setShowGoMissing(true)}
              style={{padding:"7px 14px",borderRadius:99,background:"#EF4444",
                border:"none",color:"#fff",fontSize:10,fontWeight:700,cursor:"pointer"}}>
              + Report Missing
            </button>
          </div>
        </div>

        {/* Stats */}
        <div style={{display:"flex",gap:8,marginBottom:12}}>
          {[
            {label:"Active",val:activeCount,color:"#EF4444"},
            {label:"AMBER",val:criticalCount,color:"#EF4444"},
            {label:"Found Safe",val:foundCount,color:"#10B981"},
            {label:"Sightings",val:sightings.length,color:"#F97316"},
            {label:"LE Verified",val:sightings.filter(s=>s.leVerified).length,color:"#10B981"},
            {label:"Total",val:kids.length,color:C.electric},
          ].map(s=>(
            <div key={s.label} style={{flex:1,padding:"8px 10px",borderRadius:10,
              background:C.bgCard,boxShadow:`0 3px 12px ${C.shadow}`}}>
              <p style={{margin:0,fontSize:20,fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</p>
              <p style={{margin:"3px 0 0",fontSize:9,color:C.muted,fontWeight:600}}>{s.label}</p>
            </div>
          ))}
        </div>

        {/* Search + filter + tabs */}
        <div style={{display:"flex",gap:8,alignItems:"center",flexWrap:"wrap"}}>
          <div style={{flex:1,minWidth:150,display:"flex",alignItems:"center",gap:8,
            padding:"7px 12px",borderRadius:10,background:C.bg,border:`1px solid ${C.border}`}}>
            <span style={{color:C.muted}}>🔎</span>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Name, city, state…"
              style={{...inp,margin:0,padding:0,border:"none",background:"transparent",flex:1,fontSize:11}}/>
          </div>
          {[{id:"active",l:"Active"},{id:"found",l:"Found"},{id:"all",l:"All"}].map(f=>(
            <button key={f.id} onClick={()=>setFilter(f.id)}
              style={{padding:"6px 12px",borderRadius:99,fontSize:10,fontWeight:700,cursor:"pointer",
                background:filter===f.id?"#EF4444":"transparent",
                color:filter===f.id?"#fff":C.muted,
                border:`1px solid ${filter===f.id?"#EF4444":C.border}`}}>
              {f.l}
            </button>
          ))}
          <div style={{display:"flex",padding:3,borderRadius:10,background:C.bg,border:`1px solid ${C.border}`,gap:2}}>
            {[{id:"grid",l:"⊞"},{id:"list",l:"≡"},{id:"map",l:"🗺"},{id:"ncmec",l:"📡"},{id:"alerts",l:"🔔"}].map(v=>(
              <button key={v.id} onClick={()=>setTab(v.id)}
                style={{padding:"5px 9px",borderRadius:8,fontSize:12,cursor:"pointer",
                  background:tab===v.id?C.bgCard:"transparent",border:"none",
                  color:tab===v.id?C.text:C.muted}}>
                {v.l}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* ── BODY ──────────────────────────────────────── */}
      <div style={{flex:1,overflow:"hidden",display:"flex",minHeight:0}}>

        {/* Detail panel */}
        {kid&&tab!=="map"&&(
          <div style={{width:300,flexShrink:0,borderRight:`1px solid ${C.border}`,
            background:C.bgCard,display:"flex",flexDirection:"column",overflowY:"auto"}}>
            <div style={{padding:"14px 16px",borderBottom:`1px solid ${C.border}`,
              background:kid.alertLevel==="critical"?"rgba(239,68,68,0.05)":"transparent"}}>
              <button onClick={()=>setActiveKid(null)}
                style={{background:"none",border:"none",color:C.muted,cursor:"pointer",fontSize:11,marginBottom:10,padding:0}}>
                ← Back
              </button>
              <div style={{display:"flex",gap:12,alignItems:"flex-start"}}>
                <KidAvatar initials={kid.photo} alertLevel={kid.alertLevel} size={56} C={C}/>
                <div>
                  <div style={{display:"flex",gap:5,marginBottom:5,flexWrap:"wrap"}}>
                    <span style={{fontSize:8,fontWeight:900,padding:"2px 7px",borderRadius:99,
                      background:sm.bg,color:sm.color}}>{sm.label}</span>
                    {kid.alertLevel==="critical"&&kid.status==="active"&&(
                      <span style={{fontSize:8,fontWeight:900,padding:"2px 7px",borderRadius:99,
                        background:"rgba(239,68,68,0.1)",color:"#EF4444"}}>AMBER</span>
                    )}
                  </div>
                  <h3 style={{margin:0,fontSize:15,fontWeight:900,color:C.text}}>{kid.name}</h3>
                  <p style={{margin:"3px 0 0",fontSize:10,color:C.muted}}>
                    {kid.age} yrs now ({ageNow(kid)} today) · {kid.gender}
                  </p>
                  {ageNow(kid) !== kid.age && (
                    <p style={{margin:"3px 0 0",fontSize:10,color:"#F97316",fontWeight:600}}>
                      ⚠ Would now be {ageNow(kid)} years old
                    </p>
                  )}
                </div>
              </div>
            </div>

            <div style={{padding:"12px 16px",flex:1,overflowY:"auto"}}>
              {/* Physical */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:6,marginBottom:12}}>
                {[["Missing",kid.missing],["Case #",kid.caseNum],["Height",kid.height],
                  ["Weight",kid.weight],["Hair",kid.hair],["Eyes",kid.eyes]].map(([l,v])=>(
                  <div key={l} style={{padding:"7px 9px",borderRadius:9,background:C.bg}}>
                    <p style={{margin:0,fontSize:8,color:C.muted,fontWeight:600,textTransform:"uppercase"}}>{l}</p>
                    <p style={{margin:"1px 0 0",fontSize:10,color:C.text,fontWeight:700}}>{v}</p>
                  </div>
                ))}
              </div>

              {/* Reward */}
              {kid.reward>0&&(
                <div style={{padding:"8px 10px",borderRadius:10,background:"rgba(245,158,11,0.08)",
                  border:"1px solid rgba(245,158,11,0.2)",marginBottom:10}}>
                  <p style={{margin:0,fontSize:11,fontWeight:700,color:"#F59E0B"}}>
                    💰 ${kid.reward.toLocaleString()} Reward Offered
                  </p>
                </div>
              )}

              {/* Last seen */}
              <div style={{padding:"9px 11px",borderRadius:10,background:"rgba(239,68,68,0.05)",
                border:"1px solid rgba(239,68,68,0.12)",marginBottom:10}}>
                <p style={{margin:0,fontSize:8,color:"#EF4444",fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Last Seen</p>
                <p style={{margin:0,fontSize:11,color:C.text,lineHeight:1.5}}>{kid.lastSeen}</p>
              </div>

              {/* Description */}
              <div style={{padding:"9px 11px",borderRadius:10,background:C.bg,marginBottom:10}}>
                <p style={{margin:0,fontSize:8,color:C.muted,fontWeight:700,textTransform:"uppercase",marginBottom:3}}>Details</p>
                <p style={{margin:0,fontSize:10,color:C.textSub,lineHeight:1.6}}>{kid.description}</p>
              </div>

              {/* Circumstance */}
              <div style={{padding:"7px 11px",borderRadius:9,background:C.bg,marginBottom:14}}>
                <p style={{margin:0,fontSize:8,color:C.muted,fontWeight:600}}>Circumstance</p>
                <p style={{margin:"2px 0 0",fontSize:10,color:C.text,fontWeight:700}}>{kid.circumstance}</p>
              </div>

              {/* Timeline */}
              {kid.timeline&&kid.timeline.length>0&&(
                <div style={{marginBottom:14}}>
                  <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,color:C.text}}>Case Timeline</p>
                  {kid.timeline.map((t,i)=>(
                    <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                      <div style={{flexShrink:0,display:"flex",flexDirection:"column",alignItems:"center"}}>
                        <div style={{width:22,height:22,borderRadius:"50%",
                          background:`${TIMELINE_COLORS[t.type]}15`,
                          display:"flex",alignItems:"center",justifyContent:"center",fontSize:10}}>
                          {TIMELINE_ICONS[t.type]}
                        </div>
                        {i<kid.timeline.length-1&&(
                          <div style={{width:1,flex:1,minHeight:12,background:C.border,margin:"3px 0"}}/>
                        )}
                      </div>
                      <div style={{paddingBottom:4}}>
                        <p style={{margin:0,fontSize:10,fontWeight:700,color:C.text}}>{t.event}</p>
                        <p style={{margin:"1px 0 0",fontSize:9,color:C.muted}}>{t.date}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Sightings */}
              {kid.sightings.length>0&&(
                <div style={{marginBottom:14}}>
                  <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,color:C.text}}>
                    Sightings ({kid.sightings.length})
                  </p>
                  {kid.sightings.map(s=>(
                    <div key={s.id} style={{padding:"9px 11px",borderRadius:10,
                      background:s.leVerified?"rgba(16,185,129,0.06)":"rgba(249,115,22,0.06)",
                      border:`1px solid ${s.leVerified?"rgba(16,185,129,0.2)":"rgba(249,115,22,0.2)"}`,
                      marginBottom:6}}>
                      <div style={{display:"flex",justifyContent:"space-between",marginBottom:3}}>
                        <span style={{fontSize:9,fontWeight:700,color:s.leVerified?"#10B981":"#F97316"}}>
                          {s.leVerified?"✓ LE Verified":"Unconfirmed"} — {s.location}
                        </span>
                        <span style={{fontSize:9,color:C.muted}}>{s.date}</span>
                      </div>
                      <p style={{margin:0,fontSize:10,color:C.textSub,lineHeight:1.5}}>{s.detail}</p>
                      {leVerified&&!s.leVerified&&(
                        <button onClick={()=>verifyLESighting(s.id,kid.id)}
                          style={{marginTop:6,padding:"4px 10px",borderRadius:99,fontSize:9,fontWeight:700,cursor:"pointer",
                            background:"rgba(16,185,129,0.1)",border:"1px solid rgba(16,185,129,0.3)",color:"#10B981"}}>
                          ✓ Mark LE Verified
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Actions */}
              <div style={{display:"flex",flexDirection:"column",gap:7}}>
                <button onClick={()=>{setReportKidId(kid.id);setShowReport(true);}}
                  style={{padding:"9px",borderRadius:11,background:"#F97316",border:"none",
                    color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                  📍 Report Sighting
                </button>
                <button onClick={()=>{setActiveKid(activeKid);setShowShareCard(true);}}
                  style={{padding:"9px",borderRadius:11,background:C.bg,
                    border:`1px solid ${C.border}`,color:C.text,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  🔗 Share Alert Card
                </button>
                <button onClick={()=>setShowSMSBlast(true)}
                  style={{padding:"9px",borderRadius:11,background:C.bg,
                    border:`1px solid ${C.border}`,color:C.text,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  📲 SMS Area Blast
                </button>
                <a href={`tel:${kid.contact.replace(/[^0-9+]/g,"")}`}
                  style={{padding:"9px",borderRadius:11,background:C.bg,
                    border:`1px solid ${C.border}`,color:C.text,fontWeight:600,fontSize:11,
                    cursor:"pointer",textDecoration:"none",display:"block",textAlign:"center"}}>
                  📞 {kid.contact}
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Main content */}
        <div style={{flex:1,overflowY:"auto",padding:tab==="map"?0:16,minWidth:0}}>

          {/* MAP TAB */}
          {tab==="map"&&(
            <SightingsMap kids={kids} onSelectKid={id=>{setActiveKid(id);setTab("grid");}} C={C}/>
          )}

          {/* NCMEC FEED TAB */}
          {tab==="ncmec"&&(
            <div style={{maxWidth:680}}>
              <NCMECFeed C={C} onNewCase={()=>{}}/>
            </div>
          )}

          {/* LIVE ALERTS TAB */}
          {tab==="alerts"&&(
            <div style={{maxWidth:680}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
                <div style={{width:8,height:8,borderRadius:"50%",background:"#EF4444",
                  animation:"ping 1s cubic-bezier(0,0,0.2,1) infinite"}}/>
                <p style={{margin:0,fontSize:13,fontWeight:700,color:C.text}}>Live Alert Feed</p>
                <span style={{marginLeft:"auto",fontSize:10,color:C.muted}}>{liveAlerts.length} alerts</span>
              </div>
              {liveAlerts.map(a=>(
                <div key={a.id} onClick={()=>{setActiveKid(a.kidId);setTab("grid");}}
                  style={{padding:"12px 14px",borderRadius:14,background:C.bgCard,
                    boxShadow:`0 3px 12px ${C.shadow}`,borderLeft:`3px solid ${a.color}`,
                    cursor:"pointer",marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                    <span style={{fontSize:9,fontWeight:900,padding:"2px 8px",borderRadius:99,
                      background:`${a.color}12`,color:a.color,letterSpacing:"0.8px"}}>{a.type}</span>
                    <span style={{fontSize:10,color:C.muted}}>{a.time}</span>
                  </div>
                  <p style={{margin:0,fontSize:12,color:C.text,lineHeight:1.5,fontWeight:500}}>{a.msg}</p>
                </div>
              ))}
            </div>
          )}

          {/* GRID TAB */}
          {tab==="grid"&&(
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))",gap:12}}>
              {filtered.map(k=>{
                const sm2 = STATUS_META[k.status]||STATUS_META.active;
                const nowAge = ageNow(k);
                return (
                  <div key={k.id} onClick={()=>setActiveKid(k.id)}
                    style={{borderRadius:18,background:C.bgCard,cursor:"pointer",overflow:"hidden",
                      boxShadow:activeKid===k.id?`0 0 0 2px #EF4444,0 8px 24px ${C.shadow}`:`0 4px 18px ${C.shadow}`,
                      opacity:k.status==="found_deceased"?0.6:1,
                      transition:"transform 0.15s,box-shadow 0.15s"}}>
                    <div style={{padding:"14px 14px 10px",display:"flex",gap:10,alignItems:"flex-start"}}>
                      <KidAvatar initials={k.photo} alertLevel={k.alertLevel} size={44} C={C}/>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",gap:3,marginBottom:4,flexWrap:"wrap"}}>
                          <span style={{fontSize:8,fontWeight:800,padding:"2px 6px",borderRadius:99,
                            background:sm2.bg,color:sm2.color}}>{sm2.label}</span>
                          {k.alertLevel==="critical"&&k.status==="active"&&(
                            <span style={{fontSize:8,padding:"2px 6px",borderRadius:99,
                              background:"rgba(239,68,68,0.1)",color:"#EF4444",fontWeight:800}}>🚨</span>
                          )}
                        </div>
                        <p style={{margin:0,fontSize:12,fontWeight:800,color:C.text,
                          overflow:"hidden",whiteSpace:"nowrap",textOverflow:"ellipsis"}}>{k.name}</p>
                        <p style={{margin:"1px 0 0",fontSize:9,color:C.muted}}>
                          {k.age} yrs missing {nowAge!==k.age?`· ${nowAge} today`:""}
                        </p>
                      </div>
                    </div>
                    <div style={{padding:"8px 14px 12px",borderTop:`1px solid ${C.border}`}}>
                      <p style={{margin:"0 0 2px",fontSize:9,color:C.muted}}>📍 {k.city}, {k.state}</p>
                      <p style={{margin:"0 0 6px",fontSize:9,color:C.muted}}>📅 {k.missing}</p>
                      <p style={{margin:0,fontSize:9,color:C.textSub,lineHeight:1.5,
                        overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,WebkitBoxOrient:"vertical"}}>
                        {k.lastSeen}
                      </p>
                      {k.reward>0&&(
                        <p style={{margin:"6px 0 0",fontSize:9,fontWeight:700,color:"#F59E0B"}}>
                          💰 ${k.reward.toLocaleString()} reward
                        </p>
                      )}
                      {k.sightings.length>0&&(
                        <span style={{display:"inline-block",marginTop:5,fontSize:8,padding:"2px 7px",
                          borderRadius:99,background:"rgba(249,115,22,0.1)",color:"#F97316",fontWeight:600}}>
                          {k.sightings.length} sighting{k.sightings.length>1?"s":""}
                          {k.sightings.some(s=>s.leVerified)?" · ✓ LE":""}
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filtered.length===0&&(
                <div style={{gridColumn:"1/-1",textAlign:"center",padding:40,color:C.muted,fontSize:12}}>
                  No cases match your filter
                </div>
              )}
            </div>
          )}

          {/* LIST TAB */}
          {tab==="list"&&(
            <div style={{display:"flex",flexDirection:"column",gap:7,maxWidth:780}}>
              {filtered.map(k=>{
                const sm2=STATUS_META[k.status]||STATUS_META.active;
                return (
                  <div key={k.id} onClick={()=>setActiveKid(k.id)}
                    style={{padding:"12px 14px",borderRadius:14,background:C.bgCard,
                      boxShadow:`0 3px 12px ${C.shadow}`,cursor:"pointer",
                      display:"flex",gap:12,alignItems:"center",
                      borderLeft:`3px solid ${sm2.color}`}}>
                    <KidAvatar initials={k.photo} alertLevel={k.alertLevel} size={40} C={C}/>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                        <span style={{fontSize:12,fontWeight:800,color:C.text}}>{k.name}</span>
                        <span style={{fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:99,
                          background:sm2.bg,color:sm2.color}}>{sm2.label}</span>
                        {k.alertLevel==="critical"&&k.status==="active"&&(
                          <span style={{fontSize:8,fontWeight:700,padding:"1px 6px",borderRadius:99,
                            background:"rgba(239,68,68,0.1)",color:"#EF4444"}}>AMBER</span>
                        )}
                      </div>
                      <p style={{margin:0,fontSize:10,color:C.muted}}>
                        {k.age} yrs · {k.gender} · {k.city}, {k.state} · {k.missing}
                      </p>
                    </div>
                    <div style={{flexShrink:0,textAlign:"right"}}>
                      <p style={{margin:0,fontSize:9,color:C.muted}}>{k.caseNum}</p>
                      {k.reward>0&&<p style={{margin:"2px 0 0",fontSize:9,color:"#F59E0B",fontWeight:600}}>${k.reward.toLocaleString()}</p>}
                      {k.sightings.length>0&&(
                        <p style={{margin:"2px 0 0",fontSize:9,color:"#F97316",fontWeight:600}}>
                          {k.sightings.length} sighting{k.sightings.length>1?"s":""}
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── MODALS ────────────────────────────────────── */}

      {/* Report Sighting */}
      {showReport&&(
        <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.85)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <div style={{background:C.bgCard,borderRadius:22,padding:26,
            width:"100%",maxWidth:420,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:900,color:C.text}}>📍 Report a Sighting</h3>
            <p style={{margin:"0 0 16px",fontSize:11,color:C.muted}}>Your tip could bring a child home safely</p>
            <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Child</label>
            <select value={reportKidId} onChange={e=>setReportKidId(e.target.value)} style={inp}>
              <option value="">— Select —</option>
              {kids.filter(k=>k.status==="active").map(k=>(
                <option key={k.id} value={k.id}>{k.name} — {k.city}, {k.state}</option>
              ))}
            </select>
            <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Location Seen</label>
            <input value={reportForm.location} onChange={e=>setReportForm(p=>({...p,location:e.target.value}))}
              placeholder="City, state or address" style={inp}/>
            <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Date / Time</label>
            <input type="date" value={reportForm.date} onChange={e=>setReportForm(p=>({...p,date:e.target.value}))} style={inp}/>
            <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>What did you see?</label>
            <textarea value={reportForm.detail} onChange={e=>setReportForm(p=>({...p,detail:e.target.value}))}
              placeholder="Describe clothing, who was with them, direction of travel, vehicle…"
              rows={3} style={{...inp,resize:"none",lineHeight:1.5}}/>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:12}}>
              <input type="checkbox" id="anon" checked={reportForm.anonymous}
                onChange={e=>setReportForm(p=>({...p,anonymous:e.target.checked}))}/>
              <label htmlFor="anon" style={{fontSize:11,color:C.muted,cursor:"pointer"}}>
                🔒 Submit anonymously (recommended)
              </label>
            </div>
            {!reportForm.anonymous&&(
              <input value={reportForm.contact} onChange={e=>setReportForm(p=>({...p,contact:e.target.value}))}
                placeholder="Your phone / email for investigators" style={inp}/>
            )}
            <div style={{display:"flex",gap:8,marginTop:4}}>
              <button onClick={()=>setShowReport(false)}
                style={{flex:1,padding:"10px",borderRadius:11,background:C.bg,
                  border:`1px solid ${C.border}`,color:C.muted,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                Cancel
              </button>
              <button onClick={submitSighting}
                disabled={!reportForm.location||!reportForm.detail||!reportKidId}
                style={{flex:2,padding:"10px",borderRadius:11,background:"#F97316",border:"none",
                  color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",
                  opacity:!reportForm.location||!reportForm.detail||!reportKidId?0.5:1}}>
                Submit Sighting
              </button>
            </div>
            <p style={{margin:"10px 0 0",fontSize:9,color:C.muted,textAlign:"center"}}>
              For emergencies, call 911. Tips forwarded to NCMEC and local LE.
            </p>
          </div>
        </div>
      )}

      {/* Report New Missing */}
      {showGoMissing&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <div style={{background:C.bgCard,borderRadius:22,padding:26,
            width:"100%",maxWidth:420,boxShadow:"0 24px 64px rgba(0,0,0,0.5)",maxHeight:"90vh",overflowY:"auto"}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:900,color:"#EF4444"}}>🚨 Report Missing Child</h3>
            <p style={{margin:"0 0 14px",fontSize:11,color:C.muted}}>Immediate registry entry + area alert</p>
            <div style={{padding:"9px 11px",borderRadius:10,background:"rgba(239,68,68,0.06)",
              border:"1px solid rgba(239,68,68,0.2)",marginBottom:14}}>
              <p style={{margin:0,fontSize:10,color:"#EF4444",fontWeight:600}}>
                ⚠ In an emergency, call 911 first. This form files a registry report.
              </p>
            </div>
            {[
              {l:"Child's Full Name *",k:"name",p:"First and last name"},
              {l:"Age *",k:"age",p:"Age in years"},
              {l:"City Last Seen *",k:"city",p:"City"},
              {l:"State",k:"state",p:"State abbreviation"},
              {l:"When & Where Last Seen",k:"lastSeen",p:"e.g. Monday 3pm leaving school"},
              {l:"Your Contact Number",k:"contact",p:"For investigators to reach you"},
            ].map(f=>(
              <div key={f.k}>
                <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>{f.l}</label>
                <input value={newMissingForm[f.k]} onChange={e=>setNewMissingForm(p=>({...p,[f.k]:e.target.value}))}
                  placeholder={f.p} style={inp}/>
              </div>
            ))}
            <label style={{fontSize:10,fontWeight:700,color:C.muted,display:"block",marginBottom:4,textTransform:"uppercase"}}>Description / What They Were Wearing</label>
            <textarea value={newMissingForm.description} onChange={e=>setNewMissingForm(p=>({...p,description:e.target.value}))}
              placeholder="Physical description, clothing, any associates or vehicle info…"
              rows={3} style={{...inp,resize:"none",lineHeight:1.5}}/>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setShowGoMissing(false)}
                style={{flex:1,padding:"10px",borderRadius:11,background:C.bg,
                  border:`1px solid ${C.border}`,color:C.muted,fontWeight:600,fontSize:11,cursor:"pointer"}}>Cancel</button>
              <button onClick={submitNewMissing}
                disabled={!newMissingForm.name||!newMissingForm.city}
                style={{flex:2,padding:"10px",borderRadius:11,background:"#EF4444",border:"none",
                  color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",
                  opacity:!newMissingForm.name||!newMissingForm.city?0.5:1}}>
                🚨 File Report + Alert Area
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SMS Blast Modal */}
      {showSMSBlast&&(
        <SMSBlast kids={kids} guardians={[]} C={C} onClose={()=>setShowSMSBlast(false)}/>
      )}

      {/* Share Card Modal */}
      {showShareCard&&kid&&(
        <ShareCard kid={kid} C={C} onClose={()=>setShowShareCard(false)}/>
      )}

      {/* LE PIN Modal */}
      {lePinModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.8)",
          display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
          <div style={{background:C.bgCard,borderRadius:22,padding:28,
            width:"100%",maxWidth:360,boxShadow:"0 24px 64px rgba(0,0,0,0.5)"}}>
            <h3 style={{margin:"0 0 4px",fontSize:15,fontWeight:900,color:C.text}}>🔒 Law Enforcement Access</h3>
            <p style={{margin:"0 0 16px",fontSize:11,color:C.muted}}>Enter your LE access PIN to verify sightings</p>
            <input type="password" value={lePin} onChange={e=>setLePin(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&tryLEVerify()}
              placeholder="Enter PIN (hint: LEONLY2024)"
              style={{...inp,marginBottom:4}}/>
            {lePinError&&<p style={{margin:"0 0 10px",fontSize:10,color:"#EF4444"}}>{lePinError}</p>}
            <p style={{margin:"0 0 14px",fontSize:9,color:C.muted}}>
              LE access allows you to mark sightings as verified and update case status.
            </p>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setLePinModal(false)}
                style={{flex:1,padding:"10px",borderRadius:11,background:C.bg,
                  border:`1px solid ${C.border}`,color:C.muted,fontWeight:600,fontSize:11,cursor:"pointer"}}>Cancel</button>
              <button onClick={tryLEVerify}
                style={{flex:2,padding:"10px",borderRadius:11,background:"#8B5CF6",border:"none",
                  color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                Verify Access
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Success toast */}
      {submitted&&(
        <div style={{position:"fixed",bottom:24,right:24,
          background:"#10B981",color:"#fff",padding:"12px 20px",
          borderRadius:14,fontWeight:700,fontSize:13,
          boxShadow:"0 8px 24px rgba(16,185,129,0.4)",zIndex:9999}}>
          ✓ Sighting submitted — forwarded to investigators
        </div>
      )}
    </div>
  );
};


const SCHOOLS = [
  {id:"s1",name:"Lincoln Middle School",district:"Westfield USD",students:843,monitored:712,incidents:14,safetyScore:88,grade:"A-",status:"active",channels:["#general","#homework","#sports"]},
  {id:"s2",name:"Roosevelt Elementary",district:"Westfield USD",students:521,monitored:521,incidents:6,safetyScore:94,grade:"A",status:"active",channels:["#general","#lunch"]},
  {id:"s3",name:"Jefferson High School",district:"Westfield USD",students:1240,monitored:980,incidents:31,safetyScore:74,grade:"C+",status:"active",channels:["#general","#gaming","#sports","#seniors"]},
  {id:"s4",name:"Washington Academy",district:"Northgate USD",students:670,monitored:540,incidents:9,safetyScore:91,grade:"A-",status:"active",channels:["#general","#chess","#debate"]},
  {id:"s5",name:"Parkside K-8",district:"Northgate USD",students:390,monitored:390,incidents:3,safetyScore:97,grade:"A+",status:"active",channels:["#general"]},
  {id:"s6",name:"Central High",district:"Riverdale USD",students:1560,monitored:820,incidents:47,safetyScore:62,grade:"D+",status:"warning",channels:["#general","#drama","#band","#gaming","#seniors"]},
  {id:"s7",name:"Maple Grove Middle",district:"Riverdale USD",students:720,monitored:680,incidents:18,safetyScore:83,grade:"B",status:"active",channels:["#general","#sports"]},
];

const PLATFORM_LIST = [
  {id:"discord",  name:"Discord",   icon:"💬", color:"#5865F2", desc:"Monitor servers, channels, and DM alerts",   status:"connected", users:1240, incidents:23},
  {id:"roblox",   name:"Roblox",    icon:"🎮", color:"#E62929", desc:"Game chat, voice, and in-game messages",      status:"connected", users:890,  incidents:41},
  {id:"twitch",   name:"Twitch",    icon:"🟣", color:"#9146FF", desc:"Stream chat and whisper monitoring",           status:"available", users:0,    incidents:0},
  {id:"youtube",  name:"YouTube",   icon:"▶️", color:"#FF0000", desc:"Comment and live stream chat monitoring",      status:"available", users:0,    incidents:0},
  {id:"minecraft",name:"Minecraft", icon:"⛏", color:"#62B47A", desc:"Server chat and in-game communication",        status:"available", users:0,    incidents:0},
  {id:"instagram",name:"Instagram", icon:"📸", color:"#E1306C", desc:"DMs, comments, and story replies",             status:"coming",    users:0,    incidents:0},
  {id:"tiktok",   name:"TikTok",    icon:"🎵", color:"#010101", desc:"Comments and DM monitoring",                   status:"coming",    users:0,    incidents:0},
  {id:"snapchat", name:"Snapchat",  icon:"👻", color:"#FFFC00", desc:"Message safety scanning",                      status:"coming",    users:0,    incidents:0},
];

const WEBHOOK_DOCS = {
  discord: {
    steps:[
      "Open Discord Server Settings → Integrations → Webhooks",
      "Click 'New Webhook' and select the channel to monitor",
      "Copy the webhook URL and paste it below",
      "Enable 'Message Content Intent' in Developer Portal → Bot",
    ],
    fields:[{label:"Webhook URL",ph:"https://discord.com/api/webhooks/..."},{label:"Bot Token (optional)",ph:"MT..."}],
    curl:`curl -X POST https://discord.com/api/webhooks/YOUR_ID/YOUR_TOKEN \\
  -H "Content-Type: application/json" \\
  -d '{"content":"Neural Sentry AI connected ✅"}'`,
  },
  roblox: {
    steps:[
      "Go to Roblox Creator Dashboard → Open Studio",
      "Install the Neural Sentry plugin from the Toolbox",
      "Add your API key to the plugin settings",
      "Enable the chat filter hook in game settings",
    ],
    fields:[{label:"API Key",ph:"nsa_live_..."},{label:"Game ID",ph:"1234567890"}],
    curl:`-- In Roblox Studio LocalScript:
local NS = require(game.ServerStorage.NeuralSentry)
NS.connect({apiKey = "YOUR_KEY", gameId = "YOUR_GAME_ID"})`,
  },
};

const IntegrationsScreen = ({C}) => {
  const [tab,            setTab]           = useState("platforms");
  const [selPlatform,    setSelPlatform]   = useState(null);
  const [connecting,     setConnecting]    = useState(null);
  const [connected,      setConnected]     = useState({discord:true, roblox:true});
  const [districtFilter, setDistrictFilter]= useState("All");
  const [webhookVals,    setWebhookVals]   = useState({});
  const [testResult,     setTestResult]    = useState(null);
  const [testing,        setTesting]       = useState(false);

  const districts      = ["All",...new Set(SCHOOLS.map(s=>s.district))];
  const filteredSchools= districtFilter==="All"?SCHOOLS:SCHOOLS.filter(s=>s.district===districtFilter);
  const totalStudents  = SCHOOLS.reduce((a,s)=>a+s.students,0);
  const totalMonitored = SCHOOLS.reduce((a,s)=>a+s.monitored,0);
  const totalIncidents = SCHOOLS.reduce((a,s)=>a+s.incidents,0);
  const avgScore       = Math.round(SCHOOLS.reduce((a,s)=>a+s.safetyScore,0)/SCHOOLS.length);

  const gradeColor = g => g.startsWith("A")?C.emerald:g.startsWith("B")?C.electric:g.startsWith("C")?C.amber:C.crimson;

  const simulateConnect = async (pid) => {
    setConnecting(pid);
    await new Promise(r=>setTimeout(r,1800));
    setConnected(p=>({...p,[pid]:true}));
    setConnecting(null);
    setSelPlatform(null);
  };

  const testWebhook = async () => {
    setTesting(true); setTestResult(null);
    await new Promise(r=>setTimeout(r,1400));
    setTestResult({ok:true, msg:"✓ Webhook responded — connection verified"});
    setTesting(false);
  };

  // Soft white palette override for this screen
  const W = {
    bg:      "#FFFFFF",
    bgPage:  "#F8FAFC",
    bgCard:  "#FFFFFF",
    border:  "#E8EDF3",
    borderSoft:"#F0F4F8",
    text:    "#0F172A",
    textSub: "#475569",
    muted:   "#94A3B8",
    shadow:  "rgba(15,23,42,0.06)",
    shadowMd:"rgba(15,23,42,0.10)",
    tag:     "#F1F5F9",
    tagText: "#64748B",
  };

  const tabs = [
    {id:"platforms", label:"Platforms",     ico:"🔗"},
    {id:"schools",   label:"Schools",       ico:"🏫"},
    {id:"webhooks",  label:"Webhooks",      ico:"⚡"},
    {id:"apikeys",   label:"API Keys",      ico:"🔑"},
  ];

  const inp = {
    width:"100%", padding:"9px 12px", borderRadius:10,
    background:W.bgPage, border:`1px solid ${W.border}`,
    color:W.text, fontSize:12, outline:"none",
    boxSizing:"border-box", marginBottom:10, fontFamily:"inherit",
  };

  const StatusBadge = ({status}) => {
    const meta = {
      connected: {label:"Connected",  bg:"#ECFDF5", color:"#059669"},
      available: {label:"Available",  bg:"#EFF6FF", color:"#2563EB"},
      coming:    {label:"Coming Soon",bg:"#F8FAFC", color:"#94A3B8"},
      warning:   {label:"Warning",    bg:"#FFF7ED", color:"#D97706"},
      active:    {label:"Active",     bg:"#ECFDF5", color:"#059669"},
    };
    const m = meta[status]||meta.available;
    return (
      <span style={{fontSize:9,fontWeight:700,padding:"3px 8px",borderRadius:99,
        background:m.bg,color:m.color,letterSpacing:"0.4px"}}>{m.label}</span>
    );
  };

  return (
    <div style={{minHeight:"100%",background:W.bgPage,fontFamily:"inherit"}}>

      {/* Page header */}
      <div style={{background:W.bg,borderBottom:`1px solid ${W.border}`,
        padding:"20px 24px 0",boxShadow:`0 1px 0 ${W.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:14,marginBottom:20}}>
          <div style={{width:44,height:44,borderRadius:14,background:"#EFF6FF",
            display:"flex",alignItems:"center",justifyContent:"center",fontSize:20}}>🔗</div>
          <div>
            <h2 style={{margin:0,fontSize:16,fontWeight:800,color:W.text}}>Integrations</h2>
            <p style={{margin:0,fontSize:12,color:W.muted}}>Connect platforms, schools, and configure webhooks</p>
          </div>
          <div style={{marginLeft:"auto",display:"flex",gap:8}}>
            <div style={{padding:"8px 14px",borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`,textAlign:"center"}}>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:C.electric}}>{Object.values(connected).filter(Boolean).length}</p>
              <p style={{margin:0,fontSize:9,color:W.muted,fontWeight:600}}>Connected</p>
            </div>
            <div style={{padding:"8px 14px",borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`,textAlign:"center"}}>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:C.emerald}}>{totalMonitored.toLocaleString()}</p>
              <p style={{margin:0,fontSize:9,color:W.muted,fontWeight:600}}>Users Monitored</p>
            </div>
            <div style={{padding:"8px 14px",borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`,textAlign:"center"}}>
              <p style={{margin:0,fontSize:18,fontWeight:800,color:W.text}}>{SCHOOLS.length}</p>
              <p style={{margin:0,fontSize:9,color:W.muted,fontWeight:600}}>Schools</p>
            </div>
          </div>
        </div>

        {/* Tab bar */}
        <div style={{display:"flex",gap:0}}>
          {tabs.map(t=>(
            <button key={t.id} onClick={()=>setTab(t.id)}
              style={{padding:"10px 18px",background:"none",border:"none",cursor:"pointer",
                fontSize:12,fontWeight:tab===t.id?700:500,
                color:tab===t.id?C.electric:W.muted,
                borderBottom:tab===t.id?`2px solid ${C.electric}`:"2px solid transparent",
                display:"flex",alignItems:"center",gap:6,transition:"color 0.15s"}}>
              <span>{t.ico}</span>{t.label}
            </button>
          ))}
        </div>
      </div>

      <div style={{padding:24}}>

        {/* ── PLATFORMS ── */}
        {tab==="platforms"&&(
          <div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {PLATFORM_LIST.map(p=>{
                const isConnected = connected[p.id];
                const isConnecting = connecting===p.id;
                return (
                  <div key={p.id} style={{
                    background:W.bg, borderRadius:16,
                    border:`1px solid ${isConnected?`${p.color}20`:W.border}`,
                    boxShadow:isConnected?`0 4px 20px ${p.color}10`:`0 2px 12px ${W.shadow}`,
                    padding:"18px 20px",
                    opacity:p.status==="coming"?0.6:1,
                    transition:"box-shadow 0.2s,transform 0.15s",
                  }}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:14,marginBottom:14}}>
                      <div style={{width:44,height:44,borderRadius:12,
                        background:`${p.color}12`,display:"flex",
                        alignItems:"center",justifyContent:"center",fontSize:22,flexShrink:0}}>
                        {p.icon}
                      </div>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                          <p style={{margin:0,fontSize:14,fontWeight:700,color:W.text}}>{p.name}</p>
                          <StatusBadge status={isConnected?"connected":p.status}/>
                        </div>
                        <p style={{margin:0,fontSize:11,color:W.muted,lineHeight:1.5}}>{p.desc}</p>
                      </div>
                    </div>

                    {isConnected&&(
                      <div style={{display:"flex",gap:8,marginBottom:14}}>
                        <div style={{flex:1,padding:"8px 10px",borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`}}>
                          <p style={{margin:0,fontSize:16,fontWeight:800,color:W.text}}>{p.users.toLocaleString()}</p>
                          <p style={{margin:0,fontSize:9,color:W.muted,fontWeight:600}}>Users</p>
                        </div>
                        <div style={{flex:1,padding:"8px 10px",borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`}}>
                          <p style={{margin:0,fontSize:16,fontWeight:800,color:p.incidents>20?C.crimson:C.emerald}}>{p.incidents}</p>
                          <p style={{margin:0,fontSize:9,color:W.muted,fontWeight:600}}>Incidents</p>
                        </div>
                      </div>
                    )}

                    {p.status!=="coming"&&(
                      <button
                        onClick={()=>isConnected?null:setSelPlatform(p.id)}
                        disabled={isConnecting||isConnected}
                        style={{
                          width:"100%",padding:"9px",borderRadius:10,
                          background:isConnected?W.bgPage:p.color,
                          border:isConnected?`1px solid ${W.border}`:"none",
                          color:isConnected?W.muted:"#fff",
                          fontSize:11,fontWeight:700,cursor:isConnected?"default":"pointer",
                          opacity:isConnecting?0.7:1,
                        }}>
                        {isConnecting?"Connecting…":isConnected?"✓ Connected":"Connect"}
                      </button>
                    )}
                    {p.status==="coming"&&(
                      <div style={{padding:"9px",borderRadius:10,background:W.bgPage,
                        border:`1px solid ${W.border}`,textAlign:"center"}}>
                        <p style={{margin:0,fontSize:11,color:W.muted,fontWeight:600}}>Coming Soon</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Connect modal */}
            {selPlatform&&(
              <div style={{position:"fixed",inset:0,background:"rgba(15,23,42,0.5)",
                display:"flex",alignItems:"center",justifyContent:"center",zIndex:9999,padding:20}}>
                <div style={{background:W.bg,borderRadius:20,padding:28,
                  width:"100%",maxWidth:420,boxShadow:"0 24px 64px rgba(15,23,42,0.2)"}}>
                  {(() => {
                    const p = PLATFORM_LIST.find(x=>x.id===selPlatform);
                    const docs = WEBHOOK_DOCS[selPlatform];
                    return (<>
                      <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:20}}>
                        <div style={{width:48,height:48,borderRadius:14,
                          background:`${p.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:24}}>
                          {p.icon}
                        </div>
                        <div>
                          <h3 style={{margin:0,fontSize:16,fontWeight:800,color:W.text}}>Connect {p.name}</h3>
                          <p style={{margin:0,fontSize:11,color:W.muted}}>{p.desc}</p>
                        </div>
                        <button onClick={()=>setSelPlatform(null)}
                          style={{marginLeft:"auto",background:"none",border:"none",fontSize:18,color:W.muted,cursor:"pointer"}}>×</button>
                      </div>

                      {docs&&(
                        <>
                          <div style={{marginBottom:14}}>
                            <p style={{margin:"0 0 8px",fontSize:10,fontWeight:700,color:W.text,textTransform:"uppercase",letterSpacing:"0.5px"}}>Setup Steps</p>
                            {docs.steps.map((s,i)=>(
                              <div key={i} style={{display:"flex",gap:10,marginBottom:6,alignItems:"flex-start"}}>
                                <div style={{width:20,height:20,borderRadius:"50%",background:`${p.color}15`,
                                  display:"flex",alignItems:"center",justifyContent:"center",
                                  fontSize:9,fontWeight:800,color:p.color,flexShrink:0}}>{i+1}</div>
                                <p style={{margin:0,fontSize:11,color:W.textSub,lineHeight:1.5}}>{s}</p>
                              </div>
                            ))}
                          </div>
                          {docs.fields.map(f=>(
                            <div key={f.label}>
                              <label style={{fontSize:10,fontWeight:700,color:W.muted,display:"block",
                                marginBottom:4,textTransform:"uppercase",letterSpacing:"0.4px"}}>{f.label}</label>
                              <input placeholder={f.ph}
                                value={webhookVals[`${selPlatform}_${f.label}`]||""}
                                onChange={e=>setWebhookVals(p=>({...p,[`${selPlatform}_${f.label}`]:e.target.value}))}
                                style={inp}/>
                            </div>
                          ))}
                          <div style={{padding:"10px 12px",borderRadius:10,background:C.bgDeep,marginBottom:14}}>
                            <p style={{margin:"0 0 4px",fontSize:9,fontWeight:700,color:"#64748B",textTransform:"uppercase"}}>Test Command</p>
                            <pre style={{margin:0,fontSize:9,color:"#94A3B8",whiteSpace:"pre-wrap",lineHeight:1.7,fontFamily:"monospace"}}>
                              {docs.curl}
                            </pre>
                          </div>
                        </>
                      )}

                      <div style={{display:"flex",gap:8}}>
                        <button onClick={()=>setSelPlatform(null)}
                          style={{flex:1,padding:"10px",borderRadius:11,background:W.bgPage,
                            border:`1px solid ${W.border}`,color:W.muted,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                          Cancel
                        </button>
                        <button onClick={()=>simulateConnect(selPlatform)}
                          style={{flex:2,padding:"10px",borderRadius:11,background:p.color,
                            border:"none",color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer"}}>
                          Connect {p.name}
                        </button>
                      </div>
                      <p style={{margin:"10px 0 0",fontSize:9,color:W.muted,textAlign:"center"}}>
                        ⚠ Connections require a deployed app — not available in preview mode
                      </p>
                    </>);
                  })()}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SCHOOLS ── */}
        {tab==="schools"&&(
          <div>
            {/* Summary stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginBottom:20}}>
              {[
                {label:"Total Students",val:totalStudents.toLocaleString(),color:C.electric},
                {label:"Monitored",val:totalMonitored.toLocaleString(),color:C.emerald},
                {label:"Incidents",val:totalIncidents,color:C.crimson},
                {label:"Avg Safety Score",val:`${avgScore}%`,color:C.purple},
              ].map(s=>(
                <div key={s.label} style={{background:W.bg,borderRadius:14,padding:"16px 18px",
                  border:`1px solid ${W.border}`,boxShadow:`0 2px 12px ${W.shadow}`}}>
                  <p style={{margin:0,fontSize:26,fontWeight:900,color:s.color,lineHeight:1}}>{s.val}</p>
                  <p style={{margin:"5px 0 0",fontSize:11,color:W.muted,fontWeight:500}}>{s.label}</p>
                </div>
              ))}
            </div>

            {/* District filter */}
            <div style={{display:"flex",gap:8,marginBottom:16,flexWrap:"wrap"}}>
              {districts.map(d=>(
                <button key={d} onClick={()=>setDistrictFilter(d)}
                  style={{padding:"6px 14px",borderRadius:99,fontSize:11,fontWeight:600,cursor:"pointer",
                    background:districtFilter===d?C.electric:"transparent",
                    color:districtFilter===d?"#fff":W.muted,
                    border:`1px solid ${districtFilter===d?C.electric:W.border}`}}>
                  {d}
                </button>
              ))}
            </div>

            {/* School list */}
            <div style={{display:"flex",flexDirection:"column",gap:10}}>
              {filteredSchools.map(s=>(
                <div key={s.id} style={{background:W.bg,borderRadius:14,
                  border:`1px solid ${s.status==="warning"?"rgba(217,119,6,0.3)":W.border}`,
                  boxShadow:`0 2px 12px ${W.shadow}`,padding:"16px 20px",
                  display:"flex",gap:16,alignItems:"center"}}>
                  <div style={{width:44,height:44,borderRadius:12,
                    background:s.status==="warning"?"rgba(217,119,6,0.1)":"#EFF6FF",
                    display:"flex",alignItems:"center",justifyContent:"center",
                    fontSize:9,fontWeight:900,flexShrink:0,
                    color:s.status==="warning"?C.amber:C.electric}}>
                    🏫
                  </div>
                  <div style={{flex:1,minWidth:0}}>
                    <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                      <p style={{margin:0,fontSize:13,fontWeight:700,color:W.text}}>{s.name}</p>
                      <StatusBadge status={s.status}/>
                    </div>
                    <p style={{margin:0,fontSize:11,color:W.muted}}>{s.district}</p>
                    <div style={{display:"flex",gap:6,marginTop:6,flexWrap:"wrap"}}>
                      {s.channels.map(ch=>(
                        <span key={ch} style={{fontSize:9,padding:"2px 7px",borderRadius:99,
                          background:W.bgPage,color:W.textSub,border:`1px solid ${W.border}`,fontWeight:500}}>
                          {ch}
                        </span>
                      ))}
                    </div>
                  </div>
                  <div style={{display:"flex",gap:10,flexShrink:0}}>
                    {[
                      {l:"Students",v:s.students.toLocaleString()},
                      {l:"Monitored",v:s.monitored.toLocaleString()},
                      {l:"Incidents",v:s.incidents,color:s.incidents>20?C.crimson:C.emerald},
                    ].map(x=>(
                      <div key={x.l} style={{textAlign:"center",padding:"6px 10px",
                        borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`}}>
                        <p style={{margin:0,fontSize:14,fontWeight:800,color:x.color||W.text}}>{x.v}</p>
                        <p style={{margin:0,fontSize:8,color:W.muted,fontWeight:600}}>{x.l}</p>
                      </div>
                    ))}
                    <div style={{textAlign:"center",padding:"6px 10px",
                      borderRadius:10,background:W.bgPage,border:`1px solid ${W.border}`}}>
                      <p style={{margin:0,fontSize:14,fontWeight:800,color:gradeColor(s.grade)}}>{s.grade}</p>
                      <p style={{margin:0,fontSize:8,color:W.muted,fontWeight:600}}>Grade</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── WEBHOOKS ── */}
        {tab==="webhooks"&&(
          <div style={{maxWidth:680}}>
            <div style={{background:W.bg,borderRadius:16,border:`1px solid ${W.border}`,
              boxShadow:`0 2px 12px ${W.shadow}`,padding:"20px 24px",marginBottom:16}}>
              <h3 style={{margin:"0 0 4px",fontSize:14,fontWeight:700,color:W.text}}>Inbound Webhook</h3>
              <p style={{margin:"0 0 14px",fontSize:11,color:W.muted}}>
                Send messages from any platform to Neural Sentry for real-time AI classification
              </p>
              <div style={{padding:"10px 14px",borderRadius:10,background:C.bgDeep,marginBottom:14}}>
                <p style={{margin:"0 0 4px",fontSize:9,color:"#64748B",fontWeight:700,textTransform:"uppercase"}}>Your Webhook Endpoint</p>
                <p style={{margin:0,fontSize:11,color:"#60A5FA",fontFamily:"monospace"}}>
                  https://your-project.supabase.co/functions/v1/ingest-message
                </p>
              </div>
              <div style={{padding:"10px 14px",borderRadius:10,background:C.bgDeep,marginBottom:14}}>
                <p style={{margin:"0 0 6px",fontSize:9,color:"#64748B",fontWeight:700,textTransform:"uppercase"}}>Example Payload</p>
                <pre style={{margin:0,fontSize:10,color:"#94A3B8",fontFamily:"monospace",lineHeight:1.7}}>{`POST /ingest-message
{
  "username": "user123",
  "text": "message content here",
  "channel": "#general",
  "platform": "discord",
  "timestamp": "2024-01-15T14:30:00Z"
}`}</pre>
              </div>
              <div style={{display:"flex",gap:8}}>
                <button onClick={testWebhook} disabled={testing}
                  style={{padding:"9px 18px",borderRadius:10,background:C.electric,border:"none",
                    color:"#fff",fontWeight:700,fontSize:11,cursor:"pointer",opacity:testing?0.7:1}}>
                  {testing?"Testing…":"⚡ Test Webhook"}
                </button>
                <button style={{padding:"9px 18px",borderRadius:10,background:W.bgPage,
                  border:`1px solid ${W.border}`,color:W.text,fontWeight:600,fontSize:11,cursor:"pointer"}}>
                  📋 Copy URL
                </button>
              </div>
              {testResult&&(
                <div style={{marginTop:10,padding:"9px 12px",borderRadius:10,
                  background:testResult.ok?"rgba(5,150,105,0.06)":"rgba(220,38,38,0.06)",
                  border:`1px solid ${testResult.ok?"rgba(5,150,105,0.2)":"rgba(220,38,38,0.2)"}`}}>
                  <p style={{margin:0,fontSize:11,color:testResult.ok?C.emerald:C.crimson,fontWeight:600}}>
                    {testResult.msg}
                  </p>
                </div>
              )}
            </div>

            {/* Rate limits */}
            <div style={{background:W.bg,borderRadius:16,border:`1px solid ${W.border}`,
              boxShadow:`0 2px 12px ${W.shadow}`,padding:"20px 24px"}}>
              <h3 style={{margin:"0 0 14px",fontSize:14,fontWeight:700,color:W.text}}>Rate Limits & Usage</h3>
              {[
                {label:"Messages / minute",used:340,limit:1000,color:C.electric},
                {label:"API calls today",used:12400,limit:50000,color:C.emerald},
                {label:"SMS sent today",used:23,limit:500,color:C.purple},
              ].map(r=>(
                <div key={r.label} style={{marginBottom:14}}>
                  <div style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                    <span style={{fontSize:11,fontWeight:600,color:W.text}}>{r.label}</span>
                    <span style={{fontSize:11,color:W.muted}}>{r.used.toLocaleString()} / {r.limit.toLocaleString()}</span>
                  </div>
                  <div style={{height:6,borderRadius:99,background:W.bgPage,border:`1px solid ${W.border}`}}>
                    <div style={{height:"100%",borderRadius:99,
                      width:`${Math.round(r.used/r.limit*100)}%`,
                      background:r.used/r.limit>0.8?C.crimson:r.color,
                      transition:"width 0.4s"}}/>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── API KEYS ── */}
        {tab==="apikeys"&&(
          <div style={{maxWidth:620}}>
            <div style={{padding:"10px 14px",borderRadius:12,background:"rgba(245,158,11,0.06)",
              border:"1px solid rgba(245,158,11,0.2)",marginBottom:20,display:"flex",gap:10,alignItems:"flex-start"}}>
              <span style={{fontSize:16}}>⚠️</span>
              <div>
                <p style={{margin:0,fontSize:12,fontWeight:700,color:C.amber}}>Preview Mode — Keys Not Saved</p>
                <p style={{margin:"2px 0 0",fontSize:11,color:W.muted}}>
                  API keys entered here are stored in browser memory only and never sent to our servers.
                  After deploying to Vercel, add them as environment variables instead.
                </p>
              </div>
            </div>

            {[
              {id:"supabase_url",label:"Supabase Project URL",ph:"https://xxxx.supabase.co",ico:"🗄",color:"#3ECF8E",docs:"supabase.com → Settings → API"},
              {id:"supabase_key",label:"Supabase Anon Key",ph:"eyJhbGciOi...",ico:"🗄",color:"#3ECF8E",docs:"supabase.com → Settings → API"},
              {id:"anthropic",label:"Anthropic API Key",ph:"sk-ant-api...",ico:"🤖",color:"#D4A373",docs:"console.anthropic.com → API Keys"},
              {id:"groq",label:"Groq API Key",ph:"gsk_...",ico:"⚡",color:"#FF6B35",docs:"console.groq.com → API Keys (free)"},
              {id:"openai",label:"OpenAI API Key",ph:"sk-proj-...",ico:"🧠",color:"#10A37F",docs:"platform.openai.com → API Keys"},
              {id:"gemini",label:"Gemini API Key",ph:"AIzaSy...",ico:"✨",color:"#4285F4",docs:"aistudio.google.com → Get API Key (free)"},
              {id:"twilio_sid",label:"Twilio Account SID",ph:"ACxxxx...",ico:"📲",color:"#F22F46",docs:"twilio.com → Console Dashboard"},
              {id:"twilio_token",label:"Twilio Auth Token",ph:"xxxx...",ico:"📲",color:"#F22F46",docs:"twilio.com → Console Dashboard"},
            ].map(k=>(
              <div key={k.id} style={{background:W.bg,borderRadius:14,border:`1px solid ${W.border}`,
                boxShadow:`0 2px 10px ${W.shadow}`,padding:"14px 18px",marginBottom:10}}>
                <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:8}}>
                  <div style={{width:32,height:32,borderRadius:9,
                    background:`${k.color}15`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14}}>
                    {k.ico}
                  </div>
                  <div style={{flex:1}}>
                    <p style={{margin:0,fontSize:12,fontWeight:700,color:W.text}}>{k.label}</p>
                    <p style={{margin:0,fontSize:10,color:W.muted}}>{k.docs}</p>
                  </div>
                </div>
                <input type="password" placeholder={k.ph}
                  value={webhookVals[k.id]||""}
                  onChange={e=>setWebhookVals(p=>({...p,[k.id]:e.target.value}))}
                  style={{...inp,marginBottom:0,fontFamily:"monospace",fontSize:11}}/>
              </div>
            ))}

            <div style={{padding:"12px 16px",borderRadius:12,background:W.bgPage,
              border:`1px solid ${W.border}`,marginTop:4}}>
              <p style={{margin:0,fontSize:11,color:W.muted}}>
                💡 <strong>For production:</strong> add these as environment variables in Vercel Dashboard →
                Settings → Environment Variables prefixed with <code style={{fontFamily:"monospace",fontSize:10}}>VITE_</code>
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};


// ══════════════════════════════════════════════════════════════════════════════
// TWO-WAY SMS CONSOLE SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const CONVO_SEED = [
  { id:"g1", guardianName:"Sarah Mitchell", phone:"+1 (555) 234-8901", childName:"Emma M.",
    messages:[
      {dir:"out",text:"⚠ APEX INTEGRITY ALERT: Severe bullying detected involving Emma M. in #roblox-chat at 3:42 PM. Reply REVIEW for full report, MUTE to pause alerts, STATUS for child status.",time:"3:42 PM",auto:true},
      {dir:"in", text:"REVIEW",time:"3:43 PM"},
      {dir:"out",text:"📋 INCIDENT REPORT — Emma M. (#roblox-chat, 3:42 PM)\n\nMessage: \"Nobody likes you here, you should just quit and disappear forever\"\nFrom: vortex99\nEscalation: HIGH\nOther targets: None\nPrior incidents this week: 2\n\nAction taken: User vortex99 flagged for moderator review.\nReply MUTE to pause non-critical alerts for 4h.",time:"3:43 PM",auto:true},
      {dir:"in", text:"MUTE",time:"3:44 PM"},
      {dir:"out",text:"✅ Non-critical alerts paused for 4 hours. Critical (safe word) alerts remain active. Reply STATUS at any time to check Emma's current safety status.",time:"3:44 PM",auto:true},
      {dir:"in", text:"STATUS",time:"3:52 PM"},
      {dir:"out",text:"📊 Emma M. Status — 3:52 PM\n\nSafety Score: 72/100 (↓ from 88 this week)\nCurrently: Online in #roblox-chat\nLast check-in: 14 min ago ✓\nIncidents today: 1\nAlerts paused until: 7:44 PM",time:"3:52 PM",auto:true},
    ]},
  { id:"g2", guardianName:"David Torres", phone:"+1 (555) 876-5432", childName:"Mia T.",
    messages:[
      {dir:"out",text:"⚠ APEX INTEGRITY ALERT: Critical — safe word detected from Mia T. in #general at 2:15 PM. Mia typed: 'i'm scared and i don't know what to do'. Reply REVIEW for full incident details.",time:"2:15 PM",auto:true},
      {dir:"in", text:"REVIEW",time:"2:16 PM"},
      {dir:"out",text:"📋 SAFE WORD INCIDENT — Mia T. (#general, 2:15 PM)\n\nMessage: \"i'm scared and i don't know what to do\"\nContext: 3 prior messages from unknown user asking personal questions.\nEscalation: CRITICAL\n\nRecommendation: Call Mia immediately.\nModerator alerted. School counselor notified.\nReply BAN to ban the targeting user.",time:"2:16 PM",auto:true},
      {dir:"in", text:"BAN",time:"2:18 PM"},
      {dir:"out",text:"🔨 User banned. Mia T. has been moved to a safe channel and a moderator is monitoring. School counselor Sarah Chen has been notified at (555) 441-9900.",time:"2:18 PM",auto:true},
    ]},
];

const COMMANDS = [
  {cmd:"REVIEW",  desc:"Get full incident report",         color:"#7B9CFF"},
  {cmd:"STATUS",  desc:"Check child's current status",     color:"#06D6A0"},
  {cmd:"MUTE",    desc:"Pause non-critical alerts 4h",     color:"#FFB703"},
  {cmd:"PAUSE",   desc:"Pause all alerts for 1 hour",      color:"#FF6B35"},
  {cmd:"BAN",     desc:"Ban the offending user",           color:"#EF233C"},
  {cmd:"UNMUTE",  desc:"Resume all alerts immediately",    color:"#9B5DE5"},
];

const TwoWaySMSScreen = ({C, smsLog}) => {
  const [convos, setConvos] = useState(CONVO_SEED);
  const [activeConvo, setActiveConvo] = useState("g1");
  const [input, setInput] = useState("");
  const [simulating, setSimulating] = useState(false);
  const bottomRef = useRef(null);

  const convo = convos.find(c=>c.id===activeConvo);

  const autoReply = (cmd) => {
    const replies = {
      REVIEW: `📋 LATEST INCIDENT REPORT\n\nUser: vortex99\nTime: ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}\nType: Severe Bullying (HIGH)\nChannel: #roblox-chat\nMessage: "Nobody likes you here, stop embarrassing yourself"\n\nSMS alerts have been sent. Moderator assigned.`,
      STATUS: `📊 ${convo.childName} Status — ${new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}\n\nOnline: Yes ✓\nLast check-in: 2 min ago\nSafety score: 72/100\nIncidents today: 1\nChannel: #roblox-chat`,
      MUTE:   `✅ Non-critical alerts muted for 4 hours. Critical alerts (safe words) remain active. Reply UNMUTE to resume early.`,
      PAUSE:  `⏸ All alerts paused for 1 hour. Reply UNMUTE to resume. Emergency safe-word alerts still active.`,
      BAN:    `🔨 Most recent offending user has been banned and removed from all channels. Incident logged.`,
      UNMUTE: `🔔 All alerts resumed. You will receive SMS notifications for all flagged incidents.`,
    };
    return replies[cmd.toUpperCase().trim()] || `Unknown command "${cmd}". Valid commands: REVIEW, STATUS, MUTE, PAUSE, BAN, UNMUTE`;
  };

  const sendMessage = () => {
    if (!input.trim()) return;
    const userMsg = {dir:"in",text:input.trim(),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})};
    const reply   = {dir:"out",text:autoReply(input),time:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),auto:true};
    setConvos(prev=>prev.map(c=>c.id===activeConvo?{...c,messages:[...c.messages,userMsg,reply]}:c));
    setInput("");
    setTimeout(()=>bottomRef.current?.scrollIntoView({behavior:"smooth"}),100);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Guardian selector */}
      <div className="flex gap-2 p-3 border-b flex-shrink-0 overflow-x-auto" style={{borderColor:C.border}}>
        {convos.map(c=>(
          <button key={c.id} onClick={()=>setActiveConvo(c.id)}
            className="flex-shrink-0 flex items-center gap-2 px-3 py-2 rounded-xl"
            style={{background:activeConvo===c.id?`${C.guardian}20`:C.bgCard,border:`1px solid ${activeConvo===c.id?C.guardian+"40":C.border}`,color:activeConvo===c.id?C.guardian:C.muted}}>
            <div className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black"
              style={{background:`${C.guardian}30`,color:C.guardian}}>{c.guardianName[0]}</div>
            <div className="text-left">
              <p className="text-[10px] font-bold leading-none" style={{color:activeConvo===c.id?C.text:C.muted}}>{c.guardianName}</p>
              <p className="text-[8px] leading-none mt-0.5" style={{color:C.muted}}>re: {c.childName}</p>
            </div>
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="px-4 py-2.5 border-b flex-shrink-0 flex items-center gap-3"
        style={{borderColor:C.border,background:`${C.guardian}08`}}>
        <div className="w-8 h-8 rounded-xl flex items-center justify-center text-sm font-black"
          style={{background:`${C.guardian}25`,color:C.guardian}}>{convo.guardianName[0]}</div>
        <div>
          <p className="text-sm font-semibold" style={{color:C.text}}>{convo.guardianName}</p>
          <p className="text-[10px]" style={{color:C.muted}}>{convo.phone} · re: {convo.childName}</p>
        </div>
        <div className="ml-auto flex items-center gap-1.5 px-2 py-1 rounded-xl"
          style={{background:`${C.emerald}10`}}>
          <div className="w-1.5 h-1.5 rounded-full" style={{background:C.emerald}}/>
          <span className="text-[9px] font-bold" style={{color:C.emerald}}>SMS Active</span>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {convo.messages.map((m,i)=>(
          <div key={i} className={`flex ${m.dir==="out"?"justify-start":"justify-end"}`}>
            <div className="max-w-[85%] rounded-xl px-3 py-2"
              style={{
                background:m.dir==="out"
                  ? m.auto?`${C.guardian}12`:`${C.bgCard}`
                  : `${C.electric}15`,
                border:`1px solid ${m.dir==="out"?m.auto?C.guardian+"25":C.border:C.electric+"30"}`,
              }}>
              {m.dir==="out"&&m.auto&&(
                <div className="flex items-center gap-1 mb-1">
                  <Ico name="zap" size={8} color={C.guardian}/>
                  <span className="text-[8px] font-black uppercase" style={{color:C.guardian}}>Auto-response</span>
                </div>
              )}
              <p className="text-[10px] leading-relaxed whitespace-pre-wrap" style={{color:m.dir==="out"?C.textSub:C.text}}>{m.text}</p>
              <p className="text-[8px] mt-1 text-right" style={{color:C.muted}}>{m.time}</p>
            </div>
          </div>
        ))}
        <div ref={bottomRef}/>
      </div>

      {/* Command quick-tap */}
      <div className="px-3 py-2 border-t flex-shrink-0 overflow-x-auto" style={{borderColor:C.border}}>
        <div className="flex gap-1.5">
          {COMMANDS.map(c=>(
            <button key={c.cmd} onClick={()=>setInput(c.cmd)}
              className="flex-shrink-0 px-2.5 py-1.5 rounded-xl text-[9px] font-black whitespace-nowrap"
              style={{background:`${c.color}15`,color:c.color}}
              title={c.desc}>
              {c.cmd}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="px-3 pb-3 flex-shrink-0">
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2"
            style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`}}>
            <input value={input} onChange={e=>setInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&sendMessage()}
              placeholder="Type a command or simulate parent reply..."
              className="bg-transparent flex-1 outline-none text-xs" style={{color:C.text}}/>
          </div>
          <button onClick={sendMessage}
            className="px-3 py-2 rounded-xl font-bold text-xs"
            style={{background:`${C.guardian}20`,color:C.guardian}}>
            <Ico name="send" size={14} color={C.guardian}/>
          </button>
        </div>
        <p className="text-[9px] mt-1.5 text-center" style={{color:C.muted}}>
          Tap a command above or type: REVIEW · STATUS · MUTE · PAUSE · BAN · UNMUTE
        </p>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// OVERVIEW SCREEN (condensed from previous version)
// ══════════════════════════════════════════════════════════════════════════════
const OverviewScreen = ({messages,chartData,keywords,msgCount,activeUsers,alerts,smsLog,C,setNav}) => {
  const sentData=[
    {name:"Positive",value:messages.filter(m=>m.sentiment==="positive").length},
    {name:"Neutral",value:messages.filter(m=>m.sentiment==="neutral").length},
    {name:"Negative",value:messages.filter(m=>m.sentiment==="negative"&&!m.toxic&&!m.bullying).length},
    {name:"Toxic",value:messages.filter(m=>m.toxic).length},
    {name:"Bullying",value:messages.filter(m=>m.bullying).length},
  ];
  const pc=[C.emerald,C.electric,C.pink,C.crimson,C.bully];

  return (
    <div className="p-5 space-y-5 min-h-full">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat C={C} label="Messages Today" value={msgCount.toLocaleString()} icon="message" color={C.electric} sub="12% vs yesterday" trend="up"/>
        <Stat C={C} label="Active Users" value={activeUsers.toLocaleString()} icon="users" color={C.purple} sub="5% vs yesterday" trend="up"/>
        <Stat C={C} label="Safety Alerts" value={alerts.length} icon="shield" color={C.crimson} sub="active now" trend="down" onClick={()=>setNav("alerts")}/>
        <Stat C={C} label="SMS Sent" value={smsLog.length} icon="sms" color={C.guardian} sub="to guardians" trend="up" onClick={()=>setNav("parents")}/>
      </div>

      <Card C={C} className="p-3">
        <div className="flex items-center justify-between mb-2">
          <p className="text-sm font-semibold" style={{color:C.text}}>Sentiment Trend</p>
          <div className="flex gap-2">
            {[["Pos",C.emerald],["Neu",C.electric],["Neg",C.pink]].map(([l,c])=>(
              <div key={l} className="flex items-center gap-1"><div className="w-1.5 h-1.5 rounded-full" style={{background:c}}/><span className="text-[9px]" style={{color:C.muted}}>{l}</span></div>
            ))}
          </div>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart data={chartData}>
            <defs>
              {[["pg",C.emerald],["ng",C.electric],["ng2",C.pink]].map(([id,col])=>(
                <linearGradient key={id} id={id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={col} stopOpacity={0.25}/>
                  <stop offset="95%" stopColor={col} stopOpacity={0}/>
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="label" tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} interval={2}/>
            <YAxis tick={{fill:C.muted,fontSize:8}} axisLine={false} tickLine={false} width={22}/>
            <Tooltip content={p=><Tip {...p} C={C}/>}/>
            <Area type="monotone" dataKey="positive" stroke={C.emerald} fill="url(#pg)" strokeWidth={1.5} dot={false} name="Positive"/>
            <Area type="monotone" dataKey="neutral" stroke={C.electric} fill="url(#ng)" strokeWidth={1.5} dot={false} name="Neutral"/>
            <Area type="monotone" dataKey="negative" stroke={C.pink} fill="url(#ng2)" strokeWidth={1.5} dot={false} name="Negative"/>
          </AreaChart>
        </ResponsiveContainer>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card C={C} className="p-3">
          <p className="text-[11px] font-bold mb-1" style={{color:C.text}}>Sentiment Mix</p>
          <ResponsiveContainer width="100%" height={80}>
            <PieChart>
              <Pie data={sentData} dataKey="value" cx="50%" cy="50%" outerRadius={35} innerRadius={18} strokeWidth={0}>
                {sentData.map((_,i)=><Cell key={i} fill={pc[i]}/>)}
              </Pie>
              <Tooltip content={p=><Tip {...p} C={C}/>}/>
            </PieChart>
          </ResponsiveContainer>
          {sentData.map((d,i)=>(
            <div key={d.name} className="flex items-center gap-1 mb-0.5">
              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:pc[i]}}/>
              <span className="text-[9px] truncate" style={{color:C.muted}}>{d.name}</span>
              <span className="text-[9px] ml-auto font-bold" style={{color:C.text}}>{d.value}</span>
            </div>
          ))}
        </Card>

        <Card C={C} className="p-3">
          <p className="text-[11px] font-bold mb-2" style={{color:C.text}}>Channel Health</p>
          {CHANNEL_GRADES.slice(0,5).map(ch=>{
            const gc=ch.score>=90?C.emerald:ch.score>=75?C.electric:ch.score>=60?C.amber:C.crimson;
            return (
              <div key={ch.ch} className="flex items-center gap-2 mb-1">
                <span className="text-[9px] font-black w-5 flex-shrink-0 text-center rounded" style={{color:gc,background:`${gc}18`}}>{ch.grade}</span>
                <span className="text-[9px] flex-1 truncate" style={{color:C.muted}}>{ch.ch}</span>
                <span className="text-[9px] flex-shrink-0" style={{color:ch.incidents>5?C.crimson:C.muted}}>{ch.incidents}⚠</span>
              </div>
            );
          })}
        </Card>
      </div>

      {/* Heatmap */}
      <Card C={C} className="p-3">
        <div className="flex items-center gap-2 mb-2">
          <Ico name="activity" size={13} color={C.bully}/>
          <p className="text-sm font-semibold" style={{color:C.text}}>Incident Heatmap — 24h</p>
        </div>
        <div className="grid gap-0.5" style={{gridTemplateColumns:"repeat(24,1fr)"}}>
          {HEATMAP.map((h,i)=>{
            const intens=(h.bully+h.toxic)/14;
            const bg=intens>0.5?C.crimson:intens>0.25?C.bully:intens>0.1?C.amber:C.emerald;
            return <div key={i} className="rounded-sm" style={{height:20,background:`${bg}${Math.floor(intens*180+40).toString(16).padStart(2,"0")}`,boxShadow:`0 2px 12px ${C.shadow}`}} title={h.h}/>;
          })}
        </div>
        <div className="flex justify-between mt-1">
          {["12am","6am","12pm","6pm","11pm"].map(t=><span key={t} className="text-[9px]" style={{color:C.muted}}>{t}</span>)}
        </div>
      </Card>

      <div className="grid grid-cols-2 gap-2">
        <Card C={C} className="p-3">
          <p className="text-[11px] font-bold mb-2" style={{color:C.text}}>🔥 Trending</p>
          {keywords.slice(0,6).map((kw,i)=>(
            <div key={kw.word} className="flex items-center gap-1 mb-1">
              <span className="text-[9px] w-3 flex-shrink-0" style={{color:C.muted}}>{i+1}</span>
              <span className="text-[10px] flex-1 truncate" style={{color:C.text}}>#{kw.word}</span>
              <span className="text-[10px] font-black" style={{color:C.electric}}>{kw.count}</span>
              <span style={{color:kw.trend==="up"?C.emerald:kw.trend==="down"?C.pink:C.muted,fontSize:8}}>
                {kw.trend==="up"?"▲":kw.trend==="down"?"▼":"—"}
              </span>
            </div>
          ))}
        </Card>
        <Card C={C} className="p-3" gold>
          <div className="flex items-center gap-1.5 mb-2">
            <Ico name="sms" size={12} color={C.guardian}/>
            <p className="text-[11px] font-bold" style={{color:C.text}}>Guardian SMS</p>
          </div>
          {smsLog.slice(0,4).map(s=>(
            <div key={s.id} className="flex items-center gap-1.5 mb-1.5 rounded-lg px-2 py-1"
              style={{background:`${C.guardian}08`}}>
              <div className="w-4 h-4 rounded-full flex items-center justify-center text-[8px] font-black"
                style={{background:`${C.guardian}25`,color:C.guardian}}>{s.guardianName[0]}</div>
              <span className="text-[9px] flex-1 truncate" style={{color:C.muted}}>{s.childName}</span>
              <span className="text-[8px] font-black uppercase" style={{color:s.type==="bullying"?C.bully:s.type==="safeword"?C.safeWord:C.crimson}}>{s.type}</span>
              <Ico name="check" size={8} color={C.emerald}/>
            </div>
          ))}
          {smsLog.length===0&&<p className="text-[10px] text-center py-2" style={{color:C.muted}}>No alerts yet</p>}
        </Card>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// FEED SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const FeedScreen = ({messages,search,setSearch,filter,setFilter,onFlag,onBan,C}) => {
  const [open,setOpen]=useState(false);
  return (
    <div className="flex flex-col h-full">
      <div className="px-3 py-2 border-b flex-shrink-0" style={{borderColor:C.border}}>
        <div className="flex gap-2">
          <div className="flex-1 flex items-center gap-2 rounded-xl px-3 py-2 min-w-0"
            style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`}}>
            <Ico name="search" size={12} color={C.muted}/>
            <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
              className="bg-transparent flex-1 outline-none text-xs min-w-0" style={{color:C.text}}/>
            {search&&<button onClick={()=>setSearch("")}><Ico name="x" size={11} color={C.muted}/></button>}
          </div>
          <button onClick={()=>setOpen(!open)} className="px-2.5 py-2 rounded-xl flex items-center gap-1.5 flex-shrink-0"
            style={{background:filter!=="all"?`${C.electric}15`:C.bgCard,border:`1px solid ${filter!=="all"?C.electric+"40":C.border}`,color:filter!=="all"?C.electric:C.muted}}>
            <Ico name="filter" size={12} color={filter!=="all"?C.electric:C.muted}/>
          </button>
        </div>
        {open&&(
          <div className="flex gap-1.5 mt-2 flex-wrap">
            {["all","positive","neutral","negative","toxic","bullying","safe-word","urgent"].map(f=>(
              <button key={f} onClick={()=>{setFilter(f);setOpen(false);}}
                className="px-2.5 py-1 rounded-lg text-[11px] font-semibold capitalize"
                style={{background:filter===f?`${C.electric}20`:"transparent",color:filter===f?C.electric:C.muted,border:filter===f?`1px solid ${C.electric}40`:`1px solid ${C.border}`}}>
                {f}
              </button>
            ))}
          </div>
        )}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {messages.map(m=><MsgRow key={m.id} msg={m} onFlag={onFlag} onBan={onBan} C={C}/>)}
        {messages.length===0&&<p className="text-center py-12 text-xs" style={{color:C.muted}}>No messages</p>}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ALERTS SCREEN
// ══════════════════════════════════════════════════════════════════════════════
const AlertsScreen = ({alerts,onDismiss,C}) => {
  const [tab,setTab]=useState("all");
  const critical=alerts.filter(a=>a.safeWord);
  const bullying=alerts.filter(a=>a.bullying&&!a.safeWord);
  const toxic=alerts.filter(a=>a.toxic&&!a.bullying&&!a.safeWord);
  const shown=tab==="critical"?critical:tab==="bullying"?bullying:tab==="toxic"?toxic:alerts;

  return (
    <div className="flex flex-col h-full">
      <div className="flex gap-1.5 px-3 pt-3 pb-2 border-b flex-shrink-0 overflow-x-auto" style={{borderColor:C.border}}>
        {[
          {id:"all",label:`All (${alerts.length})`,color:C.muted},
          {id:"critical",label:`🚨 Critical (${critical.length})`,color:C.safeWord},
          {id:"bullying",label:`Bullying (${bullying.length})`,color:C.bully},
          {id:"toxic",label:`Toxic (${toxic.length})`,color:C.crimson},
        ].map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className="flex-shrink-0 px-3 py-1.5 rounded-xl text-[11px] font-bold whitespace-nowrap"
            style={{background:tab===t.id?`${t.color}18`:"transparent",color:tab===t.id?t.color:C.muted,border:`1px solid ${tab===t.id?t.color+"40":C.border}`}}>
            {t.label}
          </button>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        {shown.length===0?(
          <div className="text-center py-16 opacity-40">
            <Ico name="shield" size={40} color={C.emerald}/>
            <p className="text-xs mt-2" style={{color:C.emerald}}>All clear</p>
          </div>
        ):shown.map(a=>{
          const col=a.safeWord?C.safeWord:a.bullying?C.bully:C.crimson;
          const info=CHILD_MAP[a.user];
          return (
            <div key={a.id} className="card-enter rounded-xl p-3 mb-2 border"
              style={{background:`${col}08`,borderColor:`${col}35`}}>
              <div className="flex items-start gap-2.5">
                <Ico name={a.safeWord?"warn":"alert"} size={14} color={col} style={{marginTop:1}}/>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1 flex-wrap">
                    <span className="text-[10px] font-black" style={{color:col}}>
                      {a.safeWord?"⚠ SAFE WORD":a.bullying?"SEVERE BULLYING":"TOXIC"}
                    </span>
                    <span className="text-[10px]" style={{color:C.muted}}>{a.user} · {a.channel} · {a.time}</span>
                    <EscBadge level={a.escalation} C={C}/>
                  </div>
                  <p className="text-xs mb-1.5" style={{color:C.textSub}}>{a.text}</p>
                  {info&&(
                    <div className="flex items-center gap-1.5 rounded-lg px-2 py-1"
                      style={{background:C.bgCard}}>
                      <Ico name="sms" size={10} color={C.guardian}/>
                      <span className="text-[10px] font-semibold" style={{color:C.guardian}}>
                        SMS → {info.guardian.name} ({info.guardian.phone})
                      </span>
                      <Ico name="check" size={9} color={C.emerald} style={{marginLeft:"auto"}}/>
                    </div>
                  )}
                </div>
                <button onClick={()=>onDismiss(a.id)}><Ico name="x" size={12} color={C.muted}/></button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// PARENTS SCREEN (condensed)
// ══════════════════════════════════════════════════════════════════════════════
const ParentsScreen = ({smsLog,guardians,setGuardians,C}) => (
  <div className="p-5 space-y-5 min-h-full">
    <Card C={C} gold className="p-4">
      <div className="flex items-center gap-3">
        <EyeLogo size={40} C={C}/>
        <div>
          <p className="text-sm font-black" style={{color:C.gold}}>Guardian Dashboard</p>
          <p className="text-xs" style={{color:C.muted}}>Parent Portal · Apex Integrity Labs</p>
          <p className="text-[10px] mt-0.5" style={{color:C.guardian}}>
            {guardians.filter(g=>g.smsEnabled).length}/{guardians.length} guardians receiving SMS
          </p>
        </div>
        <div className="ml-auto text-right">
          <p className="text-2xl font-black" style={{color:C.guardian}}>{smsLog.length}</p>
          <p className="text-[9px]" style={{color:C.muted}}>alerts sent</p>
        </div>
      </div>
    </Card>
    {guardians.map(g=>(
      <Card C={C} key={g.id} className="p-4">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-10 h-10 rounded-xl flex items-center justify-center text-sm font-black"
            style={{background:C.surface,color:C.guardian}}>
            {g.name[0]}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold" style={{color:C.text}}>{g.name}</p>
            <p className="text-[10px]" style={{color:C.muted}}>{g.phone}</p>
          </div>
          <button onClick={()=>setGuardians(prev=>prev.map(x=>x.id===g.id?{...x,smsEnabled:!x.smsEnabled}:x))}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-[11px] font-bold"
            style={{background:g.smsEnabled?`${C.emerald}15`:`${C.muted}10`,border:`1px solid ${g.smsEnabled?C.emerald+"40":C.border}`,color:g.smsEnabled?C.emerald:C.muted}}>
            <Ico name="sms" size={11} color={g.smsEnabled?C.emerald:C.muted}/>
            {g.smsEnabled?"ON":"OFF"}
          </button>
        </div>
        {g.children.map(child=>{
          const sc=child.safetyScore>=90?C.emerald:child.safetyScore>=70?C.amber:C.crimson;
          return (
            <div key={child.id} className="rounded-xl p-3 mb-2 border flex items-center gap-3"
              style={{background:C.bgCard,borderColor:C.border}}>
              <ScoreRing score={child.safetyScore} C={C} size={44}/>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold" style={{color:C.text}}>{child.name}</span>
                  <span className="text-[9px]" style={{color:C.muted}}>Age {child.age}</span>
                </div>
                <p className="text-[9px]" style={{color:C.muted}}>@{child.username}</p>
                <div className="flex items-center gap-2 mt-0.5">
                  <span className="text-[9px]" style={{color:sc}}>Score: {child.safetyScore}</span>
                  <span className="text-[9px]" style={{color:child.incidents>0?C.bully:C.emerald}}>{child.incidents} incidents</span>
                  <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{background:child.checkedIn?C.emerald:C.amber}}/>
                  <span className="text-[9px]" style={{color:C.muted}}>{child.lastCheckIn}</span>
                </div>
              </div>
            </div>
          );
        })}
      </Card>
    ))}
    {smsLog.length>0&&(
      <Card C={C} className="p-4">
        <div className="flex items-center gap-2 mb-3">
          <Ico name="phone" size={13} color={C.guardian}/>
          <p className="text-sm font-semibold" style={{color:C.text}}>SMS Dispatch Log</p>
          <span className="ml-auto text-[10px] font-black px-1.5 py-0.5 rounded-full" style={{background:`${C.guardian}20`,color:C.guardian}}>{smsLog.length} sent</span>
        </div>
        <div className="space-y-2 max-h-48 overflow-y-auto">
          {smsLog.map(s=>(
            <div key={s.id} className="rounded-xl p-2.5 border" style={{background:`${C.guardian}05`,borderColor:`${C.guardian}20`}}>
              <div className="flex items-center gap-2 mb-1">
                <div className="w-5 h-5 rounded-lg flex items-center justify-center text-[9px] font-black" style={{background:`${C.guardian}20`,color:C.guardian}}>{s.guardianName[0]}</div>
                <span className="text-[10px] font-semibold flex-1" style={{color:C.text}}>{s.guardianName}</span>
                <span className="text-[9px]" style={{color:C.muted}}>{s.time}</span>
                <Ico name="check" size={9} color={C.emerald}/>
              </div>
              <p className="text-[9px] leading-snug pl-7" style={{color:C.muted}}>
                <span className="font-bold" style={{color:s.type==="bullying"?C.bully:s.type==="safeword"?C.safeWord:C.crimson}}>[{s.type}]</span> re {s.childName}: "{s.preview}"
              </p>
            </div>
          ))}
        </div>
      </Card>
    )}
  </div>
);

// ══════════════════════════════════════════════════════════════════════════════
// SIDEBAR
// ══════════════════════════════════════════════════════════════════════════════
const Sidebar = ({nav,activeNav,setNav,open,setOpen,activeUsers,C,theme,setTheme,alerting}) => (
  <div className="hidden lg:flex flex-col flex-shrink-0 transition-all duration-300"
    style={{width:open?248:68,background:C.bgCard,borderRight:`1px solid ${C.border}`,
      boxShadow:`4px 0 24px ${C.shadow}`}}>

    {/* Brand */}
    <div className="flex items-center gap-3 px-4 py-5">
      <div className="flex-shrink-0">
        <EyeLogo size={open?32:26} C={C} alerting={alerting}/>
      </div>
      {open&&(
        <div>
          <p className="text-sm font-black leading-tight" style={{color:C.text}}>Neural Sentry</p>
          <p className="text-[9px] font-semibold tracking-widest uppercase" style={{color:C.muted}}>Safety Platform</p>
        </div>
      )}
    </div>

    {/* Live pill */}
    {open&&(
      <div className="mx-3 mb-3 flex items-center gap-2 px-3 py-2 rounded-xl"
        style={{background:`${C.emerald}12`}}>
        <LiveDot C={C}/>
        <span className="text-xs font-bold" style={{color:C.emerald}}>Live</span>
        <span className="text-xs ml-auto" style={{color:C.muted}}>{activeUsers.toLocaleString()}</span>
      </div>
    )}

    {/* Nav */}
    <nav className="flex-1 px-3 space-y-0.5 overflow-y-auto">
      {nav.map(({id,icon,label,badge})=>{
        const active = activeNav===id;
        return (
          <button key={id} onClick={()=>setNav(id)}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all text-left"
            style={{
              background:active?`${C.electric}12`:"transparent",
              color:active?C.electric:C.muted,
            }}>
            <Ico name={icon} size={16} color={active?C.electric:C.muted}/>
            {open&&<span className="text-[13px] font-semibold">{label}</span>}
            {badge>0&&(
              <span className="ml-auto min-w-[18px] h-[18px] text-[9px] font-black rounded-full flex items-center justify-center px-1"
                style={{background:C.crimson,color:"#fff"}}>{badge}</span>
            )}
          </button>
        );
      })}
    </nav>

    {/* Footer */}
    <div className="p-3 space-y-1">
      <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}
        className="w-full flex items-center gap-3 px-3 py-2 rounded-xl"
        style={{color:C.muted}}>
        <Ico name={theme==="dark"?"sun":"moon"} size={15} color={C.muted}/>
        {open&&<span className="text-xs font-medium">Switch theme</span>}
      </button>
      <button onClick={()=>setOpen(!open)}
        className="w-full flex items-center justify-center py-2 rounded-xl"
        style={{color:C.muted}}>
        <Ico name="chevronR" size={13} color={C.muted}
          style={{transform:open?"rotate(180deg)":"none",transition:"transform 0.3s"}}/>
      </button>
    </div>
  </div>
);

const BottomTab = ({id,icon,label,badge,active,onClick,C}) => (
  <button onClick={()=>onClick(id)} className="flex-1 flex flex-col items-center justify-center py-2 gap-0.5 relative"
    style={{color:active?C.gold:C.muted}}>
    {active&&<div className="absolute top-0 left-1/2 -translate-x-1/2 w-6 h-0.5 rounded-full" style={{background:C.gold}}/>}
    <Ico name={icon} size={17} color={active?C.gold:C.muted}/>
    <span className="text-[9px] font-semibold leading-none">{label}</span>
    {badge>0&&<span className="absolute top-1 right-[calc(50%-18px)] w-3.5 h-3.5 rounded-full text-[8px] font-black flex items-center justify-center"
      style={{background:C.crimson,color:"#fff"}}>{badge}</span>}
  </button>
);


// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE CLIENT — loads SDK from CDN, falls back to demo mode
// ══════════════════════════════════════════════════════════════════════════════

// Lightweight Supabase client using fetch directly (no npm needed)
// Works in browser artifacts out of the box
const createSupabaseClient = (url, anonKey) => {
  const headers = {
    "apikey": anonKey,
    "Content-Type": "application/json",
  };

  let _accessToken = null;
  let _realtimeChannels = {};

  const authHeaders = () => ({
    ...headers,
    ..._accessToken ? { "Authorization": `Bearer ${_accessToken}` } : { "Authorization": `Bearer ${anonKey}` },
  });

  const rest = (path, opts = {}) =>
    fetch(`${url}/rest/v1/${path}`, { ...opts, headers: { ...authHeaders(), ...opts.headers } }).then(r => r.json());

  const client = {
    auth: {
      _session: null,
      _listeners: [],

      onAuthStateChange(cb) {
        client.auth._listeners.push(cb);
        return { data: { subscription: { unsubscribe: () => { client.auth._listeners = client.auth._listeners.filter(l => l !== cb); } } } };
      },

      async getSession() {
        const stored = localStorage.getItem("apex_session");
        if (stored) {
          try {
            const s = JSON.parse(stored);
            _accessToken = s.access_token;
            client.auth._session = s;
            return { data: { session: s } };
          } catch(e) {}
        }
        return { data: { session: null } };
      },

      async getUser() {
        if (!_accessToken) return { data: { user: null } };
        const r = await fetch(`${url}/auth/v1/user`, { headers: authHeaders() });
        const data = await r.json();
        return { data: { user: data } };
      },

      async signUp(email, password, meta = {}) {
        const r = await fetch(`${url}/auth/v1/signup`, {
          method: "POST", headers,
          body: JSON.stringify({ email, password, data: meta }),
        });
        const data = await r.json();
        if (data.access_token) {
          _accessToken = data.access_token;
          localStorage.setItem("apex_session", JSON.stringify(data));
          client.auth._session = data;
          client.auth._listeners.forEach(l => l("SIGNED_IN", data));
        }
        return { data, error: data.error ? { message: data.msg || data.error_description || data.error } : null };
      },

      async signInWithPassword(email, password) {
        const r = await fetch(`${url}/auth/v1/token?grant_type=password`, {
          method: "POST", headers,
          body: JSON.stringify({ email, password }),
        });
        const data = await r.json();
        if (data.access_token) {
          _accessToken = data.access_token;
          localStorage.setItem("apex_session", JSON.stringify(data));
          client.auth._session = data;
          client.auth._listeners.forEach(l => l("SIGNED_IN", data));
        }
        return { data, error: data.error ? { message: data.error_description || data.error } : null };
      },

      async signOut() {
        await fetch(`${url}/auth/v1/logout`, { method: "POST", headers: authHeaders() });
        _accessToken = null;
        localStorage.removeItem("apex_session");
        client.auth._session = null;
        client.auth._listeners.forEach(l => l("SIGNED_OUT", null));
        return { error: null };
      },
    },

    from(table) {
      let _filters = [];
      let _order   = null;
      let _limit   = null;
      let _select  = "*";
      let _single  = false;

      const build = () => {
        let q = `${table}?select=${encodeURIComponent(_select)}`;
        _filters.forEach(f => { q += `&${f}`; });
        if (_order)  q += `&order=${_order}`;
        if (_limit)  q += `&limit=${_limit}`;
        return q;
      };

      const chain = {
        select(cols) { _select = cols; return chain; },
        eq(col, val) { _filters.push(`${col}=eq.${val}`); return chain; },
        neq(col,val) { _filters.push(`${col}=neq.${val}`); return chain; },
        gte(col,val) { _filters.push(`${col}=gte.${val}`); return chain; },
        lte(col,val) { _filters.push(`${col}=lte.${val}`); return chain; },
        in(col,vals) { _filters.push(`${col}=in.(${vals.join(",")})`); return chain; },
        order(col, { ascending = true } = {}) {
          _order = `${col}.${ascending ? "asc" : "desc"}`;
          return chain;
        },
        limit(n) { _limit = n; return chain; },
        single() { _single = true; return chain; },
        async then(resolve, reject) {
          try {
            const r = await fetch(`${url}/rest/v1/${build()}`, {
              headers: {
                ...authHeaders(),
                "Prefer": _single ? "return=representation" : "return=representation",
              }
            });
            let data = await r.json();
            if (!r.ok) {
              resolve({ data: null, error: { message: data.message || data.hint || JSON.stringify(data) } });
              return;
            }
            if (_single && Array.isArray(data)) data = data[0] || null;
            resolve({ data, error: null });
          } catch(e) { reject(e); }
        },
        async insert(rows) {
          const r = await fetch(`${url}/rest/v1/${table}`, {
            method: "POST",
            headers: { ...authHeaders(), "Prefer": "return=representation" },
            body: JSON.stringify(Array.isArray(rows) ? rows : [rows]),
          });
          const data = await r.json();
          if (!r.ok) return { data: null, error: { message: data.message || JSON.stringify(data) } };
          return { data: Array.isArray(data) ? data[0] : data, error: null };
        },
        async update(updates) {
          const r = await fetch(`${url}/rest/v1/${build()}`, {
            method: "PATCH",
            headers: { ...authHeaders(), "Prefer": "return=representation" },
            body: JSON.stringify(updates),
          });
          const data = await r.json();
          if (!r.ok) return { data: null, error: { message: data.message || JSON.stringify(data) } };
          return { data, error: null };
        },
        async delete() {
          const r = await fetch(`${url}/rest/v1/${build()}`, {
            method: "DELETE", headers: authHeaders(),
          });
          return { error: r.ok ? null : { message: "Delete failed" } };
        },
      };
      return chain;
    },

    functions: {
      async invoke(name, { body } = {}) {
        const r = await fetch(`${url}/functions/v1/${name}`, {
          method: "POST",
          headers: authHeaders(),
          body: JSON.stringify(body),
        });
        const data = await r.json();
        return { data, error: r.ok ? null : { message: data.message } };
      },
    },

    // Lightweight polling-based realtime (no WebSocket SDK needed)
    _pollers: {},
    channel(name) {
      let _handlers = [];
      const ch = {
        on(event, config, callback) {
          _handlers.push({ event, config, callback });
          return ch;
        },
        subscribe() {
          // Start polling for changes every 3 seconds
          const { table, filter } = _handlers[0]?.config || {};
          if (!table) return ch;

          let lastTs = new Date().toISOString();
          const key = `${name}_${table}`;

          client._pollers[key] = setInterval(async () => {
            try {
              let q = client.from(table).select("*").order("created_at", { ascending: false }).limit(5);
              if (filter) {
                const [col, val] = filter.split("=eq.");
                if (col && val) q = q.eq(col, val);
              }
              const { data } = await q;
              if (!Array.isArray(data)) return;
              const newRows = data.filter(r => r.created_at > lastTs);
              if (newRows.length > 0) {
                lastTs = newRows[0].created_at;
                newRows.forEach(row => {
                  _handlers.forEach(h => {
                    if (h.config.table === table) h.callback({ new: row });
                  });
                });
              }
            } catch(e) {}
          }, 3000);
          return ch;
        },
      };
      return ch;
    },

    removeChannel(ch) {
      Object.values(client._pollers).forEach(id => clearInterval(id));
    },
  };

  return client;
};

// ══════════════════════════════════════════════════════════════════════════════
// SUPABASE CONFIG SCREEN — shown when no config found
// ══════════════════════════════════════════════════════════════════════════════
const STORAGE_KEY = "apex_supabase_config";

const loadConfig = () => {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || "null"); } catch(e){ return null; }
};

const ConfigScreen = ({ onSave }) => {
  const C = LIGHT;
  const [url,  setUrl]  = useState("");
  const [key,  setKey]  = useState("");
  const [err,  setErr]  = useState("");
  const [testing, setTesting] = useState(false);

  const save = async () => {
    if (!url.includes("supabase.co") || !key.startsWith("eyJ")) {
      setErr("Paste your Supabase Project URL and anon key exactly as shown in Settings → API"); return;
    }
    setTesting(true); setErr("");
    try {
      const r = await fetch(`${url}/rest/v1/organizations?limit=1`, {
        headers: { apikey: key, Authorization: `Bearer ${key}` }
      });
      if (!r.ok && r.status !== 406) throw new Error(`Status ${r.status}`);
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ url, key }));
      onSave({ url, key });
    } catch(e) {
      setErr(`Could not reach Supabase: ${e.message}. Check your URL and key.`);
    }
    setTesting(false);
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh",
      background:"#F8FAFC", fontFamily:"'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:480, padding:40, borderRadius:20, border:"1px solid rgba(201,168,76,0.3)",
        background:C.bgCard, boxShadow:"0 0 80px rgba(0,0,0,0.8)" }}>

        <div style={{ display:"flex", alignItems:"center", gap:12, marginBottom:8 }}>
          <div style={{ width:40, height:40, borderRadius:12, background:"rgba(201,168,76,0.15)",
            border:"1px solid rgba(201,168,76,0.4)", display:"flex", alignItems:"center", justifyContent:"center" }}>
            <Ico name="settings" size={20} color="#C9A84C"/>
          </div>
          <div>
            <h2 style={{ color:C.gold, fontSize:18, fontWeight:900, margin:0 }}>Connect Supabase</h2>
            <p style={{ color:C.muted, fontSize:11, margin:0 }}>One-time setup — takes 2 minutes</p>
          </div>
        </div>

        <div style={{ margin:"24px 0", padding:16, borderRadius:12, background:"rgba(0,212,255,0.06)", border:"1px solid rgba(0,212,255,0.2)" }}>
          <p style={{ color:"#00D4FF", fontSize:11, fontWeight:700, marginBottom:8 }}>How to get your keys:</p>
          {["1. Go to supabase.com and create a free project","2. Open Settings → API","3. Copy Project URL and anon/public key below","4. Run apex_schema.sql in your SQL Editor"].map((s,i)=>(
            <p key={i} style={{ color:C.textSub, fontSize:10, margin:"3px 0" }}>{s}</p>
          ))}
        </div>

        <div style={{ marginBottom:12 }}>
          <label style={{ color:C.muted, fontSize:10, fontWeight:700, display:"block", marginBottom:4, textTransform:"uppercase" }}>Project URL</label>
          <input value={url} onChange={e=>setUrl(e.target.value.trim())}
            placeholder="https://xxxxxxxxxxxx.supabase.co"
            style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:C.bgDeep,
              border:`1px solid ${C.border}`, color:C.text, fontSize:12, outline:"none", boxSizing:"border-box" }}/>
        </div>

        <div style={{ marginBottom:20 }}>
          <label style={{ color:C.muted, fontSize:10, fontWeight:700, display:"block", marginBottom:4, textTransform:"uppercase" }}>Anon Public Key</label>
          <input value={key} onChange={e=>setKey(e.target.value.trim())} type="password"
            placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
            style={{ width:"100%", padding:"10px 14px", borderRadius:10, background:C.bgDeep,
              border:`1px solid ${C.border}`, color:C.text, fontSize:12, outline:"none", boxSizing:"border-box" }}/>
        </div>

        {err && <p style={{ color:"#EF233C", fontSize:11, marginBottom:12 }}>⚠ {err}</p>}

        <button onClick={save} disabled={testing}
          style={{ width:"100%", padding:"12px", borderRadius:12,
            background:"#C9A84C", border:"none",
            color:"#030810", fontWeight:900, fontSize:13, cursor:testing?"not-allowed":"pointer",
            opacity:testing?0.7:1 }}>
          {testing ? "Testing connection…" : "Connect & Continue →"}
        </button>

        <button onClick={()=>onSave(null)}
          style={{ width:"100%", marginTop:10, background:"none", border:"none",
            color:C.muted, fontSize:11, cursor:"pointer", padding:8 }}>
          Skip — use demo mode (no data saved)
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// AUTH GATE — Login / Sign up
// ══════════════════════════════════════════════════════════════════════════════
const AuthGate = ({ supabase, onAuth, onSkip }) => {
  const C = LIGHT;
  const [isSignUp,  setIsSignUp]  = useState(false);
  const [email,     setEmail]     = useState("");
  const [password,  setPassword]  = useState("");
  const [name,      setName]      = useState("");
  const [loading,   setLoading]   = useState(false);
  const [error,     setError]     = useState("");

  const submit = async () => {
    setLoading(true); setError("");
    const { data, error: err } = isSignUp
      ? await supabase.auth.signUp(email, password, { full_name: name })
      : await supabase.auth.signInWithPassword(email, password);
    if (err) { setError(err.message); setLoading(false); return; }
    if (isSignUp && !data?.access_token) {
      setError("Check your email for a confirmation link, then sign in.");
      setLoading(false); return;
    }
    onAuth(data);
    setLoading(false);
  };

  const inp = {
    width:"100%", padding:"10px 14px", borderRadius:10,
    background:C.bgDeep, border:`1px solid ${C.border}`,
    color:C.text, fontSize:12, outline:"none", boxSizing:"border-box", marginBottom:10,
  };

  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh",
      background:"#F8FAFC", fontFamily:"'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif" }}>
      <div style={{ width:380, padding:36, borderRadius:20, border:"1px solid rgba(201,168,76,0.3)",
        background:C.bgCard }}>

        <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:6 }}>
          <EyeLogo size={32} C={DARK} alerting={false}/>
          <div>
            <p style={{ color:C.gold, fontSize:15, fontWeight:900, margin:0 }}>APEX INTEGRITY LABS</p>
            <p style={{ color:C.muted, fontSize:10, margin:0 }}>Neural Sentry AI Safety Platform</p>
          </div>
        </div>

        <p style={{ color:C.muted, fontSize:11, marginBottom:22, marginTop:12 }}>
          {isSignUp ? "Create your moderator account" : "Sign in to your dashboard"}
        </p>

        {isSignUp && (
          <input value={name} onChange={e=>setName(e.target.value)} placeholder="Full name" style={inp}/>
        )}
        <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email address" type="email" style={inp}
          onKeyDown={e=>e.key==="Enter"&&submit()}/>
        <input value={password} onChange={e=>setPassword(e.target.value)} placeholder="Password" type="password" style={inp}
          onKeyDown={e=>e.key==="Enter"&&submit()}/>

        {error && <p style={{ color:"#EF233C", fontSize:11, marginBottom:10 }}>⚠ {error}</p>}

        <button onClick={submit} disabled={loading}
          style={{ width:"100%", padding:"11px", borderRadius:11,
            background:"#C9A84C", border:"none",
            color:"#030810", fontWeight:900, fontSize:12, cursor:loading?"not-allowed":"pointer",
            opacity:loading?0.7:1, marginBottom:10 }}>
          {loading ? "Please wait…" : isSignUp ? "Create Account" : "Sign In"}
        </button>

        <button onClick={()=>{setIsSignUp(v=>!v);setError("");}}
          style={{ width:"100%", background:"none", border:"none", color:C.muted, fontSize:11, cursor:"pointer", marginBottom:6 }}>
          {isSignUp ? "Already have an account? Sign in" : "Don't have an account? Sign up"}
        </button>

        <button onClick={onSkip}
          style={{ width:"100%", background:"none", border:"none", color:C.muted, fontSize:10, cursor:"pointer" }}>
          Continue in demo mode →
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// MANUAL MESSAGE INPUT — for tryout phase (no platform integration needed)
// ══════════════════════════════════════════════════════════════════════════════
const ManualInput = ({ C, onSubmit }) => {
  const [text,    setText]    = useState("");
  const [user,    setUser]    = useState("");
  const [channel, setChannel] = useState("#general");
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!text.trim() || !user.trim()) return;
    setLoading(true);
    await onSubmit({ user: user.trim(), text: text.trim(), channel });
    setText(""); setLoading(false);
  };

  return (
    <div className="px-3 py-2 border-b flex-shrink-0" style={{ borderColor: C.border, background: `${C.gold}06` }}>
      <p className="text-[9px] font-bold uppercase tracking-wider mb-1.5" style={{ color: C.gold }}>
        ✏ Submit Test Message
      </p>
      <div className="flex gap-1.5 flex-wrap">
        <input value={user} onChange={e=>setUser(e.target.value)} placeholder="username"
          className="rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{ width:90, background:C.bgCard, boxShadow:`0 2px 12px ${C.shadow}`, color:C.text }}/>
        <input value={text} onChange={e=>setText(e.target.value)}
          onKeyDown={e=>e.key==="Enter"&&submit()}
          placeholder="Type any message to classify and save…"
          className="flex-1 rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{ minWidth:160, background:C.bgCard, boxShadow:`0 2px 12px ${C.shadow}`, color:C.text }}/>
        <select value={channel} onChange={e=>setChannel(e.target.value)}
          className="rounded-lg px-2 py-1.5 text-[10px] outline-none"
          style={{ background:C.bgCard, boxShadow:`0 2px 12px ${C.shadow}`, color:C.text }}>
          {["#general","#roblox-chat","#support","#feedback","#discord-main"].map(ch=>(
            <option key={ch} value={ch}>{ch}</option>
          ))}
        </select>
        <button onClick={submit} disabled={loading||!text.trim()||!user.trim()}
          className="px-3 py-1.5 rounded-lg text-[10px] font-black"
          style={{ background:`${C.electric}15`, 
            color:loading?C.muted:C.electric, cursor:loading?"not-allowed":"pointer" }}>
          {loading?"…":"Send →"}
        </button>
      </div>
    </div>
  );
};

// ══════════════════════════════════════════════════════════════════════════════
// ROOT APP
// ══════════════════════════════════════════════════════════════════════════════
export default function App() {
  useEffect(()=>{
    const el = document.createElement("style");
    el.textContent = CSS;
    document.head.appendChild(el);
    return () => document.head.removeChild(el);
  },[]);

  // ── App-level setup state ────────────────────────────────────
  const [appState, setAppState] = useState("loading"); // loading | config | auth | ready
  const [supabase, setSupabase] = useState(null);
  const [demoMode, setDemoMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [orgId, setOrgId] = useState("00000000-0000-0000-0000-000000000001");
  const [dbStatus, setDbStatus] = useState("idle"); // idle | loading | live | error

  // ── Dashboard state ──────────────────────────────────────────
  const [theme,      setTheme]      = useState("dark");
  const C = theme === "dark" ? DARK : LIGHT;
  const [soundOn,    setSoundOn]    = useState(true);
  const [alerting,   setAlerting]   = useState(false);

  const [messages,   setMessages]   = useState(()=>Array.from({length:12},()=>genMsg()));
  const [alerts,     setAlerts]     = useState(()=>[
    {...genMsg(),toxic:true, bullying:false,safeWord:false,user:"vortex99",  escalation:"high"},
    {...genMsg(),toxic:false,bullying:true, safeWord:false,user:"neon_cat",  text:"Nobody likes you here",escalation:"high"},
    {...genMsg(),toxic:false,bullying:false,safeWord:true, user:"sky_arch",  text:"i'm scared please help",escalation:"critical"},
  ]);
  const [smsLog,     setSmsLog]     = useState(()=>{
    const g1=GUARDIAN_DATA[0],c1=g1.children[0];
    const g2=GUARDIAN_DATA[1],c2=g2.children[0];
    return [makeSMS({text:"Nobody likes you here",bullying:true,safeWord:false},g1,c1),
            makeSMS({text:"i'm scared please help",bullying:false,safeWord:true},g2,c2)];
  });
  const [toast,      setToast]      = useState(null);
  const [guardians,  setGuardians]  = useState(GUARDIAN_DATA);
  const [childMap,   setChildMap]   = useState(CHILD_MAP);
  const [chartData,  setChartData]  = useState(()=>Array.from({length:10},(_,i)=>({
    label:`${i+9}:00`,
    positive:Math.floor(25+Math.random()*35),
    neutral:Math.floor(15+Math.random()*20),
    negative:Math.floor(5+Math.random()*15)
  })));
  const [keywords,   setKeywords]   = useState([
    {word:"broken",count:47,trend:"up"},{word:"refund",count:38,trend:"up"},
    {word:"amazing",count:31,trend:"stable"},{word:"payment",count:29,trend:"up"},
    {word:"crash",count:24,trend:"up"},{word:"slow",count:19,trend:"down"},
  ]);
  const [search,     setSearch]     = useState("");
  const [filter,     setFilter]     = useState("all");
  const [activeNav,  setActiveNav]  = useState("overview");
  const [msgCount,   setMsgCount]   = useState(1247);
  const [activeUsers,setActiveUsers]= useState(384);
  const [sidebarOpen,setSidebarOpen]= useState(true);

  const alertTimer  = useRef(null);
  const toastTimer  = useRef(null);
  const mockInterval= useRef(null);
  const unsubRefs   = useRef([]);

  // ── Bootstrap: check for saved config ───────────────────────
  useEffect(()=>{
    const cfg = loadConfig();
    if (cfg) {
      const sb = createSupabaseClient(cfg.url, cfg.key);
      setSupabase(sb);
      sb.auth.getSession().then(({ data: { session } }) => {
        if (session) { setCurrentUser(session.user); setAppState("ready"); }
        else setAppState("auth");
      });
    } else {
      setAppState("config");
    }
  },[]);

  // ── Load real data when authenticated ───────────────────────
  useEffect(()=>{
    if (appState !== "ready" || !supabase) return;
    setDbStatus("loading");

    async function bootstrap() {
      try {
        // Load guardians
        const { data: gdns } = await supabase
          .from("guardians")
          .select("*, children(*)")
          .eq("org_id", orgId)
          .order("name");

        if (gdns && gdns.length > 0) {
          const normalized = gdns.map(g=>({
            id: g.id, name: g.name, phone: g.phone, smsEnabled: g.sms_enabled,
            children: (g.children||[]).map(c=>({
              id:c.id, name:c.name, username:c.username, age:c.age,
              safetyScore:c.safety_score, checkedIn:c.checked_in,
              incidents:0,
              lastCheckIn: c.last_check_in
                ? new Date(c.last_check_in).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}) + " ago"
                : "Never",
            })),
          }));
          setGuardians(normalized);
          const newMap = {};
          normalized.forEach(g=>g.children.forEach(c=>{ newMap[c.username]={guardian:g,child:c}; }));
          setChildMap(newMap);
        }

        // Load recent messages
        const { data: msgs } = await supabase
          .from("messages")
          .select("*, channels(name)")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(40);

        if (msgs && msgs.length > 0) {
          setMessages(msgs.map(m=>({
            id:m.id, user:m.username, text:m.text, sentiment:m.sentiment,
            toxic:m.toxic, bullying:m.bullying, safeWord:m.safe_word,
            urgent:m.urgent, escalation:m.escalation,
            aiConfidence:m.ai_confidence, aiReason:m.ai_reason,
            channel:m.channels?.name||"#general",
            time:new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
            ts:new Date(m.created_at).getTime(),
          })));
          setMsgCount(msgs.length);
        }

        // Load incidents/alerts
        const { data: incs } = await supabase
          .from("incidents")
          .select("*, messages(username,text,channels(name))")
          .eq("org_id", orgId)
          .eq("status", "review")
          .order("created_at", { ascending: false })
          .limit(20);

        if (incs && incs.length > 0) {
          setAlerts(incs.map(i=>({
            id:i.id, escalation:i.escalation, type:i.type,
            user:i.messages?.username, text:i.messages?.text,
            channel:i.messages?.channels?.name||"#general",
            safeWord:i.type==="safeword", bullying:i.type==="bullying", toxic:i.type==="toxic",
            aiConfidence:i.ai_confidence, aiReason:i.ai_reason,
          })));
        }

        // Load SMS log
        const { data: sms } = await supabase
          .from("sms_log")
          .eq("org_id", orgId)
          .order("created_at", { ascending: false })
          .limit(30);

        if (sms && sms.length > 0) {
          setSmsLog(sms.map(s=>({
            id:s.id, to:s.to_phone, guardianName:s.guardian_name,
            childName:s.child_name, childUsername:s.child_username,
            type:s.type, preview:s.message_preview,
            time:new Date(s.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
          })));
        }

        // Subscribe to realtime new messages
        const msgCh = supabase.channel("msgs-live")
          .on("postgres_changes",{event:"INSERT",schema:"public",table:"messages",filter:`org_id=eq.${orgId}`},
            payload=>{
              const m = payload.new;
              const newMsg = {
                id:m.id, user:m.username, text:m.text, sentiment:m.sentiment,
                toxic:m.toxic, bullying:m.bullying, safeWord:m.safe_word,
                urgent:m.urgent, escalation:m.escalation,
                aiConfidence:m.ai_confidence, aiReason:m.ai_reason,
                channel:"#general",
                time:new Date(m.created_at).toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
                ts:new Date(m.created_at).getTime(),
              };
              setMessages(prev=>[newMsg,...prev].slice(0,50));
              setMsgCount(c=>c+1);
              if (m.escalation) {
                triggerAlertRef.current(m.escalation, newMsg);
              }
            })
          .subscribe();

        // Subscribe to new incidents
        const incCh = supabase.channel("incs-live")
          .on("postgres_changes",{event:"INSERT",schema:"public",table:"incidents",filter:`org_id=eq.${orgId}`},
            payload=>{
              const i = payload.new;
              setAlerts(prev=>[{
                id:i.id, escalation:i.escalation, type:i.type,
                safeWord:i.type==="safeword", bullying:i.type==="bullying", toxic:i.type==="toxic",
              },...prev]);
            })
          .subscribe();

        unsubRefs.current = [
          ()=>supabase.removeChannel(msgCh),
          ()=>supabase.removeChannel(incCh),
        ];

        // Stop mock interval since we have real data
        if (mockInterval.current) { clearInterval(mockInterval.current); mockInterval.current = null; }
        setDbStatus("live");
      } catch(e) {
        console.error("Bootstrap error:", e);
        setDbStatus("error");
      }
    }
    bootstrap();
    return () => { unsubRefs.current.forEach(fn=>fn?.()); };
  }, [appState, supabase, orgId]);

  // ── Mock interval (only runs in demo mode or before DB loads) ─
  useEffect(()=>{
    if (appState === "ready" && dbStatus === "live") return; // real data active
    mockInterval.current = setInterval(()=>{
      const m = genMsg();
      setMessages(prev=>[m,...prev].slice(0,40));
      setMsgCount(c=>c+1);
      setActiveUsers(u=>Math.max(300,u+Math.floor(Math.random()*5)-2));
      if (m.safeWord||m.bullying||m.toxic) {
        setAlerts(prev=>[m,...prev].slice(0,15));
        dispatchSMSRef.current(m);
        triggerAlertRef.current(m.escalation||"medium", m);
      }
      if (Math.random()>0.65) setChartData(prev=>[...prev.slice(1),{
        label:new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}),
        positive:Math.floor(25+Math.random()*35),neutral:Math.floor(15+Math.random()*20),negative:Math.floor(5+Math.random()*15)
      }]);
    }, 2800);
    return () => { if (mockInterval.current) clearInterval(mockInterval.current); };
  }, [appState, dbStatus]);

  // Use refs so callbacks inside setInterval always have fresh values
  const triggerAlertRef = useRef(null);
  const dispatchSMSRef  = useRef(null);

  const triggerAlert = useCallback(async (level, msg) => {
    if (soundOn) SoundEngine.play(level);
    setAlerting(true);
    if (alertTimer.current) clearTimeout(alertTimer.current);
    alertTimer.current = setTimeout(()=>setAlerting(false), 4000);

    // Real SMS via Supabase edge function
    if (supabase && msg && (level==="critical"||level==="high")) {
      const info = childMap[msg.user];
      if (info?.guardian?.smsEnabled && info.guardian.phone) {
        try {
          await supabase.functions.invoke("send-sms", { body: {
            toPhone:        info.guardian.phone,
            guardianName:   info.guardian.name,
            childName:      info.child.name,
            childUsername:  info.child.username,
            type:           msg.safeWord?"safeword":msg.bullying?"bullying":"toxic",
            messagePreview: msg.text,
          }});
        } catch(e) { console.warn("SMS failed:", e); }
      }
    }
  }, [soundOn, supabase, childMap]);
  triggerAlertRef.current = triggerAlert;

  const dispatchSMS = useCallback((msg) => {
    const info = childMap[msg.user];
    if (!info) return;
    const lg = guardians.find(g=>g.id===info.guardian.id)||info.guardian;
    if (!lg.smsEnabled) return;
    const sms = makeSMS(msg, lg, info.child);
    setSmsLog(prev=>[sms,...prev].slice(0,50));
    setToast(sms);
    if (toastTimer.current) clearTimeout(toastTimer.current);
    toastTimer.current = setTimeout(()=>setToast(null), 5500);
  }, [childMap, guardians]);
  dispatchSMSRef.current = dispatchSMS;

  // ── DB write handlers ─────────────────────────────────────────
  const onFlag = useCallback(async (id) => {
    setMessages(prev=>prev.map(m=>m.id===id?{...m,flagged:!m.flagged}:m));
    if (supabase) {
      await supabase.from("messages").update({ flagged: true }).eq("id", id);
    }
  }, [supabase]);

  const onBan = useCallback(async (user) => {
    setMessages(prev=>prev.filter(m=>m.user!==user));
    if (supabase) {
      await supabase.from("banned_users").insert({ org_id: orgId, username: user, reason: "Banned via dashboard" });
    }
  }, [supabase, orgId]);

  const onDismiss = useCallback(async (id) => {
    setAlerts(prev=>prev.filter(a=>a.id!==id));
    if (supabase) {
      await supabase.from("incidents").update({ status:"resolved", resolved_at: new Date().toISOString() }).eq("id", id);
    }
  }, [supabase]);

  // ── Manual message submit (tryout phase) ──────────────────────
  const onManualMessage = useCallback(async ({ user, text, channel }) => {
    const base = { user, text, channel, sentiment:"neutral", toxic:false, bullying:false, safeWord:false, urgent:false };
    // Quick local keyword check while waiting for AI
    if (/scared|help me|don't feel safe/i.test(text)) { base.safeWord=true; base.escalation="critical"; }
    else if (/nobody likes|everyone hates|disappear|ugly|worthless/i.test(text)) { base.bullying=true; base.escalation="high"; }
    else if (/idiot|stupid|hate you|shut up/i.test(text)) { base.toxic=true; base.escalation="medium"; }
    base.escalation = base.escalation || ESC(base);

    const newMsg = { ...base, id: Date.now(), time: new Date().toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"}), ts: Date.now() };
    setMessages(prev=>[newMsg,...prev].slice(0,50));
    setMsgCount(c=>c+1);

    if (base.safeWord||base.bullying||base.toxic) {
      setAlerts(prev=>[newMsg,...prev].slice(0,15));
      dispatchSMSRef.current(newMsg);
      triggerAlertRef.current(newMsg.escalation||"medium", newMsg);
    }

    // Save to Supabase if connected
    if (supabase) {
      const { data: chData } = await supabase.from("channels").select("id").eq("org_id", orgId).eq("name", channel).limit(1);
      const channelId = chData?.[0]?.id;
      const { data: saved } = await supabase.from("messages").insert({
        org_id:    orgId,
        channel_id: channelId,
        username:  user, text,
        toxic:     base.toxic, bullying:base.bullying,
        safe_word: base.safeWord, urgent:base.urgent,
        escalation:base.escalation, sentiment:base.sentiment,
      });

      // Create incident if needed
      if (base.escalation && saved?.id) {
        await supabase.from("incidents").insert({
          org_id:    orgId,
          message_id:saved.id,
          escalation:base.escalation,
          type:      base.safeWord?"safeword":base.bullying?"bullying":"toxic",
        });
      }

      // Update message id with real DB id
      if (saved?.id) {
        setMessages(prev=>prev.map(m=>m.id===newMsg.id?{...m,id:saved.id}:m));
      }
    }
  }, [supabase, orgId]);

  const filtered = useMemo(()=>messages.filter(m=>{
    const ms=!search||m.text.toLowerCase().includes(search.toLowerCase())||m.user.toLowerCase().includes(search.toLowerCase());
    const mf=filter==="all"||(filter==="toxic"?m.toxic:filter==="bullying"?m.bullying:filter==="safe-word"?m.safeWord:filter==="urgent"?m.urgent:m.sentiment===filter);
    return ms&&mf;
  }),[messages,search,filter]);

  // ── App state routing ─────────────────────────────────────────
  if (appState === "loading") return (
    <div style={{ display:"flex",alignItems:"center",justifyContent:"center",height:"100vh",background:"#F8FAFC" }}>
      <div style={{ textAlign:"center" }}>
        <EyeLogo size={48} C={DARK} alerting={false}/>
        <p style={{ color:"#D97706",fontFamily:"sans-serif",marginTop:12,fontSize:12,fontWeight:600 }}>Initializing…</p>
      </div>
    </div>
  );

  if (appState === "config") return (
    <ConfigScreen onSave={cfg=>{
      if (!cfg) { setDemoMode(true); setAppState("ready"); return; }
      const sb = createSupabaseClient(cfg.url, cfg.key);
      setSupabase(sb);
      setAppState("auth");
    }}/>
  );

  if (appState === "auth") return (
    <AuthGate supabase={supabase}
      onAuth={data=>{ setCurrentUser(data?.user||null); setAppState("ready"); }}
      onSkip={()=>{ setDemoMode(true); setAppState("ready"); }}/>
  );

  // ── Main dashboard ────────────────────────────────────────────
  const navItems = [
    {id:"overview",   icon:"chart",        label:"Overview"},
    {id:"feed",       icon:"message",      label:"Feed"},
    {id:"alerts",     icon:"alert",        label:"Alerts",  badge:alerts.filter(a=>a.safeWord||a.bullying||a.toxic).length},
    {id:"kanban",     icon:"kanban",       label:"Queue"},
    {id:"ailab",      icon:"sparkles",     label:"AI Lab"},
    {id:"parents",    icon:"guardian",     label:"Parents", badge:smsLog.filter(s=>s.type==="safeword").length},
    {id:"sms2way",    icon:"sms",          label:"SMS"},
    {id:"fingerprint",icon:"fingerprint",  label:"Finger"},
    {id:"missing",    icon:"guardian",       label:"Missing", badge:0},
    {id:"integrations",icon:"link",        label:"Connect"},
    {id:"rnapp",      icon:"phone2",       label:"App"},
  ];

  const renderScreen = () => {
    const feedScreen = (
      <div className="flex flex-col h-full">
        <ManualInput C={C} onSubmit={onManualMessage}/>
        <FeedScreen C={C} messages={filtered} search={search} setSearch={setSearch}
          filter={filter} setFilter={setFilter} onFlag={onFlag} onBan={onBan}/>
      </div>
    );
    switch(activeNav) {
      case "overview":      return <OverviewScreen C={C} messages={messages} chartData={chartData} keywords={keywords} msgCount={msgCount} activeUsers={activeUsers} alerts={alerts} smsLog={smsLog} setNav={setActiveNav}/>;
      case "feed":          return feedScreen;
      case "alerts":        return <AlertsScreen C={C} alerts={alerts} onDismiss={onDismiss}/>;
      case "kanban":        return <KanbanScreen C={C}/>;
      case "ailab":         return <AILabScreen C={C} messages={messages}/>;
      case "parents":       return <ParentsScreen C={C} smsLog={smsLog} guardians={guardians} setGuardians={setGuardians}/>;
      case "sms2way":       return <TwoWaySMSScreen C={C} smsLog={smsLog}/>;
      case "fingerprint":   return <FingerprintScreen C={C}/>;
      case "missing":       return <MissingKidsScreen C={C} key="missing"/>;
      case "integrations":  return <IntegrationsScreen C={C}/>;
      case "rnapp":         return <RNScreen C={C} alerts={alerts} smsLog={smsLog}/>;
      default: return null;
    }
  };

  const criticalCount = alerts.filter(a=>a.safeWord).length;

  return (
    <div className="flex h-screen overflow-hidden"
      style={{background:C.bg,color:C.text,fontFamily:"'Inter','Segoe UI','Helvetica Neue',Arial,sans-serif"}}>

      {toast&&<SmsToast sms={toast} onClose={()=>setToast(null)} C={C}/>}

      <Sidebar nav={navItems} activeNav={activeNav} setNav={setActiveNav}
        open={sidebarOpen} setOpen={setSidebarOpen} activeUsers={activeUsers}
        C={C} theme={theme} setTheme={setTheme} alerting={alerting}/>

      <div className="flex-1 flex flex-col overflow-hidden min-w-0">
        <header className="flex items-center gap-3 px-4 py-3 border-b flex-shrink-0"
          style={{borderColor:alerting?`${C.crimson}40`:C.borderGold,
            background:C.bgCard,
            backdropFilter:"blur(8px)",transition:"border-color 0.3s"}}>

          <div className="flex items-center gap-2 lg:hidden flex-shrink-0">
            <EyeLogo size={26} C={C} alerting={alerting}/>
            <div>
              <p className="text-[10px] font-black tracking-tight leading-none"
                style={{color:alerting?C.crimson:C.gold,transition:"color 0.3s"}}>APEX INTEGRITY LABS</p>
              <p className="text-[7px] tracking-widest uppercase leading-none mt-0.5" style={{color:C.muted}}>Neural Sentry AI</p>
            </div>
          </div>

          <div className="hidden lg:block">
            <h1 className="text-sm font-black" style={{color:C.text}}>{navItems.find(n=>n.id===activeNav)?.label}</h1>
            <p className="text-[10px]" style={{color:C.muted}}>
              {msgCount.toLocaleString()} analyzed · {smsLog.length} SMS
              {dbStatus==="live"&&<span style={{color:C.emerald}}> · ● DB Live</span>}
              {demoMode&&<span style={{color:C.amber}}> · Demo Mode</span>}
            </p>
          </div>

          <div className="hidden lg:flex flex-1 max-w-xs mx-4">
            <div className="flex items-center gap-2 rounded-xl px-3 py-2 w-full"
              style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`}}>
              <Ico name="search" size={12} color={C.muted}/>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search..."
                className="bg-transparent flex-1 outline-none text-xs" style={{color:C.text}}/>
            </div>
          </div>

          <div className="flex-1"/>

          {criticalCount>0&&(
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl flex-shrink-0"
              style={{background:C.bgCard,boxShadow:`0 2px 12px ${C.shadow}`}}>
              <span className="text-[10px] font-black" style={{color:C.safeWord}}>⚠ {criticalCount} CRITICAL</span>
            </div>
          )}

          <div className="flex items-center px-2.5 py-1 rounded-full flex-shrink-0"
            style={{background:C.bgCard}}>
            <LiveDot C={C}/><span className="text-[10px] font-bold" style={{color:C.emerald}}>
              {dbStatus==="live"?"LIVE":"DEMO"}
            </span>
          </div>

          <SoundToggle on={soundOn} setOn={setSoundOn} C={C}/>

          {smsLog.length>0&&(
            <button onClick={()=>setActiveNav("parents")}
              className="relative flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl flex-shrink-0"
              style={{background:C.bgCard}}>
              <Ico name="sms" size={13} color={C.guardian}/>
              <span className="text-[10px] font-black" style={{color:C.guardian}}>{smsLog.length}</span>
            </button>
          )}

          <button className="relative p-2 rounded-xl flex-shrink-0" style={{boxShadow:`0 2px 12px ${C.shadow}`}}>
            <Ico name="bell" size={14} color={C.muted}/>
            {alerts.length>0&&(
              <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full text-[8px] font-black flex items-center justify-center"
                style={{background:C.crimson,color:"#fff"}}>{alerts.length}</span>
            )}
          </button>

          <button onClick={()=>setTheme(t=>t==="dark"?"light":"dark")}
            className="p-2 rounded-xl lg:hidden flex-shrink-0" style={{boxShadow:`0 2px 12px ${C.shadow}`}}>
            <Ico name={theme==="dark"?"sun":"moon"} size={14} color={C.muted}/>
          </button>

          {/* User avatar + sign out */}
          <div className="relative flex-shrink-0" style={{position:"relative"}}>
            <button
              onClick={async ()=>{
                if (supabase && !demoMode) {
                  await supabase.auth.signOut();
                  localStorage.removeItem(STORAGE_KEY);
                }
                setAppState("config");
                setDemoMode(false);
                setSupabase(null);
                setCurrentUser(null);
                setDbStatus("idle");
              }}
              title={currentUser?.email||"Sign out"}
              className="w-7 h-7 rounded-full flex items-center justify-center text-xs font-black"
              style={{background:C.border}}>
              {currentUser?.email?.[0]?.toUpperCase()||"A"}
            </button>
          </div>
        </header>

        <div className="flex-1 min-h-0 overflow-y-auto h-full">{renderScreen()}</div>

        <nav className="lg:hidden flex border-t flex-shrink-0"
          style={{borderColor:alerting?`${C.crimson}40`:C.borderGold,
            background:C.bgCard,
            paddingBottom:"env(safe-area-inset-bottom,0px)",
            transition:"border-color 0.3s"}}>
          {navItems.map(n=><BottomTab key={n.id} {...n} active={activeNav===n.id} onClick={setActiveNav} C={C}/>)}
        </nav>
      </div>
    </div>
  );
}
