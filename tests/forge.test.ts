import { describe, expect, it } from 'vitest';
import { RECIPES, QUALITIES } from '../src/core/data/forge';
import { ITEMS } from '../src/core/data/items';
import { qualityStats } from '../src/core/forge';
import { computeStats } from '../src/core/stats';
import { emptyEquipment } from '../src/core/inventory';

describe('Forja', () => {
  it('cada receta fabrica un objeto real con materiales reales', () => {
    for (const r of RECIPES) {
      expect(ITEMS[r.result], r.id).toBeTruthy();
      for (const m of r.materials) expect(ITEMS[m.itemId], `${r.id} → ${m.itemId}`).toBeTruthy();
    }
  });
  it('la calidad mejora las estadísticas del arma equipada', () => {
    expect(qualityStats({ atk: 10 }, 2).atk).toBe(Math.round(10 * (1 + QUALITIES[2].bonus)));
    const eq = { ...emptyEquipment(), mainHand: { uid: 'a', itemId: 'tempered_sword', qty: 1, quality: 2 } };
    const plain = { ...emptyEquipment(), mainHand: { uid: 'b', itemId: 'tempered_sword', qty: 1 } };
    expect(computeStats('warrior', 12, eq).atk).toBeGreaterThan(computeStats('warrior', 12, plain).atk);
  });
});
