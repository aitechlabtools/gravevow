# Plan: subzonas, mercenarios errantes, Kael y tutorial

Propuesta del 4/11/2026, APROBADA con las respuestas de abajo. IMPLEMENTADA entera el 4/11 (arte provisional por código).
El encargo original está al final del chat del 4/11 (bloques A, B y C). Regla añadida por el usuario: **antes de meter en el
juego escenarios, enemigos o mercenarios nuevos, Claude enseña capturas y espera el visto bueno del diseño.**

## Decisiones del usuario (4/11/2026)
1. Dentro de una zona basta el nivel para bajar a cada subzona. Para pasar a la zona siguiente hace falta vencer al jefe
   de la última subzona de la zona (como hasta ahora).
2. Sí a las variantes (mismo dibujo con otra paleta y otra habilidad) para aligerar el arte.
3. Los errantes cobran con el reparto de cofres y además un porcentaje del oro que encuentres mientras van contigo
   (propuesta: 20 %, editable en config/wanderers.ts).
4. Errantes hostiles en las subzonas 8–10: 20 %.
5. Se quita el duelo amistoso con Kael.
6. Sí: «Saltar tutorial» en personajes nuevos posteriores y «Repetir tutorial» en Ajustes.
7. Sí a reducir la experiencia en subzonas muy por debajo de tu nivel (tabla 100/50/10 %).
8. Los prisioneros de Garra Roja aparecen en una subzona al azar de su zona (dinámico).
9. Nombres: los propuestos; se retocarán si hace falta.

---

## 1. Análisis del código actual

### 1.1 Zonas, mapas y enemigos
- Hay 3 zonas en `src/core/data/zones/` (mazmorra.ts, cripta.ts, infierno.ts), cada una con un `ZoneDef`:
  - rango de niveles (`levels`, p. ej. [1, 30]) y acceso (`access`: nivel mínimo y jefe de la zona anterior);
  - criaturas normales con peso y profundidad mínima de sala (`enemies`), un élite y un jefe;
  - nombres de salas y mazmorras, tablas de cofres (`chests`), reparto de rarezas del botín (`rarity`);
  - un **tinte de color** (`tint`) y los fondos de combate (`backdrops`).
- **Escenario:** todas las zonas usan las mismas baldosas (4 suelos y 2 muros de piedra, 32×16 y 32×38 px, dibujadas por
  código en `shared/art.ts` → `engine/textures.ts`). Lo único que cambia es el tinte (azul en la Cripta, rojo en el
  Infierno). Hay 5 fondos de combate dibujados por código (`ui/combatZones.ts`, 320×180).
- **Mapas:** `core/dungeonGen.ts` genera mapas deterministas por semilla: salas rectangulares unidas por pasillos, con portal,
  sala del jefe (la más honda), sala de Kael (a media profundidad), sala del élite, cofres, vetas, trampas y decorado.
  Todo es «interior»: no hay plantillas de sala ni piezas de exterior.
- **Enemigos:** 21 (15 normales + 3 élites + 3 jefes). Se elige cada criatura por peso y profundidad de sala
  (`pickEnemy`). Su **nivel = tu nivel, limitado al rango de la zona** (`zoneEnemyLevel`). Las estadísticas se multiplican
  por `levelScale(nivel)` = 1 + 0,0466 × (nivel − 1) (`config/progression.ts`).
- **Salto brusco hoy:** las criaturas de la Cripta tienen de base un 55 % más de vida que las de la Mazmorra (70 frente a 45
  de media), así que al pasar del nivel 30 de la Mazmorra al 30 de la Cripta la dificultad pega un salto.

### 1.2 Mercenarios de los mercaderes
- Datos en `core/data/mercenaries.ts` (9: dos contratables y un prisionero por zona); lógica en `core/mercenaries.ts`;
  precios y probabilidades en `config/contracts.ts`.
- **Contrato:** con Garra Roja, de 1, 3 o 5 expediciones (−15 % y −30 %), descuento por rango; uno a la vez.
- **IA:** control `ai` del combate (`core/combat.ts`) con dos actitudes (agresivo/prudente) que cambian la probabilidad
  de usar habilidades y cuándo se cura. Se escala con el nivel del combate y +12 %/+25 % en Cripta/Infierno.
- **Muerte:** si muere, el contrato se rompe. Tras cada victoria recupera un 15 % de vida.
- **Prisioneros:** 35 % por expedición si vas sin mercenario; si extraes con él vivo, Garra Roja lo ofrece con −50 %.

