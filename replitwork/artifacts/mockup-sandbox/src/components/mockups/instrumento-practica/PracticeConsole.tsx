import { useEffect, useMemo, useRef, useState } from "react";
import type { CSSProperties } from "react";
import {
  ArrowLeft, Check, ChevronDown, ChevronUp, Headphones, Minus, Music2,
  Pause, Play, RotateCcw, Volume2, VolumeX,
} from "lucide-react";

type NoteBlock = { id: number; lane: number; hue: string };
type Lane = { name: string; note: string; pitch: number };

const LANES: Lane[] = [
  { name: "01", note: "Do", pitch: 261.63 },
  { name: "02", note: "Re", pitch: 293.66 },
  { name: "03", note: "Mi", pitch: 329.63 },
  { name: "04", note: "Fa", pitch: 349.23 },
  { name: "05", note: "Sol", pitch: 392 },
  { name: "06", note: "La", pitch: 440 },
];

export function PracticeConsole() {
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
      const lane = pending.splice(Math.floor(Math.random() * pending.length), 1)[0];
      setQueue(pending);
      const id = nextId.current++;
      setBlocks((current) => current.length < 2
        ? [...current, { id, lane, hue: Math.random() < 0.5 ? "#8834dc" : "#b57ae9" }]
        : current);
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

  const makeQueue = () => {
    const assignments = lanePalette.flatMap((_, lane) => {
    const amount = minBlocks + Math.floor(Math.random() * (maxBlocks - minBlocks + 1));
    return Array.from({ length: amount }, () => lane);
    });
    for (let index = assignments.length - 1; index > 0; index -= 1) {
      const swap = Math.floor(Math.random() * (index + 1));
      [assignments[index], assignments[swap]] = [assignments[swap], assignments[index]];
    }
    return assignments;
  };

  const startPractice = () => {
    setQueue(makeQueue());
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
    setQueue(makeQueue());
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
    <main className="pc-root">
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Archivo:wght@400;500;600;700;800&family=Montserrat:wght@500;600;700;800&display=swap');
        .pc-root{--pc-white:#ffffff;--pc-light:#d6d2db;--pc-muted:#a8a2b0;--pc-purple:#8834dc;--pc-lilac:#b57ae9;--pc-deep:#5f1fa3;--pc-plum:#2a1738;--pc-bg:#171418;--pc-surface:#211c24;--pc-line:#4a454f;min-height:100dvh;width:100%;padding:18px;background:var(--pc-bg);color:var(--pc-white);display:grid;place-items:center;font-family:'Archivo',sans-serif}
        .pc-root *{box-sizing:border-box}
        .pc-root button{font-family:'Archivo',sans-serif;min-height:44px}
        .pc-frame{width:min(1460px,calc(100vw - 36px),calc((100dvh - 36px) * 1.7778));height:auto;aspect-ratio:16/9;min-height:0;display:grid;grid-template-columns:286px minmax(0,1fr);background:var(--pc-bg);border:1px solid var(--pc-line);border-radius:17px;overflow:hidden}
        .pc-rail{background:var(--pc-bg);border-right:1px solid var(--pc-line);padding:27px 24px 22px;display:flex;flex-direction:column;position:relative;overflow:hidden}
        .pc-brand{display:flex;align-items:center;gap:11px;font-size:20px;font-weight:800;letter-spacing:-.06em}
        .pc-brand-mark{height:37px;width:37px;border-radius:11px;background:var(--pc-purple);color:var(--pc-white);display:grid;place-items:center}
        .pc-rail-rule{height:1px;background:var(--pc-line);margin:28px 0 27px}
        .pc-rail-label,.pc-eyebrow{color:var(--pc-muted);font:500 10px 'Archivo',sans-serif;letter-spacing:.13em;text-transform:uppercase}
        .pc-rail-title{font-family:'Montserrat',sans-serif;font-size:27px;line-height:1.15;letter-spacing:-.055em;margin:12px 0 10px;font-weight:700}
        .pc-rail-title em{color:var(--pc-lilac);font-style:normal}
        .pc-rail-copy{font-size:14px;line-height:1.65;color:var(--pc-light);margin:0;max-width:220px}
        .pc-rail-spacer{flex:1;min-height:24px}
        .pc-aside-art{height:142px;position:relative;display:flex;align-items:flex-end;gap:7px;padding:0 10px 15px;overflow:hidden}
        .pc-aside-art:before{content:'';position:absolute;width:190px;height:190px;border:1px solid var(--pc-line);border-radius:50%;left:36px;top:5px}
        .pc-aside-art:after{content:'';position:absolute;width:133px;height:133px;border:1px solid var(--pc-line);border-radius:50%;left:65px;top:34px}
        .pc-art-note{height:40px;width:17px;border-radius:7px 7px 2px 2px;position:relative;z-index:1;background:var(--pc-lilac)}
        .pc-art-note:nth-child(2){height:60px;background:var(--pc-purple)}.pc-art-note:nth-child(3){height:47px}.pc-art-note:nth-child(4){height:80px;background:var(--pc-deep)}.pc-art-note:nth-child(5){height:52px}.pc-art-note:nth-child(6){height:68px;background:var(--pc-purple)}
        .pc-rail-foot{border-top:1px solid var(--pc-line);padding-top:17px;display:flex;gap:10px;align-items:center;color:var(--pc-light);font-size:14px;line-height:1.5}
        .pc-headphones{height:44px;width:44px;display:grid;place-items:center;background:var(--pc-plum);color:var(--pc-lilac);border-radius:9px;flex:none}
        .pc-main{min-width:0;padding:25px 33px 24px;display:flex;flex-direction:column;position:relative}
        .pc-topline{height:44px;display:flex;justify-content:space-between;align-items:center;flex:none}
        .pc-crumb{display:flex;align-items:center;gap:9px;color:var(--pc-muted);font:500 10px 'Archivo',sans-serif;letter-spacing:.09em;text-transform:uppercase}
        .pc-crumb i{display:block;width:5px;height:5px;background:var(--pc-lilac);border-radius:50%}
        .pc-status{display:flex;align-items:center;gap:8px;color:var(--pc-light);font-size:14px}
        .pc-status-dot{width:7px;height:7px;border-radius:50%;background:var(--pc-lilac)}
        .pc-setup{flex:1;min-height:0;display:flex;flex-direction:column;padding-top:22px}
        .pc-setup-title{font-family:'Montserrat',sans-serif;font-size:clamp(28px,3.3vw,42px);font-weight:700;letter-spacing:-.065em;line-height:1.05;margin:0}
        .pc-setup-sub{color:var(--pc-light);font-size:14px;line-height:1.55;margin:10px 0 0}
        .pc-settings{display:grid;grid-template-columns:.95fr 1.05fr;gap:13px;margin-top:22px}
        .pc-card{background:var(--pc-surface);border:1px solid var(--pc-line);border-radius:13px;padding:17px 20px;min-height:151px;display:flex;flex-direction:column;justify-content:space-between}
        .pc-card-head{display:flex;justify-content:space-between;align-items:flex-start;gap:10px}
        .pc-card-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;letter-spacing:-.035em;line-height:1.15;margin:0}
        .pc-card-hint{font-size:14px;line-height:1.35;color:var(--pc-light);margin-top:5px}
        .pc-card-symbol{color:var(--pc-lilac)}
        .pc-stepper{display:flex;align-items:center;gap:12px;margin-top:12px}
        .pc-stepper button{width:44px;height:44px;border:1px solid var(--pc-line);border-radius:9px;background:var(--pc-bg);color:var(--pc-white);display:grid;place-items:center;cursor:pointer;transition:transform .18s,background .18s}
        .pc-stepper button:hover:not(:disabled){background:var(--pc-plum);transform:translateY(-1px)}
        .pc-stepper button:disabled{opacity:.35;cursor:not-allowed}
        .pc-step-value{font:600 20px 'Archivo',sans-serif;min-width:24px;text-align:center}
        .pc-dots{display:flex;gap:5px;margin-left:auto}
        .pc-dots i{width:7px;height:7px;border-radius:50%;background:var(--pc-lilac)}
        .pc-range{display:grid;grid-template-columns:1fr auto 1fr;align-items:end;gap:10px;margin-top:14px}
        .pc-range label{font:500 14px 'Archivo',sans-serif;color:var(--pc-light);letter-spacing:.04em;text-transform:uppercase;display:block;margin-bottom:6px}
        .pc-select{position:relative}
        .pc-select select{appearance:none;width:100%;height:44px;background:var(--pc-bg);border:1px solid var(--pc-line);border-radius:8px;color:var(--pc-white);padding:0 27px 0 10px;font:500 14px 'Archivo',sans-serif;outline:none}
        .pc-select select:focus-visible,.pc-root button:focus-visible{outline:2px solid var(--pc-lilac);outline-offset:2px}
        .pc-select svg{position:absolute;right:8px;top:15px;pointer-events:none;color:var(--pc-light)}
        .pc-range-dash{font-size:14px;color:var(--pc-muted);padding-bottom:14px}
        .pc-preview{position:relative;margin-top:14px;flex:1;min-height:100px;border:1px solid var(--pc-line);background:var(--pc-surface);border-radius:13px;overflow:hidden;display:flex;align-items:stretch}
        .pc-preview-copy{width:205px;flex:none;padding:17px 0 15px 19px;display:flex;flex-direction:column;justify-content:space-between}
        .pc-preview-copy strong{font:700 20px/1.15 'Montserrat',sans-serif;letter-spacing:-.035em}
        .pc-preview-copy span{font:14px 'Archivo',sans-serif;color:var(--pc-light)}
        .pc-preview-lanes{display:flex;gap:6px;align-items:stretch;flex:1;padding:13px 15px 13px 4px}
        .pc-preview-lane{position:relative;flex:1;min-width:12px;background:var(--pc-plum);border-radius:3px;overflow:hidden}
        .pc-preview-note{height:7px;width:100%;left:0!important;position:absolute;border-radius:1px;background:var(--pc-lilac)}
        .pc-preview-note:nth-child(1){top:17%}.pc-preview-note:nth-child(2){top:49%;background:var(--pc-purple)}.pc-preview-note:nth-child(3){top:73%}
        .pc-start-row{display:flex;justify-content:space-between;align-items:center;gap:16px;margin-top:13px}
        .pc-summary{font:500 14px 'Archivo',sans-serif;color:var(--pc-light)}
        .pc-primary{border:0;border-radius:9px;min-height:46px;padding:0 19px;background:var(--pc-purple);color:var(--pc-white);font:700 14px 'Archivo',sans-serif;display:flex;align-items:center;justify-content:center;gap:10px;cursor:pointer;transition:transform .18s,background .18s}
        .pc-primary:hover{background:var(--pc-deep);transform:translateY(-1px)}
        .pc-practice{flex:1;min-height:0;display:flex;flex-direction:column;padding-top:18px}
        .pc-practice-top{display:flex;align-items:center;justify-content:space-between;gap:14px;margin-bottom:12px}
        .pc-back{border:1px solid var(--pc-line);background:var(--pc-surface);color:var(--pc-light);border-radius:8px;height:44px;padding:0 11px;display:flex;align-items:center;gap:7px;font:600 14px 'Archivo',sans-serif;cursor:pointer}
        .pc-practice-title{font-family:'Montserrat',sans-serif;font-size:20px;font-weight:700;letter-spacing:-.04em;margin:0}
        .pc-actions{display:flex;gap:7px;align-items:center}
        .pc-score{height:44px;padding:0 11px;border:1px solid var(--pc-line);border-radius:8px;color:var(--pc-light);background:var(--pc-surface);display:flex;align-items:center;gap:6px;font:500 14px 'Archivo',sans-serif}
        .pc-score svg{color:var(--pc-lilac)}
        .pc-action{width:44px;height:44px;border:1px solid var(--pc-line);border-radius:8px;background:var(--pc-surface);color:var(--pc-white);display:grid;place-items:center;cursor:pointer}
        .pc-action:hover{border-color:var(--pc-lilac);background:var(--pc-plum)}
        .pc-action.primary{color:var(--pc-white);background:var(--pc-purple);border-color:var(--pc-purple)}
        .pc-action:disabled{opacity:.35;cursor:not-allowed}
        .pc-stage{position:relative;flex:1;min-height:270px;border-radius:12px;background:var(--pc-surface);overflow:hidden;padding:11px 12px 43px}
        .pc-tracks{height:100%;display:grid;gap:8px;position:relative;overflow:hidden}
        .pc-lane{position:relative;border-radius:3px;background:var(--pc-plum);overflow:hidden;min-width:0}
        .pc-lane-meta{position:absolute;z-index:2;top:9px;left:8px;color:var(--pc-light);font:500 9px 'Archivo',sans-serif}
        .pc-note{position:absolute;z-index:3;left:0;width:100%;height:44px;min-height:44px;top:0;border:0;border-radius:2px;background:var(--note-color);cursor:pointer;animation:pc-fall 5.5s linear forwards;animation-play-state:var(--fall-state,running);touch-action:manipulation}
        .pc-note:focus-visible{outline:2px solid var(--pc-white);outline-offset:-2px}
        .pc-hitline{position:absolute;z-index:1;left:12px;right:12px;bottom:0;height:44px;background:var(--pc-surface);display:flex;align-items:center;justify-content:center;color:var(--pc-light);font-size:14px}
        .pc-hitline:before{content:'';width:6px;height:6px;border-radius:50%;background:var(--pc-lilac);margin-right:9px}
        .pc-feedback{height:44px;display:flex;justify-content:space-between;align-items:center;gap:12px;color:var(--pc-light);font-size:14px}
        .pc-message{display:flex;align-items:center;gap:8px}
        .pc-message i{width:24px;height:24px;border-radius:7px;background:var(--pc-plum);color:var(--pc-lilac);display:grid;place-items:center}
        .pc-remaining{color:var(--pc-muted);font:10px 'Archivo',sans-serif}
        .pc-overlay{position:absolute;inset:0;background:var(--pc-bg);display:grid;place-items:center;z-index:5}
        .pc-dialog{width:min(365px,calc(100% - 28px));padding:27px;text-align:center;border:1px solid var(--pc-line);border-radius:13px;background:var(--pc-surface)}
        .pc-dialog-mark{height:44px;width:44px;margin:0 auto 13px;border-radius:12px;background:var(--pc-plum);color:var(--pc-lilac);display:grid;place-items:center}
        .pc-dialog h2{font-family:'Montserrat',sans-serif;font-size:22px;letter-spacing:-.05em;margin:0}
        .pc-dialog p{font-size:14px;line-height:1.55;color:var(--pc-light);margin:8px 0 18px}
        .pc-dialog-buttons{display:flex;justify-content:center;flex-wrap:wrap;gap:8px}
        .pc-dialog-buttons button{min-height:44px;padding:0 13px;border-radius:8px;border:1px solid var(--pc-line);background:var(--pc-bg);color:var(--pc-white);display:flex;align-items:center;gap:7px;font:600 14px 'Archivo',sans-serif;cursor:pointer}
        .pc-dialog-buttons button.primary{background:var(--pc-purple);color:var(--pc-white);border-color:var(--pc-purple)}
        @keyframes pc-fall{from{transform:translateY(0)}to{transform:translateY(calc(100dvh - 250px))}}
        @media(max-width:780px){
          .pc-root{padding:0;display:block}.pc-frame{height:auto;min-height:100dvh;width:100%;aspect-ratio:auto;grid-template-columns:1fr;border:0;border-radius:0}
          .pc-rail{min-height:0;padding:17px 19px 14px;border-right:0;border-bottom:1px solid var(--pc-line);display:grid;grid-template-columns:1fr auto;align-items:center}
          .pc-brand{font-size:17px}.pc-brand-mark{height:32px;width:32px}.pc-rail-rule,.pc-rail-label,.pc-rail-copy,.pc-rail-spacer,.pc-aside-art,.pc-rail-foot,.pc-rail-title{display:none}
          .pc-rail{grid-template-columns:1fr}
          .pc-main{padding:18px 18px 22px;min-height:calc(100dvh - 64px)}.pc-topline{height:44px}
          .pc-setup{padding-top:22px}.pc-setup-title{font-size:32px}.pc-settings{grid-template-columns:1fr;gap:10px;margin-top:22px}
          .pc-card{min-height:130px;padding:16px}.pc-preview{min-height:95px;margin-top:12px}.pc-preview-copy{width:135px;padding-left:13px}.pc-preview-lanes{padding:11px 10px 11px 2px;gap:4px}
          .pc-start-row{align-items:stretch;flex-direction:column;margin-top:13px}.pc-primary{width:100%}
          .pc-practice{padding-top:14px}.pc-practice-top{align-items:flex-start;flex-wrap:wrap}.pc-practice-title{display:none}.pc-actions{margin-left:auto;gap:5px}.pc-score{height:44px}
          .pc-stage{height:clamp(390px,62vh,600px);flex:none;padding:8px 8px 44px}.pc-tracks{gap:5px}.pc-lane{border-radius:3px}.pc-lane-meta{left:4px;top:7px;font-size:10px}.pc-note{height:44px;min-height:44px}
          .pc-hitline{left:8px;right:8px;height:44px;font-size:12px}.pc-feedback{height:44px}.pc-remaining{display:none}
        }
        @media(prefers-reduced-motion:reduce){.pc-note{animation-duration:10s}.pc-primary,.pc-stepper button{transition:none}}
      `}</style>
      <section className="pc-frame">
        <aside className="pc-rail">
          <div className="pc-brand"><span className="pc-brand-mark"><Music2 size={18} strokeWidth={2.5} /></span>Kinusic</div>
          <div className="pc-rail-rule" />
          <div className="pc-rail-label">{screen === "setup" ? "Tu espacio de práctica" : "Sesión en curso"}</div>
          <h1 className="pc-rail-title">Encuentra tu <em>ritmo.</em><br />Una nota a la vez.</h1>
          <p className="pc-rail-copy">Sigue los bloques con un toque. No necesitas instrumento: solo curiosidad y ganas de probar.</p>
          <div className="pc-rail-spacer" />
          <div className="pc-aside-art" aria-hidden="true">
            {lanePalette.map((lane) => <i key={lane.name} className="pc-art-note" />)}
          </div>
          <div className="pc-rail-foot"><span className="pc-headphones"><Headphones size={16} /></span><span>Sin instrumento,<br />con ritmo.</span></div>
        </aside>

        <section className="pc-main">
          <header className="pc-topline">
            <div className="pc-crumb"><i /> Kinusic <span>/</span> Práctica</div>
            <div className="pc-status"><span className="pc-status-dot" />{screen === "setup" ? "Todo listo para empezar" : paused ? "En pausa" : finished ? "Sesión completada" : "Escuchando el ritmo"}</div>
          </header>

          {screen === "setup" ? (
            <div className="pc-setup">
              <div className="pc-eyebrow">Un pequeño rato para ti</div>
              <h2 className="pc-setup-title">Prepara tu sesión</h2>
              <p className="pc-setup-sub">Elige cómo quieres jugar. Puedes pausar o volver a empezar cuando quieras.</p>

              <div className="pc-settings">
                <section className="pc-card" aria-label="Cantidad de carriles">
                  <div className="pc-card-head">
                    <div><h3 className="pc-card-title">¿Cuántos carriles?</h3><div className="pc-card-hint">Cada carril tiene su propio tono.</div></div>
                    <Music2 className="pc-card-symbol" size={19} />
                  </div>
                  <div className="pc-stepper">
                    <button aria-label="Quitar un carril" onClick={() => setLaneCount((count) => Math.max(2, count - 1))} disabled={laneCount <= 2}><Minus size={16} /></button>
                    <span className="pc-step-value">{laneCount}</span>
                    <button aria-label="Añadir un carril" onClick={() => setLaneCount((count) => Math.min(6, count + 1))} disabled={laneCount >= 6}><ChevronUp size={17} /></button>
                    <div className="pc-dots" aria-hidden="true">{lanePalette.map((lane) => <i key={lane.name} />)}</div>
                  </div>
                </section>

                <section className="pc-card" aria-label="Cantidad de bloques">
                  <div className="pc-card-head">
                    <div><h3 className="pc-card-title">Bloques por carril</h3><div className="pc-card-hint">La cantidad cambia en cada práctica.</div></div>
                    <Music2 className="pc-card-symbol" size={19} />
                  </div>
                  <div className="pc-range">
                    <div><label htmlFor="pc-min">Mínimo</label><div className="pc-select"><select id="pc-min" value={minBlocks} onChange={(event) => updateMin(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} bloques</option>)}</select><ChevronDown size={14} /></div></div>
                    <span className="pc-range-dash">a</span>
                    <div><label htmlFor="pc-max">Máximo</label><div className="pc-select"><select id="pc-max" value={maxBlocks} onChange={(event) => updateMax(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count} bloques</option>)}</select><ChevronDown size={14} /></div></div>
                  </div>
                </section>
              </div>

              <div className="pc-preview">
                <div className="pc-preview-copy"><strong>Así se verá tu ritmo</strong><span>{laneCount} tonos · ritmo a tu manera</span></div>
                <div className="pc-preview-lanes" aria-hidden="true">
                  {lanePalette.map((lane, index) => <div key={lane.name} className="pc-preview-lane">
                    {[0, 1, 2].map((noti) => <i key={noti} className="pc-preview-note" style={{ left: `${18 + ((index + noti) % 3) * 16}%` }} />)}
                  </div>)}
                </div>
              </div>
              <div className="pc-start-row">
                <span className="pc-summary">Un tono por carril. Toca cada bloque al pasar.</span>
                <button className="pc-primary" onClick={startPractice}>Empezar a practicar <Play size={15} fill="currentColor" /></button>
              </div>
            </div>
          ) : (
            <div className="pc-practice">
              <div className="pc-practice-top">
                <button className="pc-back" onClick={() => { setScreen("setup"); setBlocks([]); setQueue([]); setFinished(false); }}><ArrowLeft size={15} /> Ajustes</button>
                <h2 className="pc-practice-title">{paused ? "Práctica en pausa" : finished ? "Práctica terminada" : "Sigue el ritmo"}</h2>
                <div className="pc-actions">
                  <div className="pc-score"><Check size={13} /> {hits} <span>toques</span></div>
                  <button className="pc-action" aria-label={muted ? "Activar sonido" : "Silenciar"} title={muted ? "Activar sonido" : "Silenciar"} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={17} /> : <Volume2 size={17} />}</button>
                  <button className="pc-action primary" aria-label={paused ? "Reanudar práctica" : "Pausar práctica"} title={paused ? "Reanudar" : "Pausar"} onClick={() => setPaused((value) => !value)} disabled={finished}>{paused ? <Play size={15} fill="currentColor" /> : <Pause size={15} fill="currentColor" />}</button>
                  <button className="pc-action" aria-label="Reiniciar práctica" title="Reiniciar" onClick={resetRun}><RotateCcw size={15} /></button>
                </div>
              </div>
              <div className="pc-stage">
                <div className="pc-tracks" style={{ gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))` }}>
                  {lanePalette.map((lane, index) => (
                    <div className="pc-lane" key={lane.name}>
                      <span className="pc-lane-meta">{lane.name} · {lane.note}</span>
                      {blocks.filter((block) => block.lane === index).map((block) => <button key={block.id} className="pc-note" style={{ "--fall-state": paused ? "paused" : "running", "--note-color": block.hue } as CSSProperties} onClick={() => hitBlock(block)} onAnimationEnd={() => setBlocks((current) => current.filter((item) => item.id !== block.id))} aria-label={`Tocar nota ${lane.note}, carril ${lane.name}`} />)}
                    </div>
                  ))}
                </div>
                <div className="pc-hitline">Toca cualquier bloque mientras cae</div>
                {paused && <div className="pc-overlay"><div className="pc-dialog"><div className="pc-dialog-mark"><Pause size={19} /></div><h2>Tómate tu tiempo.</h2><p>Todo se queda justo donde lo dejaste. Vuelve cuando quieras.</p><div className="pc-dialog-buttons"><button className="primary" onClick={() => setPaused(false)}><Play size={14} fill="currentColor" /> Continuar</button><button onClick={resetRun}><RotateCcw size={14} /> Empezar de nuevo</button></div></div></div>}
                {finished && <div className="pc-overlay"><div className="pc-dialog"><div className="pc-dialog-mark"><Check size={21} /></div><h2>¡Lo hiciste!</h2><p>Completaste la práctica con {hits} {hits === 1 ? "toque" : "toques"}. El ritmo ya es tuyo.</p><div className="pc-dialog-buttons"><button className="primary" onClick={resetRun}><RotateCcw size={14} /> Otra vuelta</button><button onClick={() => { setScreen("setup"); setFinished(false); }}><ArrowLeft size={14} /> Ajustar</button></div></div></div>}
              </div>
              <div className="pc-feedback"><div className="pc-message"><i><Check size={13} /></i>{message}</div><span className="pc-remaining">{Math.max(0, queue.length)} notas por aparecer</span></div>
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
