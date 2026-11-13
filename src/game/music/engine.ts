// Motor de música generativa (13/11). Cada pista se toca por frases: el orden de las frases, las capas y los
// adornos cambian al azar (con reglas), así que nunca suena igual dos veces. Entre bloques de frases hay pausas
// en las que solo suena el ambiente de la subzona. Cambios de pista con fundido cruzado.
import { DEFAULT_VARIATION, MUSIC_CFG, TRACKS, type AmbientId, type FanfareId, type SubzoneVariation, type TrackDef, type TrackId } from '../../config/music';
import { noise, playNote } from './instruments';

export interface Graph { c: AudioContext; music: GainNode; ambient: GainNode }

const rnd = (a: number, b: number) => a + Math.random() * (b - a);
const pick = <T,>(xs: T[]) => xs[Math.floor(Math.random() * xs.length)];

/** Reverberación generada (ruido que se apaga): sin archivos. */
function makeReverb(c: AudioContext, secs = 2.8) {
  const len = Math.floor(c.sampleRate * secs);
  const b = c.createBuffer(2, len, c.sampleRate);
  for (let ch = 0; ch < 2; ch++) { const d = b.getChannelData(ch); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 2.6); }
  const cv = c.createConvolver(); cv.buffer = b;
  return cv;
}

/** Una pista sonando: programa frases por adelantado y se puede apagar con fundido. */
class Deck {
  readonly out: GainNode;
  private filter: BiquadFilterNode;
  private send: GainNode;
  private timer: number | null = null;
  private next = 0;
  private phrasesLeft = 0;
  private lastPattern: Record<number, number> = {};
  phrase = 0;
  status = 'parada';
  constructor(private g: Graph, bus: AudioNode, reverb: AudioNode | null, readonly id: TrackId, private def: TrackDef,
    private v: SubzoneVariation, public intensity: number, private tempoMul: number, private light: boolean) {
    const c = g.c;
    this.out = c.createGain(); this.out.gain.value = 0.0001;
    this.filter = c.createBiquadFilter(); this.filter.type = 'lowpass'; this.filter.frequency.value = Math.min(7000, def.cutoff * v.cutoff);
    this.filter.connect(this.out); this.out.connect(bus);
    this.send = c.createGain(); this.send.gain.value = light ? 0 : def.reverb;
    if (reverb) { this.filter.connect(this.send); this.send.connect(reverb); }
  }
  start(fade: number) {
    const c = this.g.c;
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), c.currentTime);
    this.out.gain.linearRampToValueAtTime(1, c.currentTime + fade);
    this.next = c.currentTime + 0.15;
    this.newBlock();
    this.timer = window.setInterval(() => this.tick(), 250);
    this.tick();
  }
  stop(fade: number) {
    const c = this.g.c;
    if (this.timer !== null) clearInterval(this.timer);
    this.timer = null;
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), c.currentTime);
    this.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
    const out = this.out, send = this.send;
    setTimeout(() => { try { out.disconnect(); send.disconnect(); } catch { /* ya libre */ } }, (fade + 6) * 1000);
  }
  setIntensity(x: number) { this.intensity = x; }
  private newBlock() {
    const r = this.def.phrasesBeforePause;
    this.phrasesLeft = r ? Math.round(rnd(r[0], r[1])) : Infinity;
  }
  private tick() {
    const c = this.g.c;
    // Programa la siguiente frase cuando falta poco para que acabe la actual
    while (this.next - c.currentTime < 1.2) {
      if (this.phrasesLeft <= 0) {
        const pause = rnd(MUSIC_CFG.pause[0], MUSIC_CFG.pause[1]);
        this.status = `pausa de ${Math.round(pause)} s (solo ambiente)`;
        this.next += pause;
        this.newBlock();
        continue;
      }
      this.next = this.playPhrase(this.next);
      this.phrasesLeft--;
    }
  }
  private playPhrase(t0: number): number {
    const c = this.g.c, d = this.def, v = this.v;
    const bpm = d.bpm * v.tempo * this.tempoMul * (1 + rnd(-MUSIC_CFG.tempoJitter, MUSIC_CFG.tempoJitter));
    const beat = 60 / bpm;
    const root = d.root * Math.pow(2, v.transpose / 12);
    const freq = (deg: number, oct: number) => {
      const n = d.scale.length;
      const o = oct + Math.floor(deg / n);
      let semi = d.scale[((deg % n) + n) % n] + 12 * o;
      if (v.dissonance && Math.random() < v.dissonance) semi += pick([-1, 1]);
      return root * Math.pow(2, semi / 12);
    };
    let layers = d.layers.filter((l) => (l.from ?? 0) <= this.intensity && Math.random() < (l.chance ?? 1));
    if (this.light) layers = layers.slice(0, MUSIC_CFG.light.maxLayers);
    if (!layers.length) layers = [d.layers[0]];
    layers.forEach((l) => {
      const li = d.layers.indexOf(l);
      // No repite el mismo patrón dos frases seguidas si hay más de uno
      let k = Math.floor(Math.random() * l.patterns.length);
      if (l.patterns.length > 1 && k === this.lastPattern[li]) k = (k + 1) % l.patterns.length;
      this.lastPattern[li] = k;
      for (const [deg, oct, at, len] of l.patterns[k]) {
        const t = t0 + at * beat;
        const f = deg === null ? null : freq(deg, oct);
        playNote(c, this.filter, l.voice, f, t, len * beat, l.gain);
        if (deg !== null && l.grace && Math.random() < l.grace) playNote(c, this.filter, l.voice, freq(deg + 1, oct), t - beat / 4, beat / 4, l.gain * 0.5);
      }
    });
    this.phrase++;
    this.status = `frase ${this.phrase} · capas: ${layers.map((l) => l.voice).join(', ')}`;
    return t0 + d.beats * beat;
  }
}