### 1.3 NPCs, diálogo y cambios de bando
- **Kael el Errante** (`core/social.ts`) es el único NPC con diálogo. Aparece en todas las expediciones, neutral.
  Confianza y codicia ocultas; hablar, aliarse, duelo amistoso, ignorar o atacar; reparto de cofres; traición calculada
  (no es azar: puntuación ≥ 60 con codicia, botín, poca vida y cercanía al portal; aviso a partir de 40).
  Ya existen los combates «hostil», «traición tuya» y «traición suya» (sin huida), y su bolsa al morir.
- El mercenario contratado y Kael ya pueden luchar a la vez en el bando del jugador.
- No hay facciones ni enemigos que cambien de bando, aparte de Kael.

### 1.4 Inicio de partida y ayuda
- Crear personaje → lobby con una ventana de bienvenida (`LobbyTutorial`) → la **primera expedición usa una cripta hecha
  a mano** (`CRYPTS_OF_UMBRAVEL` en `core/dungeon.ts`) con otra ventana de ayuda (`DungeonTutorial`). No es un tutorial
  guiado: son dos ventanas de texto.
- Si mueres sin arma, el intendente te da un equipo de recluta.

### 1.5 Guardado
- Un perfil por navegador en IndexedDB `cryptraiders` (`game/persistence/db.ts`), limpiado y migrado al cargar por
  `sanitizeProfile` (`core/profile.ts`). Ya hay `tutorialSeen: { lobby, dungeon }`, `stats.expeditions` y
  `bossesDefeated`. Ahí se añadirían `tutorial` (hecho/no), el contador de Kael y lo desbloqueado.

### 1.6 Qué hay que refactorizar
1. `ZoneDef` pasa a tener **subzonas** (`SubzoneDef`) con su rango, criaturas, élite, jefe, escenario, plantillas de mapa,
   fondos y botín. La zona queda como agrupación (nombre, llave de cofre, mercenarios de Garra).
2. `dungeonGen.ts`: recibir la subzona y un **estilo de mapa** (exterior abierto, salones, túneles, nichos…).
3. Texturas: de «un juego de baldosas + tinte» a **un juego de baldosas por subzona** (`tileset`).
4. Nivel de las criaturas: por subzona y profundidad de sala, con la curva nueva.
5. `social.ts` (Kael) se generaliza a **mercenarios errantes** con datos por tipo y por zona.
6. Primera expedición: el mapa a mano de la cripta se sustituye por el **mapa del tutorial** con sus pasos.
7. Interfaz: tarjeta de zona y «Mapa de zonas» de la pantalla Jugar con subzonas.

**Cambios que tocan sistemas existentes (aviso, restricción 2):** el comportamiento de Kael cambia (deja de estar siempre
y deja de tener traición calculada); la primera expedición deja de ser la cripta a mano; el acceso a la Cripta y al
Infierno pasa a depender de subzonas; las criaturas cambian de sitio (misiones de matar y Bestiario siguen funcionando
porque reutilizo sus identificadores); el tráiler y la landing hablan de Kael como rival y habrá que retocarlos al final.

---

## 2. Las 10 subzonas

R = reutilizado (ya existe), N = nuevo. Todas con 4 criaturas comunes (+ élite + jefe). Nombres provisionales.

