// ESTACIONES DEL REFUGIO (bloque 2, parte 2.1). Encargados, coste y beneficio de cada nivel. Todo editable.
//  · Nivel 0 = bloqueada (se usa la alternativa básica). Nivel 1 = desbloqueo simbólico (una o dos bajadas a S1).
//  · Niveles 2 y 3 = mejoras caras, con materiales de subzonas más hondas.
//  · El Catre empieza en nivel 1. Lo construye y mejora siempre su encargado, que cobra materiales y oro.
//  · Los materiales del nivel 1 salen en S1: chatarra y retales (desguazando lo que encuentras), setas y agua (Garth),
//    mena de cobre (vetas), polvo de hueso y esquirlas arcanas (enemigos y desguace de equipo de Mago).
import type { VendorId } from '../core/data/vendors';

// Bastión unificado (14/11): una estación por mercader. El Catre pasa a Grizk (hostal de mercenarios: dormir cuesta oro),
// la Forja de Brand se queda con armas, lingotes y anillos; Valerius tiene la Forja de armaduras; Nira, la Curtiduría
// (cuero y tela, antes en el Banco de Orik) y Eldrin, el Laboratorio (la Mesa de alquimia y el Atril rúnico, unidos).
export type StationId = 'cot' | 'kitchen' | 'bench' | 'infirmary' | 'forge' | 'alchemy' | 'tannery' | 'armory';

export interface StationLevel {
  name: string;
  /** Qué da este nivel (se lee antes de pagar). */
  effect: string;
  /** Coste para llegar a este nivel (lo cobra el encargado). */
  cost?: { items: { itemId: string; qty: number }[]; gold: number };
}

export interface StationDef {
  id: StationId;
  name: string;
  icon: string;
  /** Para qué sirve, en una línea. */
  purpose: string;
  /** Lo que hay mientras sigue en ruinas (nadie se queda sin la función básica). */
  fallback: string;
  by: VendorId;
  /** Frase del encargado al reconstruir (nivel 1) y al mejorar (2 y 3). */
  lines: [string, string, string];
  /** Índice = nivel (0 a 3). */
  levels: [StationLevel, StationLevel, StationLevel, StationLevel];
}

const c = (gold: number, ...items: [string, number][]) => ({ gold, items: items.map(([itemId, qty]) => ({ itemId, qty })) });