/** Pista hecha con un archivo (OGG; MP3 si el navegador no lo entiende, como Safari). Carga diferida y caché. */
const fileCache = new Map<string, Promise<AudioBuffer | null>>();
class FileDeck {
  readonly out: GainNode;
  private src: AudioBufferSourceNode | null = null;
  private stopped = false;
  status = 'cargando archivo';
  intensity = 1;
  constructor(private g: Graph, bus: AudioNode, readonly id: TrackId, private file: { ogg: string; mp3: string; loop?: boolean }) {
    this.out = g.c.createGain(); this.out.gain.value = 0.0001; this.out.connect(bus);
  }
  start(fade: number) {
    const c = this.g.c;
    const url = new Audio().canPlayType('audio/ogg; codecs="vorbis"') ? this.file.ogg : this.file.mp3;
    if (!fileCache.has(url)) fileCache.set(url, fetch(url).then((r) => r.arrayBuffer()).then((b) => c.decodeAudioData(b)).catch(() => null));
    void fileCache.get(url)!.then((buf) => {
      if (!buf || this.stopped) { this.status = buf ? 'parada' : 'no se pudo cargar'; return; }
      const s = c.createBufferSource(); s.buffer = buf; s.loop = this.file.loop !== false; s.connect(this.out); s.start();
      this.src = s; this.status = 'archivo';
      this.out.gain.linearRampToValueAtTime(1, c.currentTime + fade);
    });
  }
  stop(fade: number) {
    const c = this.g.c; this.stopped = true;
    this.out.gain.cancelScheduledValues(c.currentTime); this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), c.currentTime);
    this.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
    const s = this.src; setTimeout(() => { try { s?.stop(); this.out.disconnect(); } catch { /* */ } }, (fade + 0.3) * 1000);
  }
  setIntensity() { /* un archivo no cambia de capas */ }
}