| # | Subzona | Niveles | Escenario | Comunes | Élite | Jefe |
|---|---|---|---|---|---|---|
| 1 | **Afueras del castillo** | 1–10 | Exterior de noche: camino embarrado, empalizadas, murallas rotas, hogueras de bandidos, niebla. Mapa abierto (patios unidos por brechas en la muralla). | Bandido saqueador (R) · Arquero renegado (R) · Lobo famélico (N) · Cuervo carroñero (N) | Capitán de bandidos (R) | **Mordrek el Desertor** (N): antiguo sargento de la Guardia, jefe de la banda que tomó la muralla. |
| 2 | **El castillo** | 10–20 | Interior: salones con tapices quemados, pasillos, patios de armas, capilla. Losas y alfombras rojas; luz de candelabros. | Esqueleto guerrero (R) · Murciélago cavernario (R, en las vigas) · Armadura hueca (N) · Criado ahorcado (N) | Caballero de la guardia caída (N) | **El Senescal Quemado** (N): gobernó el castillo cuando cayó la orden; aún arde. |
| 3 | **Las mazmorras del castillo** | 20–30 | Calabozos y túneles: celdas con rejas, cadenas, potros, desagües, roca húmeda. Pasillos estrechos y salas pequeñas. | Rata de osario (R) · Torturador (N) · Preso enloquecido (N) · Gusano de pozo (N) | El Verdugo (N) | **Señor del Osario** (R): bajo los calabozos se abre su osario. |
| 4 | **El Osario de Umbravel** | 30–40 | Primera cripta: paredes de calaveras y fémures, nichos, polvo de hueso, velas cortas. Gris y hueso. | Necrófago (R) · Arquero de hueso (R) · Coloso de huesos (N) · Monje del osario (N) | Caballero del sepulcro (R) | **El Abad de los Huesos** (N): el último abad, cosido a los huesos de sus monjes. |
| 5 | **Las Catacumbas Ahogadas** | 40–50 | Galerías inundadas: agua negra hasta el tobillo (charcos en el suelo), raíces, moho verde, niebla baja. Verde y azul oscuro. | Espectro lamentador (R) · Ahogado (N) · Sanguijuela de cripta (N) · Plañidera (N) | La Dama del Agua (N) | **El Barquero de las Aguas Negras** (N): cobra en almas el paso a lo hondo. |
| 6 | **El Panteón de los Nobles** | 50–60 | Mármol, oro sucio, estatuas, sarcófagos labrados, cortinas de terciopelo podrido. Blanco, dorado y negro. | Sacerdote no-muerto (R) · Guardián de tumbas (R) · Noble embalsamado (N) · Gárgola de mármol (N) | Duelista espectral (N) | **La Reina Velada** (R) |
| 7 | **La Cripta Carmesí** | 60–70 | Transición: la misma cripta, pero teñida de rojo; grietas con luz de brasas, sangre seca, altares profanados, calor. | Diablillo de brasas (R) · Cultista de la Llama (N) · Necrófago sangrante (N) · Altar de carne (N) | Sumo sacerdote del Umbral (N) | **Vharok, Guardián del Umbral** (N): la puerta entre la cripta y el Infierno. |
| 8 | **Las Puertas del Abismo** | 70–80 | Entrada al Infierno: roca negra, ríos de lava estrechos, puentes de obsidiana, cadenas colgando. | Can del abismo (R) · Invocador de azufre (R) · Elemental de magma (N) · Gárgola de obsidiana (N) | Domador de canes (N) | **Ignaroth, Señor de la Fragua** (N): forja cadenas para Belzar. |
| 9 | **Los Ríos de Fuego** | 80–90 | El Infierno: lagos de lava amplios, islas de roca, ceniza que cae, pozos de azufre. Más abierto y más hostil. | Tentadora del pozo (R) · Caballero infernal (R) · Desollador (N) · Alma ardiente (N) | Carcelero de cadenas (R) | **La Bestia de Azufre** (N) |
| 10 | **El Trono de las Cadenas** | 90–100 | Infierno profundo: fortaleza de cadenas sobre el vacío, lava bajo puentes, cielo negro con brasas. Lo más extremo. | Señor del foso (N) · Heraldo encadenado (N) · Engendro del abismo (N) · Devorador de almas (N) | Heraldo de Belzar (N) | **Belzar, Señor de las Cadenas** (R) |

**Resumen:** se reutilizan las 21 criaturas actuales (15 comunes, 3 élites, 3 jefes). Nuevas: 25 comunes, 7 élites y
7 jefes (39 en total). Es mucho arte: ver pregunta 2 (variantes recoloreadas para aligerar).

**Rol en combate de las nuevas** (el detalle de cada habilidad lo enseño con las capturas de cada zona):
- Rápidas y débiles (cuervo, sanguijuela, alma ardiente): mucha velocidad y esquiva; desgastan.
- Cuerpo a cuerpo (lobo, criado, preso, ahogado, desollador): daño medio, algún estado (sangrado, miedo).
- Tanques (armadura hueca, coloso, gárgolas, elemental): mucha defensa, lentos; castigan al que no usa magia.
- Lanzadores y control (monje, plañidera, cultista, invocadores): curan a los suyos, maldicen o aturden.
- Élites: un truco propio (el Verdugo remata por debajo del 30 % de vida; la Dama del Agua se esconde tras escudos de agua).
- Jefes: dos fases (al 50 % de vida cambian de habilidades). Hoy ningún jefe tiene fases: es una mejora del combate
  que entraría en S4 y se aplicaría también a los tres jefes que ya existen.

