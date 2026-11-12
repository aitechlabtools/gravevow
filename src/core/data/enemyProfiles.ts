// Perfil de combate de cada criatura (bloque 1): a qué zonas apunta, de qué tipo es su golpe básico y si es fuerte.
// Élites y jefes ya son fuertes por serlo. Las habilidades toman su tipo de SKILL_DAMAGE o, si no está, de su efecto.
import type { DamageType, ZoneProfile } from '../../config/damage';

export interface EnemyProfile {
  profile: ZoneProfile;
  /** Tipo del golpe básico (si no, sale de su efecto visual). */
  basic?: DamageType;
  /** Criatura fuerte aunque sea común: puede alcanzar zonas vitales desde el principio. */
  strong?: boolean;
  /** Criatura enorme: sus mordiscos también rompen huesos. */
  huge?: boolean;
}

export const ENEMY_PROFILE: Record<string, EnemyProfile> = {
  // S1 · Afueras
  bandit: { profile: 'humanoid' },
  renegade_archer: { profile: 'humanoid', basic: 'pierce' },
  starving_wolf: { profile: 'beast' },
  carrion_crow: { profile: 'flyer', basic: 'pierce' },
  bandit_captain: { profile: 'humanoid' },
  mordrek: { profile: 'humanoid' },
  // S2 · Castillo
  skeleton: { profile: 'humanoid' },
  hollow_armor: { profile: 'humanoid' },
  hanged_servant: { profile: 'humanoid', basic: 'cut' },
  bat: { profile: 'flyer' },
  fallen_guard_knight: { profile: 'humanoid' },
  burned_seneschal: { profile: 'humanoid', basic: 'blunt' },
  // S3 · Calabozos
  ossuary_rat: { profile: 'crawler' },
  torturer: { profile: 'humanoid' },
  mad_prisoner: { profile: 'humanoid', basic: 'cut' },
  pit_worm: { profile: 'crawler' },
  executioner: { profile: 'humanoid' },
  ossuary_lord: { profile: 'large' },
  // S4 · Osario
  ghoul: { profile: 'beast' },
  bone_archer: { profile: 'humanoid', basic: 'pierce' },
  bone_colossus: { profile: 'large', strong: true },
  ossuary_monk: { profile: 'humanoid' },
  bone_abbot: { profile: 'humanoid' },
  tomb_knight: { profile: 'humanoid' },
  // S5 · Catacumbas
  wraith: { profile: 'flyer' },
  drowned: { profile: 'humanoid', basic: 'blunt' },
  crypt_leech: { profile: 'crawler' },
  mourner: { profile: 'flyer' },
  water_lady: { profile: 'flyer' },
  black_ferryman: { profile: 'large' },
  // S6 · Panteón
  necro_priest: { profile: 'humanoid' },
  tomb_guardian: { profile: 'humanoid' },
  embalmed_noble: { profile: 'humanoid', basic: 'pierce' },
  marble_gargoyle: { profile: 'large', strong: true },
  spectral_duelist: { profile: 'humanoid', basic: 'pierce' },
  veiled_queen: { profile: 'flyer' },
  // S7 · Carmesí
  ember_imp: { profile: 'flyer', basic: 'cut' },
  flame_cultist: { profile: 'humanoid' },
  bleeding_ghoul: { profile: 'beast' },
  flayed_penitent: { profile: 'humanoid' },
  umbral_priest: { profile: 'humanoid' },
  vharok: { profile: 'large' },
  // S8 · Puertas
  abyss_hound: { profile: 'beast' },
  sulfur_caller: { profile: 'humanoid' },
  magma_elemental: { profile: 'large', basic: 'blunt', strong: true },
  obsidian_gargoyle: { profile: 'large', strong: true },
  hound_master: { profile: 'humanoid' },
  ignaroth: { profile: 'large' },
  // S9 · Ríos
  pit_temptress: { profile: 'humanoid' },
  hell_knight: { profile: 'humanoid' },
  flayer: { profile: 'humanoid', basic: 'pierce' },
  burning_soul: { profile: 'flyer' },
  sulfur_beast: { profile: 'large', huge: true },
  // S10 · Trono
  pit_lord: { profile: 'large', strong: true },
  chained_herald: { profile: 'humanoid' },
  abyss_spawn: { profile: 'beast' },
  soul_devourer: { profile: 'flyer' },
  chain_warden: { profile: 'humanoid' },
  belzar_herald: { profile: 'humanoid' },
  belzar: { profile: 'large' },
};

/** Habilidades cuyo tipo no coincide con su efecto visual. */
export const SKILL_DAMAGE: Record<string, DamageType> = {
  aimed_shot: 'pierce', piercing_shot: 'pierce', thrust: 'pierce', backstab: 'pierce', venom_strike: 'pierce',
  hell_cleave: 'cut',
};

/** Perfil de quien no está en la lista (errantes, mercenarios traidores…): humanoide. */
export const DEFAULT_PROFILE: EnemyProfile = { profile: 'humanoid' };
