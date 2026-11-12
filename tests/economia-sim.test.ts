import { describe, expect, it } from 'vitest';
import { economyRows } from '../tools/simulador/economia';

// Bloque 2, fase 7: el simulador de economía no encuentra ningún ciclo que gane monedas.
describe('simulador de economía', () => {
  it('fabricar y vender, fabricar y desguazar y comprar y desguazar nunca devuelven más de lo que cuestan', () => {
    for (const r of economyRows()) {
      expect(r.craftSellMax, r.station).toBeLessThanOrEqual(1);
      expect(r.salvage3Max, r.station).toBeLessThan(1);
      expect(r.buySalvageMax, r.station).toBeLessThan(1);
    }
  });
});