export const STATIONS: Record<StationId, StationDef> = {
  cot: {
    id: 'cot', name: 'Catre', icon: '🛏', by: 'grizk',
    purpose: 'La cama de la lonja, donde duermen los que venden su espada. Dormir llena el Descanso y, mejorado, te deja a punto para bajar.',
    fallback: 'Paja en el suelo.',
    lines: ['«Paja limpia en la trastienda. Aquí duermen los que venden su espada; tú también, si pagas.»', '«Un jergón como Dios manda. Lo cobro como Dios manda.»', '«Mantas de lana y un somier que no chirría. Dormirás como un muerto. Uno que ha pagado.»'],
    levels: [
      { name: 'Sin catre', effect: 'Paja en el suelo.' },
      { name: 'Catre de paja', effect: 'Dormir recupera todo el Descanso. 5 de oro la noche.' },
      { name: 'Catre con jergón', effect: 'Dormir te deja a punto: −10 % de Descanso en la siguiente incursión. 10 de oro la noche.', cost: c(80, ['scrap_metal', 6], ['leather_scrap', 6]) },
      { name: 'Cama de lana', effect: 'Dormir te deja a punto: −15 % de Descanso en la siguiente incursión. 15 de oro la noche.', cost: c(250, ['iron_ore', 4], ['silver_ore', 2], ['leather_scrap', 10]) },
    ],
  },
  kitchen: {
    id: 'kitchen', name: 'Cocina', icon: '🍲', by: 'garth',
    purpose: 'Platos que te preparan para bajar: gastas menos Saciedad, Hidratación o Descanso.',
    fallback: 'Solo el rancho comunitario y lo que vende Garth.',
    lines: ['«La vieja cocina del Bastión vuelve a tener fuego. Un fogón pequeño, pero tuyo.»', '«Especias del mercado de abajo. No quieras saber a cambio de qué.»', '«Ahora sí: una cocina donde se puede guisar para un regimiento.»'],
    levels: [
      { name: 'Sin fogón', effect: 'Solo el rancho comunitario.' },
      { name: 'Fogón', effect: 'Guiso del Bastión. Lotes de hasta 5.', cost: c(15, ['scrap_metal', 2], ['cave_mushroom', 2]) },
      { name: 'Despensa de especias', effect: 'Caldo especiado. Lotes de hasta 10.', cost: c(100, ['scrap_metal', 6], ['leather_scrap', 4], ['iron_ore', 2]) },
      { name: 'Cocina de regimiento', effect: 'Lotes de hasta 20 y los platos preparan un 15 % en vez de un 10 %.', cost: c(250, ['silver_ore', 4], ['bone_dust', 6], ['iron_ore', 4]) },
    ],
  },
  bench: {
    id: 'bench', name: 'Banco de trabajo', icon: '🪚', by: 'orik',
    purpose: 'Desguazar rinde más materiales. Empuñaduras y astiles de madera.',
    fallback: 'Desguazas en el taller de Orik con su rendimiento normal.',
    lines: ['«He sacado los escombros del taller. Tornillo, lima y un mazo: lo demás lo pones tú.»', '«Un banco de roble con su tornillo de hierro. Esto ya es otra cosa.»', '«Herramienta fina. Si lo rompes tú, lo arreglas tú.»'],
    levels: [
      { name: 'Sin banco', effect: 'Desguazas con el rendimiento normal de Orik.' },
      { name: 'Banco de trabajo', effect: 'Desguazar rinde un 25 % más.', cost: c(10, ['scrap_metal', 3], ['leather_scrap', 2]) },
      { name: 'Banco con tornillo', effect: 'Desguazar rinde un 40 % más.', cost: c(120, ['scrap_metal', 8], ['iron_ore', 4]) },
      { name: 'Banco de maestro', effect: 'Desguazar rinde un 55 % más.', cost: c(280, ['silver_ore', 3], ['leather_scrap', 10], ['iron_ore', 4]) },
    ],
  },
  infirmary: {
    id: 'infirmary', name: 'Rincón de cura', icon: '✚', by: 'vesper',
    purpose: 'Vendas, torniquetes y férulas preparadas en casa.',
    fallback: 'Las vendas y férulas se compran a Vesper.',
    lines: ['«He barrido la ceniza de la vieja enfermería. Hilo hervido y tablillas; que la orden te perdone el desorden.»', '«Más tablillas, más hilo. Menos excusas para morir desangrado.»', '«Un rincón digno de la enfermería. Casi me da envidia.»'],
    levels: [
      { name: 'Sin rincón', effect: 'Las vendas y férulas se compran a Vesper.' },
      { name: 'Rincón de cura', effect: 'Vendas, torniquetes y férulas. Lotes de hasta 5.', cost: c(10, ['leather_scrap', 3], ['water', 1]) },
      { name: 'Botiquín', effect: 'Lotes de hasta 10.', cost: c(100, ['leather_scrap', 8], ['iron_ore', 2]) },
      { name: 'Enfermería propia', effect: 'Lotes de hasta 20.', cost: c(220, ['silver_ore', 4], ['bone_dust', 6]) },
    ],
  },
  forge: {
    id: 'forge', name: 'Forja', icon: '⚒', by: 'brand',
    purpose: 'Lingotes, armas de hierro y anillos.',
    fallback: 'Las armas de metal se compran en la tienda de Brand.',
    lines: ['«La forja del Bastión respira otra vez. Un yunque viejo y un fuelle: suficiente para empezar.»', '«Ahora el fuego aguanta el hierro bueno.»', '«Esta forja ya no me da vergüenza. Haz algo digno con ella.»'],
    levels: [
      { name: 'Sin forja', effect: 'Las armas de metal se compran en la tienda de Brand.' },
      { name: 'Forja', effect: 'Recetas de forja de nivel 1. Lotes de hasta 5.', cost: c(20, ['scrap_metal', 5], ['bone_dust', 1]) },
      { name: 'Forja con fuelle doble', effect: 'Recetas de nivel 2, lotes de 10 y 10 % de acabado fino.', cost: c(150, ['iron_ore', 6], ['scrap_metal', 10], ['bone_dust', 4]) },
      { name: 'Gran forja', effect: 'Recetas de nivel 3, lotes de 20 y 20 % de acabado fino.', cost: c(320, ['silver_ore', 6], ['iron_ore', 6]) },
    ],
  },
  alchemy: {
    id: 'alchemy', name: 'Laboratorio', icon: '⚗', by: 'eldrin',
    purpose: 'Alquimia (pociones, antídotos, tónicos y bombas) y runas (cristales, tinta, equipo mágico y, al máximo, runas para grabar).',
    fallback: 'Las pociones se compran a Eldrin; el equipo mágico se encuentra o se compra.',
    lines: ['«He rescatado redomas y un atril de entre los cascotes. No casan y el quemador tose, pero funciona.»', '«Alambique de cobre y cristales en el atril. Ya no destilarás veneno por error. Tanto.»', '«Un laboratorio de verdad: hasta las runas se dejan grabar. Cuidado, una runa nueva borra la vieja.»'],
    levels: [
      { name: 'Sin laboratorio', effect: 'Las pociones se compran a Eldrin; el equipo mágico se encuentra o se compra.' },
      { name: 'Mesa y atril', effect: 'Pociones, antídotos, tónicos, bombas y equipo mágico básico. Lotes de hasta 5.', cost: c(20, ['arcane_shard', 2], ['cave_mushroom', 2]) },
      { name: 'Alambique y cristal', effect: 'Recetas de nivel 2, lotes de 10 y 10 % de acabado fino.', cost: c(130, ['iron_ore', 3], ['arcane_shard', 6], ['bone_dust', 4]) },
      { name: 'Laboratorio de runas', effect: 'Recetas de nivel 3, lotes de 20 y runas para grabar en armas, armaduras y equipo mágico.', cost: c(280, ['silver_ore', 4], ['arcane_shard', 10]) },
    ],
  },
  tannery: {
    id: 'tannery', name: 'Curtiduría', icon: '🧵', by: 'nira',
    purpose: 'Cuero curtido, correas, telas, ropa, botas, guantes, capuchas, bolsas y mochilas.',
    fallback: 'Lo de cuero y tela se compra en la tienda de Nira.',
    lines: ['«He colgado las pieles donde antes se secaban los estandartes. Huele fatal; funciona.»', '«Tinas nuevas y agujas de hueso. Ya no se te descoserá la capa a la primera.»', '«Una curtiduría como las de antes de la caída. Ni yo cosería mejor.»'],
    levels: [
      { name: 'Sin curtiduría', effect: 'Lo de cuero y tela se compra en la tienda de Nira.' },
      { name: 'Curtiduría', effect: 'Recetas de cuero y tela de nivel 1. Lotes de hasta 5.', cost: c(10, ['scrap_metal', 3], ['leather_scrap', 2]) },
      { name: 'Tinas de curtido', effect: 'Recetas de nivel 2, lotes de 10 y 10 % de acabado fino.', cost: c(120, ['scrap_metal', 8], ['iron_ore', 4]) },
      { name: 'Taller de sastre', effect: 'Recetas de nivel 3, lotes de 20 y 20 % de acabado fino.', cost: c(280, ['silver_ore', 3], ['leather_scrap', 10], ['iron_ore', 4]) },
    ],
  },
  armory: {
    id: 'armory', name: 'Forja de armaduras', icon: '🛡', by: 'valerius',
    purpose: 'Yelmos, corazas, guanteletes, grebas y escudos de metal.',
    fallback: 'Las armaduras de metal se encuentran o se compran a Valerius.',
    lines: ['«He limpiado el yunque de la vieja armería. Las placas no se forjan solas, pero ya hay dónde.»', '«Fuelle doble y tenazas nuevas. La plata ya no se me resiste.»', '«Una armería digna del Bastión. Que tiemblen los que te esperan abajo.»'],
    levels: [
      { name: 'Sin forja', effect: 'Las armaduras de metal se encuentran o se compran a Valerius.' },
      { name: 'Forja de armaduras', effect: 'Recetas de armadura de nivel 1. Lotes de hasta 5.', cost: c(20, ['scrap_metal', 5], ['bone_dust', 1]) },
      { name: 'Forja con fuelle doble', effect: 'Recetas de nivel 2, lotes de 10 y 10 % de acabado fino.', cost: c(150, ['iron_ore', 6], ['scrap_metal', 10], ['bone_dust', 4]) },
      { name: 'Gran armería', effect: 'Recetas de nivel 3, lotes de 20 y 20 % de acabado fino.', cost: c(320, ['silver_ore', 6], ['iron_ore', 6]) },
    ],
  },
};

