// ESTACIONES DEL REFUGIO (bloque 2, parte 2.1). Encargados, coste y beneficio de cada nivel. Todo editable.
//  · Nivel 0 = bloqueada (se usa la alternativa básica). Nivel 1 = desbloqueo simbólico (una o dos bajadas a S1).
//  · Niveles 2 y 3 = mejoras caras, con materiales de subzonas más hondas.
//  · El Catre empieza en nivel 1. Lo construye y mejora siempre su encargado, que cobra materiales y oro.
//  · Los materiales del nivel 1 salen en S1: chatarra y retales (desguazando lo que encuentras), setas y agua (Garth),
//    mena de cobre (vetas), polvo de hueso y esquirlas arcanas (enemigos y desguace de equipo de Mago).
import type { VendorId } from '../core/data/vendors';

export type StationId = 'cot' | 'kitchen' | 'bench' | 'infirmary' | 'forge' | 'alchemy' | 'runic';

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
  /** Lo que hay mientras está bloqueada (nadie se queda sin la función básica). */
  fallback: string;
  by: VendorId;
  /** Frase del encargado al construir (nivel 1) y al mejorar (2 y 3). */
  lines: [string, string, string];
  /** Índice = nivel (0 a 3). */
  levels: [StationLevel, StationLevel, StationLevel, StationLevel];
}

const c = (gold: number, ...items: [string, number][]) => ({ gold, items: items.map(([itemId, qty]) => ({ itemId, qty })) });

