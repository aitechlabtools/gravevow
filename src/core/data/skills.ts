import type { SkillDef } from '../types';

// Habilidades del juego. Cada una pertenece a una fuente:
//  · Clase: siempre disponible (1 por clase).
//  · Arma: la concede el arma equipada.
//  · Secundaria: la conceden escudos y tomos (las defensivas solo existen si los llevas).
//  · Criaturas: solo las usan los enemigos.
export const SKILLS: Record<string, SkillDef> = {
  // ── Clase ──
  war_cry: { id: 'war_cry', name: 'Grito de guerra', description: 'Tu rabia sube: causas un 30% más de daño durante 3 turnos.', cost: 4, target: 'self', applies: [{ status: 'empower', chance: 1, turns: 3, self: true }], fx: 'holy' },
  meditation: { id: 'meditation', name: 'Meditación', description: 'Recuperas cerca del 40% de tu maná a cambio del turno.', cost: 0, target: 'self', manaGain: 18, fx: 'holy' },
  shadow_veil: { id: 'shadow_veil', name: 'Velo de sombras', description: 'Te ocultas: recibes un 40% menos de daño durante 2 turnos.', cost: 3, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 2, self: true }], fx: 'dark' },
  prayer: { id: 'prayer', name: 'Plegaria', description: 'Recuperas un 25% de tu vida.', cost: 5, target: 'self', healPct: 0.25, fx: 'holy' },

  // ── Clase: Guerrero (se desbloquean a elegir en los niveles 20, 40, 60 y 80) ──
  bloodthirst: { id: 'bloodthirst', name: 'Sed de sangre', description: 'Golpe (x1.3) que te cura la mitad del daño hecho.', cost: 4, cooldown: 3, target: 'enemy', kind: 'physical', power: 1.3, lifesteal: 0.5, fx: 'slash' },
  hold_line: { id: 'hold_line', name: 'Aguantar la línea', description: 'Durante 2 turnos recibes un 40% menos de daño y no puedes bajar de 1 de vida.', cost: 4, cooldown: 6, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 2, self: true }, { status: 'endure', chance: 1, turns: 2, self: true }], fx: 'shield' },
  steel_whirl: { id: 'steel_whirl', name: 'Torbellino de acero', description: 'Golpeas a todos los enemigos (x1.2) y les haces sangrar.', cost: 5, cooldown: 4, target: 'enemy', kind: 'physical', power: 1.2, aoe: true, applies: [{ status: 'bleed', chance: 0.8, turns: 3 }], fx: 'slash' },
  last_bastion: { id: 'last_bastion', name: 'Último bastión', description: 'Durante 2 turnos no puedes bajar de 1 de vida y causas un 30% más de daño.', cost: 6, cooldown: 9, target: 'self', applies: [{ status: 'endure', chance: 1, turns: 2, self: true }, { status: 'empower', chance: 1, turns: 2, self: true }], fx: 'holy' },
  // ── Clase: Mago ──
  mana_shield: { id: 'mana_shield', name: 'Escudo de maná', description: 'Un escudo absorbe daño igual al 30% de tu vida máxima durante 3 turnos.', cost: 4, cooldown: 3, target: 'self', shieldPct: 0.3, applies: [{ status: 'ward', chance: 1, turns: 3, self: true }], fx: 'shield' },
  blink: { id: 'blink', name: 'Parpadeo', description: 'Esquivas el próximo ataque y causas un 30% más de daño durante 2 turnos.', cost: 3, cooldown: 3, target: 'self', applies: [{ status: 'evade', chance: 1, turns: 2, self: true }, { status: 'empower', chance: 1, turns: 2, self: true }], fx: 'dark' },
  curse_weakness: { id: 'curse_weakness', name: 'Maldición de debilidad', description: 'Daño mágico (x1.0) y el enemigo causa un 30% menos de daño durante 3 turnos.', cost: 4, cooldown: 4, target: 'enemy', kind: 'magical', power: 1.0, applies: [{ status: 'weaken', chance: 1, turns: 3 }], fx: 'dark' },
  blood_pact: { id: 'blood_pact', name: 'Pacto de sangre', description: 'Pierdes el 15% de tu vida máxima y todas tus otras recargas vuelven a 0.', cost: 0, cooldown: 7, target: 'self', selfDamagePct: 0.15, resetCooldowns: true, fx: 'dark' },
  abyss_comet: { id: 'abyss_comet', name: 'Cometa del abismo', description: 'Daño mágico enorme (x3) que siempre quema durante 3 turnos.', cost: 8, cooldown: 8, target: 'enemy', kind: 'magical', power: 3, applies: [{ status: 'burn', chance: 1, turns: 3 }], fx: 'fire' },

  // ── Armas de las subzonas (C4) ──
  impale: { id: 'impale', name: 'Empalar', description: 'Lanzada profunda (x1.5) que hace sangrar.', cost: 3, cooldown: 3, target: 'enemy', kind: 'physical', power: 1.5, applies: [{ status: 'bleed', chance: 0.8, turns: 3 }], fx: 'slash' },
  keep_at_bay: { id: 'keep_at_bay', name: 'Mantener a raya', description: 'Golpe (x0.8) y recibes un 40% menos de daño 2 turnos.', cost: 2, cooldown: 2, target: 'enemy', kind: 'physical', power: 0.8, applies: [{ status: 'protect', chance: 1, turns: 2, self: true }], fx: 'slash' },
  sweep: { id: 'sweep', name: 'Barrido', description: 'Barrido bajo (x1.1) con 25% de aturdir.', cost: 2, cooldown: 2, target: 'enemy', kind: 'physical', power: 1.1, applies: [{ status: 'stun', chance: 0.25, turns: 1 }], fx: 'smash' },
  crush: { id: 'crush', name: 'Aplastar', description: 'Golpe (x1.4) que le rompe la armadura: recibe un 25% más de daño 2 turnos.', cost: 3, cooldown: 2, target: 'enemy', kind: 'physical', power: 1.4, applies: [{ status: 'sunder', chance: 1, turns: 2 }], fx: 'smash' },
  dull_blow: { id: 'dull_blow', name: 'Golpe sordo', description: 'Golpe (x0.9) con 50% de aturdir.', cost: 3, cooldown: 3, target: 'enemy', kind: 'physical', power: 0.9, applies: [{ status: 'stun', chance: 0.5, turns: 1 }], fx: 'smash' },
  hammer_blow: { id: 'hammer_blow', name: 'Martillazo', description: 'Golpe demoledor (x1.9).', cost: 4, cooldown: 4, target: 'enemy', kind: 'physical', power: 1.9, fx: 'smash' },
  parry_stab: { id: 'parry_stab', name: 'Puñalada', description: 'Puñalada rápida (x0.9) que no se puede esquivar.', cost: 1, cooldown: 1, target: 'enemy', kind: 'physical', power: 0.9, ignoresEvasion: true, fx: 'slash' },
  arcane_pulse: { id: 'arcane_pulse', name: 'Pulso', description: 'Daño mágico (x1.0).', cost: 2, cooldown: 1, target: 'enemy', kind: 'magical', power: 1.0, fx: 'dark' },
  focus: { id: 'focus', name: 'Foco', description: 'Concentras tu poder: causas un 30% más de daño durante 2 turnos.', cost: 2, cooldown: 3, target: 'self', applies: [{ status: 'empower', chance: 1, turns: 2, self: true }], fx: 'holy' },
  life_siphon: { id: 'life_siphon', name: 'Sifón vital', description: 'Daño mágico (x0.9) y te curas la mitad del daño hecho.', cost: 3, cooldown: 2, target: 'enemy', kind: 'magical', power: 0.9, lifesteal: 0.5, fx: 'dark' },
  torch_burn: { id: 'torch_burn', name: 'Quemar', description: 'Golpe con la antorcha (x0.8, fuego) con 70% de quemar.', cost: 2, cooldown: 1, target: 'enemy', kind: 'magical', power: 0.8, applies: [{ status: 'burn', chance: 0.7, turns: 3 }], fx: 'fire' },
  scare: { id: 'scare', name: 'Ahuyentar', description: 'Le acercas el fuego a la cara: causa un 30% menos de daño 2 turnos.', cost: 2, cooldown: 3, target: 'enemy', applies: [{ status: 'weaken', chance: 1, turns: 2 }], fx: 'fire' },
  sepulchral_bolt: { id: 'sepulchral_bolt', name: 'Saeta sepulcral', description: 'Magia oscura (x1.3).', cost: 3, cooldown: 1, target: 'enemy', kind: 'magical', power: 1.3, fx: 'dark' },
  // ── Especiales únicos de las legendarias ──
  veil_lament: { id: 'veil_lament', name: 'Lamento velado', description: 'Magia (x1.2) con 60% de congelar; te protege (-40% de daño) 2 turnos.', cost: 4, cooldown: 4, target: 'enemy', kind: 'magical', power: 1.2, applies: [{ status: 'freeze', chance: 0.6, turns: 1 }, { status: 'protect', chance: 1, turns: 2, self: true }], fx: 'frost' },
  living_forge: { id: 'living_forge', name: 'Forja viva', description: 'Martillazo (x1.8) que siempre quema y aturde un 40%.', cost: 5, cooldown: 4, target: 'enemy', kind: 'physical', power: 1.8, applies: [{ status: 'burn', chance: 1, turns: 3 }, { status: 'stun', chance: 0.4, turns: 1 }], fx: 'fire' },
  drag_abyss: { id: 'drag_abyss', name: 'Arrastrar al abismo', description: 'Latigazo de cadena (x2.5) que ignora la defensa y aturde un 50%.', cost: 6, cooldown: 6, target: 'enemy', kind: 'physical', power: 2.5, armorPierce: 1, applies: [{ status: 'stun', chance: 0.5, turns: 1 }], fx: 'dark' },
  void_gaze: { id: 'void_gaze', name: 'Mirada del vacío', description: 'Magia (x1.0); el enemigo causa un 30% menos de daño 3 turnos y le rompes la armadura.', cost: 4, cooldown: 4, target: 'enemy', kind: 'magical', power: 1.0, applies: [{ status: 'weaken', chance: 1, turns: 3 }, { status: 'sunder', chance: 1, turns: 2 }], fx: 'dark' },
  obsidian_cleave: { id: 'obsidian_cleave', name: 'Tajo de obsidiana', description: 'Tajo enorme (x2.2) que ignora la mitad de la defensa y hace sangrar.', cost: 5, cooldown: 4, target: 'enemy', kind: 'physical', power: 2.2, armorPierce: 0.5, applies: [{ status: 'bleed', chance: 1, turns: 3 }], fx: 'slash' },
  brimstone_storm: { id: 'brimstone_storm', name: 'Tormenta de azufre', description: 'Fuego (x2.0) contra todos los enemigos con 70% de quemar.', cost: 6, cooldown: 5, target: 'enemy', kind: 'magical', power: 2.0, aoe: true, applies: [{ status: 'burn', chance: 0.7, turns: 3 }], fx: 'fire' },

  // ── Puños (sin arma) ──
  wild_swing: { id: 'wild_swing', name: 'Golpe a lo loco', description: 'Puñetazo con todo el cuerpo (x1.1).', cost: 2, target: 'enemy', kind: 'physical', power: 1.1, fx: 'smash' },
  // ── Mano izquierda vacía ──
  brace: { id: 'brace', name: 'Guardia', description: 'Te cubres con el brazo: -40% de daño durante 1 turno.', cost: 1, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 1, self: true }], fx: 'shield' },
  shove: { id: 'shove', name: 'Empujón', description: 'Empujas al enemigo (x0.5) con 20% de aturdir.', cost: 2, target: 'enemy', kind: 'physical', power: 0.5, applies: [{ status: 'stun', chance: 0.2, turns: 1 }], fx: 'smash' },
  low_blow: { id: 'low_blow', name: 'Golpe bajo', description: 'Golpe sucio (x0.5) con 25% de aturdir.', cost: 2, target: 'enemy', kind: 'physical', power: 0.5, applies: [{ status: 'stun', chance: 0.25, turns: 1 }], fx: 'smash' },

  // ── Espadas ──
  rending_slash: { id: 'rending_slash', name: 'Tajo desgarrador', description: 'Golpe potente (x1.4) que provoca sangrado durante 3 turnos.', cost: 5, target: 'enemy', kind: 'physical', power: 1.4, applies: [{ status: 'bleed', chance: 0.8, turns: 3 }], fx: 'slash' },
  thrust: { id: 'thrust', name: 'Estocada', description: 'Ataque preciso (x1.2) que no se puede esquivar.', cost: 3, target: 'enemy', kind: 'physical', power: 1.2, ignoresEvasion: true, fx: 'slash' },
  pommel_strike: { id: 'pommel_strike', name: 'Golpe de pomo', description: 'Golpe seco (x0.8) con 40% de aturdir.', cost: 4, target: 'enemy', kind: 'physical', power: 0.8, applies: [{ status: 'stun', chance: 0.4, turns: 1 }], fx: 'smash' },
  dread_cut: { id: 'dread_cut', name: 'Corte del pavor', description: 'Tajo terrible (x2.0) que siempre hace sangrar.', cost: 8, target: 'enemy', kind: 'physical', power: 2.0, applies: [{ status: 'bleed', chance: 1, turns: 3 }], fx: 'slash' },

  // ── Hachas ──
  brutal_blow: { id: 'brutal_blow', name: 'Golpe brutal', description: 'Golpe (x1.4) que ignora la mitad de la defensa.', cost: 5, target: 'enemy', kind: 'physical', power: 1.4, armorPierce: 0.5, fx: 'smash' },
  skull_splitter: { id: 'skull_splitter', name: 'Partecráneos', description: 'Golpe (x1.2) con 35% de aturdir.', cost: 6, target: 'enemy', kind: 'physical', power: 1.2, applies: [{ status: 'stun', chance: 0.35, turns: 1 }], fx: 'smash' },
  reaping: { id: 'reaping', name: 'Siega', description: 'Barrido demoledor (x1.8) que ignora parte de la defensa.', cost: 8, target: 'enemy', kind: 'physical', power: 1.8, armorPierce: 0.3, fx: 'slash' },

  // ── Dagas ──
  venom_strike: { id: 'venom_strike', name: 'Estocada venenosa', description: 'Ataque (x1.1) con 70% de envenenar durante 3 turnos.', cost: 4, target: 'enemy', kind: 'physical', power: 1.1, applies: [{ status: 'poison', chance: 0.7, turns: 3 }], fx: 'poison' },
  backstab: { id: 'backstab', name: 'Puñalada traicionera', description: 'Golpe preciso (x1.7) que ignora la evasión.', cost: 6, target: 'enemy', kind: 'physical', power: 1.7, ignoresEvasion: true, fx: 'slash' },

  // ── Báculos ──
  spark: { id: 'spark', name: 'Chispa', description: 'Daño mágico (x1.0) con 25% de quemar.', cost: 3, target: 'enemy', kind: 'magical', power: 1.0, applies: [{ status: 'burn', chance: 0.25, turns: 2 }], fx: 'fire' },
  frost_lance: { id: 'frost_lance', name: 'Lanza de escarcha', description: 'Daño mágico (x1.2). 40% de congelar al objetivo un turno.', cost: 5, target: 'enemy', kind: 'magical', power: 1.2, applies: [{ status: 'freeze', chance: 0.4, turns: 1 }], fx: 'frost' },
  fireball: { id: 'fireball', name: 'Bola de fuego', description: 'Daño mágico alto (x1.7). 50% de quemar durante 3 turnos.', cost: 7, target: 'enemy', kind: 'magical', power: 1.7, applies: [{ status: 'burn', chance: 0.5, turns: 3 }], fx: 'fire' },
  ember_rain: { id: 'ember_rain', name: 'Lluvia de ascuas', description: 'Daño mágico (x1.1) con 80% de quemar durante 3 turnos.', cost: 6, target: 'enemy', kind: 'magical', power: 1.1, applies: [{ status: 'burn', chance: 0.8, turns: 3 }], fx: 'fire' },
  blizzard: { id: 'blizzard', name: 'Ventisca', description: 'Daño mágico alto (x1.6) con 35% de congelar.', cost: 9, target: 'enemy', kind: 'magical', power: 1.6, applies: [{ status: 'freeze', chance: 0.35, turns: 1 }], fx: 'frost' },
  ice_prison: { id: 'ice_prison', name: 'Prisión de hielo', description: 'Poco daño (x0.6), pero 80% de congelar.', cost: 6, target: 'enemy', kind: 'magical', power: 0.6, applies: [{ status: 'freeze', chance: 0.8, turns: 1 }], fx: 'frost' },
  dark_nova: { id: 'dark_nova', name: 'Nova oscura', description: 'Estallido de magia prohibida (x2.2).', cost: 14, target: 'enemy', kind: 'magical', power: 2.2, fx: 'dark' },

  // ── Mazas ──
  holy_light: { id: 'holy_light', name: 'Luz sagrada', description: 'Daño mágico (x1.2), el doble contra no-muertos.', cost: 5, target: 'enemy', kind: 'magical', power: 1.2, bonusVsUndead: 2, fx: 'holy' },

  // ── Escudos ──
  block: { id: 'block', name: 'Bloqueo', description: 'Levantas el escudo: el próximo golpe se reduce un 85% y los demás, a la mitad, hasta tu siguiente turno.', cost: 2, target: 'self', applies: [{ status: 'block', chance: 1, turns: 2, self: true }], fx: 'shield' },
  shield_bash: { id: 'shield_bash', name: 'Embestida', description: 'Golpe con el escudo (x0.7) con 40% de aturdir.', cost: 4, target: 'enemy', kind: 'physical', power: 0.7, applies: [{ status: 'stun', chance: 0.4, turns: 1 }], fx: 'smash' },
  iron_wall: { id: 'iron_wall', name: 'Muro de hierro', description: 'Te proteges (-40% de daño) y regeneras vida durante 3 turnos.', cost: 5, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 3, self: true }, { status: 'regen', chance: 1, turns: 3, self: true }], fx: 'shield' },

  // ── Tomos ──
  arcane_barrier: { id: 'arcane_barrier', name: 'Barrera arcana', description: 'Un escudo de luz: -40% de daño durante 3 turnos.', cost: 5, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 3, self: true }], fx: 'shield' },
  mana_siphon: { id: 'mana_siphon', name: 'Sifón de maná', description: 'Daño mágico (x0.9) y recuperas algo de maná (cerca del 20%).', cost: 0, target: 'enemy', kind: 'magical', power: 0.9, manaGain: 10, fx: 'dark' },

  // ── Clérigo (preparado) ──
  sanctuary: { id: 'sanctuary', name: 'Santuario', description: 'Cura un 30% de tu vida y te protege 2 turnos.', cost: 6, target: 'self', healPct: 0.3, applies: [{ status: 'protect', chance: 1, turns: 2, self: true }], fx: 'holy' },

  // ── Criaturas ──
  bone_bash: { id: 'bone_bash', name: 'Golpe óseo', description: 'Golpe contundente con 25% de aturdir.', cost: 0, target: 'enemy', kind: 'physical', power: 1.3, applies: [{ status: 'stun', chance: 0.25, turns: 1 }], fx: 'smash' },
  leech_bite: { id: 'leech_bite', name: 'Mordisco sangrante', description: 'Mordisco con 50% de sangrado.', cost: 0, target: 'enemy', kind: 'physical', power: 0.9, applies: [{ status: 'bleed', chance: 0.5, turns: 2 }], fx: 'bite' },
  grave_slam: { id: 'grave_slam', name: 'Losa funeraria', description: 'Golpe devastador con 30% de aturdir.', cost: 0, target: 'enemy', kind: 'physical', power: 1.6, applies: [{ status: 'stun', chance: 0.3, turns: 1 }], fx: 'smash' },
  necrotic_wave: { id: 'necrotic_wave', name: 'Onda necrótica', description: 'Magia oscura con 60% de veneno.', cost: 0, target: 'enemy', kind: 'magical', power: 1.2, applies: [{ status: 'poison', chance: 0.6, turns: 3 }], fx: 'dark' },
  bone_shield: { id: 'bone_shield', name: 'Escudo de huesos', description: 'Se protege durante 2 turnos.', cost: 0, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 2, self: true }], fx: 'shield' },
  // ── Criaturas de la Mazmorra ──
  dirty_cut: { id: 'dirty_cut', name: 'Corte sucio', description: 'Cuchillada traicionera con 50% de sangrado.', cost: 0, target: 'enemy', kind: 'physical', power: 1.0, applies: [{ status: 'bleed', chance: 0.5, turns: 2 }], fx: 'slash' },
  aimed_shot: { id: 'aimed_shot', name: 'Disparo certero', description: 'Flecha (x1.3) que no se puede esquivar.', cost: 0, target: 'enemy', kind: 'physical', power: 1.3, ignoresEvasion: true, fx: 'slash' },
  plague_bite: { id: 'plague_bite', name: 'Mordisco pestilente', description: 'Mordisco con 70% de veneno.', cost: 0, target: 'enemy', kind: 'physical', power: 0.8, applies: [{ status: 'poison', chance: 0.7, turns: 3 }], fx: 'bite' },
  rally_cry: { id: 'rally_cry', name: 'Grito de mando', description: 'Se enfurece: +30% de daño durante 3 turnos.', cost: 0, target: 'self', applies: [{ status: 'empower', chance: 1, turns: 3, self: true }], fx: 'holy' },
  // ── Criaturas de la Cripta ──
  wail: { id: 'wail', name: 'Lamento helado', description: 'Grito espectral (mágico) con 35% de congelar.', cost: 0, target: 'enemy', kind: 'magical', power: 1.1, applies: [{ status: 'freeze', chance: 0.35, turns: 1 }], fx: 'frost' },
  rotting_claw: { id: 'rotting_claw', name: 'Garra putrefacta', description: 'Zarpazo con 60% de veneno.', cost: 0, target: 'enemy', kind: 'physical', power: 1.1, applies: [{ status: 'poison', chance: 0.6, turns: 3 }], fx: 'bite' },
  grave_bolt: { id: 'grave_bolt', name: 'Saeta sepulcral', description: 'Magia oscura (x1.3).', cost: 0, target: 'enemy', kind: 'magical', power: 1.3, fx: 'dark' },
  dark_mend: { id: 'dark_mend', name: 'Remiendo oscuro', description: 'Se cura un 20% de la vida.', cost: 0, target: 'self', healPct: 0.2, fx: 'dark' },
  piercing_shot: { id: 'piercing_shot', name: 'Flecha de hueso', description: 'Disparo (x1.2) que ignora la mitad de la defensa.', cost: 0, target: 'enemy', kind: 'physical', power: 1.2, armorPierce: 0.5, fx: 'slash' },
  veil: { id: 'veil', name: 'Velo fúnebre', description: 'Se envuelve en su velo: -40% de daño 3 turnos.', cost: 0, target: 'self', applies: [{ status: 'protect', chance: 1, turns: 3, self: true }], fx: 'dark' },
  lament: { id: 'lament', name: 'Lamento de la Reina', description: 'Magia (x1.4) con 50% de congelar.', cost: 0, target: 'enemy', kind: 'magical', power: 1.4, applies: [{ status: 'freeze', chance: 0.5, turns: 1 }], fx: 'frost' },
  // ── Criaturas del Infierno ──
  ember_spit: { id: 'ember_spit', name: 'Escupitajo de brasas', description: 'Fuego (mágico) con 70% de quemar.', cost: 0, target: 'enemy', kind: 'magical', power: 0.9, applies: [{ status: 'burn', chance: 0.7, turns: 3 }], fx: 'fire' },
  savage_maul: { id: 'savage_maul', name: 'Dentellada doble', description: 'Muerde dos veces seguidas (x1.8) con 40% de sangrado.', cost: 0, target: 'enemy', kind: 'physical', power: 1.8, applies: [{ status: 'bleed', chance: 0.4, turns: 2 }], fx: 'bite' },
  mesmerize: { id: 'mesmerize', name: 'Mirada del pozo', description: 'Magia (x0.8) con 50% de aturdir.', cost: 0, target: 'enemy', kind: 'magical', power: 0.8, applies: [{ status: 'stun', chance: 0.5, turns: 1 }], fx: 'dark' },
  hell_cleave: { id: 'hell_cleave', name: 'Tajo infernal', description: 'Golpe (x1.5) que ignora parte de la defensa.', cost: 0, target: 'enemy', kind: 'physical', power: 1.5, armorPierce: 0.3, fx: 'smash' },
  brimstone: { id: 'brimstone', name: 'Lluvia de azufre', description: 'Fuego (mágico, x1.3) con 60% de quemar.', cost: 0, target: 'enemy', kind: 'magical', power: 1.3, applies: [{ status: 'burn', chance: 0.6, turns: 3 }], fx: 'fire' },
  chain_bind: { id: 'chain_bind', name: 'Cadenas del abismo', description: 'Golpe con 60% de aturdir.', cost: 0, target: 'enemy', kind: 'physical', power: 1.0, applies: [{ status: 'stun', chance: 0.6, turns: 1 }], fx: 'smash' },
  hellfire: { id: 'hellfire', name: 'Fuego del abismo', description: 'Fuego (mágico, x1.7) con 80% de quemar.', cost: 0, target: 'enemy', kind: 'magical', power: 1.7, applies: [{ status: 'burn', chance: 0.8, turns: 3 }], fx: 'fire' },
  abyssal_rage: { id: 'abyssal_rage', name: 'Furia abisal', description: 'Su ira crece: +30% de daño 3 turnos.', cost: 0, target: 'self', applies: [{ status: 'empower', chance: 1, turns: 3, self: true }], fx: 'dark' },
};

