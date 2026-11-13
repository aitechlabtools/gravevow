// Instrumentos sintetizados para la música generada (13/11). Cada nota entra y sale con rampa (sin chasquidos)
// y se libera sola al acabar. Nada pasa de unos 7 kHz: el filtro general de la pista corta lo demás.
import type { Voice } from '../../config/music';

let noiseBuf: AudioBuffer | null = null;
export function noise(c: AudioContext): AudioBuffer {
  if (noiseBuf && noiseBuf.sampleRate === c.sampleRate) return noiseBuf;
  const b = c.createBuffer(1, c.sampleRate * 2, c.sampleRate);
  const d = b.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  noiseBuf = b;
  return b;
}

/** Envolvente sin chasquidos: sube en `a`, se mantiene y baja en `r`. Devuelve el final. */
function env(g: GainNode, t: number, peak: number, a: number, hold: number, r: number) {
  g.gain.setValueAtTime(0.0001, t);
  g.gain.linearRampToValueAtTime(peak, t + a);
  g.gain.setValueAtTime(peak, t + a + hold);
  g.gain.exponentialRampToValueAtTime(0.0001, t + a + hold + r);
  return t + a + hold + r + 0.05;
}

function osc(c: AudioContext, type: OscillatorType, f: number, t: number, end: number, out: AudioNode, detune = 0) {
  const o = c.createOscillator();
  o.type = type; o.frequency.setValueAtTime(f, t); o.detune.value = detune;
  o.connect(out); o.start(t); o.stop(end);
  return o;
}

function lp(c: AudioContext, f: number, q = 0.7, type: BiquadFilterType = 'lowpass') {
  const b = c.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; return b;
}

function noiseSrc(c: AudioContext, t: number, end: number, out: AudioNode) {
  const n = c.createBufferSource(); n.buffer = noise(c); n.loop = true;
  n.connect(out); n.start(t, Math.random()); n.stop(end);
  return n;
}