export const STATIONS: Record<StationId, StationDef> = {
  cot: {
    id: 'cot', name: 'Catre', icon: '🛏', by: 'orik',
    purpose: 'Dormir llena el Descanso y, mejorado, te deja preparado para bajar.',
    fallback: 'Paja en el suelo.',
    lines: ['«Paja limpia. No preguntes de dónde.»', '«Un jergón como Dios manda. Casi.»', '«Mantas de lana y un somier que no chirría. Dormirás como un muerto. Uno contento.»'],
    levels: [
      { name: 'Sin catre', effect: 'Paja en el suelo.' },
      { name: 'Catre de paja', effect: 'Dormir recupera todo el Descanso, gratis.' },
      { name: 'Catre con jergón', effect: 'Dormir te deja preparado: −10 % de Descanso en la siguiente incursión.', cost: c(80, ['scrap_metal', 6], ['leather_scrap', 6]) },
      { name: 'Cama de lana', effect: 'Dormir te deja preparado: −15 % de Descanso en la siguiente incursión.', cost: c(250, ['iron_ore', 4], ['silver_ore', 2], ['leather_scrap', 10]) },
    ],
  },
  kitchen: {
    id: 'kitchen', name: 'Cocina', icon: '🍲', by: 'garth',
    purpose: 'Platos que te preparan para bajar: gastas menos Saciedad, Hidratación o Descanso.',
    fallback: 'Solo el rancho comunitario y lo que vende Garth.',
    lines: ['«Un fogón. Pequeño, pero mío. Bueno, tuyo.»', '«Especias del mercado de abajo. No quieras saber a cambio de qué.»', '«Ahora sí: una cocina donde se puede guisar para un regimiento.»'],
    levels: [
      { name: 'Sin fogón', effect: 'Solo el rancho comunitario.' },
      { name: 'Fogón', effect: 'Guiso del Bastión. Lotes de hasta 5.', cost: c(15, ['scrap_metal', 2], ['cave_mushroom', 2]) },
      { name: 'Despensa de especias', effect: 'Caldo especiado. Lotes de hasta 10.', cost: c(100, ['scrap_metal', 6], ['leather_scrap', 4], ['iron_ore', 2]) },
      { name: 'Cocina de regimiento', effect: 'Lotes de hasta 20 y los platos preparan un 15 % en vez de un 10 %.', cost: c(250, ['silver_ore', 4], ['bone_dust', 6], ['iron_ore', 4]) },
    ],
  },
  bench: {
    id: 'bench', name: 'Banco de trabajo', icon: '🪚', by: 'orik',
    purpose: 'Desguazar rinde más materiales. Cuero, tela, ropa, botas y bolsas.',
    fallback: 'Desguazas en el taller de Orik con su rendimiento normal.',
    lines: ['«Tornillo, lima y un mazo. Lo demás lo pones tú.»', '«Un banco de roble con su tornillo de hierro. Esto ya es otra cosa.»', '«Herramienta fina. Si lo rompes tú, lo arreglas tú.»'],
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
    lines: ['«Hilo hervido y tablillas. Que la orden te perdone el desorden.»', '«Más tablillas, más hilo. Menos excusas para morir desangrado.»', '«Un rincón digno de la enfermería. Casi me da envidia.»'],
    levels: [
      { name: 'Sin rincón', effect: 'Las vendas y férulas se compran a Vesper.' },
      { name: 'Rincón de cura', effect: 'Vendas, torniquetes y férulas. Lotes de hasta 5.', cost: c(10, ['leather_scrap', 3], ['water', 1]) },
      { name: 'Botiquín', effect: 'Lotes de hasta 10.', cost: c(100, ['leather_scrap', 8], ['iron_ore', 2]) },
      { name: 'Enfermería propia', effect: 'Lotes de hasta 20.', cost: c(220, ['silver_ore', 4], ['bone_dust', 6]) },
    ],
  },
  forge: {
    id: 'forge', name: 'Forja', icon: '⚒', by: 'brand',
    purpose: 'Lingotes, armas y armaduras de metal, escudos, anillos y llaves.',
    fallback: 'Las armas se compran o se forjan en el yunque de Brand.',
    lines: ['«Un yunque viejo y un fuelle que respira. Suficiente para empezar.»', '«Ahora el fuego aguanta el hierro bueno.»', '«Esta forja ya no me da vergüenza. Haz algo digno con ella.»'],
    levels: [
      { name: 'Sin forja', effect: 'Se compra o se forja en el yunque de Brand.' },
      { name: 'Forja', effect: 'Recetas de forja de nivel 1. Lotes de hasta 5.', cost: c(20, ['scrap_metal', 5], ['bone_dust', 1]) },
      { name: 'Forja con fuelle doble', effect: 'Recetas de nivel 2, lotes de 10 y 10 % de acabado fino.', cost: c(150, ['iron_ore', 6], ['scrap_metal', 10], ['bone_dust', 4]) },
      { name: 'Gran forja', effect: 'Recetas de nivel 3, lotes de 20 y 20 % de acabado fino.', cost: c(320, ['silver_ore', 6], ['iron_ore', 6]) },
    ],
  },
  alchemy: {
    id: 'alchemy', name: 'Mesa de alquimia', icon: '⚗', by: 'eldrin',
    purpose: 'Consumibles: pociones, antídotos, tónicos y bombas.',
    fallback: 'Las pociones se compran a Eldrin.',
    lines: ['«Redomas que no casan y un quemador que tose. Funciona.»', '«Alambique de cobre. Ya no destilarás veneno por error. Tanto.»', '«Una mesa de verdad. Hasta yo trabajaría aquí.»'],
    levels: [
      { name: 'Sin mesa', effect: 'Las pociones se compran a Eldrin.' },
      { name: 'Mesa de alquimia', effect: 'Antídotos, pociones de maná y tónicos. Lotes de hasta 5.', cost: c(20, ['arcane_shard', 2], ['cave_mushroom', 2]) },
      { name: 'Alambique', effect: 'Lotes de hasta 10.', cost: c(130, ['iron_ore', 3], ['arcane_shard', 6], ['bone_dust', 4]) },
      { name: 'Laboratorio', effect: 'Lotes de hasta 20.', cost: c(280, ['silver_ore', 4], ['arcane_shard', 10]) },
    ],
  },
  runic: {
    id: 'runic', name: 'Atril rúnico', icon: '📜', by: 'eldrin',
    purpose: 'Equipo mágico (báculos, varitas, tomos, orbes y amuletos) y, al máximo, runas.',
    fallback: 'El equipo mágico se encuentra o se compra.',
    lines: ['«Un atril y tinta que no se seca. Lee despacio.»', '«Cristales tallados en el marco. Ahora el atril escucha.»', '«Ya puede grabar runas. Cuidado: una runa nueva borra la vieja.»'],
    levels: [
      { name: 'Sin atril', effect: 'El equipo mágico se encuentra o se compra.' },
      { name: 'Atril rúnico', effect: 'Equipo mágico básico (recetas de nivel 1). Lotes de hasta 5.', cost: c(20, ['arcane_shard', 3], ['bone_dust', 2]) },
      { name: 'Atril de cristal', effect: 'Equipo mágico mejor (nivel 2), lotes de 10 y 10 % de acabado fino.', cost: c(150, ['arcane_shard', 8], ['silver_ore', 2], ['bone_dust', 6]) },
      { name: 'Atril de runas', effect: 'Equipo de nivel 3 y runas para grabar en armas, armaduras y equipo mágico.', cost: c(320, ['arcane_shard', 12], ['silver_ore', 6]) },
    ],
  },
};

export const STATION_ORDER: StationId[] = ['cot', 'kitchen', 'bench', 'infirmary', 'forge', 'alchemy', 'runic'];

/** Beneficios numéricos por nivel (índice = nivel). */
export const STATION_FX = {
  /** Recorte de Descanso al dormir en el catre. */
  cotPrep: [0, 0, 0.1, 0.15],
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
