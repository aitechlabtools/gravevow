# Simulador de combate · escenario «actual»

300 incursiones por fila. Valores actuales del juego.

## Combates seguidos

Se sigue vivo tras 1, 2, 3 y 4 combates seguidos (cada combate tiene un 25 % de que se sume un segundo enemigo). Vida media al acabar cada uno (de los que siguen vivos). S1 con equipo inicial y 2 pociones, sin vendas; el resto con el equipo de su zona, 3 pociones y 2 vendas.

| Clase | Escenario | 1 | 2 | 3 | 4 | Vida tras 1 · 2 · 3 · 4 | Pociones gastadas |
|---|---|---|---|---|---|---|---|
| Guerrero | S1 · nv 1 · inicial | 100 % | 99 % | 94 % | 86 % | 90 % · 79 % · 70 % · 63 % | 1.2 |
| Guerrero | S1 · nv 5 · inicial | 100 % | 99 % | 93 % | 82 % | 90 % · 78 % · 67 % · 60 % | 1.5 |
| Guerrero | S1 · nv 6 · su zona | 100 % | 100 % | 100 % | 100 % | 98 % · 94 % · 91 % · 87 % | 0.0 |
| Guerrero | S2 · nv 15 · su zona | 100 % | 96 % | 88 % | 79 % | 89 % · 79 % · 71 % · 66 % | 1.6 |
| Guerrero | S3 · nv 25 · su zona | 96 % | 89 % | 75 % | 60 % | 89 % · 80 % · 74 % · 70 % | 1.5 |
| Guerrero | S4 · nv 35 · su zona | 97 % | 92 % | 83 % | 73 % | 96 % · 88 % · 81 % · 76 % | 0.7 |
| Guerrero | S5 · nv 45 · su zona | 98 % | 88 % | 76 % | 62 % | 93 % · 87 % · 80 % · 76 % | 1.2 |
| Guerrero | S6 · nv 55 · su zona | 93 % | 75 % | 54 % | 36 % | 88 % · 78 % · 72 % · 67 % | 1.6 |
| Guerrero | S7 · nv 65 · su zona | 100 % | 98 % | 95 % | 91 % | 97 % · 93 % · 89 % · 85 % | 0.4 |
| Guerrero | S8 · nv 75 · su zona | 92 % | 75 % | 59 % | 40 % | 90 % · 81 % · 72 % · 67 % | 1.4 |
| Guerrero | S9 · nv 85 · su zona | 93 % | 77 % | 59 % | 40 % | 90 % · 79 % · 72 % · 64 % | 1.5 |
| Guerrero | S10 · nv 95 · su zona | 79 % | 53 % | 29 % | 13 % | 86 % · 75 % · 68 % · 61 % | 1.7 |
| Mago | S1 · nv 1 · inicial | 100 % | 98 % | 89 % | 77 % | 92 % · 78 % · 68 % · 59 % | 1.4 |
| Mago | S1 · nv 5 · inicial | 100 % | 98 % | 87 % | 71 % | 90 % · 75 % · 65 % · 59 % | 1.7 |
| Mago | S1 · nv 6 · su zona | 100 % | 100 % | 100 % | 100 % | 98 % · 92 % · 87 % · 82 % | 0.2 |
| Mago | S2 · nv 15 · su zona | 94 % | 86 % | 79 % | 68 % | 94 % · 84 % · 74 % · 68 % | 1.5 |
| Mago | S3 · nv 25 · su zona | 91 % | 76 % | 64 % | 46 % | 93 % · 83 % · 76 % · 70 % | 1.3 |
| Mago | S4 · nv 35 · su zona | 91 % | 78 % | 62 % | 45 % | 95 % · 88 % · 82 % · 77 % | 0.9 |
| Mago | S5 · nv 45 · su zona | 93 % | 78 % | 66 % | 54 % | 93 % · 88 % · 82 % · 77 % | 1.0 |
| Mago | S6 · nv 55 · su zona | 77 % | 53 % | 35 % | 20 % | 90 % · 77 % · 66 % · 60 % | 1.5 |
| Mago | S7 · nv 65 · su zona | 99 % | 97 % | 94 % | 92 % | 99 % · 97 % · 93 % · 91 % | 0.1 |
| Mago | S8 · nv 75 · su zona | 90 % | 70 % | 47 % | 32 % | 91 % · 80 % · 72 % · 67 % | 1.2 |
| Mago | S9 · nv 85 · su zona | 93 % | 79 % | 61 % | 41 % | 95 % · 84 % · 76 % · 74 % | 1.2 |
| Mago | S10 · nv 95 · su zona | 75 % | 49 % | 28 % | 13 % | 93 % · 81 % · 71 % · 71 % | 1.3 |

