# Simulador de combate · escenario «actual»

300 incursiones por fila. Valores actuales del juego.

## Combates seguidos

Se sigue vivo tras 1, 2, 3 y 4 combates seguidos (cada combate tiene un 25 % de que se sume un segundo enemigo). Vida media al acabar cada uno (de los que siguen vivos). S1 con equipo inicial y 2 pociones, sin vendas; el resto con el equipo de su zona, 3 pociones y 2 vendas.

| Clase | Escenario | 1 | 2 | 3 | 4 | Vida tras 1 · 2 · 3 · 4 | Pociones gastadas |
|---|---|---|---|---|---|---|---|
| Guerrero | S1 · nv 1 · inicial | 99 % | 96 % | 89 % | 76 % | 88 % · 76 % · 66 % · 58 % | 1.5 |
| Guerrero | S1 · nv 5 · inicial | 99 % | 95 % | 85 % | 70 % | 86 % · 73 % · 62 % · 54 % | 1.8 |
| Guerrero | S1 · nv 6 · su zona | 100 % | 100 % | 100 % | 100 % | 96 % · 91 % · 86 % · 82 % | 0.2 |
| Guerrero | S2 · nv 15 · su zona | 97 % | 90 % | 74 % | 62 % | 87 % · 75 % · 69 % · 62 % | 1.7 |
| Guerrero | S3 · nv 25 · su zona | 93 % | 80 % | 59 % | 42 % | 87 % · 75 % · 69 % · 61 % | 1.7 |
| Guerrero | S4 · nv 35 · su zona | 98 % | 92 % | 82 % | 69 % | 94 % · 85 % · 77 % · 72 % | 0.8 |
| Guerrero | S5 · nv 45 · su zona | 95 % | 85 % | 70 % | 53 % | 92 % · 84 % · 77 % · 74 % | 1.2 |
| Guerrero | S6 · nv 55 · su zona | 94 % | 73 % | 51 % | 29 % | 85 % · 71 % · 61 % · 55 % | 1.9 |
| Guerrero | S7 · nv 65 · su zona | 100 % | 99 % | 95 % | 87 % | 96 % · 89 % · 84 % · 78 % | 0.7 |
| Guerrero | S8 · nv 75 · su zona | 95 % | 79 % | 53 % | 31 % | 85 % · 70 % · 61 % · 53 % | 2.0 |
| Guerrero | S9 · nv 85 · su zona | 91 % | 76 % | 58 % | 35 % | 87 % · 74 % · 64 % · 57 % | 1.7 |
| Guerrero | S10 · nv 95 · su zona | 84 % | 54 % | 25 % | 8 % | 80 % · 64 % · 50 % · 46 % | 2.1 |
| Mago | S1 · nv 1 · inicial | 97 % | 89 % | 76 % | 57 % | 90 % · 75 % · 63 % · 56 % | 1.5 |
| Mago | S1 · nv 5 · inicial | 98 % | 89 % | 77 % | 57 % | 89 % · 73 % · 60 % · 54 % | 1.7 |
| Mago | S1 · nv 6 · su zona | 100 % | 100 % | 98 % | 96 % | 98 % · 90 % · 83 % · 77 % | 0.4 |
| Mago | S2 · nv 15 · su zona | 91 % | 79 % | 65 % | 49 % | 93 % · 83 % · 74 % · 66 % | 1.3 |
| Mago | S3 · nv 25 · su zona | 85 % | 66 % | 46 % | 27 % | 92 % · 80 % · 74 % · 66 % | 1.3 |
| Mago | S4 · nv 35 · su zona | 90 % | 78 % | 59 % | 43 % | 95 % · 85 % · 80 % · 74 % | 0.8 |
| Mago | S5 · nv 45 · su zona | 87 % | 73 % | 60 % | 43 % | 95 % · 88 % · 83 % · 79 % | 0.6 |
| Mago | S6 · nv 55 · su zona | 76 % | 50 % | 30 % | 12 % | 89 % · 72 % · 57 % · 49 % | 1.5 |
| Mago | S7 · nv 65 · su zona | 100 % | 99 % | 95 % | 92 % | 98 % · 94 % · 91 % · 87 % | 0.2 |
| Mago | S8 · nv 75 · su zona | 90 % | 72 % | 51 % | 31 % | 91 % · 76 % · 65 % · 60 % | 1.4 |
| Mago | S9 · nv 85 · su zona | 92 % | 74 % | 55 % | 40 % | 93 % · 81 % · 76 % · 68 % | 1.2 |
| Mago | S10 · nv 95 · su zona | 75 % | 50 % | 26 % | 9 % | 90 % · 70 % · 58 % · 50 % | 1.5 |

## Estados por golpe recibido

Golpes que alcanzan al jugador y lo que provocan (sangrados y fracturas por la anatomía; el resto, estados de habilidades enemigas).