---

## 3. Curva de niveles y estadísticas

**Nivel de cada criatura:** tu nivel, limitado al rango de la subzona, **+0 / +1 / +2 según la profundidad de la sala**.
El élite va a +2 sobre el máximo de su sala; el jefe, al nivel máximo de la subzona (+3 si vas por encima). Si vuelves
a una subzona por debajo de tu nivel, todo se queda en su máximo: se nota más fácil.

**Fuerza:** estadística = base × escala por nivel × **factor de subzona**. El factor sustituye a las bases distintas de
cada zona para que no haya saltos: crece suave (+0,66 % por nivel) para acompañar la mejora de tu equipo.

Criatura común «de referencia» (vida / ataque / experiencia), élite y jefe:

| # | Niveles | Común al empezar | Común al final | Élite (final) | Jefe (final) |
|---|---|---|---|---|---|
| 1 | 1–10 | 45 / 14 / 35 | 68 / 21 / 66 | 256 vida | 421 vida |
| 2 | 10–20 | 68 / 21 / 66 | 95 / 30 / 102 | 361 | 594 |
| 3 | 20–30 | 95 / 30 / 102 | 126 / 39 / 136 | 476 | 784 |
| 4 | 30–40 | 126 / 39 / 136 | 159 / 50 / 172 | 602 | 991 |
| 5 | 40–50 | 159 / 50 / 172 | 195 / 61 / 206 | 738 | 1.216 |
| 6 | 50–60 | 195 / 61 / 206 | 234 / 73 / 242 | 885 | 1.458 |
| 7 | 60–70 | 234 / 73 / 242 | 276 / 86 / 276 | 1.042 | 1.716 |
| 8 | 70–80 | 276 / 86 / 276 | 320 / 100 / 312 | 1.210 | 1.993 |
| 9 | 80–90 | 320 / 100 / 312 | 367 / 114 / 346 | 1.388 | 2.286 |
| 10 | 90–100 | 367 / 114 / 346 | 417 / 130 / 382 | 1.576 | 2.597 |

Cada subzona empieza exactamente donde acaba la anterior. Los tipos se separan de la referencia con su papel
(un tanque, ×1,5 de vida y ×0,8 de ataque; uno rápido, ×0,6 de vida…). Los números finales se ajustan en la fase de
equilibrio con la prueba automática de combates (`tests/balance.test.ts`).

**Subzonas muy por debajo de tu nivel** (propuesta):

| Tu nivel por encima del máximo de la subzona | Experiencia | Oro y botín |
|---|---|---|
| 0–4 | 100 % | 100 % |
| 5–9 | 50 % | 75 % |
| 10 o más | 10 % | 50 % |

Se avisa en la tarjeta de la subzona: «Demasiado fácil para ti: menos experiencia y botín».

**Acceso:** nivel mínimo de la subzona + haber derrotado al jefe de la subzona anterior (pregunta 1).
**Cofres y llaves:** las llaves siguen siendo por zona (hierro, hueso, azufre; relicario para los jefes). Lo que cambia es el
contenido: cada subzona saca de las tablas solo objetos con nivel requerido cerca de su rango, y la rareza mejora
subzona a subzona (la 1 casi sin épicos; la 10 con la mejor probabilidad de legendario).

---

## 4. Mercenarios errantes, traición y Kael

### 4.1 Qué son y cómo conviven con los de Garra Roja
- **Errantes:** NPCs que te encuentras en la mazmorra. Solo para esa expedición; no se contratan ni vuelven al refugio.
- **De Garra Roja:** se contratan en el refugio, varias expediciones, nunca traicionan.
- Puedes llevar **uno de cada** a la vez (3 en tu bando). Máximo 1 errante por expedición.
- Reutilizo: la IA y el combate de los mercenarios (`mercCombatant`), el diálogo y los combates de traición de Kael
  (`social.ts`), la bolsa al morir y el reparto de cofres.
- Encuentros por expedición (datos editables): 1 errante con un 45 % en la Mazmorra, 50 % en la Cripta, 60 % en el Infierno.
  Kael cuenta como errante de la Mazmorra.

### 4.2 Qué aporta aliarse y qué cuesta
- Lucha a tu lado con sus habilidades y 1–2 pociones, y crece con el nivel como los de Garra.
- **Coste:** no cobra oro; quiere **su parte de los cofres** (como Kael hoy). Si le das algo, baja su riesgo; si no, sube.
- **Al extraer:** se despide («Hasta la próxima bajada…») y se queda con lo que le diste.

