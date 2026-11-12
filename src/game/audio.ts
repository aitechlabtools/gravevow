// Audio sintetizado con WebAudio: sin archivos externos. Placeholder hasta tener SFX y música definitivos.
let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let musicGain: GainNode | null = null;
let musicNodes: AudioNode[] = [];
let sfxBus: GainNode | null = null;
let musicBus: GainNode | null = null;
let volume = 0.6;
let musicVolume = 1;
let sfxVolume = 1;

function ac(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  if (!ctx) {
    const Ctor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx = new Ctor();
    master = ctx.createGain();
    master.gain.value = volume;
    master.connect(ctx.destination);
    // Dos buses bajo el general: efectos y música, cada uno con su volumen (Ajustes › Sonido)
    sfxBus = ctx.createGain(); sfxBus.gain.value = sfxVolume; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = musicVolume; musicBus.connect(master);
  }
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function setVolume(v: number) {
  volume = v;
  if (master) master.gain.value = v;
}

/** Aplica los tres volúmenes de Ajustes (0..1). Los que no vengan se quedan como están. */
export function setAudio(o: { volume?: number; musicVolume?: number; sfxVolume?: number }) {
  if (o.volume !== undefined) setVolume(o.volume);
  if (o.musicVolume !== undefined) { musicVolume = o.musicVolume; if (musicBus) musicBus.gain.value = musicVolume; }
  if (o.sfxVolume !== undefined) { sfxVolume = o.sfxVolume; if (sfxBus) sfxBus.gain.value = sfxVolume; }
}

function noiseBuffer(c: AudioContext, dur: number) {
  const b = c.createBuffer(1, Math.floor(c.sampleRate * dur), c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return b;
}

function tone(freq: number, dur: number, type: OscillatorType, gain: number, slideTo?: number, delay = 0) {
  const c = ac();
  if (!c || !sfxBus) return;
  const t = c.currentTime + delay;
  const o = c.createOscillator();
  const g = c.createGain();
  o.type = type;
  o.frequency.setValueAtTime(freq, t);
  if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t + dur);
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(sfxBus);
  o.start(t);
  o.stop(t + dur + 0.02);
}

function noise(dur: number, gain: number, filterFreq: number, delay = 0, type: BiquadFilterType = 'lowpass') {
  const c = ac();
  if (!c || !sfxBus) return;
  const t = c.currentTime + delay;
  const s = c.createBufferSource();
  s.buffer = noiseBuffer(c, dur);
  const f = c.createBiquadFilter();
  f.type = type;
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t);
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  s.connect(f).connect(g).connect(sfxBus);
  s.start(t);
}

export type Sfx = 'step' | 'hit' | 'crit' | 'miss' | 'magic' | 'fire' | 'frost' | 'heal' | 'chest' | 'pickup' | 'coin' | 'victory' | 'defeat' | 'door' | 'trap' | 'portal' | 'click' | 'error' | 'betray' | 'equip';

export function sfx(name: Sfx) {
  switch (name) {
    case 'step': noise(0.05, 0.05, 600); break;
    case 'hit': noise(0.12, 0.35, 1400); tone(140, 0.12, 'square', 0.12, 60); break;
    case 'crit': noise(0.18, 0.45, 2400); tone(220, 0.2, 'sawtooth', 0.15, 50); break;
    case 'miss': noise(0.15, 0.12, 3000, 0, 'highpass'); break;
    case 'magic': tone(520, 0.3, 'triangle', 0.15, 1040); tone(780, 0.3, 'sine', 0.08, 300, 0.05); break;
    case 'fire': noise(0.4, 0.35, 900); tone(200, 0.35, 'sawtooth', 0.08, 90); break;
    case 'frost': tone(1200, 0.3, 'sine', 0.12, 1800); tone(1600, 0.25, 'triangle', 0.06, 2400, 0.06); break;
    case 'heal': [523, 659, 784].forEach((f, i) => tone(f, 0.25, 'sine', 0.1, undefined, i * 0.07)); break;
    case 'chest': tone(180, 0.15, 'square', 0.08, 120); [784, 988, 1175].forEach((f, i) => tone(f, 0.2, 'triangle', 0.08, undefined, 0.12 + i * 0.06)); break;
    case 'pickup': tone(880, 0.08, 'square', 0.06, 1320); break;
    case 'coin': tone(1320, 0.07, 'square', 0.05); tone(1760, 0.12, 'square', 0.05, undefined, 0.06); break;
    case 'victory': [392, 523, 659, 784].forEach((f, i) => tone(f, 0.35, 'triangle', 0.12, undefined, i * 0.12)); break;
    case 'defeat': [392, 330, 262, 196].forEach((f, i) => tone(f, 0.5, 'sawtooth', 0.08, undefined, i * 0.2)); break;
    case 'door': noise(0.4, 0.2, 300); tone(90, 0.4, 'sawtooth', 0.05, 70); break;
    case 'trap': noise(0.1, 0.4, 4000, 0, 'highpass'); tone(300, 0.1, 'square', 0.1, 100); break;
    case 'portal': tone(110, 1.2, 'sine', 0.2, 440); tone(220, 1.2, 'triangle', 0.08, 880, 0.1); break;
    case 'click': tone(660, 0.04, 'square', 0.04); break;
    case 'error': tone(160, 0.12, 'square', 0.08, 120); break;
    case 'betray': tone(98, 0.8, 'sawtooth', 0.15, 49); noise(0.6, 0.2, 500); break;
    case 'equip': noise(0.08, 0.15, 2500); tone(440, 0.06, 'square', 0.04); break;
  }
}

/** Música ambiental: drones graves con un filtro que respira. */
export function startMusic(mood: 'lobby' | 'dungeon') {
  stopMusic();
  const c = ac();
  if (!c || !master) return;
  musicGain = c.createGain();
  musicGain.gain.value = 0;
  musicGain.gain.linearRampToValueAtTime(mood === 'dungeon' ? 0.16 : 0.12, c.currentTime + 3);
  musicGain.connect(musicBus!);
  const filt = c.createBiquadFilter();
  filt.type = 'lowpass';
  filt.frequency.value = 500;
  filt.connect(musicGain);
  const lfo = c.createOscillator();
  const lfoGain = c.createGain();
  lfo.frequency.value = 0.07;
  lfoGain.gain.value = 300;
  lfo.connect(lfoGain).connect(filt.frequency);
  lfo.start();
  const notes = mood === 'dungeon' ? [55, 82.4, 103.8] : [65.4, 98, 130.8];
  const oscs = notes.map((f, i) => {
    const o = c.createOscillator();
    o.type = i === 0 ? 'sawtooth' : 'triangle';
    o.frequency.value = f;
    o.detune.value = (i - 1) * 6;
    const g = c.createGain();
    g.gain.value = i === 0 ? 0.5 : 0.3;
    o.connect(g).connect(filt);
    o.start();
    return o;
  });
  musicNodes = [lfo, ...oscs];
}

export function stopMusic() {
  const c = ctx;
  if (c && musicGain) {
    const g = musicGain;
    g.gain.cancelScheduledValues(c.currentTime);
    g.gain.setValueAtTime(g.gain.value, c.currentTime);
    g.gain.linearRampToValueAtTime(0, c.currentTime + 0.6);
    const nodes = musicNodes;
    setTimeout(() => nodes.forEach((n) => { try { (n as OscillatorNode).stop(); } catch { /* ya parado */ } }), 700);
  }
  musicNodes = [];
  musicGain = null;
}
