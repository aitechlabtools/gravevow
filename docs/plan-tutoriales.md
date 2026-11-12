# Bloque 3 · Tutorial nuevo y mini tutoriales (propuesta, sin código)

Fecha: 12/11/2026. Actualizado el 12/11 con la nueva entrada del Bastión (Mercaderes y Refugio) y las tarjetas de estación. Maquetas: `mockups/tutorial/index.html` (capturas del juego real con la capa propuesta encima).
Abajo está todo lo que pide el formato del bloque 3: análisis, tabla, guiones, mapa, preguntas y plan.

---

## 1. Análisis del tutorial actual

Lo que hay hoy:
- **Expedición guiada** (`src/core/data/tutorial.ts` y `tutorialCheck` en `expeditionActions.ts`). Son 13 pasos en 8 tramos en línea:
  - moverse;
  - la rata;
  - coger el oro del saco;
  - el baúl con la llave;
  - el cofre de hierro;
  - equiparse la capucha;
  - meter el oro en el saquito y el saquito en el bolsillo seguro;
  - los pinchos y la poción;
  - hablar con Osric y aliarse;
  - dos bandidos;
  - la traición;
  - el portal.
- Hay un cartel arriba con «Tutorial · N/13» y el botón objetivo late (`tut-pulse`).
- Si caes, vuelves al último punto seguro. Se repite desde Ajustes.
- **Bienvenida al Bastión** (`LobbyTutorial`): una ventana con 4 puntos de texto y «Entendido».
- **Aviso de la mazmorra** (`DungeonTutorial`): una ventana con 5 puntos de teclado. Sale en la primera bajada real.
- En la partida solo se guardan `tutorialDone` (de la cuenta) y `tutorialSeen: { lobby, dungeon }`. No existe un sistema de mini tutoriales.

Problemas:
1. **Es largo y mezcla cosas del Bastión.**
   - Tiene 13 pasos.
   - El oro físico (saco, «Agrupar oro», bolsillo seguro) se explica dentro de la mazmorra. Es el paso más largo y el que más confunde: dos arrastres en una ventana de inventario, con el personaje congelado.
   - El bloque pide que eso pase a la bienvenida al Bastión.
2. **No enseña el ataque especial.**
   - Solo pide «Atacar (1)».
   - El jugador descubre solo las armas por mano y la habilidad de clase.
3. **Enseña mal las heridas.**
   - En el tutorial `noInjuries` está activo y la trampa solo baja la vida.
   - Lo que se practica es beber una poción. La mecánica real, curar una parte concreta del cuerpo con venda o férula, queda en una frase que no se hace.
4. **Comer y beber no se enseñan.**
   - Las necesidades están ocultas en el tutorial: no hay `NeedsStrip` y no se muestra el panel de comer.
   - El jugador las conoce en su primera bajada real, cuando ya bajan.
5. **«Equiparse» se hace con doble clic o con «Equipar».**
   - No se ve el cambio en los ataques, porque la capucha es armadura.
   - El bloque pide un arma o una pieza arrastrada y ver el cambio.
6. **El mercenario no está del todo blindado.**
   - Solo se oculta «Atacar» antes de aliarse.
   - Una vez aliado, «Traicionar…» y «Separar vuestros caminos» siguen visibles. Cualquiera de los dos rompe los pasos de los bandidos y de la traición.
   - La traición se lanza con un `setTimeout` de 1,6 s. Si en ese momento abres un menú o empieza otro combate, el guion puede quedarse colgado.
7. **No hay atenuado ni bloqueo.**
   - El resto de la pantalla sigue activo.
   - Se puede vender, soltar o tirar la llave o la venda que hacen falta después.
   - Se puede ir al portal antes de tiempo: el paso «extract» solo comprueba al final.
8. **La bienvenida al Bastión es un muro de texto y está anticuada.**
   - Habla de «Almacén» y de «Bastión» como si fueran pestañas.
   - No menciona Misiones, Bestiario, Tienda ni la copia de seguridad.
   - No se hace nada: solo se lee.
9. **El aviso de la mazmorra solo habla de teclado** y menciona «Las Criptas de Umbravel», que ya no es la primera zona.
10. **Nada explica las pantallas que se van desbloqueando:**
    - Refugio y sus 7 estaciones;
    - runas;
    - páginas del almacén;
    - mercaderes nuevos;
    - encargos;
    - habilidades por hitos;
    - subzonas;
    - trajes;
    - varios personajes;
    - copia.
11. **Al terminar** se dan 10 de oro, 3 pociones y unos guantes. Todo va al almacén. El jugador no sabe que está ahí.

---

## 2. Tabla de mecánicas: dónde se enseñan y con qué disparador

Leyenda:
- **TI**: tutorial inicial de expedición.
- **BB**: bienvenida al Bastión.
- **MT**: mini tutorial (su identificador está entre paréntesis).