### 4.3 El triángulo de riesgo

| Dónde | Quién | Color | Símbolo | Traición |
|---|---|---|---|---|
| Mazmorra (1–3) | Kael | Verde | ✓ (escudo) | 10 % |
| Mazmorra (1–3) | Resto | Naranja | ! | 15 % |
| Cripta (4–6) | Todos | Naranja | !! | 25 % |
| Infierno (7–10) | Todos | Rojo | ☠ (calavera) | 50 % |
| Infierno (8–10) | Hostiles | Rojo, parpadea | ⚔ (espadas) | atacan al verte |

Triángulo de 9×8 px de arte, sobre la cabeza, siempre visible (también en la oscuridad); en pantalla mide 27–36 px.
El símbolo distingue los niveles sin depender del color (daltonismo). Al tocarlo o pasar el ratón: «Riesgo bajo/medio/alto».

### 4.4 Cómo funciona la traición (tensa pero justa)
1. **Al aliarte se tira el dado una sola vez** con su probabilidad (10/15/25/50 %). Si sale, es un traidor «dormido».
   El reparto de cofres lo modifica: cada reparto justo resta 5 puntos a la probabilidad y lo vuelve a tirar; quedártelo todo suma 10.
2. **Momentos en que actúa un traidor** (el primero que ocurra, nunca en los primeros 60 s de alianza):
   al acabar un combate con tu vida por debajo del 40 %; al abrir un cofre de llave o de jefe; o a menos de 5 casillas del portal.
3. **Siempre avisa antes:** una frase y el triángulo tiembla (p. ej. «Pesa mucho esa mochila, ¿no?»). Desde el aviso
   puedes romper la alianza sin pelea (se va) o atacar tú primero. Si no haces nada, en el siguiente momento traiciona.
4. **Qué hace al traicionar:**
   - Mazmorra y Cripta: te ataca (combate sin huida; empiezas con sangrado 2 turnos, como hoy).
   - Infierno: el 50 % de las veces **roba 1–2 objetos de tu mochila y huye** hacia el portal; si lo alcanzas, combate y
     recuperas lo robado; si llega al portal, se lo lleva.
5. **Cómo vencerle:** es un combate normal; su fuerza es la de un común de su subzona ×1,3 (no un élite). Al morir deja una
   bolsa con su equipo y lo que le diste. Los traidores no tienen pociones extra.

### 4.5 Kael el Errante
- **Solo en la Mazmorra** (subzonas 1–3), siempre amistoso, triángulo verde, 10 %.
- **Aparición:** 33 % por expedición a la Mazmorra; si lleva **4 expediciones sin aparecer**, sale seguro en la siguiente.
  Contador en el perfil (`kael.missStreak`); 33 % y 4 en `config/wanderers.ts`. El tutorial no cuenta.
- **Encuentro especial:** al entrar en su sala, aviso breve arriba («Una hoguera arde en la sala del este…»), su hoguera
  propia con brillo verde y una música de dos notas; al hablar por primera vez en la partida, presentación más larga.
  Recuerda cuántas veces os habéis visto («Otra vez tú. Empiezo a pensar que me sigues.»).
- **Personalidad:** mercenario veterano y cansado, irónico, leal a su manera; vendió su espada a la orden del Bastión
  antes de que cayera y lleva años bajando solo. Habla poco y con sorna. No es un santo: es el único que te avisa de que
  la mazmorra mata.
- **Aspecto:** capa verde musgo raída, capucha, cicatriz en la cara, dos dagas; lleva una linterna verde a la cintura
  (lo distingue de lejos).
- **Combate:** rápido y certero (dagas): Cuchillada, Golpe venenoso y Puñalada por la espalda (más daño si el enemigo
  ya está herido). Prioriza al enemigo que te esté atacando a ti.
- **Frases (ejemplos):** «Baja la voz. Lo que vive aquí oye mejor que tú.» · «Si muero, mi linterna es tuya. No la apagues.» ·
  «Repartimos a partes iguales. Y si no, también: lo que no quieras, me lo quedo.» · Aviso de traición (10 %):
  «He tenido una mala racha, chico…».
- Se mantiene el **duelo amistoso** con él (es de lo más querido del sistema actual). Se quita la confianza/codicia
  ocultas: su riesgo es el 10 % del dado, que el reparto modifica igual que a los demás.

