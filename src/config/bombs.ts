// ════════════════════════════════════════════════════════════════════
// Bloque 2, fase 6: bombas y frascos. Se lanzan desde la mochila en combate y gastan el turno.
// Sin fuego amigo. El daño usa el mejor de Ataque y Magia de quien la lanza (sirven a las dos clases),
// no se esquiva, y se mitiga con Defensa (metralla y clavos) o Resistencia (fuego). Todo editable.
// ════════════════════════════════════════════════════════════════════
import type { StatusId } from '../core/types';

export interface BombDef {
  /** 'one': el objetivo elegido; 'all': todos los enemigos vivos (como mucho dos). */
  target: 'one' | 'all';
  /** Multiplicador de daño (un ataque básico ronda 1). */
  power: number;
  /** Tipo de daño, para el registro y la mitigación. */
  dmg: 'blunt' | 'cut' | 'fire';
  status?: { id: StatusId; turns: number; chance: number };
  /** Daño ×N contra no muertos. */
  undeadMult?: number;
}

export const BOMBS: Record<string, BombDef> = {
  nail_bomb: { target: 'one', power: 1.3, dmg: 'blunt', status: { id: 'stun', turns: 1, chance: 0.35 } },
  pitch_flask: { target: 'all', power: 0.45, dmg: 'fire', status: { id: 'burn', turns: 3, chance: 1 } },
  silver_shrapnel: { target: 'one', power: 1.6, dmg: 'cut', undeadMult: 2 },
  sulfur_flask: { target: 'all', power: 1.4, dmg: 'fire', status: { id: 'burn', turns: 5, chance: 1 } },
};

export const BOMB_DMG_NAME: Record<BombDef['dmg'], string> = { blunt: 'contundente', cut: 'cortante', fire: 'de fuego' };