/** Turnos de recarga de las habilidades del jugador (editable). Las de las criaturas no tienen. */
export const COOLDOWNS: Record<string, number> = {
  // Clase
  war_cry: 4, meditation: 3, shadow_veil: 3, prayer: 4, sanctuary: 5,
  // Sin arma
  low_blow: 1, wild_swing: 1, brace: 1, shove: 1,
  // Espadas, hachas y dagas
  rending_slash: 2, thrust: 1, pommel_strike: 2, dread_cut: 4,
  brutal_blow: 2, skull_splitter: 3, reaping: 4,
  venom_strike: 2, backstab: 3,
  // Báculos y mazas
  spark: 1, frost_lance: 1, fireball: 2, ember_rain: 3, blizzard: 3, ice_prison: 4, dark_nova: 5, holy_light: 2,
  // Mano izquierda
  block: 1, shield_bash: 2, iron_wall: 5, arcane_barrier: 4, mana_siphon: 2,
};
/** Con recargas, el coste baja: los especiales cuestan de 2 a 4 y las habilidades fuertes algo más. */
export const COST_WITH_COOLDOWN = 0.5;
for (const [id, cd] of Object.entries(COOLDOWNS)) {
  const sk = SKILLS[id];
  if (!sk) continue;
  sk.cooldown = cd;
  if (sk.cost > 0) sk.cost = Math.max(1, Math.round(sk.cost * COST_WITH_COOLDOWN));
}

export function getSkill(id: string): SkillDef {
  const s = SKILLS[id];
  if (!s) throw new Error(`Habilidad desconocida: ${id}`);
  return s;
}
