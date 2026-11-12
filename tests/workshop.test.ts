import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { countItem } from '../src/core/inventory';
import { deliver, receptionBlock, receptionDiscard, receptionScrap, receptionSell, receptionWithdraw } from '../src/core/refuge';
import { settlePendingJobs } from '../src/core/crafting';
import type { Profile } from '../src/core/types';

// Recepción de excedentes y trabajos a medias de los minijuegos retirados (bloque 2, fase 3). Nada se pierde.

const base = () => createProfile('Sim', 'warrior', { cloak: 0, skin: 0 });
const total = (p: Profile, id: string) => countItem(p.backpack, id) + countItem(p.stash, id);

describe('trabajos a medias de los minijuegos', () => {
  it('un guiso en el fogón y una pieza en el yunque se entregan terminados al cargar', () => {
    const p = { ...base(), cooking: { recipe: 'stew', events: [0, 1, 2], picks: [] }, workshop: { station: 'forge', recipe: 'r_tempered_sword', readings: [1, 2, 3], moves: [] } } as unknown as Profile;
    const r = settlePendingJobs(p);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.cooking).toBeNull();
    expect(r.profile.workshop).toBeNull();
    expect(total(r.profile, 'hearty_stew')).toBe(1);
    expect(total(r.profile, 'tempered_sword')).toBe(1);
  });
  it('una mezcla en la mesa entrega su poción; sin nada a medias no cambia nada', () => {
    const p = { ...base(), workshop: { station: 'alchemy', recipe: 'a_mana', readings: [1], moves: [] } } as unknown as Profile;
    const r = settlePendingJobs(p);
    expect(r.ok && total(r.profile, 'mana_potion')).toBe(1);
    const q = base();
    const s = settlePendingJobs(q);
    expect(s.ok && s.profile).toBe(q);
  });
});

describe('recepción', () => {
  const full = (): Profile => {
    let p = base();
    p = { ...p, backpack: p.backpack.map((_, i) => ({ uid: 'b' + i, itemId: 'iron_sword', qty: 1 })) as Profile['backpack'] };
    p = { ...p, stash: p.stash.map((_, i) => ({ uid: 's' + i, itemId: 'iron_sword', qty: 1 })) as Profile['stash'] };
    return p;
  };
  it('lo que no cabe va a la recepción, bloquea la bajada y no se pierde', () => {
    const d = deliver(full(), [{ itemId: 'chainmail', qty: 1 }]);
    expect(d.toReception).toBe(true);
    expect(d.profile.reception).toHaveLength(1);
    expect(receptionBlock(d.profile)).toMatch(/recepción/);
    expect(receptionWithdraw(d.profile, 0).ok).toBe(false);
  });
  it('se vacía vendiendo, desguazando o descartando, sin necesidad de ampliar nada', () => {
    const d = deliver(full(), [{ itemId: 'chainmail', qty: 1 }, { itemId: 'iron_helm', qty: 1 }, { itemId: 'iron_shield', qty: 1 }]).profile;
    const s = receptionSell(d, 0);
    expect(s.ok && s.profile.reception).toHaveLength(2);
    const x = receptionDiscard(d, 2);
    expect(x.ok && x.profile.reception).toHaveLength(2);
    const sc = receptionScrap(d, 1);
    expect(sc.ok).toBe(true);
    if (sc.ok) expect(sc.profile.reception!.some((st) => st.itemId === 'iron_helm')).toBe(false);
  });
  it('retirar funciona cuando hay hueco', () => {
    const p = { ...base(), reception: [{ uid: 'r', itemId: 'chainmail', qty: 1 }] };
    const w = receptionWithdraw(p, 0);
    expect(w.ok && w.profile.reception).toHaveLength(0);
  });
});