| Clase | Escenario | Golpes | Sangrado leve | Sangrado grave | Fractura | Algún estado de cuerpo | Otros estados |
|---|---|---|---|---|---|---|---|
| Guerrero | S1 · nv 1 · inicial | 17.5 | 6 % | 3 % | 0 % | 9 % | — |
| Guerrero | S1 · nv 5 · inicial | 18.9 | 6 % | 3 % | 0 % | 9 % | — |
| Guerrero | S1 · nv 6 · su zona | 13.9 | 3 % | 0 % | 0 % | 3 % | — |
| Guerrero | S2 · nv 15 · su zona | 17.9 | 1 % | 0 % | 0 % | 1 % | veneno 6 %, aturdimiento 4 % |
| Guerrero | S3 · nv 25 · su zona | 17.1 | 2 % | 0 % | 0 % | 2 % | veneno 13 % |
| Guerrero | S4 · nv 35 · su zona | 12.1 | 0 % | 0 % | 0 % | 1 % | veneno 5 %, aturdimiento 3 % |
| Guerrero | S5 · nv 45 · su zona | 15.0 | 1 % | 0 % | 0 % | 1 % | congelación 8 %, aturdimiento 3 %, veneno 3 % |
| Guerrero | S6 · nv 55 · su zona | 19.0 | 1 % | 0 % | 0 % | 1 % | aturdimiento 5 %, veneno 3 % |
| Guerrero | S7 · nv 65 · su zona | 13.2 | 2 % | 0 % | 0 % | 2 % | quemadura 17 %, veneno 4 % |
| Guerrero | S8 · nv 75 · su zona | 18.0 | 0 % | 0 % | 0 % | 1 % | quemadura 11 % |
| Guerrero | S9 · nv 85 · su zona | 17.3 | 1 % | 0 % | 0 % | 2 % | quemadura 10 %, aturdimiento 3 % |
| Guerrero | S10 · nv 95 · su zona | 19.5 | 1 % | 0 % | 0 % | 2 % | aturdimiento 10 %, quemadura 3 % |
| Mago | S1 · nv 1 · inicial | 12.1 | 10 % | 3 % | 0 % | 13 % | — |
| Mago | S1 · nv 5 · inicial | 13.0 | 10 % | 3 % | 1 % | 14 % | — |
| Mago | S1 · nv 6 · su zona | 7.7 | 5 % | 1 % | 0 % | 6 % | — |
| Mago | S2 · nv 15 · su zona | 12.0 | 2 % | 0 % | 0 % | 3 % | veneno 7 %, aturdimiento 5 % |
| Mago | S3 · nv 25 · su zona | 10.0 | 3 % | 1 % | 0 % | 4 % | veneno 19 % |
| Mago | S4 · nv 35 · su zona | 8.6 | 1 % | 0 % | 1 % | 2 % | veneno 6 %, aturdimiento 3 % |
| Mago | S5 · nv 45 · su zona | 9.1 | 1 % | 0 % | 0 % | 2 % | congelación 15 %, aturdimiento 8 %, veneno 5 % |
| Mago | S6 · nv 55 · su zona | 10.7 | 2 % | 0 % | 1 % | 2 % | aturdimiento 7 %, veneno 4 % |
| Mago | S7 · nv 65 · su zona | 6.4 | 3 % | 1 % | 0 % | 4 % | quemadura 29 %, veneno 7 % |
| Mago | S8 · nv 75 · su zona | 10.7 | 1 % | 0 % | 1 % | 2 % | quemadura 19 % |
| Mago | S9 · nv 85 · su zona | 11.5 | 3 % | 1 % | 0 % | 3 % | quemadura 16 %, aturdimiento 7 % |
| Mago | S10 · nv 95 · su zona | 11.9 | 1 % | 0 % | 1 % | 2 % | aturdimiento 16 %, quemadura 7 % |

## Élites y jefes (un combate, cuerpo entero, 3 pociones)

| Subzona | Clase | Nivel | Élite | Jefe |
|---|---|---|---|---|
| afueras | Guerrero | 6 | 55 % | 43 % |
| castillo | Guerrero | 15 | 54 % | 19 % |
| calabozos | Guerrero | 25 | 27 % | 1 % |
| osario | Guerrero | 35 | 93 % | 22 % |
| catacumbas | Guerrero | 45 | 74 % | 43 % |
| panteon | Guerrero | 55 | 86 % | 13 % |
| carmesi | Guerrero | 65 | 76 % | 60 % |
| puertas | Guerrero | 75 | 89 % | 52 % |
| rios | Guerrero | 85 | 98 % | 39 % |
| trono | Guerrero | 95 | 82 % | 31 % |
| afueras | Mago | 6 | 11 % | 4 % |
| castillo | Mago | 15 | 6 % | 0 % |
| calabozos | Mago | 25 | 1 % | 1 % |
| osario | Mago | 35 | 82 % | 6 % |
| catacumbas | Mago | 45 | 82 % | 0 % |
| panteon | Mago | 55 | 14 % | 12 % |
| carmesi | Mago | 65 | 89 % | 34 % |
| puertas | Mago | 75 | 76 % | 39 % |
| rios | Mago | 85 | 95 % | 32 % |
| trono | Mago | 95 | 62 % | 28 % |

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
| Guerrero | S1 · nv 1 · novato | 98 % | 90 % | 73 % | 55 % | 83 % · 69 % · 61 % · 53 % |
| Guerrero | S1 · nv 5 · novato | 97 % | 86 % | 65 % | 42 % | 81 % · 67 % · 55 % · 51 % |
| Mago | S1 · nv 1 · novato | 93 % | 76 % | 57 % | 36 % | 82 % · 67 % · 58 % · 49 % |
| Mago | S1 · nv 5 · novato | 93 % | 76 % | 52 % | 32 % | 81 % · 66 % · 57 % · 49 % |