| Mecánica o pantalla | Dónde | Disparador |
|---|---|---|
| Moverse (teclado, clic, joystick) | TI 1 | inicio |
| Ataque básico | TI 2 | primer combate |
| Ataques especiales de cada mano | TI 2 | mismo combate, tras el primer golpe |
| Habilidad de clase en combate | MT (`combat.class-skill`) | primer combate con la habilidad lista, tras el tutorial |
| Heridas por zonas y curar tocando o arrastrando | TI 3 | pinchos en la pierna |
| Herida en zona vital (cabeza o tórax) | MT (`exp.vital-wound`) | primera vez que una zona vital baja del 50 % |
| Fractura y férula | MT (`exp.fracture`) | primera fractura |
| Sangrado, venda y torniquete | MT (`exp.bleeding`) | primer sangrado |
| Armadura rota y durabilidad | MT (`exp.armor-broken`) | primera pieza a 0 |
| Necesidades y comer o beber desde la mochila | TI 6 (comer o beber); MT (`exp.need-low`) para los umbrales | TI: guion. MT: primera necesidad por debajo del umbral |
| Oro físico (monedas en casillas) | TI 4 (se recogen sin explicar); BB 3 | — |
| Saquitos y sacos | BB 3 | — |
| Bolsillo seguro | BB 3 | — |
| Cofres y llaves | TI 4 | cofre del cobertizo |
| Equipar arrastrando y ver el cambio de ataques | TI 5 | tras el cofre |
| Mochila llena y sobrecarga | MT (`exp.backpack-full`) | primera vez que no cabe un objeto o hay sobrecarga |
| Mercenarios errantes, triángulo y traición | TI 7 | Osric |
| Triángulo naranja o rojo | MT (`exp.merc-triangle`) | primer errante con triángulo naranja o rojo |
| Kael | MT (`exp.kael`) | primer encuentro con Kael |
| Élite o jefe | MT (`exp.elite`, `exp.boss`) | primer combate contra cada uno |
| Extracción por el portal | TI 9 | portal |
| Reloj de la expedición | MT (`exp.clock`) | primera bajada real (sustituye al aviso actual de la mazmorra) |
| Nueva subzona alcanzada | MT (`exp.new-subzone`) | primera entrada en cada subzona nueva desbloqueada |
| Muerte, curación por 1 de oro y equipo de recluta | MT (`bastion.first-death`) | volver al Bastión tras la primera muerte |
| Pestañas del menú | BB 1 | — |
| Intendencia (equipo, mochila, almacén, vaciar mochila) | BB 2 y MT (`tab.intendencia`) | BB: guion. MT: vista «Estado» la primera vez |
| Páginas del almacén | MT (`unlock.stash-page`) | primera página comprada |
| Página compartida | MT (`unlock.shared-page`) | compra de «Compartido» |
| Arrastrar, seleccionar y mover objetos | BB 2 | — |
| Personaje (estadísticas, habilidades) | MT (`tab.personaje`) | primera vez en la pestaña |
| Habilidades de clase por hitos | MT (`unlock.class-skill`) | primer hito alcanzado |
| Mercaderes (lista) | BB 4 y MT (`tab.bastion`) | — |
| Cada mercader (tienda, vender) | MT (`vendor.<id>`) | primera vez que entras a cada uno; lo cuenta el mercader |
| Primera venta | MT (`bastion.first-sale`) | primera venta hecha |
| Reputación | MT (`bastion.first-rep`) | primera subida de rango con un mercader |
| Encargos y Misiones | MT (`tab.misiones`) | primera vez en Misiones o en los encargos de un mercader |
| Refugio | BB 4 y MT (`tab.refugio`) | primera vez en «Tu Refugio» |
| Estaciones: desbloqueo | MT (`station.<id>`) | primera vez que se construye cada una |
| Estaciones: subida de nivel | MT (`station.<id>.lv2`, `.lv3`) | al subir de nivel, un aviso breve |
| Crafteo | MT dentro de cada `station.<id>` | — |
| Primer objeto craftable con lo que tienes | MT (`bastion.can-craft`) | al volver al Bastión con materiales para una receta |
| Desguace | MT (`station.bench`) y MT (`vendor.orik` vista desguace) | — |
| Catre: dormir y Preparación | MT (`station.cot`) | — |
| Atril rúnico y equipo mágico | MT (`station.runic`) | — |
| Runas | MT (`station.runic.runes`) | atril a nivel 3 |
| Bestiario | MT (`tab.bestiario`) | primera vez en la pestaña |
| Tienda de trajes | MT (`tab.tienda`) | primera vez en la pestaña |
| Primer traje comprado | MT (`bastion.first-skin`) | compra |
| Selección de personaje y varios personajes | MT (`screen.select`) | primera vez en «Elige quién baja» con más de un hueco |
| Ajustes | MT (`screen.settings`) | primera vez que se abre |
| Copia de seguridad | BB 5 y MT (`screen.backup`) | primera vez en la pantalla |
| Subzonas (elegir en Jugar) | BB 6 | — |

