// CRAFTEO (bloque 2). Cifras de la propuesta (docs/equilibrio/propuesta-bloque2.md, apartados 2 y 4.3). Todo editable.

export const CRAFT_CFG = {
  /** Lote máximo por nivel del espacio (índice = nivel; 0 = cerrado). */
  batch: [0, 5, 10, 20],
  /** Probabilidad de acabado fino (una rareza más) que da el nivel del espacio. */
  fineByLevel: [0, 0, 0.1, 0.2],
  /** Probabilidad extra si se añade el material fino opcional (se gasta uno por unidad). */
  fineMaterial: 0.25,
  /** Tope de rareza con acabado fino según la rareza de la receta. Lo legendario solo sale de su propio plano. */
  fineCap: { common: 'rare', uncommon: 'rare', rare: 'epic', epic: 'epic', legendary: 'legendary' } as const,
};
