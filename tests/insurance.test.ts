import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { makeUid } from '../src/core/rng';
import { setGoldExactly } from '../src/core/wallet';
import { refugeOf } from '../src/core/refuge';
import { startExpedition, endExpedition } from '../src/core/expedition';
import { canInsureAny, collectReforged, insurableSlots, insuranceCost, payInsurance, pendingFor, reforgeLost } from '../src/core/insurance';
import type { ItemStack, Profile } from '../src/core/types';

// Seguro de equipo por bajada (24/11): coste, pago al bajar, reforja al caer y recogida.

const piece = (itemId: string, extra: Partial<ItemStack> = {}): ItemStack => ({ uid: makeUid(), itemId, qty: 1, ...extra });
function rich(stations: Record<string, number> = { forge: 1, armory: 1, alchemy: 1 }): Profile {
  const p = createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
  const q: Profile = { ...p, refuge: { ...refugeOf(p), ...stations } as Profile['refuge'],
    equipment: { ...p.equipment, mainHand: piece('ash_wand', { rarity: 'rare', affixes: ['vampire'] }), helmet: piece('belzar_broken_crown'), armor: piece('chainmail'), ring: piece('ring_of_embers') } };
  return setGoldExactly(q, 100);
}

describe('seguro por bajada', () => {
  it('cuesta el 4 % del valor del ejemplar, con mínimo 1', () => {
    expect(insuranceCost(piece('rusty_sword'))).toBe(1);
    expect(insuranceCost(piece('belzar_broken_crown'))).toBe(17);
    expect(insuranceCost(piece('ash_wand'))).toBe(5);
    expect(insuranceCost(piece('ash_wand', { affixes: ['vampire'] }))).toBeGreaterThan(5);
  });
  it('sin la estación del mercader reconstruida, la pieza sale bloqueada', () => {
    const p = rich({ forge: 1 });
    const s = insurableSlots(p);
    expect(s.find((x) => x.slot === 'mainHand')!.locked).toBe(false);
    expect(s.find((x) => x.slot === 'helmet')!.locked).toBe(true);
    expect(canInsureAny(rich({}))).toBe(false);
  });
  it('se paga al bajar, solo lo válido, y recuerda lo marcado', () => {
    const p = rich({ forge: 1 });
    const r = payInsurance(p, ['mainHand', 'helmet', 'ring']);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.uids).toEqual([p.equipment.mainHand!.uid, p.equipment.ring!.uid]);
    expect(r.profile.gold).toBe(100 - r.cost);
    expect(r.profile.insurePlan).toEqual(['mainHand', 'helmet', 'ring']);
  });
  it('sin oro suficiente no se baja asegurado', () => {
    expect(payInsurance(setGoldExactly(rich(), 2), ['helmet']).ok).toBe(false);
  });
  it('al caer, lo asegurado que llevabas puesto vuelve reforjado (otro uid, durabilidad entera); al extraer, no', () => {
    const p = rich();
    const paid = payInsurance(p, ['mainHand', 'helmet']);
    if (!paid.ok) throw new Error(paid.error);
    const st = startExpedition(paid.profile, 0);
    const e = { ...st.expedition, insured: paid.uids, equipment: { ...st.expedition.equipment, mainHand: { ...st.expedition.equipment.mainHand!, dur: 3 } } };
    const died = endExpedition(st.profile, e, 'died', 1000);
    expect(died.summary.reforged?.length).toBe(2);
    const rf = died.profile.reforged!;
    expect(rf.every((r) => r.vendor === 'valerius')).toBe(true);
    const wand = rf.find((r) => r.item.itemId === 'ash_wand')!.item;
    expect(wand.uid).not.toBe(p.equipment.mainHand!.uid);
    expect(wand.dur).toBeUndefined();
    expect(wand.affixes).toEqual(['vampire']);
    expect(endExpedition(st.profile, e, 'timeout', 1000).profile.reforged?.length).toBe(2);
    expect(endExpedition(st.profile, e, 'extracted', 1000).profile.reforged).toBeUndefined();
  });
  it('lo que ya no llevabas puesto al caer no se reforja', () => {
    expect(reforgeLost({ mainHand: null, offHand: null, helmet: null, armor: null, gloves: null, boots: null, ring: null, amulet: null }, ['x'])).toEqual([]);
  });
  it('se acumulan las pendientes y se recogen todas en Valerius', () => {
    let p = rich();
    p = { ...p, reforged: [{ vendor: 'brand', item: piece('rusty_sword') }, { vendor: 'valerius', item: piece('chainmail') }, { vendor: 'brand', item: piece('ring_of_embers') }] };
    // Todo se recoge en Valerius, también lo guardado a nombre de Brand en partidas anteriores
    expect(pendingFor(p, 'brand').length).toBe(0);
    expect(pendingFor(p, 'valerius').length).toBe(3);
    const r = collectReforged(p, 'valerius');
    expect(r.taken).toBe(3);
    expect(r.profile.reforged).toHaveLength(0);
    expect(r.profile.backpack.some((x) => x?.itemId === 'rusty_sword')).toBe(true);
  });
  it('las partidas antiguas cargan sin seguro', () => {
    const p = createProfile('Old', 'mage', { cloak: 0, skin: 0 });
    expect(p.reforged).toBeUndefined();
    const st = startExpedition(p, 0);
    expect(endExpedition(st.profile, st.expedition, 'died', 10).profile.reforged).toBeUndefined();
  });
});

describe('una función por mercader', () => {
  it('quien asegura y entrega es siempre Valerius; la estación sigue siendo la de quien fabrica', () => {
    const p = rich({ forge: 1 });
    const s = insurableSlots(p);
    expect(s.every((x) => x.vendor === 'valerius')).toBe(true);
    expect(s.find((x) => x.slot === 'mainHand')!.locked).toBe(false);
    expect(s.find((x) => x.slot === 'helmet')!.locked).toBe(true);
  });
});