---

## 3. Guion del tutorial inicial de expedición (9 pasos)

Reglas de todo el tutorial:
- No corre el reloj.
- No se puede perder: si caes, vuelves al último punto seguro.
- Las necesidades se ven, pero no bajan.
- El cartel dice «Paso N de 9». «Saltar» pide confirmación: «¿Saltar el tutorial? Podrás jugarlo desde Ajustes › Partida.».
- **Bloqueos fijos** durante todo el tutorial. Si se intentan, sale un aviso de una línea:
  - Soltar, vender o tirar objetos: «Aún no: puede que lo necesites más adelante.»
  - El portal está apagado hasta el paso 9: «El portal todavía no responde. Termina lo que te queda.»
  - Huir del combate: «Aquí no hay a dónde huir.»
  - No se puede atacar, traicionar ni dejar a Osric: esas opciones no aparecen y él no recibe daño tuyo. Si se intenta, «Lo necesitas vivo. Por ahora.»

| # | Tramo | Indicación (escritorio) | Indicación (móvil y tableta) | Se resalta | Bloqueado en este paso |
|---|---|---|---|---|---|
| 1 Moverse | Camino Embarrado | Muévete con **WASD** o las flechas, o **haz clic en el suelo**. Ve hacia la luz. | Arrastra el pulgar en la **zona del joystick** o **toca el suelo**. Ve hacia la luz. | Flecha sobre el suelo; en móvil, la zona del joystick | Abrir el inventario (no hay nada aún) |
| 2 Combate | Empalizada (rata) | a) Una rata te corta el paso. Pulsa **Atacar** (tecla **1**). b) Bien. Ahora usa tu **ataque especial** (tecla **2**): pega más fuerte, pero gasta energía y tarda en volver. | a) Una rata te corta el paso. Toca **Atacar**. b) Bien. Ahora toca tu **ataque especial**: pega más fuerte, pero gasta energía y tarda en volver. Mantén pulsado para leerlo. | `act-attack`, luego el primer especial | Resto de acciones de combate hasta usar el especial; la rata no puede morir antes del especial |
| 3 Herida | Cobertizo, a la entrada | Los pinchos te han abierto la pierna. **Arrastra la venda** de tu mochila sobre la **pierna** (o haz clic en la pierna y elige la venda). | **Toca la pierna** y luego **la venda** (o arrástrala encima). Cada parte se cura por separado. | Primero la silueta (`hud-body`); luego la fila de la pierna y la venda | Moverse; cerrar el panel del cuerpo sin curar (aviso) |
| 4 Cofre | Cobertizo | La llave cuelga de un clavo. Cógela (**E**) y abre el **cofre** con ella. Llévate lo que haya. | La llave cuelga de un clavo. Acércate y toca **Usar**; luego abre el **cofre**. Llévate lo que haya. | La llave, luego el cofre, luego «Cogerlo todo» | Cerrar el botín sin cogerlo (aviso) |
| 5 Equipar | Hoguera | Hay una **espada corta** mejor que la tuya. Abre la mochila (**I**) y **arrástrala** a tu mano. Mira cómo cambian tus ataques. | Hay una **espada corta** mejor que la tuya. Abre la mochila, **tócala y toca tu mano** (o arrástrala). Mira cómo cambian tus ataques. | `btn-inventory`, la espada, la casilla de la mano, la lista de ataques | Moverse (se congela); vender o soltar |
| 6 Comer | Hoguera | El camino cansa. En la mochila llevas **pan**: haz clic en él y elige **Comer**. Arriba verás subir el hambre. | El camino cansa. Toca el **pan** de tu mochila y luego **Comer**. Arriba verás subir el hambre. | El pan, luego la barra de hambre | Moverse |
| 7 Mercenario | Puerta Rota (Osric) | a) Osric ofrece su espada a cambio de parte del botín. **Alíate con él**. El **triángulo** sobre su cabeza dice cuánto puedes fiarte. b) Dos bandidos en el patio. Osric lucha a tu lado: tú sigue atacando. | a) **Toca «Aliarse».** El **triángulo** sobre su cabeza dice cuánto puedes fiarte de él. b) Dos bandidos en el patio. Osric lucha a tu lado: tú sigue atacando. | `rival-ally`; luego la flecha al patio | Atacar, traicionar o separarse de Osric (no aparecen) |
| 8 Traición | Brecha | (Osric, en voz alta:) «La brecha es estrecha, y el botín, poco. Nada personal.» ⟶ **¡Osric te traiciona!** Véncelo. | igual | El combate | Huir. Osric tiene la vida reducida (enemigo fácil) |
| 9 Extraer | Salida | Así acaban muchas alianzas aquí abajo. Llega al **portal**, actívalo con **E** y no te muevas hasta que se llene. | Así acaban muchas alianzas aquí abajo. Llega al **portal**, toca **Usar** y no te muevas hasta que se llene. | El portal y la barra de extracción | — |

