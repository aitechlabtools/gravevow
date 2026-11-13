import { withGold } from './helpers';
import { describe, expect, it } from 'vitest';
import { MERCENARIES, MERC_ORDER, captivesOf } from '../src/core/data/mercenaries';
import { SKILLS } from '../src/core/data/skills';
import { MONSTER_SPECS } from '../src/shared/art';
import { captiveCandidate, contractPrice, hire, hireBlock, mercCombatant, mercForExpedition, rescuedMerc, settleMerc, dismiss } from '../src/core/mercenaries';
import { createProfile, sanitizeProfile } from '../src/core/profile';
import { generateDungeon, validateDungeon } from '../src/core/dungeonGen';
import { createCombat, runAITurn, currentActor } from '../src/core/combat';
import { enemyCombatant, playerCombatant } from '../src/core/combatants';
import { emptyEquipment } from '../src/core/inventory';

const base = () => withGold(createProfile('Garriano', 'warrior', { cloak: 0, skin: 0 }), 10_000);

describe('Mercenarios', () => {
  it('tres por zona, uno de ellos prisionero; habilidades y sprites existen', () => {
    expect(MERC_ORDER.length).toBe(9);
    for (const z of ['mazmorra', 'cripta', 'infierno'] as const) {
      expect(MERC_ORDER.filter((id) => MERCENARIES[id].zone === z).length).toBe(3);
      expect(captivesOf(z).length).toBe(1);
    }
    for (const id of MERC_ORDER) {
      const m = MERCENARIES[id];
      for (const s of m.skills) expect(SKILLS[s], `${id} → ${s}`).toBeTruthy();
      expect(MONSTER_SPECS[m.sprite], m.sprite).toBeTruthy();
    }
  });

  it('precio: 1/3/5 expediciones al 100/85/70 % y con descuento de reputación', () => {
    const p = base();
    // Bram: 60 de antes = 6 monedas (economía ÷10)
    expect(contractPrice(p, 'bram', 1)).toBe(6);
    expect(contractPrice(p, 'bram', 3)).toBe(Math.round(6 * 3 * 0.85));
    expect(contractPrice(p, 'bram', 5)).toBe(Math.round(6 * 5 * 0.7));
    const rep = { ...p, reputation: { grizk: 300 } }; // De confianza: 10 %
    expect(contractPrice(rep, 'bram', 1)).toBe(Math.round(6 * 0.9));
  });

  it('el rango de Grizk limita a quién puedes contratar; los prisioneros, solo si los rescataste', () => {
    const p = base();
    expect(hireBlock(p, MERCENARIES.lysa)).toMatch(/Conocido/);
    expect(hireBlock(p, MERCENARIES.tobias)).toMatch(/Rescátalo/);
    expect(hire(p, 'lysa', 1, 'aggressive').ok).toBe(false);
    const r = hire(p, 'bram', 3, 'cautious');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.gold).toBe(p.gold - contractPrice(p, 'bram', 3));
    expect(r.profile.contract).toEqual({ mercId: 'bram', left: 3, stance: 'cautious' });
    expect(hire(r.profile, 'bram', 1, 'cautious').ok).toBe(false); // solo un contrato
    expect(dismiss(r.profile).contract).toBeNull();
  });

  it('el contrato gasta una expedición por salida y se rompe si muere', () => {
    const r = hire(base(), 'bram', 3, 'aggressive');
    if (!r.ok) throw new Error();
    const ms = mercForExpedition(r.profile)!;
    expect(ms.alive && !ms.rescued).toBe(true);
    const after = settleMerc(r.profile, ms, true).profile;
    expect(after.contract?.left).toBe(2);
    expect(settleMerc(after, { ...ms, alive: false }, true).profile.contract).toBeNull();
    // Muere el jugador pero no el mercenario: vuelve y gasta la salida
    expect(settleMerc(after, ms, false).profile.contract?.left).toBe(1);
    const last = { ...after, contract: { ...after.contract!, left: 1 } };
    const end = settleMerc(last, ms, true);
    expect(end.profile.contract).toBeNull();
    expect(end.note).toMatch(/terminado/);
  });

  it('rescatar: si extraes con él vivo se desbloquea con descuento; si no, se pierde', () => {
    const p = base();
    const ms = rescuedMerc('tobias');
    expect(settleMerc(p, ms, false).profile.mercsRescued).toEqual([]);
    expect(settleMerc(p, { ...ms, alive: false }, true).profile.mercsRescued).toEqual([]);
    const ok = settleMerc(p, ms, true).profile;
    expect(ok.mercsRescued).toContain('tobias');
    expect(hireBlock(ok, MERCENARIES.tobias)).toBeNull();
    expect(contractPrice(ok, 'tobias', 1)).toBe(Math.round(3.5)); // 7 monedas con el 50 % de rescate
    const h = hire(ok, 'tobias', 1, 'aggressive');
    if (!h.ok) throw new Error(h.error);
    expect(h.profile.mercDiscounts).not.toContain('tobias');
    expect(captiveCandidate(ok, 'mazmorra')).toBeNull();
    expect(captiveCandidate(p, 'cripta')).toBe('mirra');
    // Con contrato también puede salir: solo cabe un aliado y se decide en la conversación (13/11)
    expect(captiveCandidate({ ...p, contract: { mercId: 'bram', left: 1, stance: 'cautious' } }, 'mazmorra')).toBe('tobias');
  });

  it('el generador encadena al prisionero en una sala alcanzable', () => {
    for (let seed = 1; seed <= 30; seed++) {
      const d = generateDungeon(seed, { zone: 'cripta', captive: 'mirra' });
      const c = d.entities.find((e) => e.kind === 'captive');
      expect(c, `semilla ${seed}`).toBeTruthy();
      expect(validateDungeon(d).ok).toBe(true);
    }
    expect(generateDungeon(5, { zone: 'cripta' }).entities.some((e) => e.kind === 'captive')).toBe(false);
  });

  it('lucha en el bando del jugador y escala con el nivel', () => {
    const ms = rescuedMerc('bram');
    const lo = mercCombatant(ms, 'A', 1), hi = mercCombatant(ms, 'A', 30);
    expect(hi.stats.atk).toBeGreaterThan(lo.stats.atk);
    expect(lo.side).toBe('A');
    const p = base();
    let st = createCombat([playerCombatant(p.character, emptyEquipment(), 100, 30), mercCombatant({ ...ms, stance: 'aggressive' }, 'A'), enemyCombatant('skeleton', 'e1', 'B')], 7, { canFlee: true });
    for (let i = 0; i < 20 && !st.outcome; i++) {
      const a = currentActor(st)!;
      if (a.control === 'player') break;
      st = runAITurn(st);
    }
    expect(st.combatants.find((c) => c.id === 'merc')).toBeTruthy();
  });

  it('los perfiles antiguos reciben los campos nuevos', () => {
    const raw = JSON.parse(JSON.stringify(base()));
    delete raw.contract; delete raw.mercsRescued; delete raw.mercDiscounts;
    const p = sanitizeProfile(raw)!;
    expect(p.contract).toBeNull();
    expect(p.mercsRescued).toEqual([]);
    expect(p.mercDiscounts).toEqual([]);
  });
});