/** Ambiente de la subzona: un fondo continuo y sucesos sueltos (gotas, chispas, cadenas…). */
class Ambient {
  readonly out: GainNode;
  private loops: AudioScheduledSourceNode[] = [];
  private timer: number | null = null;
  constructor(private g: Graph, readonly ids: AmbientId[]) {
    this.out = g.c.createGain(); this.out.gain.value = 0.0001; this.out.connect(g.ambient);
  }
  start(fade: number) {
    const c = this.g.c;
    this.out.gain.linearRampToValueAtTime(MUSIC_CFG.mix.ambient, c.currentTime + fade);
    for (const id of this.ids) this.bed(id);
    this.timer = window.setInterval(() => { for (const id of this.ids) this.event(id); }, 500);
  }
  stop(fade: number) {
    const c = this.g.c;
    if (this.timer !== null) clearInterval(this.timer);
    this.out.gain.cancelScheduledValues(c.currentTime);
    this.out.gain.setValueAtTime(Math.max(0.0001, this.out.gain.value), c.currentTime);
    this.out.gain.linearRampToValueAtTime(0.0001, c.currentTime + fade);
    const loops = this.loops, out = this.out;
    setTimeout(() => { loops.forEach((n) => { try { n.stop(); } catch { /* */ } }); try { out.disconnect(); } catch { /* */ } }, (fade + 0.5) * 1000);
  }
  /** Fondo continuo: ruido filtrado que respira. */
  private bed(id: AmbientId) {
    const c = this.g.c;
    const cfg: Partial<Record<AmbientId, [number, number, number]>> = { viento: [500, 0.35, 0.08], vientoCaliente: [320, 0.4, 0.06], lava: [140, 0.5, 0.15], eco: [700, 0.12, 0.05], agua: [900, 0.12, 0.1], refugio: [260, 0.12, 0.05], retumbos: [90, 0.35, 0.05], hoguera: [400, 0.1, 0.1], antorchas: [380, 0.08, 0.1] };
    const b = cfg[id]; if (!b) return;
    const n = c.createBufferSource(); n.buffer = noise(c); n.loop = true;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = b[0]; f.Q.value = 1.2;
    const g = c.createGain(); g.gain.value = b[1];
    const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = b[2]; lg.gain.value = b[0] * 0.5;
    lfo.connect(lg).connect(f.frequency);
    n.connect(f).connect(g).connect(this.out); n.start(); lfo.start();
    this.loops.push(n, lfo);
  }
  /** Sucesos sueltos, con probabilidad cada medio segundo. */
  private event(id: AmbientId) {
    const c = this.g.c, t = c.currentTime + Math.random() * 0.4;
    const ping = (f: number, dur: number, gain: number, type: OscillatorType = 'sine', slide?: number) => {
      const o = c.createOscillator(); const g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(slide, t + dur);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g).connect(this.out); o.start(t); o.stop(t + dur + 0.05);
    };
    const crack = (f: number, dur: number, gain: number, q = 2) => {
      const n = c.createBufferSource(); n.buffer = noise(c); const fl = c.createBiquadFilter(); fl.type = 'bandpass'; fl.frequency.value = f; fl.Q.value = q;
      const g = c.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.003); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      n.connect(fl).connect(g).connect(this.out); n.start(t, Math.random()); n.stop(t + dur + 0.05);
    };
    const p = Math.random();
    switch (id) {
      case 'goteo': if (p < 0.12) ping(rnd(900, 1500), 0.18, 0.12, 'sine', rnd(500, 700)); break;
      case 'agua': if (p < 0.08) ping(rnd(400, 700), 0.3, 0.08, 'sine', 300); break;
      case 'hoguera': case 'antorchas': if (p < 0.35) crack(rnd(1500, 3500), 0.04, id === 'hoguera' ? 0.18 : 0.1, 4); break;
      case 'cadenas': if (p < 0.05) for (let i = 0; i < 4; i++) setTimeout(() => crack(rnd(2200, 3200), 0.08, 0.1, 8), i * rnd(80, 160)); break;
      case 'huesos': if (p < 0.05) crack(rnd(600, 1200), 0.07, 0.14, 3); break;
      case 'eco': if (p < 0.02) ping(rnd(180, 260), 4, 0.06, 'sine'); break;
      case 'latido': if (p < 0.1) { ping(55, 0.3, 0.3, 'sine', 40); setTimeout(() => ping(50, 0.3, 0.22, 'sine', 38), 280); } break;
      case 'lava': if (p < 0.2) ping(rnd(60, 110), 0.25, 0.18, 'sine', rnd(150, 260)); break;
      case 'retumbos': if (p < 0.03) crack(60, 2.5, 0.4, 0.8); break;
      case 'viento': case 'vientoCaliente': case 'refugio': break;
    }
  }
}