Notas del guion:
- **Paso 3.** Las heridas se activan solo en ese momento: los pinchos dejan la pierna al 50 %, sin sangrado ni fractura. Así se usa la curación real por partes, no la poción. Las pociones se quedan en la mochila, pero no se piden.
- **Paso 4.** Las monedas del cofre se recogen con el resto del botín, sin explicación. Así quedan sueltas en la mochila para la bienvenida.
- **Paso 8.** La traición deja de colgar de un temporizador:
  - se dispara cuando el jugador entra en la brecha y no hay ningún menú abierto ni combate;
  - Osric habla y luego empieza el combate;
  - si algo lo interrumpe, se vuelve a intentar.
- **Al salir.** Llevas tu equipo básico más la espada, las monedas del cofre (unas 12) y **un saquito vacío** del cofre. El resumen final dice: «El intendente te espera en el Bastión.»

## 3 b. Guion de la bienvenida al Bastión (6 pasos)

**Cómo lo he adaptado:** «Alijo» e «Intendencia» son la misma pestaña («Intendencia», componente `Alijo`), y los mercaderes están en la pestaña «Bastión». La bienvenida usa esa estructura real. La cuenta el **intendente**: un personaje de voz y sin retrato (ver pregunta 2).

Bloqueos en toda la bienvenida:
- solo se puede tocar lo resaltado;
- no se puede bajar a la mazmorra hasta el paso 6;
- «Saltar» deja marcado todo lo de la bienvenida y la apunta en la Guía.

| # | Escritorio | Móvil y tableta | Se resalta | Acción real |
|---|---|---|---|---|
| 1 Pestañas | Bienvenido al Bastión de Ceniza. Arriba tienes todo: **Jugar** (bajar), **Personaje**, **Intendencia** (tu equipo y el almacén), **Bastión** (mercaderes y Refugio), **Misiones**, **Bestiario** y **Tienda**. | igual, con «toca» | La barra de pestañas (`lobby-nav`), una tras otra durante 1 s | «Entendido» |
| 2 Vaciar mochila | Lo que traes de abajo está en tu **mochila**, y lo de la mochila **se pierde si mueres**. Pulsa **«Vaciar mochila»**: todo pasa al almacén. | Toca **«Vaciar mochila»**: todo pasa al almacén. Lo de la mochila **se pierde si mueres**. | `empty-backpack` | Vaciar (las monedas y el saquito se quedan: van al paso 3) |
| 3 a Oro | El oro **ocupa sitio**: las monedas sueltas llenan casillas. Se guardan mejor en **saquitos** y **sacos**, que vende Nira. **Arrastra tus monedas al saquito.** | El oro **ocupa sitio**. **Toca tus monedas y luego el saquito** (o arrástralas encima). | Las monedas, luego el saquito | Agrupar |
| 3 b Bolsillo seguro | Este es tu **bolsillo seguro**: lo que guardes ahí **no se pierde al morir**. Caben cosas pequeñas, como llaves o saquitos (hasta 150 monedas). **Mete el saquito.** | **Toca el saquito y luego el bolsillo seguro.** Ahí no se pierde nada al morir. | `alijo-pocket` | Mover el saquito |
| 3 c Recordatorio | El oro que llevas **suelto en la mochila** durante una bajada **se pierde si mueres**. Llena el bolsillo con lo más valioso antes de bajar. | igual | La mochila | «Entendido» |
| 4 Bastión | La pestaña **Bastión** tiene dos puertas: **Mercaderes** (compran, venden y dan encargos) y tu **Refugio** (estaciones que te construyen sus encargados). Ya irás conociéndolos. | igual, con «toca» | Pestaña Bastión y luego las tarjetas `bastion-merchants` y `bastion-refuge` | Ir a la pestaña |
| 5 Copia | Tu partida vive en este navegador. Haz una **copia de seguridad** de vez en cuando: está en **Ajustes › Partida** y en el menú principal. | Haz una **copia de seguridad** de vez en cuando: está en **Ajustes › Partida** y en el menú principal. | Engranaje (`btn-lobby-settings`) | «Entendido» |
| 6 Bajar | Cuando quieras, ve a **Jugar**, **elige subzona** (de momento, las Afueras) y pulsa **Descender**. Suerte ahí abajo. | igual, con «toca» | Pestaña Jugar y la subzona | Fin (el jugador baja cuando quiera) |

---

## 4. Guion de los mini tutoriales

Formato de cada uno:
- tiene entre 2 y 4 pasos;
- cada paso tiene un texto, un elemento resaltado y una acción, que puede ser una acción real o «Entendido»;
- dónde haya dos textos, va primero el de escritorio y después, separado por « / », el de móvil;
- «Cuenta» indica quién habla, con su retrato.

