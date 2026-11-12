# Bloque 1 · Entrega 1A: análisis del estado actual

12/11/2026. Solo análisis: no se ha tocado el juego. Datos del repositorio a fecha del commit «0.9.3.3».

## 1. Qué hay hecho y qué falta

| Parte del prompt | Estado actual | Qué falta |
|---|---|---|
| 1.1 Panel de heridas y necesidades | Silueta pequeña, detalle de la región y barras con «Comer (1)» y «Beber (1)» | Rehacer la distribución entera |
| 1.2 Curar tocando | Hay tratamientos por región (`treatError` y `applyTreatment` en `core/anatomy.ts`): venda, hemostático, torniquete, férula, cirugía y analgésico | Lista de objetos útiles al tocar una herida, resaltado en la mochila y «qué mercader lo vende». Arrastrar, solo como extra |
| 1.3 Curación tras morir | **Ya existe**: tras caer cuesta 1 moneda y es gratis sin oro (`cureCost`). Al volver de una extracción: 1 moneda por cada 10 % de vida que falta, más 2 por fractura, con tope de 12 | Que se vea con claridad: botón al llegar al Bastión y en el panel |
| 1.4 Equipo tras morir | **Ya existe, pero casi nunca salta** (ver punto 2) | Cambiar cuándo se da, rellenar solo las ranuras vacías, marcarlo como «Equipo de recluta», que no se venda ni se desguace, y ponerlo en un archivo de datos propio |
| 1.5 Balanceo | Hay simulador (`scripts/simular.mjs`). En la Fase 10 ya se bajaron las lesiones, la armadura protege por zona y la cabeza no se golpea en S1 y S2 | Tipos de daño completos, zonas por enemigo, tamaño y fuerza, y ampliar el simulador con zonas golpeadas y equipo de recluta |
| 1.6 Comer desde la mochila | Solo hay 4 alimentos y el botón come el primero que encuentra | Lista para elegir, variedad de alimentos, aviso de lo que se desperdicia y archivo de datos |
| Tutorial imposible de perder | **Ya existe**: en el tutorial no se cae (al llegar a 1 se levanta) y no hay lesiones (`combat.ts`, `noInjuries`) | Solo comprobarlo. Si has muerto en el tutorial, fue antes de la Fase 10 o hay un fallo que conviene reproducir |

## 2. Qué pasó con el equipo base

- **Al crear el personaje** sigue dándose el equipo de su clase (`starterKit` en `core/data/classes.ts`). Por ejemplo, el Guerrero recibe espada oxidada, escudo de madera, túnica acolchada, 3 pociones, tónico, ración y agua.
- **Al morir**, `needsRecruitKit` (en `core/profile.ts`) solo da equipo si **no tienes ningún arma en ningún sitio**: ni equipada, ni en la mochila, ni en el almacén.
  - En cuanto guardas en el almacén un arma cualquiera, aunque sea rota o de otra clase, no recibes nada.
  - Además solo se fija en el arma. Si mueres sin armadura pero con un arma en el almacén, tampoco recibes nada.
- **Esto explica por qué vuelves «sin nada».** No es que el equipo base desapareciera: la condición para darlo es demasiado estricta.
- **Propuesta:** dar el equipo si la mano derecha o el torso están **vacíos al volver**, y rellenar solo esas ranuras.

## 3. Cómo funciona ahora el daño

- **Regiones:** 7 zonas del cuerpo. Mueres si la cabeza o el tórax llegan a 0. Un brazo, una pierna o el abdomen a 0 quedan inutilizados, y el daño sobrante pasa a las demás zonas.
- **Dónde cae el golpe** (`ANATOMY.hitWeight`):

| Cabeza | Tórax | Abdomen | Cada brazo | Cada pierna |
|---|---|---|---|---|
| 4 | 12 | 16 | 18 | 16 |

  - Es **igual para todos los enemigos**: una rata puede golpear el tórax igual que un coloso.
  - La cabeza solo se golpea desde S3.
- **Lesiones** (solo con golpes físicos):

| Lesión | Golpe normal | Golpe crítico |
|---|---|---|
| Sangrado | 7 % | 20 % (y grave) |
| Fractura (solo brazos y piernas) | 3 % | 8 % |

  - Estas probabilidades se multiplican según el **efecto visual** del golpe (`INJURY_BY_FX`):

| Efecto | Sangrado | Fractura |
|---|---|---|
| Corte | ×1 | ×0,3 |
| Mordisco | ×1 | ×0 |
| Golpe contundente | ×0,2 | ×1,7 |