---

## 5. Tutorial (primera expedición)

Mapa a mano, lineal, en **Afueras del castillo**. Sin reloj (o con reloj congelado). 8 tramos seguidos:

```
 [1 Camino]──[2 Empalizada]──[3 Cobertizo]──[4 Hoguera]──[5 Puerta rota]──[6 Patio]──[7 Brecha]──[8 Portal]
   moverse     combate fácil   cofre+llave     poción y      hablar con      combate      traición     extraer
                (rata)         equiparse       equipo        Osric           juntos       de Osric
```

| Paso | Qué pasa | Indicación (ordenador / táctil) |
|---|---|---|
| 1 | Apareces en el camino. Se resalta el destino. | «Muévete con WASD o haz clic donde quieras ir.» / «Usa el joystick o toca donde quieras ir.» |
| 2 | Una rata te corta el paso (débil, sin estados). | «Un enemigo. Pulsa Atacar (o la tecla 1) hasta vencerlo.» / «Toca Atacar hasta vencerlo.» |
| 3 | Llave en el suelo y un cofre de hierro. | «Recoge la llave (E).» / «Toca Usar junto a la llave.» → «Ahora abre el cofre.» |
| 3b | El cofre tiene una espada (o bastón) mejor que la tuya. | «Arrastra la espada a tu mano o haz doble clic.» / «Toca la espada y luego Equipar.» (se resalta la ranura) |
| 4 | Te haces daño con una trampa marcada; poción en el bolsillo. | «Estás herido. Bebe una poción (Q).» / «Toca el botón de poción.» |
| 5 | Osric Dedos Largos junto a una hoguera, triángulo naranja «!». | «Un mercenario errante. El triángulo indica su riesgo de traición. Habla con él (E).» / «…Toca Usar para hablar.» → «Alíate con él.» |
| 6 | Dos bandidos débiles; Osric lucha contigo. | «Tu aliado lucha solo. Tú sigue atacando.» |
| 7 | Antes de la brecha, Osric avisa y traiciona (es seguro en el tutorial). Débil: 60 % de vida de un común. | Aviso: «Osric mira tu mochila…» → «¡Te traiciona! Véncele: no se puede huir.» |
| 8 | Portal. Extracción garantizada. | «Llega al portal y quédate quieto para salir.» |

- **No se puede perder:** si caes, vuelves al último paso con la vida llena y sin perder nada.
- **Al terminar:** al refugio con el arma del cofre, una armadura básica, 3 pociones y 100 de oro (editable). Pantalla
  de resumen especial: «Has sobrevivido a tu primera bajada».
- **Señalar cosas:** flecha dorada que flota sobre el objeto y borde que late en el botón (Atacar, Poción, Usar…).
  Los textos detectan táctil o ratón en vivo (`useIsTouch`).
- **Saltar / repetir** (propuesta, pregunta 6): en un personaje nuevo, si en este navegador ya se completó alguna vez,
  botón «Saltar tutorial» al crear el personaje. En Ajustes, «Repetir tutorial» sin recompensas y sin tocar tu inventario.
- **Partidas existentes:** quien ya tenga alguna expedición, se da por hecho el tutorial (no lo ve).
- Las dos ventanas de ayuda actuales (lobby y mazmorra) se acortan y se quedan solo para quien salte el tutorial.

---

## 6. Preguntas

1. **Acceso a subzonas:** ¿hace falta vencer al jefe de cada subzona para abrir la siguiente (10 jefes en el camino),
   o basta el nivel dentro de una zona y el jefe solo para pasar de zona (como hoy)? Propongo lo primero.
2. **Cantidad de enemigos nuevos (39):** ¿aceptas que algunos comunes sean **variantes** de otros (mismo dibujo con otra
   paleta y otra habilidad, p. ej. «Necrófago sangrante»)? Así serían unos 25 dibujos nuevos en vez de 39.
3. **Errantes:** ¿cobran solo con el reparto de cofres (propuesta) o también un pago en oro al aliarte?
4. **Hostiles del Infierno:** propongo que un 30 % de los errantes de las subzonas 8–10 sean hostiles. ¿Te vale?
5. **Kael:** ¿mantengo el duelo amistoso? ¿Quitamos del todo la traición calculada actual (confianza/codicia)?
6. **Tutorial:** ¿«Saltar tutorial» en personajes nuevos posteriores y «Repetir tutorial» en Ajustes, como propongo?
7. **Experiencia en subzonas bajas:** ¿te vale la tabla (100 / 50 / 10 %)?
8. **Mercenarios de Garra Roja:** siguen siendo por zona (3 por zona). ¿Los prisioneros aparecen en cualquier subzona de su
   zona o en una concreta (propongo la última de cada zona: 3, 6 y 10)?