### Pestañas y pantallas

**`tab.intendencia`**
- Disparador: primera vez en la vista «Estado» de Intendencia.
- Cuenta: el intendente.
- Pasos:
  1. «Aquí ves tu **cuerpo** parte por parte y tus **necesidades**.» Resalta `intendencia-status`.
  2. «Lo que se puede curar o comer con lo que llevas aparece con un botón. **Pruébalo** si tienes algo herido.» Resalta `body-quick`, si existe; si no, «Entendido».

**`tab.personaje`**
- Disparador: primera vez en Personaje.
- Pasos:
  1. «Tu nivel, tus atributos y lo que te da el equipo.» Resalta `hero-level`.
  2. «Las **habilidades de clase** se ganan por hitos. Equipa las que quieras llevar.» Resalta la sección de habilidades.

**`screen.bastion-entry`** (antes `tab.bastion`)
- Disparador: primera vez en Mercaderes desde la entrada del Bastión.
- Pasos:
  1. «Cada mercader tiene su sitio y su **reputación** contigo: cuanto más negocias, más te ofrece.» Resalta la tarjeta de Nira.
  2. «Entra en **Nira**.» Abre la acción real `vendor-nira`.

**`vendor.<id>`**, uno por mercader
- Disparador: primera vez dentro de cada mercader.
- Cuenta: ese mercader, con su voz.
- Pasos:
  1. Qué vende.
  2. Si compra objetos, cómo se vende: «Marca y vende.»
  3. Sus encargos.
- Ejemplo, Nira:
  1. «Cuero, comida, saquitos para tu oro. Lo que necesites para no morir de tonto.»
  2. «Y si traes chatarra, la compro: **márcala y pulsa Vender**.» Resalta `vendor-view-sell`.
  3. «Te iré pidiendo cosas. Cúmplelas y subirá tu **reputación**.» Resalta `vendor-view-contracts`.
- Variaciones de los demás:
  - Orik: el desguace.
  - Grizk: préstamos y mercenarios.
  - Vesper: curas.
  - Garth: comida.
  - Brand, Valerius y Eldrin: su tienda.

**`tab.misiones`**
- Disparador: primera vez en Misiones.
- Pasos:
  1. «Los **encargos** de todos los mercaderes, juntos. Llevan lo que piden en tu almacén y recoge la paga.»
  2. Resalta el primer encargo. «Entendido».

**`tab.refugio`**
- Disparador: primera vez en el Refugio (tarjeta `bastion-refuge` de la entrada). Resalta las tarjetas de estación y «Detalles».
- Cuenta: Orik.
- Pasos:
  1. «Esto es tuyo. Cada **estación** la construye su encargado: tú pones el oro y los materiales.»
  2. «Toca una estación para ver qué pide.» Resalta la primera estación disponible.

**`tab.bestiario`**
- Pasos:
  1. «Cada criatura que vences queda apuntada: puntos débiles, botín y dónde vive.»
  2. «Cuanto más vences a una, más sabes de ella.»

**`tab.tienda`**
- Pasos:
  1. «**Trajes**: solo cambian el aspecto, no dan ventaja.»
  2. «Lo que compras es de la cuenta: cualquier personaje lo puede llevar.»

**`screen.settings`**
- Pasos:
  1. «Sonido, pantalla, controles y tu partida.» Resalta la lista de secciones.
  2. «En **Partida** está la **copia de seguridad** y la **Guía**.» Resalta `settings-tab-game`.

**`screen.backup`**
- Pasos:
  1. «Descarga tu partida en un archivo y guárdalo a salvo.»
  2. «Si cambias de aparato o borras el navegador, **Importar** la recupera.»

**`screen.select`**
- Pasos:
  1. «Hasta 4 personajes. Cada uno tiene su equipo, su almacén y su bestiario.»
  2. «Los trajes, los ajustes y la página **Compartido** son de todos.»

### Desbloqueos

**`unlock.stash-page`**
- Pasos:
  1. «Página nueva en el almacén.» Resalta `stash-pages`.
  2. «**Arrastra** un objeto a la pestaña de la página, o tócalo y toca la pestaña.» Acción real.

**`unlock.shared-page`**
- Pasos:
  1. «La página **Compartido** es de todos tus personajes.»
  2. «Deja aquí lo que quieras pasarle a otro.» Acción real.

**`unlock.class-skill`**
- Disparador: primer hito.
- Pasos:
  1. «Has ganado una **habilidad de clase**.» Resalta Personaje.
  2. «**Equípala** en un hueco.» Acción real.
  3. «En combate aparece como un ataque más.»

