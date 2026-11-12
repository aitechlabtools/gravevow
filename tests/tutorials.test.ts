import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { canShowNow, currentMini, emptyTutorials, enqueueTrigger, isPending, markSeen, pendingBadges, sanitizeTutorials } from '../src/core/tutorials';
import { MINI_TUTORIALS, getMini } from '../src/core/data/tutorials';
import { emptySave, sanitizeSave } from '../src/core/save';

describe('mini tutoriales: datos', () => {
  it('cada uno tiene id único y de 2 a 4 pasos con texto', () => {
    const ids = MINI_TUTORIALS.map((m) => m.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const m of MINI_TUTORIALS) {
      expect(m.steps.length, m.id).toBeGreaterThanOrEqual(2);
      expect(m.steps.length, m.id).toBeLessThanOrEqual(4);
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
      const found = src.includes(`"${id}"`) || src.includes(`'${id}'`) || [...src.matchAll(/data-testid=\{`([^`$]*)\$\{/g)].some((mm) => mm[1] && id.startsWith(mm[1]));
      expect(found, `no existe data-testid «${id}»`).toBe(true);
    }
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
