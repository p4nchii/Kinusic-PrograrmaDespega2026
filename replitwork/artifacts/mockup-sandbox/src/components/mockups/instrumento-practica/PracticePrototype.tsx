import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, ChevronDown, ChevronUp, Minus, Music2, Pause, Play, RotateCcw, Volume2, VolumeX } from "lucide-react";

type NoteBlock = { id: number; lane: number; hue: string };
type LaneConfig = { color: string; soft: string; name: string; pitch: number; note: string };

const LANES: LaneConfig[] = [
  { color: "#b57ae9", soft: "#b57ae9", name: "1", pitch: 261.63, note: "Do" },
  { color: "#b57ae9", soft: "#b57ae9", name: "2", pitch: 293.66, note: "Re" },
  { color: "#b57ae9", soft: "#b57ae9", name: "3", pitch: 329.63, note: "Mi" },
  { color: "#b57ae9", soft: "#b57ae9", name: "4", pitch: 349.23, note: "Fa" },
  { color: "#b57ae9", soft: "#b57ae9", name: "5", pitch: 392, note: "Sol" },
  { color: "#b57ae9", soft: "#b57ae9", name: "6", pitch: 440, note: "La" },
];

export function PracticePrototype() {
  const [screen, setScreen] = useState<"setup" | "practice">("setup");
  const [laneCount, setLaneCount] = useState(4);
  const [minBlocks, setMinBlocks] = useState(3);
  const [maxBlocks, setMaxBlocks] = useState(6);
  const [queue, setQueue] = useState<number[]>([]);
  const [blocks, setBlocks] = useState<NoteBlock[]>([]);
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hits, setHits] = useState(0);
  const [message, setMessage] = useState("Toca las notas cuando pasen por tu carril");
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const nextId = useRef(0);
  const activeBlocks = useRef<NoteBlock[]>([]);
  const pendingLanes = useRef<number[]>([]);

  const lanePalette = useMemo(() => LANES.slice(0, laneCount), [laneCount]);
  activeBlocks.current = blocks;
  pendingLanes.current = queue;

  useEffect(() => {
    if (screen !== "practice" || paused || finished) return;
    const timer = window.setInterval(() => {
      if (activeBlocks.current.length >= 2 || pendingLanes.current.length === 0) return;
      const pending = [...pendingLanes.current];
      const pick = Math.floor(Math.random() * pending.length);
      const lane = pending.splice(pick, 1)[0];
      setQueue(pending);
      const id = nextId.current++;
      const note = { id, lane, hue: id % 2 === 0 ? "#ffffff" : "#d6d2db" };
      setBlocks((current) => current.length < 2 ? [...current, note] : current);
    }, 760);
    return () => window.clearInterval(timer);
  }, [screen, paused, finished]);

  useEffect(() => {
    if (screen === "practice" && queue.length === 0 && blocks.length === 0 && !finished) {
      setFinished(true);
      setMessage("¡Sesión completada! Cada toque cuenta.");
    }
  }, [screen, queue.length, blocks.length, finished]);

  useEffect(() => () => {
    void audioRef.current?.close();
    audioRef.current = null;
  }, []);

  const startPractice = () => {
    const assignments: number[] = [];
    lanePalette.forEach((_, lane) => {
      const total = minBlocks + Math.floor(Math.random() * (maxBlocks - minBlocks + 1));
      for (let index = 0; index < total; index += 1) assignments.push(lane);
    });
    setQueue(assignments);
    setBlocks([]);
    setHits(0);
    setPaused(false);
    setFinished(false);
    setMessage("Toca las notas cuando pasen por tu carril");
    setScreen("practice");
  };

  const resetRun = () => {
    setBlocks([]);
    setFinished(false);
    setPaused(false);
    setHits(0);
    setMessage("Toca las notas cuando pasen por tu carril");
    const assignments: number[] = [];
    lanePalette.forEach((_, lane) => {
      const total = minBlocks + Math.floor(Math.random() * (maxBlocks - minBlocks + 1));
      for (let index = 0; index < total; index += 1) assignments.push(lane);
    });
    setQueue(assignments);
  };

  const playPitch = (lane: number) => {
    if (muted) return;
    try {
      const AudioContextConstructor = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextConstructor) return;
      const context = audioRef.current ?? new AudioContextConstructor();
      audioRef.current = context;
      if (context.state === "suspended") void context.resume();
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = "sine";
      oscillator.frequency.value = LANES[lane].pitch;
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.14, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.34);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.36);
    } catch {
      setMessage("El sonido no está disponible en este navegador");
    }
  };

  const hitBlock = (block: NoteBlock) => {
    setBlocks((current) => current.filter((item) => item.id !== block.id));
    setHits((current) => current + 1);
    setMessage(`${LANES[block.lane].note} · ¡bien tocado!`);
    playPitch(block.lane);
  };

  const updateMin = (value: number) => {
    const safe = Math.max(1, Math.min(12, value));
    setMinBlocks(safe);
    if (safe > maxBlocks) setMaxBlocks(safe);
  };
  const updateMax = (value: number) => {
    const safe = Math.max(1, Math.min(12, value));
    setMaxBlocks(safe);
    if (safe < minBlocks) setMinBlocks(safe);
  };

  return (
    <main className="pp-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700&family=Montserrat:wght@500;600;700&display=swap');
        .pp-root{--ink:#26332f;--muted:#78817b;--paper:#f4f3eb;--card:#fffef9;--line:#e7e5da;--mint:#dceee4;--green:#315e4c;min-height:100dvh;background:var(--paper);color:var(--ink);font-family:'Manrope',sans-serif;padding:26px clamp(18px,4vw,64px) 30px;box-sizing:border-box;display:flex;justify-content:center;align-items:center}
        .pp-root *{box-sizing:border-box}
        .pp-shell{width:min(1440px,100%);min-height:min(860px,calc(100dvh - 56px));background:var(--card);border-radius:26px;overflow:hidden;display:flex;flex-direction:column;box-shadow:0 18px 60px rgba(42,53,46,.07);position:relative}
        .pp-topbar{height:84px;display:flex;align-items:center;justify-content:space-between;padding:0 clamp(22px,4vw,56px);border-bottom:1px solid var(--line);flex-shrink:0}
        .pp-brand{display:flex;align-items:center;gap:12px;font-weight:800;letter-spacing:-.045em;font-size:19px}
        .pp-mark{width:35px;height:35px;border-radius:12px;background:#f0c962;display:grid;place-items:center;color:#354b3f;transform:rotate(-5deg)}
        .pp-top-right{display:flex;align-items:center;gap:18px}
        .pp-label{font:500 11px 'DM Mono',monospace;letter-spacing:.12em;text-transform:uppercase;color:#92978e}
        .pp-pill{display:flex;align-items:center;gap:8px;background:#eef3ec;color:#365f4d;padding:10px 14px;border-radius:99px;font:500 12px 'DM Mono',monospace}
        .pp-main{flex:1;display:flex;flex-direction:column;padding:clamp(28px,5vw,66px) clamp(22px,8vw,118px) 48px}
        .pp-kicker{font:500 11px 'DM Mono',monospace;letter-spacing:.16em;text-transform:uppercase;color:#8b948a;display:flex;align-items:center;gap:9px;margin-bottom:15px}
        .pp-kicker:before{content:'';height:1px;width:24px;background:#d3a638}
        .pp-heading{font-size:clamp(35px,5vw,60px);letter-spacing:-.065em;line-height:1.02;margin:0;max-width:690px;font-weight:700}
        .pp-heading em{font-family:Georgia,serif;font-weight:400;color:#49775e}
        .pp-subtitle{color:#7a827c;font-size:15px;line-height:1.7;margin:17px 0 0;max-width:530px}
        .pp-config-row{display:grid;grid-template-columns:1.08fr .92fr;gap:20px;margin-top:38px}
        .pp-config-card{background:#f7f7f0;border-radius:18px;padding:24px 26px 23px;min-height:164px;display:flex;flex-direction:column;justify-content:space-between}
        .pp-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:14px}
        .pp-card-title{font-size:15px;font-weight:800;letter-spacing:-.025em;margin:0}
        .pp-card-note{font-size:12px;line-height:1.5;color:#858c84;margin-top:6px}
        .pp-card-icon{color:#849184}
        .pp-stepper{display:flex;align-items:center;gap:11px;margin-top:20px}
        .pp-stepper button{height:40px;width:42px;display:grid;place-items:center;border:0;border-radius:12px;background:#fffef9;color:#355a49;cursor:pointer;box-shadow:inset 0 0 0 1px #e9e9df;transition:transform .18s,background .18s}
        .pp-stepper button:hover{background:#e6f0e8;transform:translateY(-1px)}
        .pp-step-value{font:500 18px 'DM Mono',monospace;min-width:27px;text-align:center}
        .pp-lane-dots{display:flex;gap:6px;margin-left:auto}
        .pp-lane-dot{height:8px;width:8px;border-radius:50%;transition:transform .2s}
        .pp-range{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:12px;margin-top:18px}
        .pp-range-field label{display:block;font:500 10px 'DM Mono',monospace;letter-spacing:.1em;text-transform:uppercase;color:#858c84;margin-bottom:8px}
        .pp-range-field select{width:100%;appearance:none;border:1px solid #e6e6dc;background:#fffef9;border-radius:11px;padding:11px 30px 11px 13px;font:500 13px 'DM Mono',monospace;color:#35433c;outline:none}
        .pp-select-wrap{position:relative}
        .pp-select-wrap svg{position:absolute;right:10px;top:12px;pointer-events:none;color:#7f8a81}
        .pp-range-dash{color:#a0a49a;font:500 14px 'DM Mono',monospace;padding-bottom:11px}
        .pp-bottom{display:flex;align-items:center;justify-content:space-between;gap:22px;margin-top:33px}
        .pp-preview{display:flex;align-items:center;gap:13px;color:#7e877f;font-size:12px}
        .pp-preview-bars{height:28px;display:flex;gap:4px;align-items:flex-end}
        .pp-preview-bars i{width:9px;border-radius:5px 5px 2px 2px;display:block}
        .pp-primary{height:55px;min-width:215px;border:0;border-radius:15px;background:#315e4c;color:#fffdf6;font:700 14px 'Manrope',sans-serif;letter-spacing:-.01em;display:flex;align-items:center;justify-content:center;gap:11px;cursor:pointer;box-shadow:0 8px 18px rgba(49,94,76,.17);transition:transform .18s,background .18s}
        .pp-primary:hover{background:#254d3b;transform:translateY(-2px)}
        .pp-hint{font:11px 'DM Mono',monospace;color:#a2a69e;margin-top:17px}
        .pp-practice{padding:0 clamp(18px,4vw,54px) 22px;display:flex;flex-direction:column;flex:1;min-height:0}
        .pp-practice-head{height:75px;display:flex;align-items:center;justify-content:space-between;gap:12px;flex-shrink:0}
        .pp-back{border:0;background:none;color:#637167;font:600 12px 'Manrope',sans-serif;display:flex;align-items:center;gap:8px;padding:10px 0;cursor:pointer}
        .pp-back:hover{color:#294d3d}
        .pp-session-info{display:flex;align-items:center;gap:12px}
        .pp-session-title{font-size:13px;font-weight:800;letter-spacing:-.02em}
        .pp-live-dot{height:7px;width:7px;border-radius:50%;background:#57a17b;box-shadow:0 0 0 4px #e5f2e8}
        .pp-practice-actions{display:flex;align-items:center;gap:8px}
        .pp-score{height:38px;padding:0 13px;border-radius:12px;background:#eff4ed;display:flex;align-items:center;gap:7px;color:#315e4c;font:500 12px 'DM Mono',monospace;margin-right:5px}
        .pp-icon-btn{height:40px;width:42px;border:1px solid #e8e7dd;background:#fffef9;color:#526359;border-radius:12px;display:grid;place-items:center;cursor:pointer;transition:background .18s,transform .18s}
        .pp-icon-btn:hover{background:#f0f4ed;transform:translateY(-1px)}
        .pp-icon-btn.pp-strong{background:#315e4c;border-color:#315e4c;color:#fff}
        .pp-track-wrap{flex:1;min-height:350px;position:relative;display:flex;flex-direction:column}
        .pp-tracks{height:clamp(390px,58vh,570px);display:grid;gap:10px;flex:1;position:relative;overflow:hidden}
        .pp-lane{position:relative;overflow:hidden;border-radius:14px;background:var(--lane-soft);min-width:0}
        .pp-lane-label{position:absolute;top:14px;left:12px;z-index:1;display:flex;align-items:center;gap:7px;color:color-mix(in srgb,var(--lane-color) 75%,#29382f);font:500 10px 'DM Mono',monospace;letter-spacing:.07em;text-transform:uppercase;opacity:.8}
        .pp-lane-label b{height:7px;width:7px;border-radius:50%;background:var(--lane-color)}
        .pp-note{position:absolute;z-index:2;left:50%;top:10px;transform:translateX(-50%);width:min(70%,78px);height:54px;border:0;border-radius:16px;background:var(--note-color);color:#fffdf8;display:grid;place-items:center;cursor:pointer;box-shadow:0 7px 14px color-mix(in srgb,var(--note-color) 24%,transparent);animation:pp-fall 5.5s linear forwards;animation-play-state:var(--fall-state,running);touch-action:manipulation}
        .pp-note:hover{filter:brightness(1.04)}
        .pp-note:focus-visible{outline:3px solid #294d3d;outline-offset:3px}
        .pp-note span{font:500 11px 'DM Mono',monospace;letter-spacing:.07em}
        @keyframes pp-fall{from{transform:translate(-50%,0)}to{transform:translate(-50%,calc(clamp(390px,58vh,570px) - 82px))}}
        .pp-hitline{position:absolute;left:0;right:0;bottom:0;height:53px;display:flex;align-items:center;justify-content:center;gap:9px;background:rgba(255,254,249,.9);color:#859087;font:500 10px 'DM Mono',monospace;letter-spacing:.11em;text-transform:uppercase;z-index:1}
        .pp-hitline:before{content:'';position:absolute;top:0;left:0;right:0;height:1px;background:#e5e7dc}
        .pp-hitline span{color:#b3b8ac;font-size:14px}
        .pp-feedback{height:60px;display:flex;align-items:center;justify-content:space-between;gap:14px;flex-shrink:0}
        .pp-message{display:flex;align-items:center;gap:9px;color:#627167;font-size:12px;font-weight:600}
        .pp-message-icon{height:25px;width:25px;border-radius:9px;background:#e7f1e7;color:#427653;display:grid;place-items:center}
        .pp-feedback-note{color:#a1a69d;font:10px 'DM Mono',monospace}
        .pp-overlay{position:absolute;inset:0;background:rgba(244,243,235,.72);backdrop-filter:blur(3px);display:grid;place-items:center;z-index:5}
        .pp-overlay-card{width:min(390px,calc(100% - 32px));background:#fffef9;border-radius:22px;padding:32px;text-align:center;box-shadow:0 18px 55px rgba(40,60,45,.16)}
        .pp-overlay-icon{margin:0 auto 17px;width:52px;height:52px;border-radius:17px;background:#e9f1e7;color:#315e4c;display:grid;place-items:center}
        .pp-overlay-card h2{margin:0;font-size:25px;letter-spacing:-.05em}
        .pp-overlay-card p{color:#7d867d;font-size:13px;line-height:1.6;margin:10px 0 22px}
        .pp-overlay-buttons{display:flex;justify-content:center;gap:10px;flex-wrap:wrap}
        .pp-small-btn{border:1px solid #e6e6dc;background:#fffef9;color:#526359;border-radius:12px;height:44px;padding:0 17px;font:700 12px 'Manrope',sans-serif;display:flex;align-items:center;gap:8px;cursor:pointer}
        .pp-small-btn.primary{background:#315e4c;color:white;border-color:#315e4c}
        @media(min-width:1100px){.pp-shell{aspect-ratio:16/9;min-height:0}.pp-practice{min-height:0}.pp-tracks{height:clamp(390px,57vh,560px)}}
        @media(max-width:760px){.pp-root{padding:0;align-items:stretch}.pp-shell{border-radius:0;min-height:100dvh}.pp-topbar{height:69px;padding:0 20px}.pp-brand{font-size:17px}.pp-top-right .pp-label{display:none}.pp-main{padding:36px 23px 34px}.pp-config-row{grid-template-columns:1fr;gap:12px;margin-top:27px}.pp-config-card{min-height:145px;padding:20px}.pp-bottom{align-items:stretch;flex-direction:column;margin-top:23px}.pp-primary{width:100%}.pp-hint{margin-top:11px;text-align:center}.pp-practice{padding:0 12px 14px}.pp-practice-head{height:66px}.pp-session-title{display:none}.pp-score{height:35px;font-size:11px;padding:0 10px}.pp-practice-actions{gap:5px}.pp-icon-btn{width:38px;height:38px}.pp-tracks{height:clamp(410px,62vh,590px);gap:6px}.pp-lane{border-radius:10px}.pp-lane-label{top:12px;left:7px;font-size:8px;letter-spacing:0}.pp-note{width:72%;height:48px;border-radius:13px}.pp-hitline{height:43px;font-size:8px}.pp-feedback{height:56px}.pp-feedback-note{display:none}@keyframes pp-fall{from{transform:translate(-50%,0)}to{transform:translate(-50%,calc(clamp(410px,62vh,590px) - 76px))}}}
        @media(prefers-reduced-motion:reduce){.pp-note{animation-duration:10s}.pp-stepper button,.pp-primary,.pp-icon-btn{transition:none}}
        .pp-root{--ink:#ffffff;--ink-80:#d6d2db;--ink-60:#a8a2b0;--accent:#8834dc;--accent-light:#b57ae9;--accent-deep:#5f1fa3;--accent-muted:#2a1738;--background:#171418;--surface:#211c24;--border:#4a454f;background:var(--background);color:var(--ink);font-family:'Archivo',Arial,sans-serif}
        .pp-root *{box-sizing:border-box;box-shadow:none!important;font-family:'Archivo',Arial,sans-serif!important}
        .pp-root h1,.pp-root h2,.pp-root h3,.pp-root h4,.pp-root .pp-brand,.pp-root .pp-card-title,.pp-root .pp-session-title{font-family:'Montserrat',Arial,sans-serif!important}
        .pp-shell{width:min(1440px,100%);background:var(--surface);border:1px solid var(--border);border-radius:12px;box-shadow:none;aspect-ratio:16/9}
        .pp-topbar{border-bottom:1px solid var(--border)}
        .pp-brand{color:var(--ink);font-size:20px;font-weight:700;letter-spacing:-.02em}
        .pp-mark{background:var(--accent);color:var(--ink);transform:none;border-radius:12px}
        .pp-label{color:var(--ink-60);font-size:14px;letter-spacing:.06em}
        .pp-pill{background:var(--accent-muted);color:var(--ink);font-size:14px;font-family:'Archivo',Arial,sans-serif}
        .pp-live-dot{background:var(--accent-light);box-shadow:none}
        .pp-kicker{color:var(--accent-light);font:600 14px 'Archivo',Arial,sans-serif;letter-spacing:.08em}
        .pp-kicker:before{background:var(--accent)}
        .pp-heading{color:var(--ink);font-family:'Montserrat',Arial,sans-serif!important;letter-spacing:-.03em}
        .pp-heading em{color:var(--accent-light);font-family:'Montserrat',Arial,sans-serif!important}
        .pp-subtitle{color:var(--ink-80);font:400 16px/1.6 'Archivo',Arial,sans-serif}
        .pp-config-card{background:var(--surface);border:1px solid var(--border);border-radius:12px}
        .pp-card-title{color:var(--ink);font-size:20px;font-weight:700;letter-spacing:-.01em}
        .pp-card-note{color:var(--ink-80);font-size:14px;line-height:1.5}
        .pp-card-icon{color:var(--accent-light)}
        .pp-stepper button{height:44px;width:44px;border:1px solid var(--border);border-radius:12px;background:var(--background);color:var(--ink);transition:none}
        .pp-stepper button:hover{background:var(--accent-muted);border-color:var(--accent-light);transform:none}
        .pp-stepper button:disabled{color:var(--ink-60);cursor:not-allowed}
        .pp-step-value{color:var(--ink);font:600 18px 'Archivo',Arial,sans-serif}
        .pp-lane-dot{background:var(--accent-light)}
        .pp-range-field label{color:var(--ink-80);font:600 14px 'Archivo',Arial,sans-serif;letter-spacing:0;text-transform:none}
        .pp-range-field select{min-height:46px;border:1px solid var(--border);border-radius:12px;background:var(--background);color:var(--ink);font:400 16px 'Archivo',Arial,sans-serif}
        .pp-range-field select:focus-visible,.pp-root button:focus-visible{outline:2px solid var(--accent-light);outline-offset:3px}
        .pp-select-wrap svg{color:var(--ink-80)}
        .pp-range-dash{color:var(--ink-80);font:400 16px 'Archivo',Arial,sans-serif}
        .pp-bottom{margin-top:28px}
        .pp-preview{color:var(--ink-80);font-size:14px}
        .pp-preview-bars i{border-radius:2px 2px 0 0}
        .pp-primary{min-height:55px;border:1px solid var(--accent);border-radius:12px;background:var(--accent);color:var(--ink);font:600 16px 'Archivo',Arial,sans-serif;box-shadow:none;transition:none}
        .pp-primary:hover{border-color:var(--accent);background:var(--accent);color:var(--ink);opacity:.85;transform:none}
        .pp-primary:active,.pp-small-btn.primary:active{border-color:var(--accent-deep);background:var(--accent-deep)}
        .pp-hint{color:var(--ink-60);font:400 14px 'Archivo',Arial,sans-serif}
        .pp-back{min-height:44px;padding:8px 14px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--accent-light);font:600 16px 'Archivo',Arial,sans-serif}
        .pp-back:hover{border-color:var(--accent);background:var(--accent-muted);color:var(--ink)}
        .pp-session-title{color:var(--ink);font-size:20px;font-weight:700}
        .pp-score{height:44px;border:1px solid var(--border);border-radius:12px;background:var(--accent-muted);color:var(--ink);font:400 16px 'Archivo',Arial,sans-serif}
        .pp-icon-btn{height:44px;width:44px;border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);transition:none}
        .pp-icon-btn:hover{border-color:var(--accent-light);background:var(--accent-muted);transform:none}
        .pp-icon-btn.pp-strong{border-color:var(--accent);background:var(--accent);color:var(--ink)}
        .pp-tracks{background:var(--accent);gap:10px}
        .pp-lane{border:0;border-radius:0;background:var(--lane-soft)}
        .pp-lane-label{display:none}
        .pp-note{left:0;top:0;transform:translateY(0);width:100%;height:54px;border:0;border-radius:0;background:var(--note-color);color:var(--accent-muted);box-shadow:none;animation:pp-fall 5.5s linear forwards;animation-play-state:var(--fall-state,running)}
        .pp-note:hover{filter:none;outline:2px solid var(--ink);outline-offset:-2px}
        .pp-note:focus-visible{outline:2px solid var(--ink);outline-offset:-2px}
        .pp-hitline{height:46px;border-top:1px solid var(--border);background:var(--surface);color:var(--ink-80);font:600 14px 'Archivo',Arial,sans-serif;letter-spacing:0;text-transform:none}
        .pp-hitline:before{display:none}
        .pp-feedback{color:var(--ink-80)}
        .pp-message{color:var(--ink-80);font:500 14px 'Archivo',Arial,sans-serif}
        .pp-message-icon{background:var(--accent-muted);color:var(--accent-light)}
        .pp-feedback-note{color:var(--ink-60);font:400 14px 'Archivo',Arial,sans-serif}
        .pp-overlay{background:var(--background);backdrop-filter:none}
        .pp-overlay-card{border:1px solid var(--border);border-radius:12px;background:var(--surface);color:var(--ink);box-shadow:none}
        .pp-overlay-card h2{color:var(--ink);font:700 24px 'Montserrat',Arial,sans-serif!important}
        .pp-overlay-card p{color:var(--ink-80);font:400 16px/1.6 'Archivo',Arial,sans-serif}
        .pp-overlay-icon{border-radius:12px;background:var(--accent-muted);color:var(--accent-light)}
        .pp-small-btn{min-height:44px;border:1px solid var(--border);border-radius:12px;background:var(--background);color:var(--ink);font:600 16px 'Archivo',Arial,sans-serif}
        .pp-small-btn.primary{border-color:var(--accent);background:var(--accent);color:var(--ink)}
        .pp-root button:disabled{opacity:.35;cursor:not-allowed}
        .pp-main{padding:36px clamp(22px,8vw,118px) 20px}
        .pp-config-row{margin-top:24px}
        .pp-config-card{min-height:152px;padding:20px 22px}
        .pp-stepper{margin-top:12px}
        .pp-range{margin-top:10px}
        .pp-bottom{margin-top:18px}
        .pp-hint{margin-top:10px}
        @keyframes pp-fall{from{transform:translateY(0)}to{transform:translateY(calc(clamp(390px,58vh,570px) - 54px))}}
        @media(min-width:1100px){.pp-shell{width:min(1440px,calc((100dvh - 52px) * 1.7778),100%);min-height:0;aspect-ratio:16/9}.pp-tracks{height:clamp(390px,58vh,570px)}}
        @media(max-width:760px){.pp-root{padding:0;align-items:stretch}.pp-shell{width:100%;height:100dvh;min-height:100dvh;aspect-ratio:auto;border-radius:0}.pp-brand{font-size:20px}.pp-main{padding:30px 20px 24px}.pp-config-row{grid-template-columns:1fr;gap:12px;margin-top:24px}.pp-config-card{min-height:145px;padding:20px}.pp-bottom{align-items:stretch;flex-direction:column;margin-top:22px}.pp-primary{width:100%}.pp-practice{padding:0 12px 14px}.pp-practice-head{height:66px}.pp-session-title{display:none}.pp-score{height:44px;font-size:14px;padding:0 10px}.pp-practice-actions{gap:5px}.pp-icon-btn{width:44px;height:44px}.pp-tracks{height:clamp(390px,62vh,590px);gap:6px}.pp-note{width:100%;height:48px}.pp-hitline{height:44px;font-size:14px}.pp-feedback{height:56px}.pp-feedback-note{display:none}@keyframes pp-fall{from{transform:translateY(0)}to{transform:translateY(calc(clamp(390px,62vh,590px) - 48px))}}}
      `}</style>
      <section className="pp-shell">
        <header className="pp-topbar">
          <div className="pp-brand"><span className="pp-mark"><Music2 size={19} strokeWidth={2.4} /></span><span>Kinusic</span></div>
          <div className="pp-top-right">
            <span className="pp-label">Tu espacio de práctica</span>
            <span className="pp-pill"><span className="pp-live-dot" />Sin instrumento, con ritmo</span>
          </div>
        </header>

        {screen === "setup" ? (
          <div className="pp-main">
            <div className="pp-kicker">Un pequeño rato para ti</div>
            <h1 className="pp-heading">Encuentra tu <em>ritmo.</em><br />Una nota a la vez.</h1>
            <p className="pp-subtitle">Sigue los bloques con un toque. No necesitas instrumento: solo curiosidad y ganas de probar.</p>

            <div className="pp-config-row">
              <section className="pp-config-card" aria-label="Cantidad de carriles">
                <div className="pp-card-head"><div><h2 className="pp-card-title">¿Cuántos carriles?</h2><div className="pp-card-note">Cada carril tiene su propio tono.</div></div><Music2 className="pp-card-icon" size={21} /></div>
                <div className="pp-stepper">
                  <button aria-label="Quitar un carril" onClick={() => setLaneCount((count) => Math.max(2, count - 1))} disabled={laneCount <= 2}><Minus size={17} /></button>
                  <span className="pp-step-value">{laneCount}</span>
                  <button aria-label="Añadir un carril" onClick={() => setLaneCount((count) => Math.min(6, count + 1))} disabled={laneCount >= 6}><ChevronUp size={17} /></button>
                  <div className="pp-lane-dots" aria-hidden="true">{lanePalette.map((lane) => <i key={lane.name} className="pp-lane-dot" style={{ background: lane.color }} />)}</div>
                </div>
              </section>
              <section className="pp-config-card" aria-label="Cantidad de bloques">
                <div className="pp-card-head"><div><h2 className="pp-card-title">Bloques por carril</h2><div className="pp-card-note">La cantidad cambia en cada práctica.</div></div><span className="pp-card-icon"><Music2 size={20} /></span></div>
                <div className="pp-range">
                  <div className="pp-range-field"><label htmlFor="pp-min">Mínimo</label><div className="pp-select-wrap"><select id="pp-min" value={minBlocks} onChange={(event) => updateMin(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} bloques</option>)}</select><ChevronDown size={14} /></div></div>
                  <span className="pp-range-dash">a</span>
                  <div className="pp-range-field"><label htmlFor="pp-max">Máximo</label><div className="pp-select-wrap"><select id="pp-max" value={maxBlocks} onChange={(event) => updateMax(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} bloques</option>)}</select><ChevronDown size={14} /></div></div>
                </div>
              </section>
            </div>

            <div className="pp-bottom">
              <div className="pp-preview"><div className="pp-preview-bars">{lanePalette.map((lane, index) => <i key={lane.name} style={{ height: `${14 + (index % 3) * 6}px`, background: lane.color }} />)}</div><span>{laneCount} tonos · ritmo a tu manera</span></div>
              <button className="pp-primary" onClick={startPractice}>Empezar a practicar <Play size={17} fill="currentColor" /></button>
            </div>
            <div className="pp-hint">Puedes pausar o volver a empezar cuando quieras.</div>
          </div>
        ) : (
          <div className="pp-practice">
            <div className="pp-practice-head">
              <button className="pp-back" onClick={() => { setScreen("setup"); setBlocks([]); setQueue([]); setFinished(false); }}><ArrowLeft size={16} /> Ajustes</button>
              <div className="pp-session-info"><span className="pp-live-dot" /><span className="pp-session-title">{paused ? "Práctica en pausa" : finished ? "Práctica terminada" : "Sigue el ritmo"}</span></div>
              <div className="pp-practice-actions">
                <div className="pp-score"><Check size={14} /> {hits} <span>toques</span></div>
                <button className="pp-icon-btn" aria-label={muted ? "Activar sonido" : "Silenciar"} title={muted ? "Activar sonido" : "Silenciar"} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                <button className="pp-icon-btn pp-strong" aria-label={paused ? "Reanudar práctica" : "Pausar práctica"} title={paused ? "Reanudar" : "Pausar"} onClick={() => setPaused((value) => !value)} disabled={finished}>{paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>
                <button className="pp-icon-btn" aria-label="Reiniciar práctica" title="Reiniciar" onClick={resetRun}><RotateCcw size={17} /></button>
              </div>
            </div>
            <div className="pp-track-wrap">
              <div className="pp-tracks" style={{ gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))` }}>
                {lanePalette.map((lane, index) => (
                  <div className="pp-lane" key={lane.name} style={{ "--lane-color": lane.color, "--lane-soft": lane.soft } as React.CSSProperties}>
                    {blocks.filter((block) => block.lane === index).map((block) => <button key={block.id} className="pp-note" style={{ "--note-color": block.hue, "--fall-state": paused ? "paused" : "running" } as React.CSSProperties} onClick={() => hitBlock(block)} onAnimationEnd={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} aria-label={`Tocar nota ${lane.note}, carril ${lane.name}`} />)}
                  </div>
                ))}
                <div className="pp-hitline">Toca cualquier bloque mientras cae</div>
              </div>
              {paused && <div className="pp-overlay"><div className="pp-overlay-card"><div className="pp-overlay-icon"><Pause size={22} /></div><h2>Tómate tu tiempo.</h2><p>Todo se queda justo donde lo dejaste. Vuelve cuando quieras.</p><div className="pp-overlay-buttons"><button className="pp-small-btn primary" onClick={() => setPaused(false)}><Play size={15} fill="currentColor" /> Continuar</button><button className="pp-small-btn" onClick={resetRun}><RotateCcw size={15} /> Empezar de nuevo</button></div></div></div>}
              {finished && <div className="pp-overlay"><div className="pp-overlay-card"><div className="pp-overlay-icon"><Check size={24} /></div><h2>¡Lo hiciste!</h2><p>Completaste la práctica con {hits} {hits === 1 ? "toque" : "toques"}. El ritmo ya es tuyo.</p><div className="pp-overlay-buttons"><button className="pp-small-btn primary" onClick={resetRun}><RotateCcw size={15} /> Otra vuelta</button><button className="pp-small-btn" onClick={() => { setScreen("setup"); setFinished(false); }}><ArrowLeft size={15} /> Ajustar</button></div></div></div>}
            </div>
            <div className="pp-feedback"><div className="pp-message"><span className="pp-message-icon"><Check size={14} /></span>{message}</div><span className="pp-feedback-note">{Math.max(0, queue.length)} notas por aparecer</span></div>
          </div>
        )}
      </section>
    </main>
  );
}