**`station.runic.runes`**
- Disparador: Atril a nivel 3.
- Cuenta: Eldrin.
- Pasos:
  1. «Ahora el atril graba **runas**.»
  2. «Crea una: te dejo el polvo justo.» Acción real.
  3. «**Aplícala** a un arma o pieza: arrástrala encima.» Acción real.
  4. «Una runa por objeto. Elige bien.»

### Estaciones del Refugio

Al construir cada estación, su encargado regala los materiales justos para la primera receta.

Pasos comunes de cada estación:
- **a) Para qué sirve.**
- **b) Abre el menú y elige la receta.** Se ven los materiales que tienes en verde y los que faltan en rojo.
- **c) Craftear de verdad.** La primera receta es fija.
- **d) Dónde va el objeto, cómo se usa y cómo se mejora la estación.** El siguiente nivel lo da y lo pide el mismo encargado.

| Id | Cuenta | a) Para qué sirve | Receta regalada | d) Uso y mejora | Propio |
|---|---|---|---|---|---|
| `station.cot` | Orik | «Un catre. Dormir aquí te quita el cansancio, y bien dormido bajas **preparado**.» | — (no se craftea) | «Pulsa **Dormir en el catre**. La Preparación se ve en Jugar.» El siguiente nivel lo da Orik. | Dormir (acción real `btn-cot`) |
| `station.kitchen` | Garth | «Aquí se guisa lo que da **más saciedad** y te deja **preparado** antes de bajar.» | Guiso del Bastión (carne, seta, agua) | «El guiso va a tu almacén. Llévalo en la mochila y **cómelo** abajo, o cómelo antes de bajar para la Preparación.» Nivel 2: caldo especiado. | Los pasos del fogón (fuego bajo, medio o vivo) |
| `station.bench` | Orik | «Desguazar aquí rinde más.» | — | «**Desguaza** algo que no uses: arrástralo aquí.» Acción real en `scrap`. «Sale chatarra y cuero, que van al almacén.» | Desguace |
| `station.infirmary` | Vesper | «Vendas, torniquetes y férulas, sin pagarme a mí.» | 2 vendas (cuero y agua) | «Van al almacén. Abajo, **arrástralas** sobre la parte herida.» | — |
| `station.forge` | Brand | «Forjas tus propias armas y piezas de metal.» | La receta de nivel 1 más barata | «Mantén el metal en la franja: Avivar, Golpear o Dejar respirar.» Luego: «Equípala desde Intendencia.» | Minijuego del yunque |
| `station.alchemy` | Eldrin | «Antídotos, maná y tónicos.» | Antídoto destilado | «Densidad en la franja: Añadir, Remover o Diluir.» | Minijuego de la mezcla |
| `station.runic` | Eldrin | «**Equipo mágico**: varas, amuletos, anillos.» | La receta de nivel 1 más barata | «Equípalo como cualquier pieza.» A nivel 3 sale `station.runic.runes`. | — |

**`station.<id>.lv2` y `.lv3`**: un aviso de una pantalla que cuenta el encargado. Por ejemplo, Garth: «**Despensa de especias**: ya puedes hacer **caldo especiado** y lotes de hasta 10.» Lleva un botón «Ver recetas».

### Expedición

Todos estos mini tutoriales esperan a que termine el combate, salvo los marcados como «de combate».

| Id | Disparador | Pasos |
|---|---|---|
| `exp.clock` | primera bajada real | 1) «El **reloj** corre. Si llega a cero, la mazmorra se queda con todo.» Resalta `hud-timer`. 2) «Busca el **portal** antes.» |
| `exp.vital-wound` | cabeza o tórax por debajo del 50 % | 1) «**Zona vital** herida: si llega a cero, mueres.» Resalta la silueta. 2) «Cúrala primero.» |
| `exp.fracture` | primera fractura | 1) «Hueso roto: esa parte rinde menos.» 2) «Una **férula** sobre ella.» |
| `exp.bleeding` | primer sangrado | 1) «Sangras: pierdes vida cada poco.» 2) «**Venda** o, si es grave, **torniquete**.» |
| `exp.armor-broken` | primera pieza a 0 | 1) «Pieza rota: ya no protege.» 2) «Repárala en el Bastión.» |
| `exp.backpack-full` | no cabe algo o hay sobrecarga | 1) «Mochila llena.» Resalta `CarryBar`. 2) «Suelta algo o agrúpalo; con sobrecarga vas más lento.» |
| `exp.need-low` | primera necesidad por debajo del umbral | 1) «Tienes **hambre**, **sed** o **sueño**.» Resalta la barra. 2) «Come o bebe desde la mochila.» |
| `exp.merc-triangle` | primer triángulo naranja o rojo | 1) «**Naranja** = dudoso. **Rojo** = te la jugará.» 2) «Puedes evitarlo, atacarlo o arriesgarte.» |
| `exp.kael` | Kael | 1) «**Kael**. No es un errante cualquiera.» 2) Lo que hace Kael (texto de `wanderers.ts`). |
| `exp.elite` | primer élite | Es de combate. 1) «**Élite**: más vida, golpes más duros y mejor botín.» |
| `exp.boss` | primer jefe | Es de combate. 1) «**Jefe** de la subzona. Vencerlo abre la siguiente.» |
| `exp.new-subzone` | primera entrada en cada subzona | 1) Nombre y nivel. 2) «Criaturas nuevas: mira el Bestiario.» |
| `combat.class-skill` | primer combate con habilidad lista | Es de combate. 1) «Tu **habilidad de clase**.» Resalta su botón. |

