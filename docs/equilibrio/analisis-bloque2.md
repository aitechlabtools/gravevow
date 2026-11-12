# Bloque 2 · Entrega 2A: análisis del Bastión y la fabricación

Revisión del estado actual frente a los apartados 15 (Refugio) y 16 (Fabricación) del plan maestro. No cambia nada del juego: sirve para decidir qué entra en el bloque 2.

## 1. Qué hay hecho

| Pieza | Estado | Dónde |
|---|---|---|
| Refugio por módulos (Catre, Cocina, Banco, Rincón de cura, Mesa de alquimia) | Hecho, con niveles que construye un mercader ya presente | `core/refuge.ts`, `config/refuge.ts` |
| Almacén ampliable | Hecho como páginas compradas | `core/stashPages.ts` |
| Recepción de excedentes | Hecha: retirar, vender, desguazar, descartar; no se baja con algo dentro | `Profile.reception` |
| Desguace | Hecho, rendimiento visible, roto al 35 %, tope del 80 % del precio | Orik → Desguace |
| Cocina | Hecha: 2 o 3 pasos sin reflejos, resultado fijado al empezar, lotes de 5 | Garth → Cocina |
| Forja (Yunque de Brand) | Hecha: lecturas de temperatura, golpes, magistral/buena/tosca, forja rápida | `core/workshop.ts` |
| Alquimia | Hecha: antídoto, poción de maná, tónico; lotes de 5 | Mesa de alquimia |
| Rincón de cura | Hecho: vendas, torniquetes y férulas por lotes | Vesper |
| Preparación (catre + plato) | Hecha, tope del 30 % | `Profile.prep` |

Comprobaciones de hoy: `refugio-check` y `taller-check` pasan en escritorio, iPhone e iPad apaisados.

## 2. Qué falta o choca con el plan

1. **Error conocido: `almacen-check` falla en escritorio.** La página del almacén no cabe sin desplazar (83 casillas visibles). Tableta y móvil pasan. Viene de antes de la expansión.
2. **Calidad de la forja por encima del plan.** El plan pide como máximo +5 %; el juego da +10 % (buena) y +20 % (magistral). Se dejó así para no tocar las armas ya forjadas. Hay que decidir.
3. **Recetas de Valerius.** El plan reparte la forja entre Brand y Valerius; Valerius no tiene recetas.
4. **Recetas experimentales con riesgo.** No existen (pérdida de hasta el 25 % de comunes, únicos devueltos, riesgo a la vista antes de empezar).
5. **Bombas y frascos incendiarios** de la alquimia: no existen.
6. **Depósito de misión** para objetos esenciales que llegan a la recepción: no existe.
7. **Favoritos**: el plan pide confirmación al desguazar un favorito; no hay marca de favorito.
8. **Aviso antes de salir** si el almacén está casi lleno: hay que comprobar si se avisa antes de bajar o solo al volver.
9. **Comida del bloque 1 en la cocina.** El bloque 1 dejó los valores de los alimentos en `config/food.ts` para que la cocina los use; los dos platos actuales tienen sus cifras propias.
10. **Equilibrio económico.** Nadie ha medido si fabricar sale más a cuenta que comprar, ni si el Refugio se paga solo. El simulador no cubre el Bastión.

## 3. Propuesta de orden (para la entrega 2B)

- Fase 1: arreglar el almacén en escritorio (punto 1).
- Fase 2: cocina con los valores de `config/food.ts` y platos nuevos (punto 9).
- Fase 3: favoritos y aviso de almacén lleno antes de bajar (puntos 7 y 8).
- Fase 4: depósito de misión (punto 6).
- Fase 5: recetas de Valerius (punto 3).
- Fase 6: recetas experimentales (punto 4).
- Fase 7: bombas e incendiarios (punto 5; toca el combate).
- Fase 8: economía medida con el simulador y ajuste de cifras (puntos 2 y 10).
- Fase 9: comprobación final en los tres tamaños.

## 4. Preguntas

1. Calidad de la forja: ¿bajamos a +3 %/+5 % solo para lo que se forje a partir de ahora, o dejamos +10 %/+20 %?
2. ¿Entran las bombas en este bloque o van al de combate?
3. ¿Alguna de las piezas del punto 2 sobra o falta algo que tengas en mente?
