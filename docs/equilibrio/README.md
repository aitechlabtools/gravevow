# Reequilibrio (Fase 10)

Encargo: el juego era demasiado difícil (casi cada golpe dejaba un estado aunque llevaras armadura, se podía caer en el tutorial y a nivel bajo era casi imposible pasar de dos enemigos seguidos). Aquí está el diagnóstico, lo que se cambió y cómo volver a medirlo.

## Cómo medir
- `node scripts/simular.mjs 300 actual` escribe `docs/equilibrio/simulador-actual.md` (unos 2 minutos).
- El simulador (`tools/simulador/`) usa el combate real del núcleo con los datos del juego. A diferencia de `tests/balance.test.ts`, los combates van **seguidos**: la vida, las heridas, el sangrado, las pociones y el recurso pasan de un combate al siguiente, con 8 pulsos de exploración entre medias (el sangrado corre) y un 25 % de que se sume un segundo enemigo.
- Jugadores simulados: «razonable» (lee los anuncios, se pone en guardia, usa habilidades y bebe por debajo del 35 %) y «novato» (solo ataque básico y poción).
- Para probar un ajuste sin tocar el juego: añade un escenario en `tools/simulador/escenarios.ts` y ejecuta `node scripts/simular.mjs 300 <escenario>`.
- `simulador-antes.md` es la medición con los valores previos a la Fase 10.

## Diagnóstico (antes)
- **Combates seguidos.** Con el equipo inicial en S1, sobrevivir a 4 combates seguidos: Guerrero 15 %, Mago 11 % (novato: 8 % y 3 %). Cada combate quitaba un 25–30 % de la vida y solo había 2 pociones.
- **Estados.** Un 32–36 % de los golpes recibidos en S1 dejaba sangrado o fractura. Dos causas: el 15 % de sangrado y el 6 % de fractura en **cada** golpe físico, y que 3 de las 4 criaturas de S1 tenían una habilidad con un 50 % de sangrado. La armadura no contaba.
- **Tutorial.** El simulador da 0–1 % de caídas; en el navegador, un jugador que solo ataca perdía contra Osric 2 de cada 3 veces (empieza sangrando por la traición). Al caer volvías al punto seguro, pero el combate se perdía.

## Objetivos
| Escenario | Objetivo |
|---|---|
| Tutorial | Imposible de perder |
| S1 con equipo inicial (jugador razonable) | 1 combate ≥ 97 %; 3 seguidos ≥ 75 %; 4 seguidos ≥ 55 % |
| S1 con equipo inicial (novato) | 3 seguidos ≥ 50 % |
| S2–S10 con equipo de su zona | 1 combate ≥ 75 %; cada subzona algo más dura que la anterior dentro de su zona |
| Élites | 35–75 % |
| Jefes | 15–50 % (Belzar 15–35 %) |

## Cambios (todo en archivos de datos)
| Qué | Dónde | Antes | Ahora |
|---|---|---|---|
| Sangrado por golpe físico (crítico) | `config/anatomy.ts` | 15 % (35 %) | 7 % (20 %) |
| Fractura por golpe físico (crítico) | `config/anatomy.ts` | 6 % (16 %) | 3 % (8 %) |
| Lesión según el tipo de golpe | `config/armor.ts` `INJURY_BY_FX` | igual para todo | filo y mordisco sangran; contundente rompe (×1,7) y casi no sangra |
| Armadura | `config/armor.ts` | no protegía | la pieza de la región evita el 80 %; 40 % entre el 25 y el 10 % de durabilidad; nada por debajo o rota |
| Habilidades enemigas que hacen sangrar, contra el jugador | `config/armor.ts` `SKILL_BLEED_TO_PLAYER` | 100 % | 50 % (y luego la armadura) |
| Desgaste de la armadura | `core/durability.ts` | por turnos, cualquier pieza | la pieza que cubre la región golpeada |
| Daño de las criaturas comunes | `config/subzones.ts` `ENEMY_DAMAGE` | — | S1 −20 %, S2 −10 %, S3 −8 %, S6 −8 %, S9 −5 %, S10 −8 % |
| Recobrar el aliento al ganar | `config/subzones.ts` `RECOVER_AFTER_WIN` | — | +15 % de la vida (no cierra heridas) |
| Pociones del kit inicial | `core/data/classes.ts` | 2 | 3 |
| Tutorial | `core/combat.ts` (`unbreakable`) | se podía caer | no se baja de 1; al quedar al borde te levantas con el 35 % |

Duración y acumulación: el sangrado ya tiene techo (3 % por pulso entre todas las heridas) y los estados de turnos no se acumulan (se renueva la duración). Veneno (7 %) y quemadura (6 %) no se tocan porque también los usa el Mago contra las criaturas; si hiciera falta, se ajustan en `core/statuses.ts`.

## Resultados (después, 300 incursiones por fila)
| Clase | Escenario | 1 | 2 | 3 | 4 seguidos |
|---|---|---|---|---|---|
| Guerrero | S1 nv 1 inicial | 99 % | 96 % | 89 % | 76 % |
| Mago | S1 nv 1 inicial | 97 % | 89 % | 76 % | 57 % |
| Guerrero | S1 nv 1 novato | 98 % | 90 % | 73 % | 55 % |
| Mago | S1 nv 1 novato | 93 % | 76 % | 57 % | 36 % |

Estados por golpe recibido en S1: Guerrero 9 % (antes 32 %), Mago 13 % (antes 34 %). Las tablas completas, por subzona, con élites, jefes y tutorial, están en `simulador-actual.md`.

## Pendiente
- **Mago contra élites y jefes de S1 a S3:** 0–11 % de victorias (Guerrero 27–55 %). No cambia con este reequilibrio (élites y jefes no se tocaron). Hay que reforzar al Mago al principio o ajustar esos élites.
- **Final de cada zona** (S6 y S10): 4 seguidos queda en 8–29 %. Es intencionado que cueste, pero si se ve demasiado, `ENEMY_DAMAGE` de `panteon` y `trono`.
- Veneno y quemadura en la Cripta y el Infierno, si el veneno de S3 (12–20 % de los golpes) molesta.
