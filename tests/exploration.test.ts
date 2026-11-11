// Fase 7: exploración. Garantía de cada semilla (salida y todo lo obligatorio sin abrir nada opcional), presencia por subzona y pactos.
import { describe, expect, it } from 'vitest';
import { generateDungeon, validateDungeon } from '../src/core/dungeonGen';
import { checkExploration, isOptionalRoom } from '../src/core/exploration';
import { SUBZONE_ORDER, getSubzone } from '../src/core/data/subzones';
import { EXPLORE_FROM, VAULT_KEY, RESOURCE_LOSS_CAP } from '../src/config/exploration';
import { effectiveMaxMp } from '../src/core/needs';
import { playerCombatant } from '../src/core/combatants';
import { computeStats } from '../src/core/stats';
import { createProfile } from '../src/core/profile';
import { PACTS } from '../src/core/data/altars';

const SEEDS = Array.from({ length: 100 }, (_, i) => (i + 1) * 7717);

describe('Fase 7: cada semilla tiene salida y lo obligatorio no depende de nada opcional', () => {
  for (const sz of SUBZONE_ORDER) {
    it(`${sz}: 100 semillas`, () => {
      const idx = getSubzone(sz).index;
      const zone = getSubzone(sz).zone;
      const count = { secret: 0, vault: 0, gate: 0, altar: 0 };
      for (const seed of SEEDS) {
        const d = generateDungeon(seed, { subzone: sz });
        expect(validateDungeon(d).problems).toEqual([]);
        expect(checkExploration(d)).toEqual([]);
        for (const e of d.entities) {
          if (e.kind === 'door' && e.lock) {
            count[e.lock.type === 'key' ? 'vault' : e.lock.type]++;
            if (e.lock.type === 'key') expect(e.lock.key).toBe(VAULT_KEY[zone]);
          }
          if (e.kind === 'altar') count.altar++;
        }
        // Las salas opcionales solo guardan su cofre: ni portal, ni jefe, ni enemigos
        for (const r of d.rooms.filter(isOptionalRoom)) {
          const inside = d.entities.filter((e) => e.kind !== 'torch' && e.kind !== 'decor' && e.x >= r.x && e.x < r.x + r.w && e.y >= r.y && e.y < r.y + r.h);
          expect(inside.every((e) => e.kind === 'chest')).toBe(true);
        }
      }
      // Presencia: lo que toca a la subzona sale casi siempre; lo que no toca, nunca
      if (idx >= EXPLORE_FROM.secret) expect(count.secret).toBeGreaterThanOrEqual(90); else expect(count.secret).toBe(0);
      if (idx >= EXPLORE_FROM.vault) expect(count.vault).toBeGreaterThanOrEqual(85); else expect(count.vault).toBe(0);
      if (idx >= EXPLORE_FROM.altar) expect(count.altar).toBeGreaterThanOrEqual(85); else expect(count.altar).toBe(0);
      if (idx >= EXPLORE_FROM.shortcut) expect(count.gate).toBeGreaterThan(10); else expect(count.gate).toBe(0);
    }, 60000);
  }

  it('la misma semilla da siempre el mismo mapa (también los accesos)', () => {
    const a = generateDungeon(4242, { subzone: 'calabozos' });
    const b = generateDungeon(4242, { subzone: 'calabozos' });
    expect(JSON.stringify(a)).toBe(JSON.stringify(b));
  });

  it('sin subzona (mapas antiguos y tutorial) no se añade nada', () => {
    const d = generateDungeon(99, {});
    expect(d.entities.some((e) => (e.kind === 'door' && e.lock) || e.kind === 'altar')).toBe(false);
  });
});

describe('Fase 7: pactos de altar', () => {
  const full = { sat: 100, hyd: 100, rest: 100 };
  it('el pacto recorta el máximo del recurso y se suma a las necesidades con techo (A77)', () => {
    expect(effectiveMaxMp(100, full, 0.1)).toBe(90);
    expect(effectiveMaxMp(100, { sat: 5, hyd: 100, rest: 100 }, 0.1)).toBe(70);
    expect(effectiveMaxMp(100, { sat: 5, hyd: 100, rest: 100 }, 0.5)).toBe(Math.round(100 * (1 - RESOURCE_LOSS_CAP)));
  });
  it('el pacto del hierro sube la defensa y baja el máximo del recurso en combate', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    const base = computeStats('warrior', 1, p.equipment);
    const c = playerCombatant(p.character, p.equipment, base.maxHp, base.maxMp, {}, undefined, { needs: full, pact: 'iron' });
    expect(c.stats.def).toBe(Math.round(base.def * PACTS.iron.mult.def!));
    expect(c.stats.maxMp).toBe(Math.round(base.maxMp * 0.9));
    const none = playerCombatant(p.character, p.equipment, base.maxHp, base.maxMp, {}, undefined, { needs: full });
    expect(none.stats.def).toBe(base.def);
    expect(none.stats.maxMp).toBe(base.maxMp);
  });
});