### Bastión, por hechos

| Id | Disparador | Cuenta | Pasos |
|---|---|---|---|
| `bastion.first-death` | primera vuelta tras morir | Vesper | 1) «Te han traído a rastras. Lo que llevabas en la mochila se ha quedado abajo.» 2) «Te curo por **1 moneda**.» Acción real `CureOffer`. 3) «Y si no tienes nada, el Bastión te da **equipo de recluta**.» Acción real `RecruitOffer`. |
| `bastion.can-craft` | vuelves con materiales para una receta | su encargado | 1) «Con lo que traes puedes hacer **X** en la **estación**.» 2) Ir. |
| `bastion.first-sale` | primera venta | el mercader | 1) «Bien vendido. El oro va a tu Intendencia.» |
| `bastion.first-rep` | primera subida de rango | el mercader | 1) «Ya me fío más de ti: **más género** y mejores encargos.» |
| `bastion.first-skin` | primer traje | — | 1) «Póntelo en Personaje.» Resalta. |

---

## 5. Esquema del mapa del tutorial

Son 8 tramos en línea, como ahora, con el contenido nuevo:

```
[0 Camino]──[1 Empalizada]──[2 Cobertizo]──[3 Hoguera]──[4 Puerta Rota]──[5 Patio]──[6 Brecha]──[7 Salida]
  spawn        rata            pinchos→pierna  espada en       Osric           2 bandidos   traición    portal
  (paso 1)     (paso 2)        llave y cofre   el suelo        (paso 7a)       (paso 7b)    (paso 8)    (paso 9)
                               (pasos 3 y 4)   pan (5 y 6)
```

- Puntos seguros: 0, 1, 2, 3, 4, 5 y 6.
- El portal está apagado hasta el paso 9.
- Cambia respecto al mapa actual:
  - El baúl con la llave pasa a ser una llave colgada.
  - La fila de pinchos pasa del tramo 3 al 2.
  - La capucha se sustituye por una espada en el suelo y pan en la mochila inicial.
- Duración estimada: de 4 a 6 minutos.

---

## 6. Maquetas

En `mockups/tutorial/index.html` hay 7 escenas, cada una en escritorio 1920×1080 y en móvil 844×390:
- tutorial: pasos 1, 2, 3 y 7 (con el aviso de bloqueo);
- mini tutorial de Intendencia;
- mini tutorial de la Cocina, que cuenta Garth;
- la Guía.

Son capturas del juego real con la capa propuesta encima: atenuado con hueco, cartel con quién habla y «Paso N de M», y botones de 44 px. Se regeneran con `node mockups/tutorial/capturar.cjs`.

La Guía:
- agrupa los tutoriales por tema;
- los que no has visto salen como «Aún por descubrir» y no se pueden abrir;
- tiene «Repetir el tutorial inicial».

---

## 7. Preguntas

**Respuestas (12/11):**
1. La herida la hace la rata del paso 2. No hay pinchos y el tutorial tiene un paso menos.
2. La bienvenida la cuenta un intendente nuevo del Bastión, con un retrato provisional hasta que esté el definitivo (apuntado en ASSETS.md).
3. Opción a): se marcan como vistos los mini tutoriales de lo que el jugador ya ha usado.
4. El regalo de materiales es por personaje.
5. «Desactivar mini tutoriales» no oculta los avisos de subida de nivel.
6. «Saltar el tutorial» sigue marcada por defecto.

1. **Paso 3 (heridas).** ¿Te parece bien que la herida la hagan unos pinchos al entrar en el Cobertizo, antes del cofre? La alternativa es que la haga la rata del paso 2, que es más natural pero menos controlable.
2. **¿Quién cuenta la bienvenida al Bastión?** Hoy no existe ningún «intendente» con retrato.
   - a) Un intendente nuevo, con un retrato provisional apuntado en ASSETS.md.
   - b) Nira, que es quien vende los saquitos.
   - c) Una voz sin retrato.
3. **Jugadores que ya tienen partida** (migración):
   - a) Marcar como vistos los mini tutoriales de lo que ya han usado (pestañas abiertas, estaciones construidas, mercaderes visitados, muerte ya ocurrida) y dejar pendientes solo los de lo que aún no han tocado. Es mi recomendación.
   - b) Marcarlos todos como vistos.
   - c) Mostrar todos poco a poco.
