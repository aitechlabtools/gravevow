// Director de música (13/11): mira el estado de la partida y decide qué suena. Exploración: el tema de la zona
// con la variación de su subzona y pausas de ambiente. Combate: fundido a la pista de combate (más intensa con
// élites y jefes). Peligro: capa de tensión. Fanfarrias al extraer, morir, subir de nivel o sacar un legendario.
// Solo arranca tras la primera interacción del jugador (lo exigen los navegadores).
import { audioGraph } from '../audio';
import { getState, subscribe } from '../state/store';
import { getEnemy } from '../../core/data/enemies';
import { getItem } from '../../core/data/items';
import { timeLeft } from '../../core/expedition';
import { DEFAULT_VARIATION, MUSIC_CFG, SUBZONE_MUSIC, type AmbientId, type FanfareId, type SubzoneVariation, type TrackId } from '../../config/music';
import { MusicEngine } from './engine';

let engine: MusicEngine | null = null;
let unlocked = false;
let started = false;
let lastKey = '';
let lastSummary: unknown = null;
/** Con la pantalla de pruebas abierta, el director no toca nada. */
let labOverride = false;

export function musicEngine(): MusicEngine | null {
  if (!unlocked) return null;
  if (!engine) { const g = audioGraph(); if (g) engine = new MusicEngine(g); }
  return engine;
}

export function setLabOverride(on: boolean) { labOverride = on; lastKey = ''; if (!on) sync(); }

const ZONE_TRACK: Record<string, TrackId> = { mazmorra: 'mazmorra', cripta: 'cripta', infierno: 'infierno' };

interface Want { track: TrackId | null; v: SubzoneVariation; intensity: number; tempo: number; ambient: AmbientId[] | null; combat: boolean; key: string }

function want(): Want {
  const s = getState();
  const none: Want = { track: null, v: DEFAULT_VARIATION, intensity: 0, tempo: 1, ambient: null, combat: false, key: 'none' };
  if (s.profile && s.profile.settings.music === false && s.screen !== 'dungeon') return { ...none, key: 'off' };
  switch (s.screen) {
    case 'boot': case 'title': case 'select': case 'create': case 'backup':
      return { ...none, track: 'menu', intensity: 0.6, key: 'menu' };
    case 'lobby':
      return { ...none, track: 'bastion', intensity: 0.4, ambient: ['refugio'], key: 'bastion' };
    case 'dungeon': {
      const sub = s.dungeon?.subzone ?? '';
      const v = SUBZONE_MUSIC[sub] ?? DEFAULT_VARIATION;
      const zone = ZONE_TRACK[s.dungeon?.zone ?? s.expedition?.zone ?? 'mazmorra'] ?? 'mazmorra';
      const musicOn = s.profile?.settings.music !== false;
      if (s.combat && !s.combat.state.outcome) {
        const foes = s.combat.state.combatants.filter((c) => c.side === 'B' && c.ref && c.ref !== 'rival' && c.ref !== 'merc');
        const big = s.combat.kind !== 'pve' || foes.some((c) => { try { const e = getEnemy(c.ref!); return e.boss || e.elite; } catch { return false; } });
        const intensity = big ? MUSIC_CFG.eliteBoost.intensity : Math.max(MUSIC_CFG.normalCombatIntensity, v.intensity * 0.6);
        return { track: musicOn ? 'combat' : null, v: { ...v, cutoff: 1, tempo: 1 }, intensity, tempo: big ? MUSIC_CFG.eliteBoost.tempo : 1, ambient: v.ambient, combat: true, key: `combat:${sub}:${big}` };
      }
      return { track: musicOn ? zone : null, v, intensity: v.intensity, tempo: 1, ambient: v.ambient, combat: false, key: `zone:${sub}:${musicOn}` };
    }
    default: return none;
  }
}

function inDanger(): boolean {
  const s = getState(), e = s.expedition;
  if (s.screen !== 'dungeon' || !e) return false;
  const max = e.body?.total || 0;
  if (max > 0 && e.hp / max < MUSIC_CFG.danger.hpBelow) return true;
  return !s.tutorial && timeLeft(e, Date.now()) < MUSIC_CFG.danger.timeBelowMs;
}

function fanfares() {
  const s = getState();
  if (!s.summary || s.summary === lastSummary) { if (!s.summary) lastSummary = null; return; }
  lastSummary = s.summary;
  const m = musicEngine(); if (!m) return;
  const sm = s.summary as unknown as { reason: string; levelsGained?: number; gained?: { itemId: string; rarity?: string }[] };
  const list: FanfareId[] = [];
  if (sm.reason === 'extracted') list.push('extract'); else list.push('death');
  if ((sm.levelsGained ?? 0) > 0) list.push('level');
  if (sm.gained?.some((x) => (x.rarity ?? getItem(x.itemId).rarity) === 'legendary')) list.push('legendary');
  list.forEach((f, i) => setTimeout(() => m.fanfare(f), i * 2600));
}

function sync() {
  if (labOverride || !unlocked) return;
  const m = musicEngine(); if (!m) return;
  const s = getState();
  const w = want();
  if (w.key !== lastKey) {
    const wasCombat = lastKey.startsWith('combat');
    const fade = w.combat || wasCombat ? MUSIC_CFG.combatFade : MUSIC_CFG.crossfade;
    lastKey = w.key;
    m.play(w.track, w.v, { intensity: w.intensity, tempo: w.tempo, fade });
    m.setAmbient(w.ambient);
  }
  const lvl = MUSIC_CFG.combatLevel[s.profile?.settings.combatMusic ?? 'normal'];
  m.setCombatLevel(w.combat ? lvl : 1);
  m.setDanger(s.profile?.settings.music !== false && inDanger());
  fanfares();
}

/** Se llama una vez al arrancar la aplicación. */
export function initMusicDirector() {
  if (started || typeof window === 'undefined') return;
  started = true;
  const unlock = () => {
    if (unlocked) return;
    unlocked = true;
    window.removeEventListener('pointerdown', unlock); window.removeEventListener('keydown', unlock);
    sync();
  };
  window.addEventListener('pointerdown', unlock); window.addEventListener('keydown', unlock);
  subscribe(sync);
  // Con ?debug, para las pruebas: qué suena y por qué
  if (/[?&]debug\b/.test(window.location.search)) (window as unknown as Record<string, unknown>).__MUSIC__ = { current: () => engine?.current ?? null, key: () => lastKey, ambient: () => engine?.ambientIds ?? [], danger: () => inDanger() };
  window.setInterval(() => { if (unlocked && !labOverride) { const m = musicEngine(); m?.setDanger(getState().profile?.settings.music !== false && inDanger()); } }, 1000);
}

/** Compatibilidad: antes cada pantalla arrancaba su música. Ahora decide el director. */
export function startMusic(_mood?: 'lobby' | 'dungeon') { lastKey = ''; sync(); }
export function stopMusic() { lastKey = 'stopped'; engine?.stopAll(); }