/** Fanfarrias cortas. */
const FANFARES: Record<FanfareId, { voice: Parameters<typeof playNote>[2]; notes: [number, number, number][] }[]> = {
  extract: [{ voice: 'bell', notes: [[293.66, 0, 1], [440, 0.25, 1], [587.33, 0.5, 2.2]] }, { voice: 'pad', notes: [[146.83, 0, 2.5], [220, 0, 2.5]] }, { voice: 'timpani', notes: [[0, 0, 1], [0, 0.5, 1]] }],
  death: [{ voice: 'choir', notes: [[220, 0, 2], [207.65, 0.9, 2.6]] }, { voice: 'bell', notes: [[110, 0, 3]] }, { voice: 'drone', notes: [[55, 0, 3.5]] }],
  level: [{ voice: 'pluck', notes: [[293.66, 0, 0.3], [369.99, 0.15, 0.3], [440, 0.3, 0.3], [587.33, 0.45, 1.2]] }, { voice: 'bell', notes: [[587.33, 0.45, 2]] }],
  legendary: [{ voice: 'bell', notes: [[440, 0, 1.5], [554.37, 0.18, 1.5], [659.25, 0.36, 1.5], [880, 0.54, 2.5]] }, { voice: 'choir', notes: [[220, 0.2, 2.4], [329.63, 0.2, 2.4]] }],
};

export class MusicEngine {
  private reverb: ConvolverNode | null = null;
  private musicIn: GainNode;
  private combatGain: GainNode;
  private deck: Deck | null = null;
  private ambient: Ambient | null = null;
  private danger: { stop: () => void } | null = null;
  light = false;
  constructor(private g: Graph) {
    const c = g.c;
    // Música → limitador suave → bus de música
    const comp = c.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.attack.value = 0.01; comp.release.value = 0.3;
    this.musicIn = c.createGain(); this.musicIn.gain.value = MUSIC_CFG.mix.music;
    this.combatGain = c.createGain(); this.combatGain.gain.value = 1;
    this.musicIn.connect(this.combatGain).connect(comp).connect(g.music);
    this.reverb = makeReverb(c); const rg = c.createGain(); rg.gain.value = 0.5; this.reverb.connect(rg).connect(this.musicIn);
  }
  get current() { return this.deck ? { id: this.deck.id, status: this.deck.status, intensity: this.deck.intensity } : null; }
  get ambientIds() { return this.ambient?.ids ?? []; }

