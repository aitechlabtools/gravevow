// Exporta sprites reales del juego (generados por código) a PNG para las maquetas del HUD unificado.
import * as Art from '../../../src/shared/art';
import { getItem } from '../../../src/core/data/items';
import { zoneBackdrop, ZONES } from '../../../src/game/ui/combatZones';
import { stationArtUrl } from '../../../src/game/ui/stationArt';
import type { Equipment } from '../../../src/core/types';
import { EQUIP_SLOTS } from '../../../src/core/types';
const out: Record<string, string> = {};
const put = (k: string, c: HTMLCanvasElement) => (out[k] = c.toDataURL('image/png'));
const gear = (items: Record<string, string>): Equipment => { const eq = Object.fromEntries(EQUIP_SLOTS.map((s) => [s, null])) as Equipment; for (const [s, id] of Object.entries(items)) (eq as Record<string, unknown>)[s] = { uid: 'x' + id, itemId: id, qty: 1 }; return eq; };
const P = gear({ mainHand: 'knight_sword', offHand: 'bastion_shield', helmet: 'knight_helm', armor: 'chainmail', gloves: 'gauntlets', boots: 'swift_boots' });
const ap = { cloak: 0, skin: 0 } as never;
put('hero', Art.drawHumanoid(Art.heroSpec('warrior', ap, P), 0));
put('hero_back', Art.drawHumanoidBack(Art.heroSpec('warrior', ap, P)));
for (const v of ['vesper', 'garth', 'nira', 'orik', 'collector', 'brand', 'valerius', 'eldrin']) put('v_' + v, Art.drawHumanoid(Art.MONSTER_SPECS['vendor_' + v], 0));
for (const m of ['skeleton', 'merc_bram', 'rival']) if (Art.MONSTER_SPECS[m]) put('m_' + m, Art.drawHumanoid(Art.MONSTER_SPECS[m], 0));
const ITEMS = ['knight_sword', 'bastion_shield', 'knight_helm', 'chainmail', 'gauntlets', 'swift_boots', 'copper_ring', 'bone_amulet', 'health_potion', 'mana_potion', 'antidote', 'stale_bread', 'water', 'salted_meat', 'cave_mushroom', 'hearty_stew', 'scrap_metal', 'leather_scrap', 'iron_ore', 'old_coin', 'iron_sword', 'executioner_axe', 'leather_hood', 'worn_boots', 'padded_tunic', 'iron_shield', 'bone_dust', 'golden_chalice', 'tanned_leather', 'strap', 'fireproof_leather', 'backpack_basic', 'ragged_cloth', 'woven_cloth', 'scrap_bar', 'iron_ingot', 'arcane_shard', 'cut_crystal', 'rune_ink', 'bitter_herb', 'bastion_plate', 'old_wood', 'grip', 'haft', 'linen_robe'];
const meta: Record<string, unknown> = {};
for (const id of ITEMS) { try { const d = getItem(id); put('i_' + id, Art.drawIcon(d.icon)); meta[id] = { name: d.name, rarity: d.rarity }; } catch { /* */ } }
out.meta = JSON.stringify(meta);
const img = (url: string) => new Promise<HTMLImageElement>((r) => { const i = new Image(); i.onload = () => r(i); i.src = url; });
const toC = (i: HTMLImageElement) => { const c = document.createElement('canvas'); c.width = i.width; c.height = i.height; c.getContext('2d')!.drawImage(i, 0, 0); return c; };
(async () => {
  put('zone_galerias', toC(await img(zoneBackdrop(Object.values(ZONES)[0]))));
  for (const s of ['cot', 'kitchen', 'bench', 'infirmary', 'forge', 'alchemy', 'runic']) { put('st_' + s, toC(await img(stationArtUrl(s as never)))); put('st_' + s + '_r', toC(await img(stationArtUrl(s as never, true)))); }
  put('chest', Art.drawChest('common', false));
  (window as unknown as { __A__: unknown }).__A__ = out; document.title = 'listo';
})();
