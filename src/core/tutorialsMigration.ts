// Migración de los mini tutoriales para partidas de antes de que existieran (plan-tutoriales.md, fase 8, opción a):
// se dan por vistos los de lo que el jugador ya ha usado; lo que aún no ha tocado queda pendiente.
import { MINI_TUTORIALS } from './data/tutorials';
import { SUBZONE_ORDER, SUBZONES } from './data/subzones';
import { refugeOf } from './refuge';
import { MODULE_ORDER } from './data/refuge';
import { rankOf } from '../config/reputation';
import type { Profile } from './types';

type Hist = Pick<Profile, 'stats' | 'reputation' | 'bestiary' | 'bossesDefeated' | 'refuge' | 'kael' | 'lastSubzone' | 'classSkills'> & { stashPages?: unknown[] };
interface AccountHist { tutorialDone: boolean; skinsOwned: string[]; backupAt: number | null; settingsOpened: boolean; sharedOwned?: boolean }

/** Ids de los mini tutoriales que una partida antigua ya ha usado. Sin expediciones no hay nada que dar por visto. */
export function seenFromHistory(chars: Hist[], acc: AccountHist): string[] {
  const seen = new Set<string>();
  const played = chars.some((c) => (c.stats?.expeditions ?? 0) > 0);
  if (!played && !acc.tutorialDone) return [];
  if (played) {
    // Quien ya ha bajado conoce el Bastión, sus pestañas y el reloj de la mazmorra
    for (const id of ['bienvenida', 'tab.misiones', 'tab.bestiario', 'tab.tienda', 'tab.intendencia', 'tab.personaje', 'screen.bastion-entry', 'tab.refugio', 'screen.select', 'exp.clock']) seen.add(id);
  }
  if (acc.backupAt) seen.add('screen.backup');
  if (acc.settingsOpened) seen.add('screen.settings');
  if (acc.skinsOwned.length) seen.add('bastion.first-skin');
  if (acc.sharedOwned) seen.add('unlock.shared-page');
  let maxSub = -1;
  for (const c of chars) {
    if ((c.stats?.deaths ?? 0) > 0) seen.add('bastion.first-death');
    for (const [v, rep] of Object.entries(c.reputation ?? {})) {
      if (rep > 0) { seen.add(`vendor.${v}`); seen.add('bastion.first-sale'); }
      if (rankOf(rep) > 0) seen.add('bastion.first-rep');
    }
    const r = refugeOf(c);
    for (const k of MODULE_ORDER) {
      if (k !== 'cot' && r[k] >= 1) seen.add(`station.${k}`);
      for (let lv = 2; lv <= r[k]; lv++) seen.add(`station.${k}.lv${lv}`);
    }
    if (r.runic >= 1) seen.add('station.runes');
    if (c.bossesDefeated?.length) seen.add('exp.boss');
    const elites = new Set(SUBZONE_ORDER.map((s) => SUBZONES[s].elite));
    if (Object.entries(c.bestiary ?? {}).some(([id, b]) => elites.has(id) && b.kills > 0)) seen.add('exp.elite');
    if (c.kael?.met) seen.add('exp.kael');
    if ((c.classSkills?.unlocked?.length ?? 0) > 1) seen.add('unlock.class-skill');
    if ((c.stashPages?.length ?? 0) > 1) seen.add('unlock.stash-page');
    const i = c.lastSubzone ? SUBZONE_ORDER.indexOf(c.lastSubzone as never) : -1;
    maxSub = Math.max(maxSub, i);
  }
  // Las subzonas hasta la más honda a la que ha bajado (para llegar ahí pasó por las anteriores)
  for (let i = 1; i <= maxSub; i++) seen.add(`exp.subzone.${SUBZONE_ORDER[i]}`);
  // Solo ids que existen en el archivo de datos
  const ids = new Set(MINI_TUTORIALS.map((m) => m.id));
  return [...seen].filter((id) => ids.has(id));
}
