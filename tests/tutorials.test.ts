import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { canShowNow, currentMini, emptyTutorials, enqueueTrigger, isPending, markSeen, pendingBadges, sanitizeTutorials } from '../src/core/tutorials';
import { MINI_TUTORIALS, getMini, guideEntries, miniTitle } from '../src/core/data/tutorials';
import { emptySave, sanitizeSave } from '../src/core/save';

describe('mini tutoriales: datos', () => {
  it('cada uno tiene id único y de 2 a 4 pasos con texto (la bienvenida, hasta 12)', () => {
    const ids = MINI_TUTORIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(MINI_TUTORIALS.filter((m) => m.long).map((m) => m.id)).toEqual(['bienvenida']);
    for (const m of MINI_TUTORIALS) {
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.steps.length, m.id).toBeLessThanOrEqual(m.long ? 12 : 4);
      for (const s of m.steps) expect(s.text.trim().length, m.id).toBeGreaterThan(0);
      for (const s of m.steps) if (s.action === 'click') expect(s.target, `${m.id}: acción real sin elemento`).toBeTruthy();
    }
  });
  it('cada data-testid al que apuntan existe en src/', () => {
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !p.includes('data/tutorials')) files.push(p); } };
    walk('src');
    const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    const ids = new Set(MINI_TUTORIALS.flatMap((m) => [m.badge, ...m.steps.map((s) => s.target)]).filter((x): x is string => !!x));
    for (const id of ids) {
      // Literal («data-testid="x"») o con plantilla («tab-${t.id}», «vendor-${id}»…): basta con que exista su prefijo fijo
      const found = src.includes(`"${id}"`) || src.includes(`'${id}'`) || [...src.matchAll(/`([a-z][a-z-]*-)\$\{/g)].some((mm) => mm[1] && id.startsWith(mm[1]));
      expect(found, `no existe data-testid «${id}»`).toBe(true);
    }
  });
});

describe('bienvenida al Bastión', () => {
  it('la cuenta el intendente y termina en Descender', () => {
    const w = getMini('bienvenida')!;
    expect(w.narrator).toBe('intendant');
    expect(w.trigger).toBe('lobby:welcome');
    expect(w.steps[w.steps.length - 1].target).toBe('btn-enter-dungeon');
    expect(w.steps.filter((s) => s.action === 'click').map((s) => s.target)).toEqual(['tab-stash', 'group-gold-backpack', 'empty-backpack', 'tab-merchants', 'tab-play']);
  });
  it('un perfil nuevo no ve el cartel viejo de la mazmorra', async () => {
    const { createProfile } = await import('../src/core/profile');
    const p = createProfile('Prueba', 'warrior', { skin: 0, hair: 0, hairColor: 0 } as never);
    expect(p.tutorialSeen).toEqual({ lobby: false, dungeon: true });
  });
});

describe('mini tutoriales: cola y guardado', () => {
  it('un disparador pone en cola solo lo no visto y sin repetir', () => {
    let t = emptyTutorials();
    let q = enqueueTrigger([], t, 'tab:quests');
    expect(q).toEqual(['tab.misiones']);
    expect(enqueueTrigger(q, t, 'tab:quests')).toBe(q);
    q = enqueueTrigger(q, t, 'tab:shop');
    expect(q).toEqual(['tab.misiones', 'tab.tienda']);
    expect(currentMini(q)?.id).toBe('tab.misiones');
    t = markSeen(t, 'tab.misiones');
    expect(enqueueTrigger([], t, 'tab:quests')).toEqual([]);
    expect(enqueueTrigger([], t, 'nada:que-ver')).toEqual([]);
  });
  it('desactivados no se encolan ni avisan', () => {
    const t = { ...emptyTutorials(), disabled: true };
    expect(enqueueTrigger([], t, 'tab:quests')).toEqual([]);
    expect(isPending(t, 'tab.misiones')).toBe(false);
    expect(pendingBadges(t).size).toBe(0);
  });
  it('el «!» desaparece al verlo', () => {
    expect(pendingBadges(emptyTutorials()).has('tab-quests')).toBe(true);
    expect(pendingBadges(markSeen(emptyTutorials(), 'tab.misiones')).has('tab-quests')).toBe(false);
  });
  it('espera a que acabe el combate, se cierre la ventana o termine el tutorial inicial', () => {
    const m = getMini('tab.misiones')!;
    const free = { combat: false, modal: false, tutorialRun: false };
    expect(canShowNow(m, free)).toBe(true);
    expect(canShowNow(m, { ...free, combat: true })).toBe(false);
    expect(canShowNow({ ...m, inCombat: true }, { ...free, combat: true })).toBe(true);
    expect(canShowNow(m, { ...free, modal: true })).toBe(false);
    expect(canShowNow(m, { ...free, tutorialRun: true })).toBe(false);
  });
  it('un id que ya no existe en los datos se ignora', () => {
    expect(currentMini(['borrado', 'tab.tienda'])?.id).toBe('tab.tienda');
  });
  it('se guarda en la cuenta y se repara al cargar', () => {
    expect(emptySave().account.tutorials).toEqual({ seen: [], disabled: false });
    const s = emptySave();
    const raw = JSON.parse(JSON.stringify({ ...s, account: { ...s.account, tutorials: { seen: ['tab.tienda', 'tab.tienda', 3], disabled: 1 } } }));
    expect(sanitizeSave(raw)!.account.tutorials).toEqual({ seen: ['tab.tienda'], disabled: true });
    const { tutorials: _t, ...old } = s.account;
    expect(sanitizeSave({ ...s, account: old })!.account.tutorials).toEqual({ seen: [], disabled: false });
    expect(sanitizeTutorials(null)).toEqual({ seen: [], disabled: false });
  });
});

describe('tutorial inicial de expedición: datos', () => {
  it('8 pasos visibles, en orden, con ids únicos y textos de ratón y de toque', async () => {
    const { TUTORIAL_STEPS, TUTORIAL_PARTS } = await import('../src/core/data/tutorial');
    const ids = TUTORIAL_STEPS.map((s) => s.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(TUTORIAL_PARTS).toBe(8);
    expect(TUTORIAL_STEPS[0].part).toBe(1);
    expect(TUTORIAL_STEPS[TUTORIAL_STEPS.length - 1].part).toBe(8);
    for (let i = 1; i < TUTORIAL_STEPS.length; i++) expect(TUTORIAL_STEPS[i].part - TUTORIAL_STEPS[i - 1].part).toBeGreaterThanOrEqual(0);
    for (let i = 1; i < TUTORIAL_STEPS.length; i++) expect(TUTORIAL_STEPS[i].part - TUTORIAL_STEPS[i - 1].part).toBeLessThanOrEqual(1);
    for (const s of TUTORIAL_STEPS) { expect(s.desktop.length, s.id).toBeGreaterThan(0); expect(s.touch.length, s.id).toBeGreaterThan(0); }
    expect(ids).toEqual(['move', 'attack', 'special', 'wound', 'box', 'rich', 'weapon', 'equip', 'eat', 'ally', 'together', 'betrayal', 'extract']);
  });
  it('no hay pinchos: la herida la deja la rata', async () => {
    const { TUTORIAL_MAP } = await import('../src/core/data/tutorial');
    expect(TUTORIAL_MAP.entities.some((e) => e.kind === 'trap')).toBe(false);
  });
  it('el arma de la hoguera es de la clase, de nivel 1 y mejor que la inicial', async () => {
    const { TUTORIAL_WEAPON } = await import('../src/core/data/tutorial');
    const { CLASSES } = await import('../src/core/data/classes');
    const { getItem } = await import('../src/core/data/items');
    for (const [cls, id] of Object.entries(TUTORIAL_WEAPON)) {
      const w = getItem(id);
      expect(w.slot, id).toBe('mainHand');
      expect(w.levelReq, id).toBe(1);
      expect(w.classes, id).toContain(cls);
      const start = CLASSES[cls as keyof typeof CLASSES].starterKit.map((k) => getItem(k.itemId)).find((i) => i.slot === 'mainHand')!;
      const sum = (i: typeof w) => Object.values(i.stats ?? {}).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum(w), id).toBeGreaterThan(sum(start));
    }
  });
  it('cada elemento que resalta existe en src/', async () => {
    const { TUTORIAL_STEPS } = await import('../src/core/data/tutorial');
    const files: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(f) && !p.includes('data/tutorial')) files.push(p); } };
    walk('src');
    const src = files.map((f) => readFileSync(f, 'utf8')).join('\n');
    const ids = new Set(TUTORIAL_STEPS.flatMap((s) => (s.highlight ?? []).flatMap((q) => [...q.matchAll(/data-testid\^?="([^"]+)"/g)].map((m) => m[1]))));
    for (const id of ids) {
      const found = src.includes(`"${id}"`) || src.includes(`'${id}'`) || [...src.matchAll(/`([a-z][a-z-]*-)\$\{/g)].some((mm) => mm[1] && id.startsWith(mm[1]));
      expect(found, `no existe data-testid «${id}»`).toBe(true);
    }
  });
});

