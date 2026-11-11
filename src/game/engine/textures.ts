import { VEINS } from '../../core/mining';
import { DECOR_SPRITES } from '../../core/dungeon';
import Phaser from 'phaser';
import * as Art from '../../shared/art';
import { PAL } from '../../shared/palette';
import type { Appearance, ClassId, Equipment } from '../../core/types';

/** Texturas del héroe según su equipo. Cada versión usa claves nuevas (hero{v}_0…3) para no tocar las que están en uso. */
export function registerHeroTextures(scene: Phaser.Scene, version: number, hero: { classId: ClassId; appearance: Appearance; equipment: Equipment; skin?: string | null }) {
  for (let f = 0; f < 4; f++) {
    const key = `hero${version}_${f}`;
    if (scene.textures.exists(key)) scene.textures.remove(key);
    scene.textures.addCanvas(key, Art.drawHumanoid(Art.heroSpec(hero.classId, hero.appearance, hero.equipment, hero.skin), f));
  }
  // Libera la versión anterior
  for (let f = 0; f < 4; f++) {
    const old = `hero${version - 1}_${f}`;
    if (version > 0 && scene.textures.exists(old)) scene.time.delayedCall(500, () => scene.textures.exists(old) && scene.textures.remove(old));
  }
  return `hero${version}_`;
}

/** Registra en Phaser el resto de texturas generadas proceduralmente. */
export function registerTextures(scene: Phaser.Scene, subzone?: string) {
  const tx = scene.textures;
  const add = (key: string, c: HTMLCanvasElement) => {
    if (tx.exists(key)) tx.remove(key);
    tx.addCanvas(key, c);
  };
  // Suelos y muros: los de la subzona (o la piedra de siempre en mapas sin subzona)
  const ts = subzone ? Art.TILESETS[subzone] : undefined;
  for (let v = 0; v < 4; v++) add(`floor${v}`, ts ? Art.drawFloorTs(v, ts) : Art.drawFloor(v));
  add('wall0', ts ? Art.drawWallTs(0, ts) : Art.drawWall(0));
  add('wall1', ts ? Art.drawWallTs(1, ts) : Art.drawWall(1));
  add('door', Art.drawDoor());
  add('pillar', Art.drawPillar());
  add('trap_off', Art.drawTrap(false));
  add('trap_on', Art.drawTrap(true));
  add('trap_spent', Art.drawTrapSpent());
  add('door_locked', Art.drawLockedDoor());
  add('gate', Art.drawGate());
  add('secret_marks', Art.drawSecretMarks());
  add('altar', Art.drawAltar(false));
  add('altar_used', Art.drawAltar(true));
  for (const k of ['common', 'rich', 'boss'] as const) {
    add(`chest_${k}`, Art.drawChest(k, false));
    add(`chest_${k}_open`, Art.drawChest(k, true));
  }
  for (let f = 0; f < 3; f++) add(`torch${f}`, Art.drawTorch(f));
  for (const d of DECOR_SPRITES) add(`decor_${d}`, Art.drawDecor(d));
  for (let f = 0; f < 6; f++) add(`portal${f}`, Art.drawPortal(f));
  add('shadow', Art.drawShadow());
  add('shadow_big', Art.drawShadow(26, 10));
  add('glow_warm', Art.drawGlow(64, 'rgba(255,170,80,0.55)'));
  add('glow_violet', Art.drawGlow(96, 'rgba(180,110,255,0.6)'));
  add('glow_kael', Art.drawGlow(56, 'rgba(110,240,160,0.55)'));
  add('mote', Art.drawGlow(4, 'rgba(255,230,200,0.9)'));
  add('marker_ally', Art.drawMarker('#5fd19a'));
  add('marker_neutral', Art.drawMarker(PAL.gold2));
  add('marker_hostile', Art.drawMarker(PAL.threat2));
  // Triángulos de riesgo de los mercenarios errantes (config/wanderers.ts)
  add('risk_kael', Art.drawRiskMarker('#5fd19a', 'check'));
  add('risk_low', Art.drawRiskMarker('#e8913a', 'one'));
  add('risk_mid', Art.drawRiskMarker('#e8913a', 'two'));
  add('risk_high', Art.drawRiskMarker('#c4283b', 'skull'));
  add('risk_hostile', Art.drawRiskMarker('#ff3a3a', 'swords'));
  add('tut_arrow', Art.drawTutorialArrow());
  add('bag', Art.drawBag());
  add('chains', Art.drawChains());
  for (const v of Object.values(VEINS)) add(`vein_${v.id}`, Art.drawVein(v.color, v.glint, false));
  add('vein_spent', Art.drawVein('#000', '#000', true));
  for (let f = 0; f < 4; f++) {
    for (const [name, spec] of Object.entries(Art.MONSTER_SPECS)) add(`${name}${f}`, Art.drawHumanoid(spec, f));
    for (const name of Object.keys(Art.BEAST_SPECS)) add(`${name}${f}`, Art.drawBeast(name, f));
  }
  for (const name of Object.keys(Art.FLYER_SPECS)) for (let f = 0; f < 3; f++) add(`${name}${f}`, Art.drawBat(f, false, name));
}
