import { useEffect, useRef, useState, type CSSProperties } from "react";
import { ArrowLeft, Check, ChevronDown, Minus, Music2, Pause, Play, RotateCcw, SlidersHorizontal, Volume2, VolumeX, Zap } from "lucide-react";
import "./practice-pulse.css";

type FallingNote = { id: number; lane: number };

const COLORS = ["#b57ae9", "#b57ae9", "#b57ae9", "#b57ae9", "#b57ae9", "#b57ae9"];
const NAMES = ["Do", "Re", "Mi", "Fa", "Sol", "La"];
const FREQUENCIES = [261.63, 293.66, 329.63, 349.23, 392, 440];

function makeNotePlan(laneCount: number, minNotes: number, maxNotes: number) {
  const plan: number[] = [];
  for (let lane = 0; lane < laneCount; lane += 1) {
    const count = minNotes + Math.floor(Math.random() * (maxNotes - minNotes + 1));
    for (let index = 0; index < count; index += 1) plan.push(lane);
  }
  for (let index = plan.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [plan[index], plan[swap]] = [plan[swap], plan[index]];
  }
  return plan;
}

export function PracticePulse() {
  const [screen, setScreen] = useState<"setup" | "practice">("practice");
  const [laneCount, setLaneCount] = useState(4);
  const [minNotes, setMinNotes] = useState(3);
  const [maxNotes, setMaxNotes] = useState(6);
  const [queue, setQueue] = useState<number[]>(() => makeNotePlan(4, 3, 6).slice(2));
  const [notes, setNotes] = useState<FallingNote[]>(() => makeNotePlan(4, 3, 6).slice(0, 2).map((lane, id) => ({ id, lane })));
  const [paused, setPaused] = useState(false);
  const [muted, setMuted] = useState(false);
  const [hits, setHits] = useState(0);
  const [message, setMessage] = useState("Toca una nota al cruzar el pulso");
  const [finished, setFinished] = useState(false);
  const audioRef = useRef<AudioContext | null>(null);
  const nextId = useRef(2);
  const notesRef = useRef<FallingNote[]>([]);
  const queueRef = useRef<number[]>([]);

  notesRef.current = notes;
  queueRef.current = queue;

  useEffect(() => {
    if (screen !== "practice" || paused || finished) return;
    const timer = window.setInterval(() => {
      if (notesRef.current.length >= 2 || queueRef.current.length === 0) return;
      const nextQueue = [...queueRef.current];
      const lane = nextQueue.shift();
      if (lane === undefined) return;
      queueRef.current = nextQueue;
      setQueue(nextQueue);
      const note = { id: nextId.current++, lane };
      setNotes((current) => current.length < 2 ? [...current, note] : current);
    }, 1050);
    return () => window.clearInterval(timer);
  }, [screen, paused, finished]);

  useEffect(() => {
    if (screen === "practice" && queue.length === 0 && notes.length === 0 && !finished) {
      setFinished(true);
      setMessage("Sesión completada. Buen pulso.");
    }
  }, [screen, queue.length, notes.length, finished]);

  useEffect(() => () => {
    void audioRef.current?.close();
    audioRef.current = null;
  }, []);

  const createPlan = () => {
    return makeNotePlan(laneCount, minNotes, maxNotes);
  };

  const startPractice = () => {
    const plan = createPlan();
    const initial = plan.splice(0, 2).map((lane) => ({ id: nextId.current++, lane }));
    setQueue(plan);
    setNotes(initial);
    setHits(0);
    setPaused(false);
    setFinished(false);
    setMessage("Toca una nota al cruzar el pulso");
    setScreen("practice");
  };

  const resetPractice = () => startPractice();

  const playNote = (lane: number) => {
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
      oscillator.frequency.value = FREQUENCIES[lane];
      gain.gain.setValueAtTime(0.0001, context.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.12, context.currentTime + 0.015);
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + 0.32);
      oscillator.connect(gain);
      gain.connect(context.destination);
      oscillator.start();
      oscillator.stop(context.currentTime + 0.34);
    } catch {
      setMessage("El sonido no está disponible en este navegador");
    }
  };

  const tapNote = (note: FallingNote) => {
    setNotes((current) => current.filter((item) => item.id !== note.id));
    setHits((current) => current + 1);
    setMessage(`${NAMES[note.lane]} · clavado en el pulso`);
    playNote(note.lane);
  };

  const updateMin = (value: number) => {
    const safe = Math.max(1, Math.min(12, value));
    setMinNotes(safe);
    if (safe > maxNotes) setMaxNotes(safe);
  };

  const updateMax = (value: number) => {
    const safe = Math.max(1, Math.min(12, value));
    setMaxNotes(safe);
    if (safe < minNotes) setMinNotes(safe);
  };

  const closePractice = () => {
    setScreen("setup");
  };

  return (
    <main className="kinpulse">
      <section className="kp-shell">
        <header className="kp-header">
          <div className="kp-brand">
            <span className="kp-brand-mark"><Music2 size={19} strokeWidth={2.4} /></span>
            <span>Kinusic</span>
            <span className="kp-brand-divider" />
            <span className="kp-brand-caption">RITMO EN MOVIMIENTO</span>
          </div>
          <div className="kp-header-side">
            <span className="kp-session-status"><i />{screen === "practice" ? "Sesión activa" : "Tu espacio de práctica"}</span>
            <button className="kp-settings-button" onClick={() => screen === "practice" ? closePractice() : setScreen("practice")}>
              {screen === "practice" ? <SlidersHorizontal size={16} /> : <ArrowLeft size={16} />}
              {screen === "practice" ? "Ajustes" : "Volver a la sesión"}
            </button>
          </div>
        </header>

        {screen === "setup" ? (
          <section className="kp-setup">
            <div className="kp-setup-copy">
              <div className="kp-eyebrow"><span className="kp-eyebrow-line" /> PRÁCTICA A TU MEDIDA</div>
              <h1>Tu ritmo,<br /><em>una nota a la vez.</em></h1>
              <p>Sigue la caída, espera el pulso y toca. Sin instrumento: solo un momento para escuchar.</p>
              <div className="kp-setup-wave" aria-hidden="true">
                {Array.from({ length: 17 }, (_, index) => <i key={index} style={{ "--bar-height": `${11 + ((index * 17 + 9) % 32)}px`, "--bar-delay": `${index * 48}ms` } as CSSProperties} />)}
                <span>UN PULSO. TU SIGUIENTE NOTA.</span>
              </div>
            </div>
            <div className="kp-setup-controls">
              <section className="kp-config-card">
                <div className="kp-card-heading"><div><span className="kp-card-index">01 / TONOS</span><h2>¿Cuántos carriles?</h2></div><Music2 size={20} /></div>
                <p>Cada columna tiene su propia nota.</p>
                <div className="kp-stepper">
                  <button aria-label="Quitar un carril" onClick={() => setLaneCount((count) => Math.max(2, count - 1))} disabled={laneCount <= 2}><Minus size={16} /></button>
                  <strong>{laneCount}</strong>
                  <button aria-label="Añadir un carril" onClick={() => setLaneCount((count) => Math.min(6, count + 1))} disabled={laneCount >= 6}><span>+</span></button>
                  <div className="kp-color-dots">{COLORS.slice(0, laneCount).map((color, index) => <i key={index} style={{ background: color }} />)}</div>
                </div>
              </section>
              <section className="kp-config-card kp-note-range">
                <div className="kp-card-heading"><div><span className="kp-card-index">02 / DURACIÓN</span><h2>Notas por carril</h2></div><Zap size={19} /></div>
                <p>Elige cuánto quieres practicar.</p>
                <div className="kp-range-fields">
                  <label>Mínimo <span className="kp-select"><select value={minNotes} onChange={(event) => updateMin(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select><ChevronDown size={14} /></span></label>
                  <span className="kp-range-to">a</span>
                  <label>Máximo <span className="kp-select"><select value={maxNotes} onChange={(event) => updateMax(Number(event.target.value))}>{Array.from({ length: 12 }, (_, index) => index + 1).map((count) => <option key={count} value={count}>{count}</option>)}</select><ChevronDown size={14} /></span></label>
                </div>
              </section>
              <button className="kp-start" onClick={startPractice}>Empezar a practicar <Play size={16} fill="currentColor" /></button>
              <div className="kp-setup-footnote"><span /> Puedes pausar o volver a empezar cuando quieras.</div>
            </div>
          </section>
        ) : (
          <section className="kp-practice">
            <div className="kp-practice-heading">
              <div>
                <span className="kp-eyebrow"><span className="kp-eyebrow-line" /> ESCUCHA · ESPERA · TOCA</span>
                <h1>Sigue el <em>pulso.</em></h1>
              </div>
              <div className="kp-tools">
                <div className="kp-score"><span className="kp-score-icon"><Check size={14} /></span><strong>{hits}</strong><span>toques</span></div>
                <button className="kp-icon-button" aria-label={muted ? "Activar sonido" : "Silenciar"} title={muted ? "Activar sonido" : "Silenciar"} onClick={() => setMuted((value) => !value)}>{muted ? <VolumeX size={18} /> : <Volume2 size={18} />}</button>
                <button className="kp-icon-button kp-play-button" aria-label={paused ? "Reanudar práctica" : "Pausar práctica"} title={paused ? "Reanudar" : "Pausar"} onClick={() => setPaused((value) => !value)} disabled={finished}>{paused ? <Play size={17} fill="currentColor" /> : <Pause size={17} fill="currentColor" />}</button>
                <button className="kp-icon-button" aria-label="Reiniciar práctica" title="Reiniciar" onClick={resetPractice}><RotateCcw size={17} /></button>
              </div>
            </div>

            <div className="kp-rhythm-strip">
              <div className="kp-bpm"><span className="kp-bpm-orbit"><i /><i /><i /></span><span><strong>84</strong><small>BPM</small></span></div>
              <div className="kp-rhythm-copy"><strong>{paused ? "El ritmo espera" : finished ? "Una sesión redonda" : "Siente el siguiente tiempo"}</strong><span>Un destello marca dónde encontrarte con la nota.</span></div>
              <div className="kp-beat-meter" aria-label="Pulso visual activo">{Array.from({ length: 9 }, (_, index) => <i key={index} style={{ "--beat-height": `${9 + ((index * 13 + 11) % 18)}px`, "--beat-delay": `${index * 90}ms` } as CSSProperties} />)}</div>
            </div>

            <div className="kp-track-stage">
              <div className="kp-track-grid" style={{ gridTemplateColumns: `repeat(${laneCount}, minmax(0, 1fr))` }}>
                {Array.from({ length: laneCount }, (_, lane) => (
                  <div className="kp-lane" key={lane} style={{ "--lane-tint": "#b57ae9" } as CSSProperties}>
                    <span className="kp-lane-label"><i />{String(lane + 1).padStart(2, "0")} <b>{NAMES[lane]}</b></span>
                    <div className="kp-beat-lines" aria-hidden="true">{[20, 40, 60, 80].map((position) => <i key={position} style={{ top: `${position}%` }} />)}</div>
                    {notes.filter((note) => note.lane === lane).map((note) => (
                      <button
                        key={note.id}
                        className="kp-falling-note"
                        style={{ "--note-tint": note.id % 2 === 0 ? "#ffffff" : "#d6d2db", "--fall-state": paused ? "paused" : "running" } as CSSProperties}
                        onClick={() => tapNote(note)}
                        onAnimationEnd={() => setNotes((current) => current.filter((item) => item.id !== note.id))}
                        aria-label={`Tocar nota ${NAMES[lane]}, carril ${lane + 1}`}
                      ><span>{NAMES[lane]}</span><i /></button>
                    ))}
                  </div>
                ))}
                <div className="kp-target-line">
                  <span className="kp-target-pulse" />
                  <span className="kp-target-label"><i /> TOCA EN EL PULSO <i /></span>
                </div>
              </div>
              {paused && <div className="kp-overlay"><div className="kp-overlay-card"><span className="kp-overlay-symbol"><Pause size={22} /></span><h2>El ritmo puede esperar.</h2><p>Todo se quedó donde lo dejaste. Vuelve cuando quieras.</p><div><button className="kp-start kp-overlay-primary" onClick={() => setPaused(false)}><Play size={15} fill="currentColor" /> Continuar</button><button className="kp-secondary" onClick={resetPractice}><RotateCcw size={15} /> Otra vuelta</button></div></div></div>}
              {finished && <div className="kp-overlay"><div className="kp-overlay-card"><span className="kp-overlay-symbol"><Check size={22} /></span><h2>¡Buen pulso!</h2><p>Terminaste con {hits} {hits === 1 ? "toque" : "toques"}. El ritmo ya es tuyo.</p><div><button className="kp-start kp-overlay-primary" onClick={resetPractice}><RotateCcw size={15} /> Otra vuelta</button><button className="kp-secondary" onClick={closePractice}><ArrowLeft size={15} /> Ajustes</button></div></div></div>}
            </div>
            <footer className="kp-feedback">
              <span className="kp-feedback-message"><i><Check size={13} /></i>{message}</span>
              <span className="kp-remaining">{queue.length} {queue.length === 1 ? "nota" : "notas"} en camino <b>·</b> {laneCount} carriles</span>
            </footer>
          </section>
        )}
      </section>
    </main>
  );
}
