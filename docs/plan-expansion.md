# Plan de la expansión de Gravevow

Última actualización: 11/11/2026. Fuente: «Gravevow_Plan_Maestro_Expansion_Claude.txt» (v1.1, 9/11/2026), entregado por el usuario.
Este archivo resume la auditoría, las decisiones del usuario y las fases. El plan maestro está en `docs/plan-maestro.txt` y tiene el detalle de reglas, cifras de prueba y la matriz de aceptación A01–A100; si falta un detalle, se pide al usuario.

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

### Cambio de decisiones (11/11/2026, tras la Fase 5). Sustituye a los puntos 1 y 2
- **Los ocho mercaderes del plan maestro (sección 13):** Vesper, Garth, Nira, Orik, Grizk, Maese Brand, Valerius y Eldrin. Orvel, Garra Roja y el Coleccionista desaparecen. Sus funciones pasan así:
  - Orvel: el equipo común pasa a Nira (depósito en consignación); la comida y el agua, a Garth; las pociones, a Vesper.
  - Garra Roja: los contratos de mercenarios pasan a Grizk.
  - El Coleccionista: la bolsa, los sacos de oro y las mochilas pasan a Grizk.
  - Brand se queda solo con las armas y su mantenimiento; Valerius lleva las armaduras pesadas y los escudos.
- **Desbloqueo por subzona** (Orik S2, Grizk S3, Brand S4, Valerius S5, Eldrin S7), según el progreso real: quien ya llegó a esa subzona los tiene. Ninguna clase se queda sin arma, contratos ni bolsas antes de tiempo: hasta que llegue cada mercader, lo básico está en Nira o en Vesper.
- **La pestaña «Mercaderes» se llama «Bastión»**, y cada mercader está en su lugar: la cocina (Garth), la enfermería (Vesper), la forja (Brand y Valerius), el taller (Orik), la lonja (Grizk), el laboratorio (Eldrin) y el mercado (Nira). El catre se usa desde un botón del Bastión.
- **La pestaña «Alijo» se llama «Intendencia»**, con las vistas «Equipo» (lo de ahora) y «Estado» (heridas y necesidades, con la mochila al lado). En el Bastión puedes curarte con tus propios objetos (vendas, férulas, pociones y analgésico) si no quieres pagar a Vesper. En «Expedición» solo quedan el destino y «Descender», sin necesidades ni catre.
- **No se come ni se bebe en combate.**
- **Reputación:** la de Orvel pasa a Nira y la de Garra Roja a Grizk; la del Coleccionista se pierde.
- **Cuándo:** en una fase propia, la **5b**, antes de la 6. La cocina con recetas, el desguace de Orik y la alquimia de Eldrin completos siguen en la Fase 9; hasta entonces, esos mercaderes venden lo básico.

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
| 3 | Durabilidad de armas, armaduras y herramientas; avisos al 25 % y 10 %; roto no se destruye; reparación con Brand y kits de campo | Hecho (11/11): `core/durability.ts`, `core/repair.ts`, yunque de Brand, `repair_kit`; `tests/durability.test.ts` |
| 4 | Anatomía de 7 zonas, sangrado, fracturas y tratamientos (venda, hemostático, torniquete, férula, cirugía) | Hecho (11/11): `core/anatomy.ts`, `config/anatomy.ts`, `medicalActions.ts`, panel de heridas, enfermería de Vesper; `tests/anatomy.test.ts`. Cirugía en combate (dos turnos), dolor y analgésico añadidos después. Pendiente: perfiles anatómicos de enemigos (Fase 8) y abdomen con necesidades (Fase 5) |
| 5 | Saciedad, hidratación y descanso; comida, agua y catre en la base | Hecho (11/11): `core/needs.ts`, `config/needs.ts`, ración y odre de agua (Orvel), catre y suministro del Bastión, tira en el HUD y panel con tiempo al siguiente efecto; `tests/needs.test.ts`, `scripts/necesidades-check.cjs`. Abdomen inutilizado: +25 % de consumo. Pendiente: platos cocinados y mejora del catre (Fase 9, Refugio), peso y entorno como modificadores (Fases 6 y 7) |
| 5b | Bastión: 8 mercaderes en sus lugares; Intendencia con las vistas Equipo y Estado; catre en el Bastión; migración de la reputación | Hecho (11/11): `data/vendors.ts` (8 mercaderes, `PLACES`, `unlockAt`), `core/vendors.ts` (`vendorUnlocked`, `migrateReputation`), pestañas «Intendencia» y «Bastión», curas y comida en la base (`baseTreat`, `baseHeal`); pruebas en `tests/vendors.test.ts` y `necesidades-check.cjs`. Los encargos de Orvel pasan a Nira y los de Garra Roja a Garth (Grizk llega en S3). Pendiente: encargos propios de Orik, Grizk, Valerius y Eldrin, y arte definitivo de los retratos |
| 6 | Inventario: tamaños por objeto, rotación y peso | Hecho (11/11): tamaños por familia y categoría (`config/carry.ts`), girar (botón, tecla R), colocar tocando, vista previa del hueco al arrastrar, dividir y fusionar pilas, peso y carga por clase (`core/carry.ts`) con tramos del 100/120 % y tope del 150 %, barra de carga y aviso en el HUD; `tests/carry.test.ts`, `tests/multicell.test.ts`, `scripts/inventario-check.cjs`. Pendiente: deshacer el orden automático, recepción de excedentes y bolsillo de 1×2 ampliable |
| 7 | Exploración: salas secretas, llaves, trampas mejoradas, atajos y altares | Hecho (11/11): `core/exploration.ts` (`addSpecials`, `checkExploration`), `config/exploration.ts`, `data/altars.ts`; accesos especiales con candado (`DoorLock`: secreto, llave, rastrillo), altar con pacto, trampas que se desarman y no se rearman; `tests/exploration.test.ts` (100 semillas por subzona), `scripts/exploracion-check.cjs`. Pendiente (segunda tanda del plan): respiros, rituales y alerta local; llaves de destino preparadas en el Bastión; usar trampas contra enemigos |
| 8 | Enemigos, élites y jefes con ataques anunciados, por región | Hecho (11/11), primera tanda: intenciones en `core/combat.ts` (`telegraph`, `unleash`, `readIntents`, `intentDamage`, fases y `restoreBoss`), datos en `data/intents.ts`, cifras en `config/intents.ts`; botón Guardia y chip de intención; huir de un jefe conserva su estado; `tests/intents.test.ts`, `scripts/intenciones-check.cjs`; equilibrio recalibrado con un jugador que lee intenciones. Pendiente: Saqueador (robo de oro), veneno de la Araña, reanimación del Acólito, refuerzo de la Plañidera, criaturas y sprites nuevos del catálogo, perfiles anatómicos de enemigos y premios propios de los jefes (Llave del Alcaide…) |
| 9 | Refugio, desguace y minijuegos de fabricación | Primera tanda hecha (11/11): `core/refuge.ts`, módulos Catre, Cocina y Banco; desguace con Orik; cocina por pasos y lotes; preparación para la incursión; `tests/refuge.test.ts` comprueba que no hay arbitraje. Segunda tanda hecha (11/11): yunque de Brand por pasos (calidad por aciertos), mesa de alquimia (Eldrin), rincón de cura (Vesper) y recepción de excedentes; `core/workshop.ts`, `tests/workshop.test.ts`, `scripts/taller-check.cjs`. El almacén ya se amplía por páginas |
| 10 | Equilibrio y repaso; prueba completa en S1 con Guerrero y Mago (sección 33 del plan) | Partida nueva y migrada completan el ciclo |