- **Armadura:** la pieza que cubre la zona evita el 80 % de las lesiones. Con el desgaste baja por tramos: entera por encima del 25 % de durabilidad, la mitad entre el 25 % y el 10 %, y nada por debajo.
- **Otros estados**, en `core/statuses.ts`:
  - veneno: 7 % de la vida por turno;
  - quemadura: 6 %;
  - sangrado de habilidad: 5 %;
  - congelación y aturdimiento: pierdes el turno;
  - debilidad: haces un 30 % menos de daño;
  - armadura rota: recibes un 25 % más de daño.
  - Los ponen las habilidades enemigas con su propia probabilidad.
- **Problemas detectados:**
  1. No hay tipo de daño: se usa el efecto visual. Las **flechas cuentan como corte** (deberían ser punzantes) y el corte puede romper huesos (×0,3), en contra de lo que pide el prompt.
  2. No hay tamaño ni «fuerte»: todos golpean las mismas zonas.
  3. Los guantes protegen los dos brazos, pero el escudo solo el izquierdo, y la armadura protege igual contra corte que contra golpe contundente.
  4. Los estados de habilidades (veneno, quemadura, congelación) **no pasan por la armadura**. Son los más frecuentes desde S2 y seguramente son la sensación de «siempre me pasa algo».

## 4. Resultados del simulador ahora

Datos de `docs/equilibrio/simulador-actual.md`: 300 partidas por fila, y lo he vuelto a ejecutar hoy con el mismo resultado.

**Seguir vivo tras 1, 2, 3 y 4 combates seguidos** (con un 25 % de que se sume un segundo enemigo):

| Caso | 1 | 2 | 3 | 4 |
|---|---|---|---|---|
| Guerrero S1, nivel 1, jugador razonable | 99 % | 96 % | 89 % | 76 % |
| Mago S1, nivel 1, jugador razonable | 97 % | 89 % | 76 % | 57 % |
| Guerrero S1, nivel 1, **novato** (solo ataque básico) | 98 % | 90 % | 72 % | **54 %** |
| Mago S1, nivel 1, **novato** | 93 % | 79 % | 56 % | **37 %** |
| Guerrero S10, su equipo | 84 % | 54 % | 25 % | 8 % |
| Mago S6, su equipo | 76 % | 50 % | 30 % | 12 % |

**Lesiones por golpe recibido en S1:** el Guerrero sangra en el 9 % de los golpes y el Mago en el 13 %. Como una incursión de 4 combates recibe unos 17 golpes, salen **1,5 o 2 lesiones por incursión**: casi siempre acabas sangrando. Desde S2 se suman el veneno (6–19 %), la congelación (8–15 %) y la quemadura (10–17 %).

**Élites y jefes**, en un combate con 3 pociones:

| Clase | Contra élite en S1–S3 | Contra jefe en S1–S3 |
|---|---|---|
| Guerrero | 22–61 % | 0–43 % |
| Mago | 1–12 % | 0–1 % |

El Mago está claramente roto contra élites y jefes en las primeras subzonas.

**Tutorial:** 0 % de caer, incluso sin la red de seguridad.

**Conclusión:**
- En S1, 3 o 4 combates seguidos solo son lo normal para un Guerrero que juega bien.
- Para un novato o un Mago no lo son.
- Las lesiones son poco probables por golpe, pero casi seguras por incursión.

## 5. Enemigos

Generado con `tools/simulador/tablaEnemigos.ts`. Formato: tipo/efecto. «Puede causar» es lo que ve hoy la ficha de combate.

