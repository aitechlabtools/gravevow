// Un solo aliado y la confianza de Kael (13/11).
import { describe, expect, it } from 'vitest';
import { initialRival, kaelTrustAfter, witnessBetrayal, refuseShare, playerBetrays, playerAttacksNeutral } from '../src/core/social';
import { kaelTrust, KAEL_TRUST, WITNESS_DISTRUST } from '../src/config/wanderers';
import { settleMerc, rescuedMerc } from '../src/core/mercenaries';
import { createProfile } from '../src/core/profile';
import { makeRng } from '../src/core/rng';

const allied = (who = 'kael') => ({ ...initialRival(who), disposition: 'allied' as const });

describe('Confianza de Kael', () => {
  it('niveles: alta, baja tras una traición, hostil tras tres', () => {
    expect(kaelTrust(0)).toBe('high');
    let t = kaelTrustAfter(0, playerBetrays(allied()), false);
    expect(kaelTrust(t)).toBe('low');
    t = kaelTrustAfter(t, playerBetrays(allied()), false);
    expect(kaelTrust(t)).toBe('low');
    t = kaelTrustAfter(t, playerAttacksNeutral(initialRival('kael')), false);
    expect(kaelTrust(t)).toBe('hostile');
  });
  it('suma y resta: dos traiciones, tres bajadas leales y una tercera traición no lo vuelven hostil', () => {
    let t = 0;
    t = kaelTrustAfter(t, playerBetrays(allied()), false);
    t = kaelTrustAfter(t, playerBetrays(allied()), false);
    for (let i = 0; i < 3; i++) t = kaelTrustAfter(t, { ...allied(), paid: 5 }, true);
    t = kaelTrustAfter(t, playerBetrays(allied()), false);
    expect(kaelTrust(t)).toBe('low');
  });
  it('negarle su parte cuenta, pero menos', () => {
    expect(kaelTrustAfter(0, refuseShare(allied()), true)).toBe(KAEL_TRUST.refuse);
  });
  it('extraer juntos pagándole la recupera; la hostilidad es permanente', () => {
    expect(kaelTrustAfter(3, { ...allied(), paid: 5 }, true)).toBe(2);
    expect(kaelTrustAfter(KAEL_TRUST.hostile, { ...allied(), paid: 5 }, true)).toBe(KAEL_TRUST.hostile);
    expect(kaelTrustAfter(3, { ...allied('brann'), paid: 5 }, true)).toBe(3);
  });
});

describe('Testigo de una traición', () => {
  it('sube su riesgo una vez', () => {
    const r = allied('brann');
    const w = witnessBetrayal(r, makeRng(1));
    expect(w.chance).toBeCloseTo(r.chance + WITNESS_DISTRUST);
    expect(w.witnessed).toBe(true);
    expect(witnessBetrayal(w, makeRng(2)).chance).toBe(w.chance);
  });
});

describe('Mercenario que se va', () => {
  it('separados: el contrato pierde esa bajada; traicionado: se rompe', () => {
    const p = { ...createProfile('A', 'warrior', { cloak: 0, skin: 0 }), contract: { mercId: 'bram', left: 3, stance: 'cautious' as const } };
    const ms = { ...rescuedMerc('bram'), rescued: false, alive: false };
    expect(settleMerc(p, { ...ms, left: 'parted' }, true).profile.contract?.left).toBe(2);
    expect(settleMerc(p, { ...ms, left: 'betrayed' }, true).profile.contract).toBeNull();
  });
});