9. **Nombres:** ¿te gustan los nombres de subzonas, élites y jefes, o prefieres darlos tú?

---

## 7. Plan por fases

He cambiado el orden propuesto en un punto: **la selección de subzona va justo después de los datos**, antes del arte,
porque permite probar cada subzona nueva desde el lobby (y con `?debug`) según se vaya haciendo. Y el arte se hace
**zona a zona** (escenario + enemigos juntos), con capturas para tu visto bueno antes de integrarlo.

| Fase | Qué | Se puede probar |
|---|---|---|
| **S1** | Datos de subzonas y migración. Las 10 subzonas con el contenido actual repartido (aún sin arte nuevo). Perfil v3: `tutorialDone`, `kael.missStreak`. Partidas viejas cargan sin errores y sin tutorial. | Vitest; cargar una partida antigua. |
| **S2** | Selección de subzona en Jugar: tarjeta con subzona, «Mapa de zonas» con 3 zonas × subzonas, bloqueos y aviso de «demasiado fácil». Modo desarrollo: ir a cualquier subzona. | Escritorio, móvil y tableta (menus-check). |
| **S3** | Curva de niveles: nivel por subzona y profundidad, factor de subzona, menos XP/botín en subzonas bajas, botín por subzona. | Prueba de equilibrio automática + tabla real. |
| **S4a** | **Mazmorra: capturas para validar** (baldosas, decorado, fondos de combate de las 3 subzonas y las 6 criaturas/élites/jefes nuevos, con su habilidad). | Te enseño hojas de capturas. Sin tocar el juego. |
| **S4b** | Mazmorra: integrar lo aprobado (generador con estilos exterior/salones/túneles, baldosas, criaturas). | Bajar a 1, 2 y 3. |
| **S5a/b** | Cripta: igual (capturas → integrar). | Bajar a 4, 5 y 6. |
| **S6a/b** | Infierno: igual. | Bajar a 7, 8, 9 y 10. |
| **S7a** | **Errantes: capturas para validar** (aspecto de los errantes de cada zona, triángulos con símbolos, globo de diálogo). | Hojas de capturas. |
| **S7b** | Errantes y traición: aparición, diálogo, alianza, reparto, dado, avisos, traición, robo y huida, hostiles. | Modo desarrollo: forzar errante y forzar traición. |
| **S8** | Kael: aparición 33 % con garantía, encuentro especial, frases, duelo. Captura de su nuevo aspecto antes. | Modo desarrollo: forzar Kael. |
| **S9** | Tutorial: mapa a mano, pasos guiados, Osric, revivir, recompensas, saltar/repetir. Captura del mapa y de Osric antes. | Personaje nuevo en los tres formatos. |
| **S10** | Equilibrio final, Bestiario con las nuevas, misiones nuevas para los jefes nuevos (opcional), landing, hoja de ruta, docs. | Suite completa. |

Cada fase: pruebas (tsc, vitest, e2e, touch-check, mobile-check móvil y tableta, menus-check), capturas en
1920×1080, 1180×820 y 844×390, cómo probarlo, texto del commit y esperar tu confirmación.

**Herramientas de desarrollo** (solo con `?debug`): `__CRYPTRAIDERS__.actions.enterDungeon('sub_5')` para ir a una subzona,
`__CRYPTRAIDERS__.dev.forceKael = true`, `dev.forceWanderer = 'id'`, `dev.forceBetrayal = true`, `dev.setLevel(55)`.

---

## 8. Archivos por fase

- **S1:** nuevo `src/core/data/subzones.ts` (las 10, con todos sus valores), `src/core/data/zones/types.ts` (SubzoneDef),
  `zones/index.ts` (getSubzone, subzoneLock), `core/types.ts` y `core/profile.ts` (perfil v3 y migración),
  `core/dungeonGen.ts` y `store.ts` (recibir subzona), tests nuevos `tests/subzones.test.ts`.