export const STATION_ORDER: StationId[] = ['tannery', 'infirmary', 'kitchen', 'bench', 'cot', 'forge', 'armory', 'alchemy'];

/** Beneficios numéricos por nivel (índice = nivel). */
export const STATION_FX = {
  /** Recorte de Descanso al dormir en el catre. */
  cotPrep: [0, 0, 0.1, 0.15],
  /** Lo que cobra Grizk por dormir en el Catre, según su nivel (hostal de mercenarios). */
  cotGold: [0, 5, 10, 15],
  /** Recorte que da un plato según el nivel de la cocina al comerlo. */
  dishPrep: [0.1, 0.1, 0.1, 0.15],
  /** Desguace: materiales de más con el banco. */
  benchBonus: [0, 0.25, 0.4, 0.55],
};

/** Dónde conseguir cada material de los costes (subzona, enemigo o mercader) y a qué servicio lleva el acceso rápido. */
export const MATERIAL_SOURCES: Record<string, { text: string; go?: { vendor: VendorId; view: 'shop' | 'scrap' } }> = {
  scrap_metal: { text: 'Desguaza armas y armaduras de metal en el taller de Orik.', go: { vendor: 'orik', view: 'scrap' } },
  leather_scrap: { text: 'Desguaza ropa, cuero y piezas ligeras en el taller de Orik.', go: { vendor: 'orik', view: 'scrap' } },
  arcane_shard: { text: 'Desguaza báculos, tomos, varitas, orbes y joyas en el taller de Orik.', go: { vendor: 'orik', view: 'scrap' } },
  cave_mushroom: { text: 'Garth las vende en su cocina.', go: { vendor: 'garth', view: 'shop' } },
  water: { text: 'Garth la vende en su cocina.', go: { vendor: 'garth', view: 'shop' } },
  bone_dust: { text: 'Esqueletos y bichos de S1 a S3; Orik y Brand lo venden.', go: { vendor: 'orik', view: 'shop' } },
  copper_ore: { text: 'Vetas de cobre de la Mazmorra (S1 a S3), con pico.', go: { vendor: 'orik', view: 'shop' } },
  iron_ore: { text: 'Vetas de hierro de la Mazmorra y la Cripta (S1 a S6), con pico.', go: { vendor: 'orik', view: 'shop' } },
  silver_ore: { text: 'Vetas de plata de la Cripta (S4 a S6), con pico.', go: { vendor: 'orik', view: 'shop' } },
};