| Subzona | Enemigo | Rol | PV | Golpe básico (efecto) | Habilidades (efecto) | Puede causar |
|---|---|---|---|---|---|---|
| 1 Afueras del Bastión | Bandido saqueador | común | 56 | Cuchillada (physical/slash) | Corte sucio (physical/slash), Golpe bajo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 1 Afueras del Bastión | Arquero renegado | común | 42 | Flecha (physical/slash) | Disparo certero (physical/slash) | Sangrado |
| 1 Afueras del Bastión | Lobo famélico | común | 44 | Dentellada (physical/bite) | Mordisco sangrante (physical/bite) | Sangrado |
| 1 Afueras del Bastión | Cuervo carroñero | común | 28 | Picotazo (physical/bite) | Mordisco sangrante (physical/bite) | Sangrado |
| 1 Afueras del Bastión | Capitán de bandidos | élite | 190 | Sable (physical/slash) | Grito de mando (—/holy), Corte sucio (physical/slash), Golpe óseo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 1 Afueras del Bastión | Mordrek el Desertor | jefe | 260 | Sable de la Guardia (physical/slash) | Corte sucio (physical/slash), Grito de mando (—/holy), Embestida (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 2 El Bastión en ruinas | Esqueleto guerrero | común | 64 | Espada mellada (physical/slash) | Golpe óseo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 2 El Bastión en ruinas | Armadura hueca | común | 70 | Espadazo (physical/slash) | Bloqueo (—/shield), Golpe óseo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 2 El Bastión en ruinas | Criado ahorcado | común | 50 | Zarpazo (physical/bite) | Garra putrefacta (physical/bite) | Sangrado, Veneno |
| 2 El Bastión en ruinas | Murciélago cavernario | común | 34 | Zarpazo (physical/bite) | Mordisco sangrante (physical/bite) | Sangrado |
| 2 El Bastión en ruinas | Caballero de la guardia caída | élite | 200 | Mandoble (physical/slash) | Tajo desgarrador (physical/slash), Bloqueo (—/shield), Grito de guerra (—/holy) | Sangrado |
| 2 El Bastión en ruinas | El Senescal Quemado | jefe | 260 | Maza ardiente (physical/fire) | Escupitajo de brasas (magical/fire), Golpe óseo (physical/smash), Remiendo oscuro (—/dark) | Sangrado, Fractura, Quemadura, Aturdimiento |
| 3 Las mazmorras del Bastión | Rata de osario | común | 30 | Mordisco (physical/bite) | Mordisco pestilente (physical/bite) | Sangrado, Veneno |
| 3 Las mazmorras del Bastión | Torturador | común | 58 | Mazazo (physical/smash) | Corte sucio (physical/slash), Partecráneos (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 3 Las mazmorras del Bastión | Preso enloquecido | común | 40 | Uñas (physical/bite) | Golpe bajo (physical/smash), Mordisco sangrante (physical/bite) | Sangrado, Fractura, Aturdimiento |
| 3 Las mazmorras del Bastión | Gusano de pozo | común | 60 | Succión (physical/bite) | Mordisco pestilente (physical/bite) | Sangrado, Veneno |
| 3 Las mazmorras del Bastión | El Verdugo | élite | 180 | Hacha del verdugo (physical/slash) | Siega (physical/slash), Partecráneos (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 3 Las mazmorras del Bastión | Señor del Osario | jefe | 203 | Mandoble de hueso (physical/smash) | Losa funeraria (physical/smash), Onda necrótica (magical/dark), Escudo de huesos (—/shield) | Fractura, Aturdimiento, Veneno |
| 4 El Osario de Umbravel | Necrófago | común | 74 | Zarpazo (physical/bite) | Garra putrefacta (physical/bite), Remiendo oscuro (—/dark) | Sangrado, Veneno |
| 4 El Osario de Umbravel | Arquero de hueso | común | 52 | Flecha (physical/slash) | Flecha de hueso (physical/slash) | Sangrado |
| 4 El Osario de Umbravel | Coloso de huesos | común | 80 | Fémur (physical/smash) | Escudo de huesos (—/shield), Golpe óseo (physical/smash) | Fractura, Aturdimiento |
| 4 El Osario de Umbravel | Monje del osario | común | 46 | Bastón (magical/dark) | Saeta sepulcral (magical/dark), Remiendo oscuro (—/dark) | — |
| 4 El Osario de Umbravel | Caballero del sepulcro | élite | 150 | Espadón sepulcral (physical/slash) | Losa funeraria (physical/smash), Grito de mando (—/holy), Escudo de huesos (—/shield) | Sangrado, Fractura, Aturdimiento |
| 4 El Osario de Umbravel | El Abad de los Huesos | jefe | 290 | Báculo de vértebras (magical/dark) | Saeta sepulcral (magical/dark), Onda necrótica (magical/dark), Escudo de huesos (—/shield) | Veneno |
| 5 Las Catacumbas Ahogadas | Espectro lamentador | común | 58 | Toque gélido (magical/frost) | Lamento helado (magical/frost) | Congelación |
| 5 Las Catacumbas Ahogadas | Ahogado | común | 56 | Abrazo frío (physical/frost) | Garra putrefacta (physical/bite), Lamento helado (magical/frost) | Sangrado, Veneno, Congelación |
| 5 Las Catacumbas Ahogadas | Sanguijuela de cripta | común | 34 | Ventosa (physical/bite) | Mordisco sangrante (physical/bite) | Sangrado |
| 5 Las Catacumbas Ahogadas | Plañidera | común | 44 | Lamento (magical/frost) | Lamento helado (magical/frost), Mirada del pozo (magical/dark) | Congelación, Aturdimiento |
| 5 Las Catacumbas Ahogadas | La Dama del Agua | élite | 180 | Ola negra (magical/frost) | Lanza de escarcha (magical/frost), Velo fúnebre (—/dark), Prisión de hielo (magical/frost) | Congelación |
| 5 Las Catacumbas Ahogadas | El Barquero de las Aguas Negras | jefe | 310 | Remo de hueso (physical/smash) | Lamento helado (magical/frost), Siega (physical/slash), Velo fúnebre (—/dark) | Sangrado, Fractura, Congelación |
| 6 El Panteón de los Nobles | Sacerdote no-muerto | común | 62 | Cetro oscuro (magical/dark) | Saeta sepulcral (magical/dark), Remiendo oscuro (—/dark), Onda necrótica (magical/dark) | Veneno |
| 6 El Panteón de los Nobles | Guardián de tumbas | común | 104 | Alabarda (physical/slash) | Bloqueo (—/shield), Golpe óseo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 6 El Panteón de los Nobles | Noble embalsamado | común | 60 | Estoque dorado (physical/slash) | Tajo desgarrador (physical/slash), Estocada (physical/slash) | Sangrado |
| 6 El Panteón de los Nobles | Gárgola de mármol | común | 82 | Garra de piedra (physical/smash) | Bloqueo (—/shield), Golpe óseo (physical/smash) | Fractura, Aturdimiento |
| 6 El Panteón de los Nobles | Duelista espectral | élite | 175 | Estocada (physical/slash) | Estocada (physical/slash), Puñalada traicionera (physical/slash), Estocada venenosa (physical/poison) | Sangrado, Veneno |
| 6 El Panteón de los Nobles | La Reina Velada | jefe | 270 | Caricia helada (magical/frost) | Lamento de la Reina (magical/frost), Velo fúnebre (—/dark), Onda necrótica (magical/dark) | Congelación, Veneno |
| 7 La Cripta Carmesí | Diablillo de brasas | común | 50 | Zarpazo ardiente (physical/fire) | Escupitajo de brasas (magical/fire) | Sangrado, Quemadura |
| 7 La Cripta Carmesí | Cultista de la Llama | común | 46 | Daga ritual (magical/fire) | Escupitajo de brasas (magical/fire), Remiendo oscuro (—/dark) | Quemadura |
| 7 La Cripta Carmesí | Necrófago sangrante | común | 58 | Zarpazo (physical/bite) | Mordisco sangrante (physical/bite), Garra putrefacta (physical/bite) | Sangrado, Veneno |
| 7 La Cripta Carmesí | Penitente desollado | común | 52 | Látigo (physical/slash) | Corte sucio (physical/slash), Grito de guerra (—/holy) | Sangrado |
| 7 La Cripta Carmesí | Sumo sacerdote del Umbral | élite | 170 | Cetro de sangre (magical/fire) | Onda necrótica (magical/dark), Fuego del abismo (magical/fire), Remiendo oscuro (—/dark) | Veneno, Quemadura |
| 7 La Cripta Carmesí | Vharok, Guardián del Umbral | jefe | 410 | Espadón del Umbral (physical/slash) | Tajo infernal (physical/smash), Bloqueo (—/shield), Cadenas del abismo (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 8 Las Puertas del Abismo | Can del abismo | común | 78 | Mordisco (physical/bite) | Dentellada doble (physical/bite) | Sangrado |
| 8 Las Puertas del Abismo | Invocador de azufre | común | 60 | Chispa de azufre (magical/fire) | Lluvia de azufre (magical/fire), Remiendo oscuro (—/dark) | Quemadura |
| 8 Las Puertas del Abismo | Elemental de magma | común | 78 | Puño de lava (physical/fire) | Escupitajo de brasas (magical/fire), Bloqueo (—/shield) | Sangrado, Quemadura |
| 8 Las Puertas del Abismo | Gárgola de obsidiana | común | 80 | Garra de obsidiana (physical/smash) | Bloqueo (—/shield), Tajo infernal (physical/smash) | Fractura |
| 8 Las Puertas del Abismo | Domador de canes | élite | 200 | Látigo de cadenas (physical/slash) | Grito de mando (—/holy), Cadenas del abismo (physical/smash), Tajo infernal (physical/smash) | Sangrado, Fractura, Aturdimiento |
| 8 Las Puertas del Abismo | Ignaroth, Señor de la Fragua | jefe | 390 | Martillo de la fragua (physical/smash) | Cadenas del abismo (physical/smash), Lluvia de azufre (magical/fire), Tajo infernal (physical/smash) | Fractura, Aturdimiento, Quemadura |
| 9 Los Ríos de Fuego | Tentadora del pozo | común | 64 | Látigo (physical/slash) | Mirada del pozo (magical/dark), Lluvia de azufre (magical/fire) | Sangrado, Aturdimiento, Quemadura |
| 9 Los Ríos de Fuego | Caballero infernal | común | 116 | Espadón al rojo (physical/slash) | Tajo infernal (physical/smash), Bloqueo (—/shield) | Sangrado, Fractura |
| 9 Los Ríos de Fuego | Desollador | común | 56 | Gancho (physical/slash) | Tajo desgarrador (physical/slash), Corte sucio (physical/slash) | Sangrado |
| 9 Los Ríos de Fuego | Alma ardiente | común | 38 | Toque abrasador (magical/fire) | Escupitajo de brasas (magical/fire), Lluvia de azufre (magical/fire) | Quemadura |
| 9 Los Ríos de Fuego | Carcelero de cadenas | élite | 160 | Mangual (physical/smash) | Cadenas del abismo (physical/smash), Tajo infernal (physical/smash), Furia abisal (—/dark) | Fractura, Aturdimiento |
| 9 Los Ríos de Fuego | La Bestia de Azufre | jefe | 410 | Zarpazo humeante (physical/bite) | Dentellada doble (physical/bite), Lluvia de azufre (magical/fire) | Sangrado, Quemadura |
| 10 El Trono de las Cadenas | Señor del foso | común | 84 | Hacha del foso (physical/slash) | Tajo infernal (physical/smash), Furia abisal (—/dark) | Sangrado, Fractura |
| 10 El Trono de las Cadenas | Heraldo encadenado | común | 62 | Cadenazo (physical/smash) | Cadenas del abismo (physical/smash) | Fractura, Aturdimiento |
| 10 El Trono de las Cadenas | Engendro del abismo | común | 66 | Mordisco (physical/bite) | Dentellada doble (physical/bite) | Sangrado |
| 10 El Trono de las Cadenas | Devorador de almas | común | 54 | Hambre (magical/dark) | Lluvia de azufre (magical/fire), Remiendo oscuro (—/dark), Mirada del pozo (magical/dark) | Quemadura, Aturdimiento |
| 10 El Trono de las Cadenas | Heraldo de Belzar | élite | 220 | Espada de cadenas (physical/slash) | Tajo infernal (physical/smash), Cadenas del abismo (physical/smash), Furia abisal (—/dark) | Sangrado, Fractura, Aturdimiento |
| 10 El Trono de las Cadenas | Belzar, Señor de las Cadenas | jefe | 480 | Cadena ardiente (physical/smash) | Cadenas del abismo (physical/smash), Fuego del abismo (magical/fire), Furia abisal (—/dark) | Fractura, Aturdimiento, Quemadura |

## 6. Alimentos y bebidas

| Objeto | Saciedad | Hidratación | Extra | Precio | Dónde |
|---|---|---|---|---|---|
| Ración de viaje | +25 | — | — | 6 | Mercader |
| Odre de agua | — | +30 | — | 5 | Mercader |
| Guiso del Bastión | +40 | — | −10 % de gasto de Descanso en la siguiente incursión. Solo se come en el Bastión | 4 | Cocina del Refugio |
| Caldo especiado | — | +30 | −10 % de gasto de Saciedad e Hidratación. Solo en el Bastión | 4 | Cocina del Refugio |

**Cómo se gastan las barras:** por cada pulso de 6 s de exploración o ronda de combate, Saciedad baja 0,12, Hidratación 0,18 y Descanso 0,09. En el Bastión no se gastan, y al volver Saciedad e Hidratación suben al menos a 60.

Con 4 alimentos no hay ninguna decisión que tomar. En la entrega 1B propondré entre 10 y 12 alimentos y bebidas con valores distintos.

## 7. Siguiente: entrega 1B (propuesta)

1. Tipos de daño (cortante, punzante, contundente, mordisco, mágico) que sustituyen a los efectos visuales, y cada enemigo con su tipo.
2. Tamaño, si es fuerte y zonas que golpea con su probabilidad, por enemigo. Las zonas vitales solo para enemigos fuertes, y para los comunes desde una subzona que propondré.
3. Armadura que también reduce los estados de habilidad físicos, y resistencias sencillas por tipo de armadura.
4. Bajar los estados de habilidades. Objetivo: como mucho 1 lesión por incursión de media en S1.
5. Simulador ampliado con zonas golpeadas, equipo de recluta y escenarios propuestos.
6. Maquetas del panel nuevo, con «tocar la herida» como forma principal.
