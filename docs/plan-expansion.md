# Plan de la expansión de Gravevow

Última actualización: 11/11/2026. Fuente: «Gravevow_Plan_Maestro_Expansion_Claude.txt» (v1.1, 9/11/2026), entregado por el usuario.
Este archivo resume la auditoría, las decisiones del usuario y las fases. El plan maestro tiene el detalle de reglas, cifras de prueba y la matriz de aceptación A01–A100; si falta un detalle, se pide al usuario.

## Reglas de trabajo
- Una fase cada vez. Al terminar una fase: el juego sigue siendo jugable y pasan `tsc`, vitest y las pruebas de navegador relacionadas.
- Todas las cifras del plan son valores de prueba, no de equilibrio comprobado.
- Cada cambio del guardado lleva su migración probada; nunca se pierden objetos ni progreso.
- Móvil (unos 750 × 340), tableta y escritorio desde el principio, no al final.
- El núcleo (`src/core`) sigue sin React ni Phaser.

## Decisiones del usuario (11/11/2026)
1. **Mercaderes:** se mantienen Orvel, Vesper, Garra Roja, Brand y el Coleccionista. Solo se añade uno nuevo si trae una función que no existe (p. ej. cocina o alquimia). No se crean Garth, Nira, Orik, Grizk, Valerius ni Eldrin por defecto.
2. **Contratación:** la sigue haciendo Garra Roja, con contratos de varias expediciones (`Contract.left`) y actitud. Donde el plan dice «Grizk», se lee «Garra Roja».
3. **Traición:** los errantes (Kael, Osric) pueden seguir traicionando o robando al azar (`core/social.ts`). Los mercenarios contratados nunca traicionan al azar: solo rompen el pacto si el jugador incumple el trato, siempre con aviso y opción de rectificar.
4. **Bandos:** máximo dos combatientes por bando en todo combate (también jefes, invocaciones y refuerzos). Con mercenario contratado, Kael no entra en ese combate.
5. **Mercenarios:** no se crean personajes nuevos (Edda, Tavia, Soren, Iria, Rook…). Los actuales (Bram, Lysa, Tobías, Ysolde, Corvin, Mirra…) reciben los papeles del plan: defensor, sanador, explorador y reparador.

## Auditoría: lo que ya existe
| Sistema | Dónde | Estado respecto al plan |
|---|---|---|
| Combate por bandos | `core/combat.ts` (`Side` A/B, `aoe`, IA) | Ya admite varios por bando; hoy el bando enemigo siempre tiene 1 y el propio hasta 3 |
| Inicio de combate | `combatActions.ts` → `startCombat` | Jugador + (mercenario o Kael) contra 1 o 2 enemigos (Fase 2) |
| Mercenarios | `core/mercenaries.ts`, `data/mercenaries.ts`, `ContractsPanel.tsx` | Contratos con Garra Roja, rescates, descuentos, actitud |
| Errantes | `core/social.ts`, `data/wanderers.ts` | Alianza, reparto, traición y robo al azar |
| Inventario | `core/inventory.ts` | Mochila 6×4, bolsillo seguro, almacén por páginas; solo el saco ocupa varias casillas; sin rotación ni peso |
| Oro físico | `gold.ts`, `bag.ts`, `wallet.ts` | Oro en saquitos y sacos; se pierde lo que llevas al morir |
| Forja | `core/forge.ts` | Calidad 0–2 |
| Herramientas | `ItemStack.uses`, `core/mining.ts` | Picos con usos; no hay durabilidad de armas ni armaduras |
| Mazmorra | `core/dungeonGen.ts` | Salas, jefe, portal, cofres, vetas y trampas |
| Misiones y reputación | `core/quests.ts`, `Profile.reputation` | Existen |
| Salud | `Combatant.hp` | Barra única; no hay anatomía, sangrado por zonas ni fracturas |
| Necesidades | — | No existen |
| Guardado | `core/save.ts` (formato 3), `persistence/db.ts` (IndexedDB) | Con migraciones; la expedición es una copia que solo cambia el perfil al extraer o morir |
| Estado global | `game/state/store.ts` + `internals.ts`, `expeditionActions.ts`, `combatActions.ts` | Separado en la Fase 1 |

## Riesgos
- Tamaño: el plan completo son meses; primero lo que cambia la forma de jugar, el contenido al final.
- Espacio en el móvil: silueta de 7 zonas, 3 necesidades y 2 fichas de enemigo en 750 × 340.
- Partidas guardadas: cada fase que cambie el formato necesita migración y pruebas.

## Fases
| Fase | Contenido | Criterio de cierre |
|---|---|---|
| 0 | Este documento | Hecho (11/11) |
| 1 | Base técnica: separar combate y expedición de `store.ts`; guardado formato 4 con migración; reloj de juego (pulso) que se pausa en menús y al ocultar la pestaña | Hecho (11/11): `internals.ts`, `expeditionActions.ts`, `combatActions.ts`; formato 4 (`playMs`); `core/clock.ts` |
| 2 | Combate 1 contra 2 y 2 contra 2: dos enemigos, elegir objetivo, dos fichas, máximo 2 por bando, defensa que cubre hasta tu próximo turno | Hecho (11/11): `MAX_PER_SIDE`, `joiningEnemy`, fichas para elegir objetivo, Bloqueo hasta tu turno; `tests/groups.test.ts` |
| 3 | Durabilidad de armas, armaduras y herramientas; avisos al 25 % y 10 %; roto no se destruye; reparación con Brand y kits de campo | Sin pérdida de objetos; siempre queda una acción básica |
| 4 | Anatomía de 7 zonas, sangrado, fracturas y tratamientos (venda, hemostático, torniquete, férula, cirugía) | Muerte solo por cabeza o tórax; interfaz legible en móvil |
| 5 | Saciedad, hidratación y descanso; comida, agua y catre en la base | Avisos antes del daño; menús no consumen |
| 6 | Inventario: tamaños por objeto, rotación y peso | Nada se pierde al reorganizar; alternativa al arrastre |
| 7 | Exploración: salas secretas, llaves, trampas mejoradas, atajos y altares | Toda semilla tiene salida y llaves alcanzables |
| 8 | Enemigos, élites y jefes con ataques anunciados, por región | Respuesta viable para ambas clases |
| 9 | Refugio, desguace y minijuegos de fabricación | Sin bucles de oro infinito |
| 10 | Equilibrio y repaso; prueba completa en S1 con Guerrero y Mago (sección 33 del plan) | Partida nueva y migrada completan el ciclo |
