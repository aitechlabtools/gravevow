import { describe, expect, it } from 'vitest';
import { FOOD } from '../src/config/food';
import { ITEMS } from '../src/core/data/items';
import { VENDORS } from '../src/core/data/vendors';

describe('comida (bloque 1, fase 7)', () => {
  it('todo alimento es positivo y existe como objeto comestible', () => {
    for (const [id, f] of Object.entries(FOOD)) {
      for (const v of [f.sat, f.hyd, f.rest]) if (v !== undefined) expect(v, id).toBeGreaterThan(0);
      expect(ITEMS[id]?.use?.kind, id).toBe('need');
    }
  });
  it('lo cocinado rinde más que lo crudo', () => {
    const total = (id: string) => (FOOD[id].sat ?? 0) + (FOOD[id].hyd ?? 0) + (FOOD[id].rest ?? 0);
    const raw = Object.keys(FOOD).filter((id) => !FOOD[id].dish).map(total);
    for (const id of Object.keys(FOOD).filter((x) => FOOD[x].dish)) expect(total(id)).toBeGreaterThan(Math.max(...raw));
  });
  it('todo lo que no es plato se vende en el Bastión', () => {
    const sold = new Set(Object.values(VENDORS).flatMap((v) => v.stock.map((s) => s.itemId)));
    for (const id of Object.keys(FOOD).filter((x) => !FOOD[x].dish)) expect(sold.has(id), id).toBe(true);
  });
});