## Estados por golpe recibido

Golpes que alcanzan al jugador y lo que provocan (sangrados y fracturas por la anatomía; el resto, estados de habilidades enemigas).

| Clase | Escenario | Golpes | Sangrado leve | Sangrado grave | Fractura | Algún estado de cuerpo | Otros estados |
|---|---|---|---|---|---|---|---|
| Guerrero | S1 · nv 1 · inicial | 18.0 | 4 % | 2 % | 0 % | 6 % | — |
| Guerrero | S1 · nv 5 · inicial | 19.9 | 4 % | 1 % | 0 % | 5 % | — |
| Guerrero | S1 · nv 6 · su zona | 13.7 | 2 % | 0 % | 0 % | 2 % | — |
| Guerrero | S2 · nv 15 · su zona | 19.7 | 1 % | 0 % | 0 % | 1 % | veneno 4 %, aturdimiento 0 % |
| Guerrero | S3 · nv 25 · su zona | 17.6 | 2 % | 0 % | 0 % | 2 % | veneno 8 % |
| Guerrero | S4 · nv 35 · su zona | 12.4 | 0 % | 0 % | 0 % | 1 % | veneno 3 %, aturdimiento 0 % |
| Guerrero | S5 · nv 45 · su zona | 16.0 | 1 % | 0 % | 0 % | 1 % | congelación 5 %, veneno 2 %, aturdimiento 1 % |
| Guerrero | S6 · nv 55 · su zona | 19.0 | 0 % | 0 % | 0 % | 1 % | veneno 1 %, aturdimiento 1 % |
| Guerrero | S7 · nv 65 · su zona | 13.3 | 2 % | 0 % | 0 % | 2 % | quemadura 10 %, veneno 2 % |
| Guerrero | S8 · nv 75 · su zona | 17.0 | 0 % | 0 % | 0 % | 1 % | quemadura 7 %, aturdimiento 0 % |
| Guerrero | S9 · nv 85 · su zona | 17.6 | 1 % | 0 % | 0 % | 1 % | quemadura 6 %, aturdimiento 1 % |
| Guerrero | S10 · nv 95 · su zona | 17.8 | 1 % | 0 % | 0 % | 2 % | aturdimiento 2 %, quemadura 2 % |
| Mago | S1 · nv 1 · inicial | 13.5 | 7 % | 3 % | 0 % | 10 % | — |
| Mago | S1 · nv 5 · inicial | 14.3 | 7 % | 2 % | 0 % | 10 % | — |
| Mago | S1 · nv 6 · su zona | 7.6 | 5 % | 0 % | 0 % | 5 % | — |
| Mago | S2 · nv 15 · su zona | 13.2 | 1 % | 0 % | 0 % | 1 % | veneno 5 %, aturdimiento 1 % |
| Mago | S3 · nv 25 · su zona | 11.6 | 3 % | 1 % | 0 % | 4 % | veneno 13 % |
| Mago | S4 · nv 35 · su zona | 9.1 | 0 % | 0 % | 0 % | 0 % | veneno 4 %, aturdimiento 1 % |
| Mago | S5 · nv 45 · su zona | 10.8 | 1 % | 0 % | 0 % | 1 % | congelación 8 %, aturdimiento 4 %, veneno 3 % |
| Mago | S6 · nv 55 · su zona | 11.4 | 0 % | 0 % | 0 % | 1 % | veneno 3 %, aturdimiento 1 % |
| Mago | S7 · nv 65 · su zona | 5.9 | 3 % | 0 % | 0 % | 4 % | quemadura 18 %, veneno 3 % |
| Mago | S8 · nv 75 · su zona | 10.0 | 1 % | 0 % | 1 % | 1 % | quemadura 12 %, aturdimiento 0 % |
| Mago | S9 · nv 85 · su zona | 12.2 | 2 % | 0 % | 0 % | 2 % | quemadura 10 %, aturdimiento 3 % |
| Mago | S10 · nv 95 · su zona | 11.0 | 1 % | 0 % | 0 % | 2 % | aturdimiento 5 %, quemadura 4 % |

