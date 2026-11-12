import { describe, expect, it } from 'vitest';
import { createProfile } from '../src/core/profile';
import { addCharacter, composeProfile, emptySave, migrateProfileToSave, sanitizeSave } from '../src/core/save';
import type { ItemStack } from '../src/core/types';

// Bloque 2, fase 7: lo forjado antes del bloque 2 conserva su calidad y su forjador al cargar.

const forged = (uid: string, quality: number): ItemStack => ({ uid, itemId: 'iron_sword', qty: 1, quality, forgedBy: 'Aldric' });

describe('migración del bloque 2', () => {
  it('una partida guardada conserva la calidad de lo forjado (mochila, almacén y equipo)', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p.backpack[0] = forged('b', 2);
    p.stash[1] = forged('s', 0);
    p.equipment.mainHand = forged('e', 1);
    const added = addCharacter(emptySave(1), p, 0, 1)!;
    const back = sanitizeSave(JSON.parse(JSON.stringify(added.save)), 2)!;
    const q = composeProfile(back, added.id)!;
    expect(q.backpack.find((x) => x?.uid === 'b')).toMatchObject({ quality: 2, forgedBy: 'Aldric' });
    expect(q.stash.find((x) => x?.uid === 's')).toMatchObject({ quality: 0, forgedBy: 'Aldric' });
    expect(q.equipment.mainHand).toMatchObject({ quality: 1, forgedBy: 'Aldric' });
  });

  it('un perfil antiguo (de antes del guardado por personajes) también la conserva', () => {
    const p = createProfile('Aldric', 'warrior', { cloak: 0, skin: 0 });
    p.backpack[0] = forged('b', 2);
    const save = migrateProfileToSave(JSON.parse(JSON.stringify(p)), 1)!;
    const q = composeProfile(save, save.characters[0].id)!;
    expect(q.backpack.find((x) => x?.uid === 'b')).toMatchObject({ quality: 2, forgedBy: 'Aldric' });
  });
});