4. **El regalo de materiales al construir una estación.** ¿Lo das por bueno siempre o solo la primera vez en la cuenta? Yo propongo que sea por personaje, porque el Refugio es de cada personaje.
5. **«Desactivar mini tutoriales» en Ajustes.** ¿Debe ocultar también los avisos de subida de nivel de las estaciones? Yo propongo que no: esos avisos son información, no tutorial.
6. **Personajes nuevos.** Juegan el tutorial solo si lo marcan. ¿Mantenemos la casilla «Saltar el tutorial» marcada por defecto, como ahora?

---

## 8. Plan por fases

1. **Sistema de mini tutoriales y su archivo de datos.**
   - `src/core/data/tutorials.ts`: id, tema, disparador, pasos con texto de escritorio y de móvil, objetivo por `data-testid`, acción esperada y quién lo cuenta.
   - Cola en el store: uno a la vez, y espera si hay combate o un modal.
   - `account.tutorials` guarda `{ seen, disabled }`.
   - Capa común con atenuado, hueco y cartel con retrato.
   - Indicador «!» en las pestañas, mercaderes y estaciones con algo pendiente.
   - Tests de la cola y del guardado.
2. **Tutorial inicial de expedición.** ✅ Hecho (12/11). Cambios sobre el guion: la herida la deja la rata (pierna a la mitad y con sangrado leve, para que la venda tenga sentido); la llave sigue en un baúl; el arma depende de la clase.
   - Mapa y pasos nuevos, y bloqueos con aviso.
   - Traición sin temporizador.
   - Heridas solo en el paso 3.
   - Se actualiza `e2e-tutorial.cjs`.
3. **Bienvenida al Bastión.** ✅ Hecho (12/11). Sustituye a `LobbyTutorial` y a `DungeonTutorial`. Cambios sobre el guion: 11 pasos (se separan las pestañas que hay que tocar); el oro se enseña con «Agrupar oro» en vez de arrastrar monedas al saquito, y el bolsillo seguro es informativo (el arrastre no se puede detectar de forma fiable); sale al volver de la primera bajada, no antes.
4. **Mini tutoriales del Bastión y de las estaciones.** ✅ Hecho (12/11). Incluye el regalo de materiales y los avisos de subida de nivel. Cambios sobre el guion: el catre va dentro del mini del Refugio; las recetas regaladas son las de nivel 1 que existen hoy (cecina, correa, vendas, lingote de chatarra, antídoto y cristal tallado), porque el guiso es de nivel 2; los de primera venta, rango y traje los cuenta el intendente; Ajustes y los desbloqueos (página del almacén, Compartido y habilidad de clase) quedan pendientes (Ajustes, en la fase 6).
5. **Mini tutoriales de la expedición.** ✅ Hecho (12/11). Los dispara `useExpeditionMinis` (`ExpeditionMinis.tsx`, dentro de la mazmorra) mirando el estado. Cambios sobre el guion: todos tienen 2 pasos (élite, jefe y habilidad de clase añaden uno); las heridas salen al acabar el combate, sobre la silueta del HUD; los del errante (triángulo y Kael) salen encima de su ventana (`overModal`); la subzona nueva es un mini por subzona (`exp.subzone.<id>`, desde la segunda) con su nombre y niveles; la mochila llena salta con sobrecarga o con el aviso de que no cabe.
6. **Guía y opciones en Ajustes › Partida.** ✅ Hecho (12/11). La Guía agrupa por tema todos los mini tutoriales menos los avisos de nivel; lo visto se relee allí mismo (texto de quien lo cuenta, con el de táctil en táctil) y lo no visto dice «Aún por descubrir». El «?» abre Ajustes directamente en Partida, sobre la Guía. Reiniciar pide confirmación. El mini `screen.settings` sale encima de la ventana de Ajustes (`overModal`) la primera vez que se abre con el engranaje.
   - Repetir el tutorial inicial.
   - Reiniciar los mini tutoriales.
   - Desactivarlos.
   - Icono «?» de 44 px en el menú, junto al engranaje.
7. **Regla permanente.** ✅ Hecho (12/11). El test de `data-testid` ya existía; se añade otro que comprueba que cada disparador se lanza en `src/`.
   - En CLAUDE.md y en `guia-interfaz.md`, apartado «Tutoriales».
   - Nuevo `docs/tutoriales.md` con el mapa de identificadores, disparadores y elementos resaltados.
   - Test que comprueba que cada `data-testid` de `tutorials.ts` existe en `src/`.
   - Línea «Tutoriales: …» en cada resumen de trabajo.
8. **Migración de jugadores existentes.** Según la respuesta a la pregunta 3. Lleva un test con partidas antiguas.

Cada fase se cierra con:
- tsc y los tests en verde;
- un script de comprobación en escritorio, tableta y móvil horizontal, con objetivos de 44 px;
- ESTADO_PROYECTO.md actualizado.
