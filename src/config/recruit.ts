// EQUIPO DE RECLUTA (Bloque 1, fase 9). Lo presta el Bastión cuando vuelves sin arma o sin armadura.
// `gear` rellena solo las ranuras vacías; `supplies` completa la mochila hasta esas cantidades (no se acumula).
import type { ClassId } from '../core/types';

export interface RecruitKit { gear: string[]; supplies: { itemId: string; qty: number }[] }

const SUPPLIES = [{ itemId: 'bandage', qty: 2 }, { itemId: 'stale_bread', qty: 1 }, { itemId: 'water', qty: 1 }];

export const RECRUIT_KITS: Partial<Record<ClassId, RecruitKit>> = {
  warrior: { gear: ['recruit_sword', 'plank_shield', 'recruit_doublet'], supplies: SUPPLIES },
  mage: { gear: ['recruit_staff', 'worn_grimoire', 'recruit_robe'], supplies: SUPPLIES },
};

export const RECRUIT_NOTE = 'Has vuelto sin nada. El Bastión te presta lo justo para volver a bajar.';