/** Toca una nota. `f` en Hz (null en percusión), `t` y `dur` en segundos. */
export function playNote(c: AudioContext, out: AudioNode, voice: Voice, f: number | null, t: number, dur: number, gain: number) {
  // Nunca en el pasado (una nota de adorno al principio caería antes de 0): el navegador lo rechazaría
  t = Math.max(t, c.currentTime + 0.005);
  const g = c.createGain(); g.connect(out);
  const hz = f ?? 100;
  switch (voice) {
    case 'pluck': {
      const end = env(g, t, gain, 0.005, 0.02, Math.min(1.6, dur + 0.6));
      const fl = lp(c, Math.min(3200, hz * 6)); fl.connect(g);
      fl.frequency.setValueAtTime(Math.min(3200, hz * 6), t); fl.frequency.exponentialRampToValueAtTime(Math.max(200, hz * 1.5), t + 0.5);
      osc(c, 'triangle', hz, t, end, fl); osc(c, 'sawtooth', hz, t, end, fl, 4);
      break;
    }
    case 'pad': {
      const end = env(g, t, gain * 0.5, Math.min(1.4, dur * 0.4), Math.max(0, dur - 1.4), 1.6);
      const fl = lp(c, 900); fl.connect(g);
      osc(c, 'sawtooth', hz, t, end, fl, -7); osc(c, 'sawtooth', hz, t, end, fl, 7); osc(c, 'triangle', hz / 2, t, end, fl);
      break;
    }
    case 'choir': {
      const end = env(g, t, gain * 0.6, Math.min(1.8, dur * 0.4), Math.max(0, dur - 1.8), 2.2);
      const f1 = lp(c, 700, 6, 'bandpass'), f2 = lp(c, 1150, 6, 'bandpass');
      f1.connect(g); f2.connect(g);
      const vib = c.createOscillator(); const vg = c.createGain(); vib.frequency.value = 4.6; vg.gain.value = 9;
      vib.connect(vg); vib.start(t); vib.stop(end);
      for (const [d, k] of [[-9, f1], [0, f2], [9, f1]] as const) { const o = osc(c, 'sawtooth', hz, t, end, k, d); vg.connect(o.detune); }
      break;
    }
    case 'bell': {
      const end = t + 3.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain * 0.5, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 3.5);
      for (const [m, k] of [[1, 1], [2.76, 0.35], [5.4, 0.12]]) {
        if (hz * m > 6500) continue;
        const pg = c.createGain(); pg.gain.value = k; pg.connect(g); osc(c, 'sine', hz * m, t, end, pg);
      }
      break;
    }
    case 'bass': {
      const end = env(g, t, gain, 0.02, Math.max(0, dur - 0.2), 0.35);
      const fl = lp(c, 420); fl.connect(g);
      osc(c, 'triangle', hz, t, end, fl); osc(c, 'sine', hz / 2, t, end, g);
      break;
    }
    case 'flute': {
      const end = env(g, t, gain * 0.6, 0.12, Math.max(0, dur - 0.3), 0.4);
      const vib = c.createOscillator(); const vg = c.createGain(); vib.frequency.value = 5.2; vg.gain.value = 6;
      vib.connect(vg); vib.start(t); vib.stop(end);
      vg.connect(osc(c, 'sine', hz, t, end, g).detune);
      const br = c.createGain(); br.gain.value = 0.04; br.connect(g); { const nf = lp(c, hz * 2, 2, 'bandpass'); nf.connect(br); noiseSrc(c, t, end, nf); }
      break;
    }
    case 'drone': {
      const end = env(g, t, gain * 0.55, 2, Math.max(0, dur - 2), 2.5);
      const fl = lp(c, 320); fl.connect(g);
      const lfo = c.createOscillator(); const lg = c.createGain(); lfo.frequency.value = 0.09 + Math.random() * 0.05; lg.gain.value = 140;
      lfo.connect(lg).connect(fl.frequency); lfo.start(t); lfo.stop(end);
      osc(c, 'sawtooth', hz, t, end, fl, -4); osc(c, 'sawtooth', hz * 1.5, t, end, fl, 3); osc(c, 'sine', hz / 2, t, end, g);
      break;
    }
    case 'drum': {
      const end = t + 0.5;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
      const o = osc(c, 'sine', 120, t, end, g); o.frequency.exponentialRampToValueAtTime(48, t + 0.25);
      const ng = c.createGain(); ng.gain.value = 0.25; ng.connect(g); { const nf = lp(c, 900); nf.connect(ng); noiseSrc(c, t, t + 0.08, nf); }
      break;
    }
    case 'timpani': {
      const end = t + 1.6;
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
      const o = osc(c, 'sine', 82, t, end, g); o.frequency.exponentialRampToValueAtTime(58, t + 0.6);
      osc(c, 'triangle', 41, t, end, g);
      const ng = c.createGain(); ng.gain.value = 0.3; ng.connect(g); { const nf = lp(c, 500); nf.connect(ng); noiseSrc(c, t, t + 0.12, nf); }
      break;
    }
    case 'metal': {
      const end = env(g, t, gain * 0.5, 0.03, Math.max(0, dur - 0.3), 0.8);
      const fl = lp(c, 1100, 3); fl.connect(g);
      const sh = c.createWaveShaper(); const k = new Float32Array(256);
      for (let i = 0; i < 256; i++) { const x = i / 128 - 1; k[i] = Math.tanh(x * 2.5); }
      sh.curve = k; sh.connect(fl);
      osc(c, 'square', hz, t, end, sh, -10); osc(c, 'square', hz * 1.01, t, end, sh, 10);
      break;
    }
    case 'shaker': {
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(gain * 0.5, t + 0.005); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.07);
      { const nf = lp(c, 5200, 1.2, 'bandpass'); nf.connect(g); noiseSrc(c, t, t + 0.1, nf); }
      break;
    }
  }
  // Libera el nodo de salida cuando ya no suena
  setTimeout(() => { try { g.disconnect(); } catch { /* ya libre */ } }, Math.max(0, (t - c.currentTime + dur + 5)) * 1000);
}
