// Hoja de ruta de la landing. Para mover un punto de columna, corta la línea y pégala en otra lista.
// No hace falta tocar el diseño (App.tsx): las columnas se dibujan solas a partir de estos datos.

export interface RoadmapColumn {
  id: 'ahora' | 'pronto' | 'multijugador';
  title: string;
  status: string;
  /** Icono pixel art del juego (iconUrl) hasta que exista el definitivo. */
  icon: string;
  items: string[];
}

export const ROADMAP: RoadmapColumn[] = [
  {
    id: 'ahora',
    title: 'Ya en el juego',
    status: 'Disponible ahora',
    icon: 'key',
    items: [
      'Guerrero y Mago, hasta el nivel 100',
      'Tres zonas y diez escenarios',
      'Combate por turnos con habilidades',
      'Heridas por zonas: sangrado y fracturas',
      'Hambre, sed y cansancio en cada incursión',
      'Armas y armaduras que se desgastan',
      'Más de cincuenta armas y piezas',
      'El Bastión: ocho mercaderes, misiones y forja',
      'Aliados y mercenarios',
      'Oro físico: si caes, lo pierdes',
      'Mochila con tamaños y peso: elige qué te llevas',
      'Salas secretas, puertas con llave, atajos y altares',
      'Hasta cuatro personajes',
      'Copia de seguridad de tu partida',
      'Atuendos sin ventajas',
      'En ordenador y en el móvil',
    ],
  },
  {
    id: 'pronto',
    title: 'Próximamente',
    status: 'En desarrollo · un jugador',
    icon: 'staff_fire',
    items: [
      'Dos clases nuevas: Pícaro y Clérigo',
      'Arte definitivo de los diez escenarios y sus criaturas',
      'Arte definitivo de armas y equipo',
      'Más atuendos, siempre solo estéticos',
      'Arte y música definitivos',
      'Guardado en la nube para jugar en varios dispositivos',
      'Gravevow en Steam (Windows)',
    ],
  },
  {
    id: 'multijugador',
    title: 'Multijugador',
    status: 'El gran objetivo · más adelante',
    icon: 'dagger',
    items: [
      'Cooperativo: baja a las criptas en grupo',
      'Extracción PvPvE: otros saqueadores en tu misma cripta',
      'Duelos y arena',
      'Comercio entre jugadores',
      'Hermandades',
      'Clasificaciones por temporada',
    ],
  },
];

export const ROADMAP_NOTE = 'La hoja de ruta puede cambiar y no tiene fechas cerradas. Lo que está en la primera columna, ya lo puedes jugar.';