describe('fase 4: Bastión y estaciones', () => {
  it('la receta regalada de cada estación es suya y de nivel 1', async () => {
    const { STATION_FIRST_RECIPE } = await import('../src/core/data/tutorials');
    const { getRecipe } = await import('../src/core/crafting');
    for (const [st, id] of Object.entries(STATION_FIRST_RECIPE)) {
      const r = getRecipe(id);
      expect(r.station, id).toBe(st);
      expect(r.level, id).toBe(1);
      expect(r.blueprint, id).toBeUndefined();
      // El mini tutorial de la estación pide tocar justo esa receta
      expect(getMini(`station.${st}`)!.steps.some((s) => s.target === `recipe-${id}` && s.action === 'click'), st).toBe(true);
    }
  });
  it('con los materiales regalados se puede fabricar la primera receta', async () => {
    const { STATION_FIRST_RECIPE } = await import('../src/core/data/tutorials');
    const { getRecipe, craftBlock, canCraftSomething } = await import('../src/core/crafting');
    const { giveItems } = await import('../src/core/refuge');
    const { createProfile } = await import('../src/core/profile');
    for (const [st, id] of Object.entries(STATION_FIRST_RECIPE)) {
      const base = createProfile('Prueba', 'warrior', { skin: 0, hair: 0, hairColor: 0 } as never);
      const p0 = { ...base, stash: base.stash.map(() => null), backpack: base.backpack.map(() => null), refuge: { ...base.refuge!, [st]: 1 } };
      expect(canCraftSomething(p0 as never), st).toBe(false);
      const p = giveItems(p0 as never, getRecipe(id).ingredients);
      expect(craftBlock(p, id), st).toBeNull();
      expect(canCraftSomething(p), st).toBe(true);
    }
  });
  it('los avisos de subida de nivel salen aunque los mini tutoriales estén desactivados', () => {
    const off = { ...emptyTutorials(), disabled: true };
    expect(enqueueTrigger([], off, 'station-up:kitchen:2')).toEqual(['station.kitchen.lv2']);
    expect(enqueueTrigger([], off, 'vendor:nira')).toEqual([]);
    expect(enqueueTrigger([], markSeen(off, 'station.kitchen.lv2'), 'station-up:kitchen:2')).toEqual([]);
    expect(getMini('station.cot.lv3')!.narrator).toBe('orik');
  });
  it('hay uno por mercader, contado por él, y uno por estación de crafteo', async () => {
    const { VENDOR_ORDER } = await import('../src/core/data/vendors');
    for (const v of VENDOR_ORDER) expect(getMini(`vendor.${v}`)?.narrator, v).toBe(v);
    for (const st of ['kitchen', 'bench', 'infirmary', 'forge', 'alchemy', 'runic']) expect(getMini(`station.${st}`)?.trigger, st).toBe(`station:${st}`);
  });
});