- **S2:** `game/ui/screens/Jugar.tsx` (tarjeta y mapa de zonas), `game.css`, `scripts/menus-check.cjs`, `store.ts` (dev).
- **S3:** nuevo `src/config/subzones.ts` (curva, factor, penalización), `core/combatants.ts`, `core/loot.ts`,
  `core/expedition.ts`, `tests/balance.test.ts`.
- **S4–S6:** `shared/art.ts` (o un nuevo `shared/art/` por zona: baldosas, decorado, criaturas), `engine/textures.ts`,
  `engine/DungeonScene.ts` (tileset por subzona), `core/dungeonGen.ts` (estilos de mapa), `ui/combatZones.ts` (fondos),
  `zones/mazmorra.ts`, `cripta.ts`, `infierno.ts` (criaturas nuevas), `data/skills.ts` (habilidades nuevas),
  `data/bestiaryLore.ts`, `scripts/subzone-shots.cjs` (capturas para validar).
- **S7–S8:** nuevo `src/config/wanderers.ts` (probabilidades, colores, símbolos, costes), nuevo `core/data/wanderers.ts`
  (los errantes y sus frases), `core/social.ts` → `core/wanderers.ts`, `store.ts`, `DungeonScene.ts` (triángulos, huida),
  `ui/DungeonScreen.tsx` (diálogo), `tests/wanderers.test.ts`, `scripts/e2e-social.cjs`.
- **S9:** nuevo `core/data/tutorial.ts` (mapa y pasos), nuevo `ui/TutorialGuide.tsx` (indicaciones y flechas),
  `store.ts`, `DungeonScene.ts`, `screens/CrearPersonaje.tsx` (saltar), Ajustes (repetir), `scripts/e2e-tutorial.cjs`;
  se retira `CRYPTS_OF_UMBRAVEL` y se acortan `LobbyTutorial`/`DungeonTutorial`.
- **S10:** `src/landing/*` (Kael ya no es «el rival», subzonas), `roadmap.ts`, `docs/estado-trabajo.md`, README.

---

## 9. Assets que diseñarás tú

Mientras no estén, uso pixel art hecho por código como marcador (se verá en las capturas para validar). Todo a escala
1×; el juego lo amplía a factores enteros. Fondo transparente (PNG).

**Por cada subzona (×10):**
- Baldosas isométricas: 4 suelos de 32×16 px y 2–3 muros de 32×38 px (16 de cara + 22 de alto).
- Decorado: 4–6 piezas de 16×16 a 32×32 px (barriles, rejas, estatuas, charcos, lava…).
- Fondo de combate: 320×180 px.
- Criaturas comunes nuevas: 20×26 px (humanoides) o 24×18 px (bestias); 2 fotogramas de reposo, 1 de ataque, 1 de golpe recibido.
- Élite nuevo: 24×30 px, mismas animaciones.
- Jefe nuevo: 32×40 px, mismas animaciones + 1 de fase 2.
- Ilustración de la tarjeta de subzona (opcional): 240×120 px.

Por zona: Mazmorra 6 criaturas comunes, 2 élites, 2 jefes · Cripta 6, 2, 2 · Infierno 13, 3, 3 (o menos con variantes).

**Iconos de comunidad (provisionales desde el 11/11, en `src/shared/community.tsx`):**
- Corazón de «Apoyar»: 9×8 px, un color (ahora #ff6a5a).
- Icono de Discord: 12×9 px, un color (ahora #c9cdfb). Debe seguir siendo reconocible como el logo de Discord (respeta sus normas de marca).
- Se ven a 16–24 px en pantalla (escala ×2 aprox.) dentro de botones de 44×44 (landing móvil), 48×48 (lobby en móvil) y 64×64 (lobby en escritorio).
- Entrega en PNG transparente a 1× o en SVG de píxeles.

**Mercenarios errantes:** 2–3 por zona, 20×26 px con reposo (2), andar (4), ataque (1), golpe (1).
**Kael:** 20×26 px, mismas animaciones + linterna verde; retrato de diálogo 48×48 px.
**Osric (tutorial):** 20×26 px, mismas animaciones; retrato 48×48 px.
**Triángulos de riesgo:** 9×8 px cada uno: verde ✓, naranja !, naranja !!, rojo calavera, rojo espadas (+ 1 fotograma de temblor).
**Interfaz:** flecha del tutorial 12×12 px (2 fotogramas), candado de subzona 12×12 px, icono «demasiado fácil» 12×12 px,
hoguera de Kael 16×24 px (3 fotogramas).
