/**
 * Tiny synthesized sound effects (no audio files). The AudioContext is made
 * on first use, which is always right after a key press or tap, so browsers
 * allow it. Quiet by design; failures are ignored.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    if (!ctx) ctx = new AudioContext();
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function noise(a: AudioContext, seconds: number): AudioBuffer {
  const buf = a.createBuffer(1, Math.floor(a.sampleRate * seconds), a.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

/** A low cannon boom. */
export function boom(): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const src = a.createBufferSource();
  src.buffer = noise(a, 1.2);
  const lp = a.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.setValueAtTime(900, t);
  lp.frequency.exponentialRampToValueAtTime(80, t + 1);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.35, t + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.1);
  src.connect(lp).connect(g).connect(a.destination);
  src.start(t);
  const thump = a.createOscillator();
  thump.frequency.setValueAtTime(90, t);
  thump.frequency.exponentialRampToValueAtTime(35, t + 0.4);
  const tg = a.createGain();
  tg.gain.setValueAtTime(0.3, t);
  tg.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
  thump.connect(tg).connect(a.destination);
  thump.start(t);
  thump.stop(t + 0.5);
}

/** A splash: filtered noise with a quick swell. */
export function splash(delay = 0): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime + delay;
  const src = a.createBufferSource();
  src.buffer = noise(a, 0.7);
  const bp = a.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.setValueAtTime(1800, t);
  bp.frequency.exponentialRampToValueAtTime(500, t + 0.6);
  const g = a.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.18, t + 0.05);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.65);
  src.connect(bp).connect(g).connect(a.destination);
  src.start(t);
}

/** Two glasses clinking. */
export function clink(): void {
  const a = audio();
  if (!a) return;
  for (const [delay, freq] of [[0, 2400], [0.09, 3100]] as const) {
    const t = a.currentTime + delay;
    const o = a.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(freq, t);
    const g = a.createGain();
    g.gain.setValueAtTime(0.08, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35);
    o.connect(g).connect(a.destination);
    o.start(t);
    o.stop(t + 0.4);
  }
}

/** A soft click (light switch, chest latch, dagger thunk). */
export function click(freq = 900): void {
  const a = audio();
  if (!a) return;
  const t = a.currentTime;
  const o = a.createOscillator();
  o.type = "square";
  o.frequency.setValueAtTime(freq, t);
  o.frequency.exponentialRampToValueAtTime(freq / 3, t + 0.06);
  const g = a.createGain();
  g.gain.setValueAtTime(0.06, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
  o.connect(g).connect(a.destination);
  o.start(t);
  o.stop(t + 0.1);
}
