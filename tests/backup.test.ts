import { SAVE_VERSION } from '../src/core/save';
import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addCharacter, composeProfile, migrateProfileToSave } from '../src/core/save';
import { backupFileName, backupStatus, backupToCode, backupToJson, buildBackup, ERR_NOT_BACKUP, ERR_TAMPERED, parseBackup, totalExpeditions } from '../src/core/backup';

const json = <T>(x: T): T => JSON.parse(JSON.stringify(x));

function twoHeroes() {
  const a = createProfile('Aldric', 'warrior', { cloak: 1, skin: 0 });
  a.gold = 12480; a.stash[0] = null; delete (a as { goldPhysical?: boolean }).goldPhysical; a.stats.expeditions = 12; a.skins = { owned: ['skin_penitent'], equipped: 'skin_penitent' };
  a.stash[7] = { uid: 'x', itemId: 'iron_sword', qty: 1 };
  const s = migrateProfileToSave(json(a))!;
  return addCharacter(s, createProfile('Mireva', 'mage', { cloak: 2, skin: 1 }))!.save;
}

describe('Copia de seguridad', () => {
  it('archivo: ida y vuelta sin perder nada', () => {
    const s = twoHeroes();
    const r = parseBackup(backupToJson(buildBackup(s, 1_700_000_000_000)));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.backup.summary.map((x) => `${x.name}·${x.className}·${x.level}`)).toEqual(['Aldric·Guerrero·1', 'Mireva·Mago·1']);
    expect(r.save.characters).toHaveLength(2);
    const back = composeProfile(r.save, r.save.characters[0].id)!;
    expect(back.gold).toBe(1248); // 12480 de antes, en monedas
    expect(back.stash[7]?.uid).toBe('x');
    expect(r.save.account.skinsOwned).toEqual(['skin_penitent']);
  });

  it('código de texto: comprimido, sin espacios y se puede pegar partido en líneas', () => {
    const s = twoHeroes();
    const code = backupToCode(buildBackup(s));
    expect(code.startsWith('GV1.')).toBe(true);
    expect(code).not.toMatch(/\s/);
    expect(code.length).toBeLessThan(backupToJson(buildBackup(s)).length / 3);
    const pasted = code.match(/.{1,60}/g)!.join('\n ');
    const r = parseBackup('  ' + pasted + '\n');
    expect(r.ok).toBe(true);
  });

  it('si se edita a mano (más oro), se rechaza', () => {
    const b = json(buildBackup(twoHeroes()));
    b.data.characters[0].gold = 999999;
    const r = parseBackup(JSON.stringify(b));
    expect(r).toEqual({ ok: false, error: ERR_TAMPERED });
    // también si se toca el resumen o la firma
    const b2 = json(buildBackup(twoHeroes())); b2.sig = '0'.repeat(28);
    expect(parseBackup(JSON.stringify(b2)).ok).toBe(false);
  });

  it('un código cortado o con letras cambiadas se rechaza con un mensaje claro', () => {
    const code = backupToCode(buildBackup(twoHeroes()));
    const r = parseBackup(code.slice(0, code.length - 40));
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error).toMatch(/dañada|modificado/);
  });

  it('lo que no es una copia no carga', () => {
    expect(parseBackup('hola')).toEqual({ ok: false, error: ERR_NOT_BACKUP });
    expect(parseBackup('{"a":1}')).toEqual({ ok: false, error: ERR_NOT_BACKUP });
  });

  it('una copia con la partida en un formato anterior se migra al cargarla', () => {
    // Copia «antigua»: los datos son un perfil suelto (formato 2) con el almacén ampliado
    const old = createProfile('Viejo', 'warrior', { cloak: 0, skin: 0 });
    old.gold = 100; delete (old as { goldPhysical?: boolean }).goldPhysical; old.stash = Array.from({ length: 48 }, () => null);
    const b = buildBackup(json(old) as never);
    const r = parseBackup(backupToJson(b));
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.save.version).toBe(SAVE_VERSION);
    expect(composeProfile(r.save, r.save.characters[0].id)!.gold).toBe(60); // (100 + 500 devueltos) ÷ 10
  });

  it('nombre del archivo con la fecha', () => {
    expect(backupFileName(new Date(2026, 10, 5).getTime())).toBe('gravevow-copia-2026-11-05.json');
  });

  it('recordatorio: a los 7 días o a las 10 expediciones desde la última copia', () => {
    const s = twoHeroes();
    const now = Date.now();
    expect(backupStatus(s, now).remind).toBe(true); // nunca se hizo copia y ya hay expediciones
    s.account.backup = { ...s.account.backup, lastAt: now - 2 * 86400000, expeditionsAt: totalExpeditions(s) };
    expect(backupStatus(s, now)).toMatchObject({ days: 2, expeditionsSince: 0, remind: false });
    expect(backupStatus(s, now + 6 * 86400000).remind).toBe(true);
    s.characters[0].stats.expeditions += 10;
    expect(backupStatus(s, now).remind).toBe(true);
  });
});

describe('Copias con el nombre anterior (Crypt Raiders)', () => {
  it('se siguen aceptando', async () => {
        const { emptySave } = await import('../src/core/save');
    const code = backupToCode(buildBackup(emptySave(0)));
    expect(parseBackup('CR1.' + code.slice(4)).ok).toBe(true);
  });
});
