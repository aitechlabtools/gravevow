import { withGold } from './helpers';
import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addToPage, buySharedPage, buyStashPage, migrateLegacyStash, nextPageCost, pageCount, pageSlice, sortPage } from '../src/core/stashPages';
import { SHARED_PAGE_COST, STASH_PAGE_COSTS, STASH_PAGE_SIZE, STASH_MAX_PAGES } from '../src/config/stash';
import { migrateProfileToSave, composeProfile, applyProfile, sanitizeSave, addCharacter } from '../src/core/save';
import { countItem, emptyGrid } from '../src/core/inventory';
import type { Profile } from '../src/core/types';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));
const sword = (uid: string) => ({ uid, itemId: 'iron_sword', qty: 1 });

describe('Almacén por páginas', () => {
  it('se empieza con una página gratis de 120 casillas', () => {
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    expect(p.stash).toHaveLength(STASH_PAGE_SIZE);
    expect(pageCount(p.stash)).toBe(1);
    expect(p.shared).toBeNull();
  });

  it('las páginas propias se compran en orden, cada una más cara, hasta el máximo', () => {
    let p: Profile = withGold(createProfile('A', 'warrior', { cloak: 0, skin: 0 }), 5_000);
    for (let i = 0; i < STASH_MAX_PAGES - 1; i++) {
      expect(nextPageCost(p.stash)).toBe(STASH_PAGE_COSTS[i]);
      const r = buyStashPage(p); expect(r.ok).toBe(true); if (r.ok) p = r.profile;
    }
    expect(pageCount(p.stash)).toBe(STASH_MAX_PAGES);
    expect(nextPageCost(p.stash)).toBeNull();
    expect(buyStashPage(p).ok).toBe(false);
    expect(p.gold).toBe(5_000 - STASH_PAGE_COSTS.reduce((a, b) => a + b, 0));
  });

  it('sin oro suficiente no se compra', () => {
    const p = createProfile('A', 'warrior', { cloak: 0, skin: 0 });
    expect(buyStashPage(p).ok).toBe(false);
    expect(buySharedPage(p).ok).toBe(false);
  });

  it('meter en una página concreta y ordenar solo esa página', () => {
    let p: Profile = withGold(createProfile('A', 'warrior', { cloak: 0, skin: 0 }), 1_000);
    const r = buyStashPage(p); if (r.ok) p = r.profile;
    let st = addToPage(p.stash, 1, sword('a')).stash;
    st[5] = { uid: 'b', itemId: 'health_potion', qty: 2 }; st[0] = null;
    st[STASH_PAGE_SIZE + 7] = st[STASH_PAGE_SIZE]; st[STASH_PAGE_SIZE] = null;
    expect(pageSlice(st, 1)[7]?.uid).toBe('a');
    st = sortPage(st, 1);
    expect(pageSlice(st, 1)[0]?.uid).toBe('a'); // la página 2 se ordena…
    expect(st[5]?.uid).toBe('b'); // …y la 1 no se toca
  });

  it('el almacén cuenta todas las páginas propias (encargos, forja), pero no la compartida', () => {
    let p: Profile = withGold(createProfile('A', 'warrior', { cloak: 0, skin: 0 }), 50_000);
    const r = buyStashPage(p); if (r.ok) p = r.profile;
    p = { ...p, stash: addToPage(p.stash, 1, { uid: 'd', itemId: 'bone_dust', qty: 4 }).stash };
    expect(countItem(p.stash, 'bone_dust')).toBe(4);
  });
});

describe('Página «Compartido»', () => {
  it('se compra una vez con el oro del personaje', () => {
    const p: Profile = withGold(createProfile('A', 'warrior', { cloak: 0, skin: 0 }), SHARED_PAGE_COST);
    const r = buySharedPage(p);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.profile.gold).toBe(0);
    expect(r.profile.shared).toHaveLength(STASH_PAGE_SIZE);
    expect(buySharedPage(withGold(r.profile, 99_999)).ok).toBe(false);
  });

  it('lo que deja un personaje en «Compartido» lo ve y lo coge otro', () => {
    let s = migrateProfileToSave(json({ ...createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 }), gold: 20_000, goldPhysical: undefined }))!;
    const aldric = s.characters[0].id;
    let a = composeProfile(s, aldric)!;
    const b = buySharedPage(a); if (b.ok) a = b.profile;
    a.shared![3] = sword('regalo');
    s = applyProfile(s, a, aldric);
    const add = addCharacter(s, createProfile('Mireva', 'mage', { cloak: 0, skin: 0 }))!;
    s = sanitizeSave(json(add.save))!;
    const m = composeProfile(s, add.id)!;
    expect(m.shared?.[3]?.uid).toBe('regalo');
    expect(m.gold).not.toBe(a.gold); // el oro de cada uno sigue siendo suyo
  });
});

describe('Migración del almacén antiguo', () => {
  it('40 casillas sin ampliar: todo a la página 1 y nada que devolver', () => {
    const old = emptyGrid(40); old[3] = sword('x'); old[39] = sword('y');
    const r = migrateLegacyStash(old);
    expect(r.refund).toBe(0);
    expect(r.stash).toHaveLength(STASH_PAGE_SIZE);
    expect(r.stash[3]?.uid).toBe('x'); expect(r.stash[39]?.uid).toBe('y');
  });

  it('con las 4 ampliaciones y lleno: todo cabe y se devuelve todo lo pagado', () => {
    const old = Array.from({ length: 72 }, (_, i) => sword(`s${i}`));
    const r = migrateLegacyStash(old);
    expect(r.refund).toBe(500 + 1500 + 4000 + 10000);
    expect(r.stash.filter(Boolean)).toHaveLength(72);
  });

  it('un perfil antiguo con el almacén ampliado recupera su oro al migrar (una sola vez)', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p.gold = 100; delete (p as { goldPhysical?: boolean }).goldPhysical; // perfil de antes del oro físico
    p.stash = Array.from({ length: 56 }, (_, i) => (i < 50 ? sword(`s${i}`) : null)); // 2 ampliaciones
    const s = migrateProfileToSave(json(p))!;
    const back = composeProfile(s, s.characters[0].id)!;
    expect(back.gold).toBe(Math.ceil((100 + 500 + 1500) / 10)); // oro antiguo + lo devuelto, en monedas (÷10)
    expect(back.stash.length % STASH_PAGE_SIZE).toBe(0); // Fase 6: si 50 espadas de 3×1 no caben, se añade otra página gratis
    expect(back.stash.filter((x) => x?.itemId === 'iron_sword')).toHaveLength(50); // además, el oro en sacos
    expect(s.account.notes[0]).toMatch(/devolvemos/);
    // Al volver a cargar no se devuelve otra vez
    const again = sanitizeSave(json(applyProfile(s, back, s.characters[0].id)))!;
    expect(composeProfile(again, again.characters[0].id)!.gold).toBe(210);
  });

  it('una partida guardada en la fase 1 (almacén antiguo en formato 3) también se migra', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    const s = migrateProfileToSave(json(p))!;
    const raw = json(s);
    raw.characters[0].stashPages = [Array.from({ length: 48 }, (_, i) => (i === 47 ? sword('z') : null))];
    raw.characters[0].gold = 10;
    const fixed = sanitizeSave(raw)!;
    const back = composeProfile(fixed, fixed.characters[0].id)!;
    expect(back.gold).toBe(50); // ya tenía el oro físico (6 monedas iniciales): + las 500 devueltas ÷ 10
    expect(back.gold).toBeGreaterThan(0);
    expect(back.stash[47]?.uid).toBe('z');
  });
});