## Élites y jefes (un combate, cuerpo entero, 3 pociones)

| Subzona | Clase | Nivel | Élite | Jefe |
|---|---|---|---|---|
| afueras | Guerrero | 6 | 72 % | 45 % |
| castillo | Guerrero | 15 | 67 % | 29 % |
| calabozos | Guerrero | 25 | 40 % | 6 % |
| osario | Guerrero | 35 | 96 % | 37 % |
| catacumbas | Guerrero | 45 | 83 % | 38 % |
| panteon | Guerrero | 55 | 82 % | 16 % |
| carmesi | Guerrero | 65 | 85 % | 54 % |
| puertas | Guerrero | 75 | 90 % | 48 % |
| rios | Guerrero | 85 | 98 % | 37 % |
| trono | Guerrero | 95 | 78 % | 33 % |
| afueras | Mago | 6 | 22 % | 2 % |
| castillo | Mago | 15 | 4 % | 0 % |
| calabozos | Mago | 25 | 0 % | 0 % |
| osario | Mago | 35 | 96 % | 17 % |
| catacumbas | Mago | 45 | 81 % | 7 % |
| panteon | Mago | 55 | 14 % | 14 % |
| carmesi | Mago | 65 | 97 % | 34 % |
| puertas | Mago | 75 | 77 % | 32 % |
| rios | Mago | 85 | 94 % | 24 % |
| trono | Mago | 95 | 73 % | 36 % |

## Tutorial: probabilidad de caer (sin la red de seguridad)

«Novato» solo usa el ataque básico y la poción por debajo del 35 %.

| Clase | Jugador | Rata | Bandidos con Osric | Osric traidor | Alguna vez |
|---|---|---|---|---|---|
| Guerrero | razonable | 0 % | 0 % | 0 % | 0 % |
| Mago | razonable | 0 % | 0 % | 0 % | 0 % |
| Guerrero | novato | 0 % | 0 % | 0 % | 0 % |
| Mago | novato | 0 % | 0 % | 0 % | 0 % |

## S1 con un jugador novato (solo ataque básico)

| Clase | Escenario | 1 | 2 | 3 | 4 | Vida tras 1 · 2 · 3 · 4 |
|---|---|---|---|---|---|---|
| Guerrero | S1 · nv 1 · novato | 100 % | 95 % | 85 % | 68 % | 85 % · 73 % · 63 % · 57 % |
| Guerrero | S1 · nv 5 · novato | 99 % | 89 % | 74 % | 51 % | 84 % · 72 % · 63 % · 59 % |
| Mago | S1 · nv 1 · novato | 98 % | 88 % | 73 % | 55 % | 84 % · 71 % · 62 % · 55 % |
| Mago | S1 · nv 5 · novato | 99 % | 86 % | 64 % | 47 % | 82 % · 69 % · 62 % · 55 % |