describe('fase 5: expedición', () => {
  it('hay uno por mecánica de la expedición y uno por subzona desde la segunda', async () => {
    for (const id of ['exp.clock', 'exp.vital-wound', 'exp.fracture', 'exp.bleeding', 'exp.armor-broken', 'exp.backpack-full', 'exp.need-low', 'exp.merc-triangle', 'exp.kael', 'exp.elite', 'exp.boss', 'combat.class-skill']) expect(getMini(id), id).toBeTruthy();
    const { SUBZONE_ORDER } = await import('../src/core/data/subzones');
    expect(getMini('exp.subzone.afueras')).toBeUndefined();
    for (const z of SUBZONE_ORDER.slice(1)) expect(getMini(`exp.subzone.${z}`)?.trigger, z).toBe(`subzone:${z}`);
  });
  it('los de combate salen en combate; los del errante, encima de su ventana; el resto espera', () => {
    const ctx = { combat: true, modal: false, tutorialRun: false };
    for (const id of ['exp.elite', 'exp.boss', 'combat.class-skill']) expect(canShowNow(getMini(id)!, ctx), id).toBe(true);
    expect(canShowNow(getMini('exp.bleeding')!, ctx)).toBe(false);
    const modal = { combat: false, modal: true, tutorialRun: false };
    expect(canShowNow(getMini('exp.kael')!, modal)).toBe(true);
    expect(canShowNow(getMini('exp.merc-triangle')!, modal)).toBe(true);
    expect(canShowNow(getMini('exp.clock')!, modal)).toBe(false);
    expect(canShowNow(getMini('exp.kael')!, { ...modal, tutorialRun: true })).toBe(false);
  });
});

describe('fase 6: Guía en Ajustes', () => {
  it('la Guía lista todos menos los avisos de nivel, por tema y con nombre corto', () => {
    const all = guideEntries().flatMap((g) => g.minis);
    expect(all.length).toBe(MINI_TUTORIALS.filter((m) => !m.always).length);
    expect(all.some((m) => m.always)).toBe(false);
    for (const m of all) { const t = miniTitle(m); expect(t.length, m.id).toBeGreaterThan(3); expect(t.length, m.id).toBeLessThanOrEqual(70); expect(t.includes('**'), m.id).toBe(false); }
  });
  it('el de Ajustes sale encima de su propia ventana', () => {
    expect(canShowNow(getMini('screen.settings')!, { combat: false, modal: true, tutorialRun: false })).toBe(true);
  });
});