  /** Cambia de pista (o de variación) con fundido cruzado. */
  play(id: TrackId | null, v: SubzoneVariation = DEFAULT_VARIATION, opts: { intensity?: number; tempo?: number; fade?: number } = {}) {
    const fade = opts.fade ?? MUSIC_CFG.crossfade;
    this.deck?.stop(fade);
    this.deck = null;
    if (!id) return;
    const def = TRACKS[id];
    // Pista sustituida por un archivo (config/music.ts → file): se carga al necesitarla y suena en bucle
    if (def.file) { this.deck = new FileDeck(this.g, this.musicIn, id, def.file) as unknown as Deck; this.deck.start(fade); return; }
    this.deck = new Deck(this.g, this.musicIn, this.light ? null : this.reverb, id, def, v, opts.intensity ?? v.intensity, opts.tempo ?? 1, this.light);
    this.deck.start(fade);
  }
  setIntensity(x: number) { this.deck?.setIntensity(x); }
  /** Volumen de la música durante el combate (Ajustes: normal, baja o sin música). */
  setCombatLevel(x: number, fade = MUSIC_CFG.combatFade) {
    const c = this.g.c, gg = this.combatGain.gain;
    gg.cancelScheduledValues(c.currentTime); gg.setValueAtTime(Math.max(0.0001, gg.value), c.currentTime); gg.linearRampToValueAtTime(Math.max(0.0001, x), c.currentTime + fade);
  }
  setAmbient(ids: AmbientId[] | null, fade = MUSIC_CFG.crossfade) {
    const same = this.ambient && ids && this.ambient.ids.join() === ids.join();
    if (same) return;
    this.ambient?.stop(fade); this.ambient = null;
    if (!ids?.length) return;
    this.ambient = new Ambient(this.g, ids); this.ambient.start(fade);
  }
  /** Capa de tensión: latido y nota tenida que sube y baja. */
  setDanger(on: boolean) {
    if (!on) { this.danger?.stop(); this.danger = null; return; }
    if (this.danger) return;
    const c = this.g.c, out = c.createGain(); out.gain.value = 0.0001; out.connect(this.musicIn);
    out.gain.linearRampToValueAtTime(MUSIC_CFG.danger.gain, c.currentTime + 1.5);
    const o = c.createOscillator(); o.type = 'sawtooth'; o.frequency.value = 73.42;
    const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = 380;
    const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 0.5; lg.gain.value = 18;
    lfo.connect(lg).connect(o.detune); o.connect(f).connect(out); o.start(); lfo.start();
    const beat = window.setInterval(() => { const t = c.currentTime + 0.05; playNote(c, out, 'drum', null, t, 0.3, 0.8); playNote(c, out, 'drum', null, t + 0.28, 0.3, 0.55); }, 900);
    this.danger = { stop: () => { clearInterval(beat); out.gain.cancelScheduledValues(c.currentTime); out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), c.currentTime); out.gain.linearRampToValueAtTime(0.0001, c.currentTime + 1.2); setTimeout(() => { try { o.stop(); lfo.stop(); out.disconnect(); } catch { /* */ } }, 1500); } };
  }
  /** Fanfarria corta; la música baja mientras suena. */
  fanfare(id: FanfareId) {
    const c = this.g.c, t = c.currentTime + 0.05;
    const out = c.createGain(); out.gain.value = MUSIC_CFG.mix.fanfare; out.connect(this.g.music);
    if (this.reverb && !this.light) { const s = c.createGain(); s.gain.value = 0.4; out.connect(s).connect(this.reverb); }
    let len = 0;
    for (const part of FANFARES[id]) for (const [f, at, d] of part.notes) { playNote(c, out, part.voice, f || null, t + at, d, 0.6); len = Math.max(len, at + d); }
    const mg = this.musicIn.gain;
    mg.cancelScheduledValues(c.currentTime); mg.setValueAtTime(mg.value, c.currentTime);
    mg.linearRampToValueAtTime(MUSIC_CFG.mix.music * MUSIC_CFG.duck, c.currentTime + 0.2);
    mg.setValueAtTime(MUSIC_CFG.mix.music * MUSIC_CFG.duck, t + len);
    mg.linearRampToValueAtTime(MUSIC_CFG.mix.music, t + len + 1.5);
    setTimeout(() => { try { out.disconnect(); } catch { /* */ } }, (len + 6) * 1000);
  }
  stopAll(fade = 0.8) { this.play(null, undefined, { fade }); this.setAmbient(null, fade); this.setDanger(false); }
}
