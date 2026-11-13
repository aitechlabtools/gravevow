// Música de archivo (13/11, noche): listas de pistas en OGG (MP3 para Safari) que se alternan sin repetir la misma
// dos veces seguidas, con una pausa en silencio entre una y otra. Se reproducen en streaming con <audio>, así que no
// retrasan el arranque ni ocupan memoria: cada pista se pide solo cuando le toca sonar.
import type { FileTrack, Playlist } from '../../config/music';

const canOgg = () => typeof Audio !== 'undefined' && !!new Audio().canPlayType('audio/ogg; codecs="vorbis"');

export class PlaylistPlayer {
  private list: Playlist | null = null;
  private listId: string | null = null;
  private el: HTMLAudioElement | null = null;
  private gain: GainNode | null = null;
  private last: string | null = null;
  private timer: number | null = null;
  status = 'parada';
  current: FileTrack | null = null;
  constructor(private c: AudioContext, private out: AudioNode) {}

  get playingId() { return this.listId; }

  /** Empieza (o sigue) la lista. Si ya está sonando, no hace nada. */
  play(id: string, list: Playlist) {
    if (this.listId === id) return;
    this.stop(list.fadeOut);
    this.listId = id; this.list = list;
    this.next(true);
  }

  /** Apaga con fundido. */
  stop(fade = 2) {
    if (this.timer !== null) { clearTimeout(this.timer); this.timer = null; }
    const el = this.el, g = this.gain;
    this.el = null; this.gain = null; this.listId = null; this.list = null; this.current = null; this.status = 'parada';
    if (!el || !g) return;
    const t = this.c.currentTime;
    g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(g.gain.value, t); g.gain.linearRampToValueAtTime(0, t + fade);
    setTimeout(() => { el.pause(); el.removeAttribute('src'); el.load(); try { g.disconnect(); } catch { /* ya libre */ } }, fade * 1000 + 100);
  }

  /** Pruebas: salta casi al final de la pista actual. */
  skipToEnd() { const el = this.el; if (el && isFinite(el.duration)) el.currentTime = Math.max(0, el.duration - 0.5); }

  private next(first = false) {
    const list = this.list; if (!list) return;
    const pool = list.tracks.length > 1 ? list.tracks.filter((t) => t.id !== this.last) : list.tracks;
    const tr = pool[Math.floor(Math.random() * pool.length)];
    this.last = tr.id; this.current = tr;
    const el = new Audio(canOgg() ? tr.ogg : tr.mp3);
    el.preload = 'auto';
    const src = this.c.createMediaElementSource(el);
    const g = this.c.createGain(); g.gain.value = 0;
    src.connect(g).connect(this.out);
    this.el = el; this.gain = g;
    const target = list.gain * (tr.gain ?? 1);
    el.addEventListener('playing', () => {
      const t = this.c.currentTime;
      g.gain.cancelScheduledValues(t); g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(target, t + (first ? list.fadeIn : 0.3));
    }, { once: true });
    el.addEventListener('ended', () => {
      if (this.el !== el) return;
      try { g.disconnect(); } catch { /* */ }
      const pause = list.pause[0] + Math.random() * (list.pause[1] - list.pause[0]);
      this.status = `silencio de ${Math.round(pause)} s`;
      this.timer = window.setTimeout(() => { this.timer = null; if (this.list === list) this.next(); }, pause * 1000);
    });
    this.status = `sonando: ${tr.name}`;
    el.play().catch(() => { this.status = 'esperando una interacción'; });
  }
}
