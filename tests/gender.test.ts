import { describe, expect, it } from 'vitest';
import { g, badMarks, className, setTextSex } from '../src/core/gender';
import { fullLook, randomName, NAME_PARTS } from '../src/core/data/appearance';
import { MINI_TUTORIALS } from '../src/core/data/tutorials';
import { TUTORIAL_STEPS } from '../src/core/data/tutorial';
import { WANDERERS, getWanderer } from '../src/core/data/wanderers';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

describe('Concordancia de género', () => {
  it('elige la variante', () => {
    expect(g('Has vuelto cansad{o|a}', 'm')).toBe('Has vuelto cansado');
    expect(g('Has vuelto cansad{o|a}', 'f')).toBe('Has vuelto cansada');
    expect(g('{Justo y honrado|Justa y honrada}.', 'f')).toBe('Justa y honrada.');
    expect(g('Sin marcas', 'f')).toBe('Sin marcas');
    expect(g('Llaves {sueltas} sin barra', 'f')).toBe('Llaves {sueltas} sin barra');
  });
  it('usa el género del personaje en juego', () => {
    setTextSex('f'); expect(g('viv{o|a}')).toBe('viva');
    expect(getWanderer('kael').lines.greet.some((l) => l.includes('viva'))).toBe(true);
    setTextSex(undefined); expect(g('viv{o|a}')).toBe('vivo');
  });
  it('nombres de clase', () => {
    expect(className('warrior', 'f')).toBe('Guerrera');
    expect(className('mage', 'f')).toBe('Maga');
    expect(className('mage', undefined)).toBe('Mago');
  });
  it('los textos de datos tienen las marcas bien cerradas', () => {
    const texts: string[] = [];
    for (const m of MINI_TUTORIALS) for (const s of m.steps) texts.push(s.text, s.touch ?? '');
    for (const s of TUTORIAL_STEPS) texts.push(s.desktop, s.touch);
    for (const w of Object.values(WANDERERS)) texts.push(...Object.values(w.lines).flat().filter((x): x is string => typeof x === 'string'));
    expect(texts.flatMap(badMarks)).toEqual([]);
  });
  it('ninguna marca del código queda a medias', () => {
    const bad: string[] = [];
    const walk = (d: string) => { for (const f of readdirSync(d)) { const p = join(d, f); if (statSync(p).isDirectory()) walk(p); else if (/\.tsx?$/.test(p)) {
      for (const m of readFileSync(p, 'utf8').matchAll(/\{[a-záéíóúñ ]*\|[a-záéíóúñ ]*\}/gi)) if (!/^\{[^{}|]*\|[^{}|]*\}$/.test(m[0])) bad.push(`${p}: ${m[0]}`);
    } } };
    walk('src');
    expect(bad).toEqual([]);
  });
});

describe('Aspecto', () => {
  it('los personajes antiguos quedan como estaban', () => {
    expect(fullLook('warrior', { cloak: 2, skin: 1 })).toEqual({ cloak: 2, skin: 1, sex: 'm', hair: 1, style: 0, beard: 0 });
    expect(fullLook('mage', { cloak: 0, skin: 0 }).hair).toBe(5);
  });
  it('nombres al azar según el género', () => {
    let i = 0; const r = () => ((i++ * 0.37) % 1);
    for (let k = 0; k < 20; k++) {
      const f = randomName('f', r);
      expect(NAME_PARTS.f.some((e) => f.endsWith(e))).toBe(true);
      expect(f.length).toBeLessThanOrEqual(18);
    }
  });
});
