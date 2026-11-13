// Destruir en el taller de Orik y cuerpo de un aliado caído (13/11): sin duplicar ni perder de más.
import { describe, expect, it } from 'vitest';
import { destroyItems, destroyNeedsHold, destroyBlock } from '../src/core/salvage';
import { allyBodyStacks } from '../src/core/allyBody';
import { createProfile } from '../src/core/profile';
import { splitStack } from '../src/core/inventory';
import type { ItemStack } from '../src/core/types';

const prof = () => {
  const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
  const stash = p.stash.map(() => null) as (ItemStack | null)[];
  stash[0] = { uid: 'a', itemId: 'recruit_sword', qty: 1 };
  stash[1] = { uid: 'b', itemId: 'health_potion', qty: 5 };
  stash[2] = { uid: 'c', itemId: 'belzar_chain', qty: 1, rarity: 'legendary' };
  stash[3] = { uid: 'd', itemId: 'gold_coins', qty: 10 };
  return { ...p, stash };
};
const total = (g: (ItemStack | null)[], id: string) => g.reduce((n, s) => n + (s && s.itemId === id ? s.qty : 0), 0);

describe('Destruir', () => {
  it('quita el objeto y, en un montón, solo la cantidad elegida', () => {
    const p = prof();
    const r = destroyItems(p, [{ container: 'stash', index: 0 }, { container: 'stash', index: 1, qty: 2 }]);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(total(r.profile.stash, 'recruit_sword')).toBe(0);
    expect(total(r.profile.stash, 'health_potion')).toBe(3);
    expect(r.count).toBe(3);
  });
  it('la misma casilla dos veces cuenta una sola vez', () => {
    const r = destroyItems(prof(), [{ container: 'stash', index: 1, qty: 2 }, { container: 'stash', index: 1, qty: 2 }]);
    expect(r.ok && total(r.profile.stash, 'health_potion')).toBe(3);
  });
  it('el oro no se destruye y el perfil original no cambia', () => {
    const p = prof();
    expect(destroyBlock(p.stash[3]!)).not.toBeNull();
    expect(destroyItems(p, [{ container: 'stash', index: 3 }]).ok).toBe(false);
    destroyItems(p, [{ container: 'stash', index: 0 }]);
    expect(p.stash[0]?.itemId).toBe('recruit_sword');
  });
  it('mantener pulsado: legendario sí, recluta no', () => {
    const p = prof();
    expect(destroyNeedsHold(p, p.stash[2]!)).toBe(true);
    expect(destroyNeedsHold(p, p.stash[0]!)).toBe(false);
  });
});

describe('Dividir montones', () => {
  it('separa exactamente la cantidad pedida sin crear ni perder', () => {
    const g: (ItemStack | null)[] = [{ uid: 'x', itemId: 'health_potion', qty: 5 }, null, null];
    const r = splitStack(g, 0, 2);
    expect(r.ok && total(r.grid, 'health_potion')).toBe(5);
    expect(r.ok && r.grid.filter(Boolean).map((s) => s!.qty).sort()).toEqual([2, 3]);
  });
});

describe('Cuerpo de un aliado', () => {
  it('guarda lo que le diste (agrupado), su oro y sus pociones', () => {
    const st = allyBodyStacks(['iron_ore', 'iron_ore', 'chain_axe'], 30, 2);
    expect(total(st, 'iron_ore')).toBe(2);
    expect(total(st, 'chain_axe')).toBe(1);
    expect(total(st, 'health_potion')).toBe(2);
    expect(total(st, 'gold_coins')).toBe(30);
  });
  it('vacío si no llevaba nada', () => {
    expect(allyBodyStacks([], 0, 0)).toEqual([]);
  });
});
