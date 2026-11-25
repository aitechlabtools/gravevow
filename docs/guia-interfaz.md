# Guía de interfaz de los menús

Cómo se monta una pantalla de los menús de Gravevow (refugio, crear personaje…) para que funcione igual
en ordenador, tableta y móvil en horizontal. La estructura viene de la opción D de las maquetas
(`mockups/menu-structure/opcion-d.html`): barra superior con pestañas en píldora y paneles en columnas.
Solo se copia la estructura: los gráficos son siempre los del juego.

## Formatos y medidas

Todo está en un sitio: `src/config/ui.ts` (para el código) y el bloque «Base de interfaz» de
`src/game/game.css` (las mismas medidas como variables CSS). Si cambias un valor, cámbialo en los dos.

| Formato | Cuándo | Barra | Margen | Casilla | Casilla de arma | Botón principal |
|---|---|---|---|---|---|---|
| Escritorio | ancho ≥ 1280 px | 68 px | 24 px | 52 px | 76 px | 72 px |
| Tableta | ancho < 1280 y alto > 520 | 60 px | 18 px | 52 px | 72 px | 64 px |
| Móvil | alto ≤ 520 px | 52 px | 10 px | 44 px | 56 px | 52 px |

- En código: `useLayout()` devuelve `'desktop' | 'tablet' | 'phone'`; `UI.slot[layout]`, etc.
- En CSS: `var(--pad)`, `var(--gap)`, `var(--slot)`, `var(--slot-big)`, `var(--cta-h)`, `var(--touch)`.
- Todo lo que se toca mide al menos **44 px** (`var(--touch)`), también en móvil.
- Respeta las zonas seguras: `max(var(--pad), env(safe-area-inset-left))` en los bordes.

## Pixel art

- Siempre a escala **entera** (×2, ×3…). Nunca 2,5. Usa `usePixelScale('hero' | 'heroSm' | 'portrait' | 'vendor' | 'nav')`,
  que devuelve la escala entera para el formato actual (`UI.scale` en `config/ui.ts`).
- Las imágenes llevan la clase `pixelated`.

## Piezas comunes (`src/game/ui/kit`)

| Pieza | Para qué |
|---|---|
| `PillBar` | Pestañas en píldora de la barra superior (con número verde de novedades). |
| `Panel` | Panel de piedra con título entre rombos («◆ EQUIPO ◆») y cuerpo. `gold` para el borde dorado. |
| `SubHead` | Encabezado pequeño dentro de un panel («Mochila · 11/24») con hueco a la derecha para un botón. |
| `Segmented` | Dos o tres vistas de la misma pantalla (Equipo / Almacén). En móvil sustituye a las columnas que no caben. |
| `Drawer` | Cajón lateral con pestaña vertical: en móvil guarda un panel secundario (Atributos). |
| `Card` | Tarjeta con arco para retratos (mercaderes). |
| `ItemSlot`, `GridView` | Casilla e inventario (miden `var(--slot)`). |
| `ItemCard` | Ficha del objeto seleccionado con sus acciones (`screens/ItemCard.tsx`). |
| `SkinSlot`, `SkinPicker`, `Tienda` | Atuendos (`screens/Atuendos.tsx`): ranura cosmética violeta con rombo (no admite objetos; al tocarla abre el selector), selector y Tienda. |
| Clases CSS | `.cta` botón principal, `.icon-btn` botón de icono de 44 px, `.ui-tag` etiqueta, `.pill`. |

## Montar una pantalla nueva

1. Crea `src/game/ui/screens/MiPantalla.tsx` y añádela a las pestañas de `Lobby.tsx` (tipo `LobbyTab` y lista `tabs`).
2. La pantalla ocupa todo el alto disponible (`h-full`) y gestiona su propio desplazamiento: los paneles
   largos llevan `overflow-y-auto scroll-thin` en su cuerpo, no la página entera.
3. Escritorio y tableta: columnas de `Panel` separadas por `var(--gap)`, con `var(--pad)` de margen.
4. Móvil (alto ≤ 520): una sola columna visible. Lo demás va en `Segmented` (vistas) o en `Drawer` (cajón).
5. Nada depende de pasar el ratón: en táctil, tocar enseña la ficha o selecciona; mantener pulsado, la ficha.
6. Textos visibles en español. Nada de funciones falsas: lo que no existe, no se enseña (o «Próximamente» si se ha decidido así).
7. Prueba en los tres formatos: `scripts/menus-check.cjs` hace capturas de todas las pestañas en 1920×1080,
   1180×820 y 844×390 y avisa si algo se sale de la pantalla o mide menos de 44 px en táctil.

## Atuendos (skins)

- Un atuendo es un traje completo y solo estético. El arma y la secundaria equipadas se siguen dibujando encima.
- Para dibujar al héroe con su atuendo: `<HeroSprite … skin={id}/>` o `PlayerSprite` (usa el que lleva puesto: `wornSkin(profile)`).
- Añadir uno: entrada en `SKINS` (`src/core/data/skins.ts`) con `order`, `price: { currency: 'gold', amount }` y `body`.
  Con arte final: `sprites.sheet` apuntando a `public/skins/<id>.png` (los tonos #FF00FF/#B000B0 se cambian por la piel del jugador).
- Comprar exige confirmación; los botones miden `var(--btn-h)` (44 px o más en táctil).

## Tutoriales
- Mapa completo, disparadores y reglas en `docs/tutoriales.md`.
- Mini tutoriales: cartel `MiniTutorial.tsx` con retrato de quien lo cuenta, atenuado y hueco sobre el `data-testid` del paso; el «!» va en el `badge`. Botones «Entendido» y «Saltar» de 44 px o más.
- Un elemento que un tutorial resalta no cambia de `data-testid` sin actualizar el tutorial.

## Mercenarios errantes y tutorial

- Triángulo de riesgo: `RiskBadge` (`DungeonScreen.tsx`), con color y símbolo (✓, !, !!, ☠, ⚔) para que se distinga sin color.
  En el mapa, texturas `risk_*` (`textures.ts`). Valores en `config/wanderers.ts`.
- Tutorial: el cartel `TutorialGuide` lee el paso de `core/data/tutorial.ts` y elige el texto de ratón o de toque con `useIsTouch`.
  Para resaltar un botón, el paso apunta a su `data-testid` (`target: { ui: '...' }`) y recibe la clase `.tut-pulse`;
  para señalar algo del mapa, `target: { tile: [x, y] }` y la escena pone la flecha.

## Barra de combate (distribución D)
- **Barra normal (fase 5)**: arriba Atacar (1) | Ataque especial (2); abajo, cada mitad partida en dos: Habilidad de clase (3) | Guardia (4, azul) y Mochila (5) | Huir (6), las dos en gris.
  - Atacar: ataque básico del arma de la mano derecha, sin coste ni recarga (sin arma: Puñetazo).
  - Ataque especial: subtítulo «N listos · M en recarga». Habilidad: coste o «Recarga: N turnos».
- **Ataque especial** se abre en el mismo sitio: columna «Volver» (Esc) + 2×2. Arriba los 2 de la mano derecha (borde rojo),
  abajo los 2 de la izquierda (borde azul); un arma a dos manos llena los 4. Teclas 1–4.
  En recarga: botón apagado con un círculo con los turnos que faltan (no es un botón; la ficha sigue abriéndose).
- **Mochila** igual: «◂ Volver» arriba y «1 / 2 ▸ Página» abajo (Tab) si hay más de 4 objetos usables.
- Toque ejecuta; mantener pulsado (o pasar el ratón) enseña la ficha en el registro: nombre, coste, mano y arma, daño, efecto y recarga.
- Pantallas bajas (≤ 560 px, móvil en horizontal): el registro es una línea flotando sobre la barra y los botones usan todo el ancho.
- Recursos: Ímpetu (barra naranja, Guerrero) y Maná (barra azul, Mago). Las recargas pendientes pasan al combate siguiente.
- Código: `CombatScreen.tsx` (`mainCmds`, `specials`, `Cmd`), estilos `.cmdgrid`, `.cmdsplit`, `.cmdback`, `.cdturns` en `game.css`.
- testids: `act-attack`, `act-special`, `act-class`, `act-bag`, `act-flee`, `special-menu`, `bag-menu`, `skill-<id>`, `use-<id>`, `btn-menu-back`, `btn-page-next`.

## Habilidades (antes Personaje): ataques y habilidad de clase (reorganizada el 14/11)
- `src/game/ui/screens/Personaje.tsx` (pestaña `character`, rótulo «Habilidades»). Escritorio: panel «Ataques» a la izquierda
  (400 px), héroe con sus rombos en el centro (escala `R / 21`) y panel «Clase» a la derecha (420 px), sin selector.
  Tableta y móvil (corte en `layout !== 'desktop'`): héroe y un solo panel con `Segmented` Ataques · Clase; se abre en Clase
  si hay un hito por elegir (lleva ◆). Ya no hay atributos aquí: están en el Alijo (panel Aventurero, `HeroStats.tsx`).
- «Cambiar armas en el Alijo» (`btn-change-weapons`) lleva a la pestaña Alijo.
- Rombos en el orden de la barra de combate: la habilidad de clase arriba (dorada, más grande, marco doble); la mano derecha
  (básico y sus especiales) en el lado de la espada; la mano izquierda en el del escudo. Tocar un rombo resalta su entrada y abre su pestaña.
- Colores = los de la barra de combate (`SOURCE` en combatActions.tsx): básico #d9d3c1, clase #e8b33a, arma #a56bff, mano izquierda #8fa8c8.
  La mano izquierda se llama «Mano izquierda» en las dos pantallas (antes «Defensa» en combate y «Secundaria» en Personaje).
- «Ataques» es informativo: por mano (icono y nombre del objeto), el básico marcado «Básico · sin coste», cada especial con coste
  y recarga, y al final «Los ataques dependen de tus armas» + «Cambiar armas en el Alijo» (prop `onStash` desde Lobby).
  Con arma a dos manos, la mano izquierda dice que está ocupada. Algunos objetos flojos tienen un solo especial a propósito.
- «Habilidad de clase» es un camino de hitos (niveles 1, 20, 40, 60, 80): arriba la equipada; luego cada hito alcanzado con la que
  elegiste (tocarla la equipa) o, si está por elegir, las candidatas con «Elegir esta»; el próximo hito con candado, barra de progreso
  y «Te faltan N niveles», y sus candidatas en gris pero legibles; los siguientes, en una línea. Las reglas no cambian
  (core/classSkills.ts): en cada hito se elige 1 de las que queden; el aviso del pueblo (`ClassUnlockNotice`) sigue igual.
- Textos pequeños: en escritorio y tableta, la clase `.pj-wide` los sube 2 px (game.css); en el móvil se quedan como estaban.
- testids: `screen-character`, `character-seg`, `seg-attrs|seg-atk|seg-class`, `arc-class`, `arc-basic`, `arc-<id>`, `character-attacks`,
  `atk-<id>`, `class-path`, `class-skill-<id>` (data-state), `btn-unlock-class-<id>`. Capturas: `node mockups/personaje/capturar.cjs <url>/play/`.

## Aviso de desbloqueo de clase (pueblo)
- `src/game/ui/ClassSkills.tsx`: `ClassUnlockNotice` (aviso en el pueblo cuando hay un desbloqueo pendiente: eliges una, y luego
  «Equiparla» o «Ahora no»). `ClassSkillCards` ya no se usa en Personaje.
- Datos: `CLASSES[c].classSkills` (5 ids, la primera es la inicial) y `CLASS_UNLOCK_LEVELS` en config/progression.ts.
- testids: `class-unlock`, `pick-class-<id>`, `btn-try-class`.

## Mover objetos: arrastrar y soltar con ratón y dedo (5/11)
- `src/game/ui/pointerDrag.tsx` sustituye al arrastre nativo del navegador (que solo iba con ratón). `ItemSlot` llama a
  `startPointerDrag` en `pointerdown`; los destinos llevan `data-drop` (casillas: `{type:'loc'}`, pestañas del almacén:
  `{type:'page'}` —si te quedas encima se abre esa página—, mochila puesta: `{type:'bag'}`). `DragLayer` (en App) pinta el icono.
- Ratón: pulsar y mover 5 px. Dedo: mantener ~220 ms y mover; si el dedo se mueve antes, es desplazamiento del panel.
  Durante el arrastre no hay desplazamiento ni zoom (touchmove no pasivo + `html.is-dragging`). En táctil el icono va 46 px
  por encima del dedo y el destino se busca en la punta del icono. Mantener pulsado en táctil NO hace la acción del clic derecho.
- Soltar en un destino llama a `actions.transfer` (intercambia, junta montones o equipa según core/inventory.ts; las reglas no
  cambian y los errores salen como siempre). Soltar fuera: el icono vuelve a su casilla.
- Resaltado: solo la ranura de equipo donde encaja el objeto (verde, discontinua y ✓) y las demás se apagan; las casillas vacías
  no se marcan. El destino bajo el puntero se marca en dorado. Objeto elegido: doble contorno blanco y dorado por fuera del de
  rareza, con brillo que late (`.slot.selected`). Elegir un objeto y tocar una ranura de equipo ocupada lo equipa ahí.
- Prueba: `node scripts/arrastre-check.cjs <url>/play/ <carpeta>`.

## Comparar, gestión rápida y venta múltiple (5/11)
- Comparar: `compareWithEquipped` e `isUpgrade` (inventory.tsx). La ficha (`ItemCard`) dice «Frente a X: mejor en N · peor en M»
  con cada diferencia ▲/▼ (incluye rareza y atributos) y los ataques que llevas ahora. Las piezas que mejoran lo puesto y puedes
  llevar muestran un ▲ verde en su casilla (`.slot-up`).
- Mochila: «Vaciar mochila» (todo al almacén, página abierta y luego las demás; pide confirmación si hay algo raro o mejor) y
  «Guardar materiales» (`actions.emptyBackpack`). Mayús+clic: mochila ⇄ almacén.
- Vender (Mercaderes → Vender): tocar marca/desmarca (doble contorno dorado y moneda, `.is-marked`); también se puede arrastrar
  a la zona «A vender» (`data-drop {type:'sell'}` → evento `cr-drop-sell`). Panel con lista, total, «Marcar equipo común /
  materiales / tesoros», «Vender N objetos · X oro» (`actions.sellMany`; confirma si hay algo raro, épico, legendario o mejor que
  lo puesto) y «Recomprar» los últimos 5 al mismo precio mientras sigas con ese mercader (`state.buyback`, `actions.buyBack`).
- Pruebas: `node scripts/objetos-check.cjs <url>/play/ <carpeta>` y `node scripts/arrastre-check.cjs`.

## Ajustes por secciones (12/11)

`src/game/ui/Settings.tsx` (`SettingsModal`; `TitleScreen.tsx` la reexporta). Maquetas en `mockups/ajustes/index.html`.
- Secciones: Sonido (general, música y efectos; nota «La música suena en el Bastión y el menú.»), Pantalla (pantalla completa, también con la tecla F, o, en iPhone, cómo instalar), Controles (teclado de mazmorra y combate, y táctil; primero lo del dispositivo), Partida (botón a la Copia de seguridad, Elegir personaje y Repetir el tutorial; en la mazmorra solo avisos), Comunidad e Información (versión, legales y `MailButton`).
- Escritorio y tableta: lista de secciones de 200 px a la izquierda. Móvil (alto ≤ 520): dos columnas de iconos de 44 px y el nombre de la sección en la cabecera.
- Pie fijo con «Cerrar» y «Salir al título» (este, solo en el Bastión). Esc cierra el panel; en el Bastión, Esc lo abre si no hay otra ventana (`data-modal`).
- La sección abierta y los volúmenes se guardan en la cuenta (`Settings.settingsTab`, `musicVolume`, `sfxVolume`); el audio tiene un bus de música y otro de efectos bajo el general (`setAudio`).
- El punto verde (copia de seguridad recomendada, `backup.remind`) sale en el engranaje y en Partida.
- Si un control cambia, actualiza las tablas `KEYS_DUNGEON`, `KEYS_COMBAT` y `GESTURES`.
- Prueba: `node scripts/ajustes-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Bastión unificado: mercaderes y estaciones en una pantalla (14/11)
- **Pestaña Bastión** (`screens/Mercaderes.tsx`, `BastionGrid`): los 8 mercaderes en 2 filas de 4 que llenan la pantalla. Sin pantalla de entrada ni rejilla de estaciones.
- **Tarjeta** (`VendorTile`, clases `.vtile*` en game.css): nombre arriba; **primer plano de medio pecho** (`Bust`: el sprite de 20 × 26 recortado por cabeza y pecho, a la mayor escala entera que quepa); icono de su estación (en ruinas si no está en pie), lugar y estado («Cocina · Nv 1/3», «Forja de armas · En ruinas»); reputación. Aviso sobre el retrato: «● Misión lista», «● Se puede reconstruir» o «▲ Mejora» (en el móvil, solo el símbolo en la esquina). Arriba a la derecha, la preparación y «Recepción (N)» si hay excedentes.
- **Pantalla del mercader** (`VendorInterior`): izquierda, retrato, lugar, oficio, frase, **Pendiente** con su botón (Entregar, Reconstruir o ▲ Mejorar) y reputación; centro, sus pestañas (`ui-seg vtabs`, solo las que tiene, con ● o ▲ si hay algo pendiente) y «◂ Bastión» al final; derecha, mochila, materiales o zona de venta. Móvil: retrato pequeño, nombre y pestañas en una línea; lo de la derecha, en un cajón.
- **Una estación por mercader** (`config/stations.ts`, campo `by`): Nira · Curtiduría (cuero y tela) · Vesper · Rincón de cura · Garth · Cocina · Orik · Banco de trabajo (madera y desguace) · Grizk · Catre (hostal: 5/10/15 de oro la noche) · Brand · Forja (lingotes, armas de hierro y anillos) · Valerius · Forja de armaduras, en «La armería» · Eldrin · Laboratorio (alquimia y atril rúnico; a nivel 3, «Grabar runas»). Qué receta va a cada una: `assignStation` en `data/crafting.ts`.
- **Pestaña de estación** (`StationTab`): en ruinas, la frase del encargado y el detalle con los 3 niveles, el coste, «Ir» a dónde conseguir lo que falta y «Reconstruir»; en pie, el menú de crafteo común con «▲ Mejorar» (abre el detalle, con «◂ Volver»). La Cocina enseña debajo los platos para comer antes de bajar; el Catre, tu Descanso, «Dormir · N oro» y los niveles con su precio.
- testids: `vendor-list`, `vendor-<id>` (tarjeta), `vendor-card-<id>` (nombre, lleva el «!»), `vendor-pending-<id>`, `vendor-station-<id>`, `vendor-tabs`, `vendor-view-<shop|sell|quests|repair|scrap|contracts|infirmary|station>`, `vendor-back` («◂ Bastión»), `vendor-pending`, `vendor-pending-go`, `station-panel`, `craft-<estación>`, `craft-locked-<estación>`, `station-detail-<estación>`, `upgrade-<estación>`, `upgrade-open-<estación>`, `detail-back`, `btn-cot`, `runic-runes`, `btn-reception`.
- Maquetas: `mockups/hud-unificado/index.html`. Prueba: `node scripts/bastion-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Jugar: menos texto y fichas (12/11)
- La tarjeta de destino solo lleva la etiqueta «Zona · N/10», el nombre de la subzona y «Mapa de zonas». El bloque Expedición, «Expedición», la línea de zona y nivel, los avisos que cambian algo (zona cerrada, demasiado fácil, sin arma, curación) y «Descender».
- Lo demás va en una ficha (`HoldTip` en `screens/Jugar.tsx`) que sale encima al pasar el ratón o al mantener pulsado (táctil; soltar no ejecuta el botón): en la zona, niveles, «mapa nuevo cada vez» y su lema; en la expedición, pociones, oro en riesgo, mercenario, minutos para el portal y «si caes, pierdes lo que llevas». testids: `zone-tip`, `expedition-tip`, `expedition-summary`.
- Prueba: `node scripts/jugar-ficha-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Comer y beber desde el objeto (12/11)
- Las cajas de Saciedad, Hidratación y Descanso (`NeedsPanel` en `NeedsBars.tsx`, en el panel de heridas de la mazmorra, en combate y en el Alijo) solo llevan nombre, barra, valor y línea de ayuda. Sin «Comer…» ni «Beber…».
- Se come desde el objeto: elegirlo y «Comer» o «Beber» (`act-eat`, en `ItemActions`). En el Bastión, de la mochila o del almacén (también los platos); en la expedición, solo de la mochila. Doble toque o doble clic también lo consume. En combate, por la Mochila de la barra (`use-<id>`, gasta el turno).
- La ficha y la ventanita del objeto (`FoodLine`, `item-food`) dicen lo que aporta («+25 saciedad, +5 hidratación») y si se desperdiciaría parte.
- Al subir, la barra se rellena con una animación corta (`.need-fill`).
- Si una barra está baja y llevas con qué, la caja enseña «Tienes comida en la mochila» (`need-food-<need>`, 44 px en táctil): resalta esos objetos (`highlightItems`, clase `.slot-hint`); en la mazmorra abre antes la mochila y en el Alijo pasa a Equipo si la mochila no se ve. En combate es solo texto.
- Prueba: `node scripts/necesidades-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Alijo (antes Intendencia) › Equipo en dos columnas (12/11)
- Escritorio (`Alijo.tsx`): el panel Equipo pasa a dos columnas cuando mide 600 px o más (470 px en escritorio estrecho, por debajo de 1600 px de ancho):
  izquierda, las ranuras alrededor del personaje y debajo la caja Oro / En riesgo (`gold-box`); derecha (`equip-bag-col`), la Mochila
  (título, contador, Agrupar oro, Ordenar, cuadrícula, carga, Vaciar y Guardar materiales) y el Bolsillo seguro (3 casillas, contador,
  «no se pierde al morir» u «oro a salvo»). El panel no se desplaza; si la mochila crece (más de 24 casillas) o la ficha quita alto,
  solo se desplaza esa columna.
- Casillas del panel: a 60 px (armas 84) en escritorio ancho; en escritorio estrecho, 44 px (armas 60) y el Aventurero baja a 280 px.
- Sin barra de ayuda («Elige un objeto…»): la ficha del objeto (`item-card-wrap`) solo sale al elegir uno. La ayuda va en la bienvenida (paso de la mochila) y en la Guía.
- Tableta: una columna, como antes, con casillas a 46 px para que la mochila no se corte. Móvil: sin cambios (vistas separadas).
- Maquetas y capturas: `mockups/intendencia/index.html` (`node mockups/intendencia/capturar.cjs <url>/play/`).


## Crear personaje: giro, aspecto y género (13/11)
- **Panel izquierdo** con `Segmented` Clase | Aspecto. Aspecto: Género (con Aleatorio en la misma fila), Capa, Piel, Pelo, Peinado y Barba. Muestras de 44 × 44: cuadros de color y miniaturas de cabeza (el sprite real recortado). En escritorio y tableta cabe sin scroll; en el móvil, Aspecto se desplaza.
- **Centro:** el personaje a la mayor escala entera, con flechas ◂ ▸ de 44 × 56 a los lados. Arrastrar ≥ 30 px también gira, y la marca «Frente · Espalda» va debajo. El giro es un estrechamiento en X en 3 pasos. Al cambiar la capa de frente, enseña la espalda 1,3 s y vuelve. Sin giro automático.
- **Nombre:** campo con el botón de pluma al lado (`name-random`, del alto del campo). El nombre sale según el género.
- **Opciones nuevas:** se añaden en `src/core/data/appearance.ts`. Un color nuevo es solo un dato; un peinado nuevo es un dato más su dibujo en `art.ts`.
- **Textos sobre el jugador:** se escriben con `{masculino|femenino}` (por ejemplo «cansad{o|a}») y se resuelven con `g()` de `src/core/gender.ts`. Avisos, registro de combate, errantes y tutoriales ya lo aplican solos; en un texto nuevo de la interfaz, envuélvelo con `g()`. Para el nombre de la clase del jugador usa `className(classId, sex)`, no `CLASSES[..].name`.

## Resultados en páginas (13/11)
- **Estructura:** cabecera con el título en pequeño (desde la página 2), rombos de página y «Saltar» discreto a la derecha (44 px). Abajo, «◂ Atrás», «Siguiente ▸» o, en la última página, «Volver al Bastión». Cada página entra con `fade-in`.
- **Navegación:** Intro y → avanzan, ← retrocede, y en táctil se puede deslizar (más de 60 px). «Saltar» nunca se salta la página del cuerpo si vuelves herido.
- **Botín:** casillas con el borde de su rareza y `loot-shine` en lo épico y legendario (sin animación con movimiento reducido). Al tocar o pasar el ratón, la ficha (`ItemTooltip`) debajo.
- **Tu cuerpo:** `BodyFigure` grande; solo las lesiones que piden atención (sangra, rota o inutilizada; al tocar una, su efecto) y los golpes en una frase; la cura de Vesper con su precio o lo que falta.

## Un solo aliado (13/11)
- **Conversación con aliado ya presente** (`AllyChoice`):
  - el nuevo arriba, con su triángulo y su frase de rivalidad;
  - debajo, «Ya te acompaña» con el actual y «Solo cabe un aliado»;
  - las opciones en tres columnas (una en móvil estrecho): ⛨ gris mantener, ⇋ oro separarse, ✕ rojo traicionar. El prisionero tiene una cuarta: ⛓ soltarle;
  - cada opción lleva su consecuencia en una línea, con botones de 44 px o más;
  - con riesgo muy alto, aviso rojo antes de las opciones.
- **HUD:** una sola tarjeta de aliado con retrato de 36 px, nombre, triángulo (o «⛨ Contrato de Grizk» / «Rescatado»), 👁 si te vio traicionar, y su vida.

## Menú principal (14/11)
`TitleScreen.tsx`, estilos `.tm*` y `.gm*` en `game.css`. Columna izquierda: logo arriba, menú abajo (entradas `.gm-it`, la elegida con `.on`: dorado y rombo rojo; flechas y Enter), enlaces externos en `.gm-links` y aviso de la alpha al pie. Derecha: `Diorama` con `fill="#040308"` sobre el mismo negro, con máscara en los bordes. Maquetas: `mockups/menu-principal/index.html`.

## Nombres de pestañas (14/11)
Rótulos visibles: Jugar · Habilidades · Alijo · Bastión · Misiones · Bestiario · Tienda; dentro del Alijo, Equipo · Heridas
(móvil: Equipo · Almacén · Heridas). Por dentro no cambian (pestañas `character` y `stash`, vista `status`, `data-testid`
`tab-character`, `tab-stash`, `seg-status`, archivo `Alijo.tsx`), para no tocar guardados ni pruebas.

## Panel Aventurero del Alijo (14/11)
`HeroStats.tsx`: `LevelBar` (Nivel N · XP con barra) arriba del panel y `HeroStats` (atributos). Pasar el ratón o tocar un
atributo abre el desglose (`stat-tip`, en un portal): total, base y una línea por fuente distinta de cero, verde si suma y rojo
si resta. Las fuentes salen de `statSources(profile)`: hoy solo «Equipo»; ahí se añaden runas, habilidades, heridas o comida.
Sin botón «Ver detalles». En el móvil, nivel y atributos van bajo el equipo, en la vista Equipo.

## Elegir personaje y Bestiario (14/11)
- Cada tarjeta lleva la trayectoria compacta (`char-record-<hueco>`): «3 expediciones · 2 extracciones · 1 muerte», o «Sin expediciones».
- Bestiario: resumen arriba (`bestiary-summary`: criaturas derrotadas y jefes derrotados de N), «N derrotadas» en cada criatura
  (`beast-kills-<id>`, del contador por tipo `profile.bestiary[id].kills`, que ya existía) y los jefes con «✓ Derrotado» o «Por derrotar».

## Misiones y Bestiario (18/11)
- **Notas de misión** (`ui/QuestNotes.tsx`, CSS «Notas de misión» en `game.css`): `QuestNote` (aceptada o del tablón), `EmptySlot`, `QuestDetail` (lateral o a pantalla completa con `QuestDetailOverlay`), `BoardNotes` y `VendorQuestNotes`. Se usan en la pantalla Misiones y en la pestaña Misiones de cada mercader: si cambias una nota, cambia en los dos sitios.
- Solo se ve sin abrir la nota el botón que importa (Cobrar/Entregar si está lista; Aceptar en el tablón). Fijar y Dejar van en el detalle.
- **Bestiario** (`ui/BestiaryTab.tsx`, CSS «Bestiario»): el nivel de conocimiento es el color del borde, no un texto. Jefes en casilla doble (`.btile.boss`), avisos rectos en la esquina superior izquierda para no tapar el sprite.
- **Estilo plano:** en estas dos pantallas los paneles y botones van sin degradado (`.qscreen`, `.qdetail`, `.bscreen`). Usa solo colores de `theme.css`/`game.css`; la única luz permitida es la cálida de las tarjetas del Bastión detrás de los personajes.
- Iconos pequeños nuevos (XP, reputación, repetible, clavo, chincheta, candado, corona, calavera, libro, sombra): `ui/uiIcons.ts`, a escala entera.

## Paleta, botones y pestañas con icono (fase 1 del plan de interfaz, 19/11)
- **Paleta «piedra fría»**: bloque al principio de `src/game/game.css` (solo el juego; la web usa `theme.css` sin cambios). Fondo #0a090c, panel
  `stone-900` #151419, botón `stone-800` #1b1a20, borde `stone-600` #3a3841, texto `parchment` #e6e0d2, secundario `stone-300/400` #a7a4ae (7,5:1),
  desactivado `stone-500` #82808a (4,7:1). Para cambiar la paleta, cambia esos valores. No escribas grises sueltos: usa estas clases o variables.
- **Paneles y botones planos**, sin degradados ni sombras. Tres niveles de botón: `.btn-gold` principal (relleno dorado `--gold-fill`; **uno por zona**,
  y en la pestaña activa), `.btn` secundario, `.btn-danger` con consecuencias (contorno y texto `--danger-tx`). Desactivado: texto `stone-500`, no transparencia;
  un `.btn-gold` desactivado se ve como secundario. `.ui-seg button.on` también es dorado plano.
- **Pestañas con icono** (`kit/PillBar.tsx`, iconos en `kit/tabIcons.ts`): siluetas de un color en 12×12 dibujadas con `PixelIcon` (`shared/community.tsx`,
  la misma línea que Apoyar y Discord), siempre a 24 px (×2). Escritorio: icono y nombre al lado. Tableta: icono encima del nombre; por debajo de 1100 px,
  nombre solo en la activa. Móvil: centradas, nombre solo en la activa; con ≤ 800 px de ancho, retrato sin nombre (`.nav-chip-txt`) y sin pantalla completa
  en la barra (`.nav-fs`; sigue en Ajustes › Pantalla y con F). Cada pestaña lleva `aria-label` con su nombre (y las novedades). Mismos `data-testid` (`tab-*`).
- Pestaña nueva: añade su icono a `TAB_ICONS` con la misma clave que su id.


## Interior del mercader (fase 2 del plan de interfaz, 19/11)
- **Columna izquierda (los tres formatos):** tarjeta del mercader igual que en la página Bastión (`vtile vcard`: nombre, busto, lugar, estado de la estación, reputación y descuento), debajo las pestañas en columna (`.vtabs-col`, botones de 48 px —44 en móvil— con icono 12×12 a ×2 de `VENDOR_TAB_ICONS`; la activa en dorado), el aviso «Pendiente» y, al final, la tarjeta «◂ Volver al Bastión» (`.vback-card`, silueta `BASTION_SKYLINE` a ×6 en escritorio y ×4 en tableta; en tableta el rótulo es «◂ Bastión»). En el móvil: retrato pequeño y nombre, pestañas y el botón `.vback`. El `data-testid` `vendor-back` está en la tarjeta o el botón.
- **Tienda:** `ShopStock` pinta filas `.shop-row` (`shop-row-<id>`); tocar elige (borde dorado). La ficha es `ShopCard`, con el único botón dorado `buy-<id>` («Comprar · N oro»; si no llega el oro, botón secundario «Te faltan N de oro»). En escritorio y tableta va en la columna derecha encima de «Tu mochila · n/24»; en el móvil sale encima (`shop-card-overlay`, cerrar con `shop-card-close`). Doble clic en una fila compra. Precio: `PriceTag` (texto dorado con moneda; rojo si no llega). Bloqueado: atenuado con candado y rango; «Otra clase» en rojo.
- **Sin título de panel** en el centro (el nombre ya está en la tarjeta). Los scripts que compran tocan antes `shop-row-<id>`.
- **Vender (los 8 mercaderes, 24/11):** tres columnas. Izquierda: la tarjeta del mercader, sin «Compra: …» (quitado el 24/11; si su estación está en ruinas, lo dice la lista «A vender»). Centro: pestañas Mochila · Almacén · Compartido (pills de 44 px, la elegida en dorado; en el almacén las casillas crecen a lo ancho hasta 80 px en ordenador y 60 en tableta, con icono a ×4 en ordenador grande, y las filas que no caben se desplazan) y barra de herramientas (botones de 36 px con ratón y 44 en táctil): «Vendibles», rareza, tipo, «Todo lo vendible», «Comunes», «Limpiar»; la selección rápida dice su alcance («mochila» o «esta página»). Estados de casilla: vendible normal; no lo compra, en gris (`.slot-nobuy`); fuera del filtro, casi invisible (`.slot-filtered`); marcada, doble contorno dorado y moneda; protegida, candado dorado de 7×8 arriba a la derecha. Derecha: lista con cantidad (− / número / + / ×N) y, abajo fija, total y botón «Vender N objetos · X oro» (48 px; en el móvil, resumen en una línea y 44 px). Al vender, «+N oro» sube junto al botón.
- **Comprador en el inventario:** sin iniciales en las casillas (quitadas el 24/11); la ficha (`item-card-buyer`) y la ventanita (`tooltip-buyer`) dicen «Lo compra X · lugar».

## Ficha de objeto (fase 3)
- Regla: la ficha nunca se pone encima de la mochila ni del contenedor del que sale el objeto. Ocupa una columna propia o la de algo secundario (Aventurero en tableta, la mochila en la vista Almacén del móvil).
- En columnas estrechas, `ItemCard stacked`: icono arriba, texto a todo el ancho y botones debajo.
- Fuera del escritorio, inventario de la expedición y saco de botín a pantalla completa, con «Cerrar ✕» arriba a la derecha y la acción principal dorada abajo.

## HUD de exploración (fase 4)
- **Escritorio y tableta:** un solo bloque arriba a la izquierda: busto (`.hud-bust`, 52 px, el sprite a ×3 recortado por el pecho), nombre y clase, figura del cuerpo, vida, recurso y dos filas de tres columnas: necesidades (icono, número y barra; el número en dorado si penaliza, rojo si es grave) y, debajo, botín, oro y carga (icono de peso y barra verde/amarilla/roja: <80 %, 80-100 %, sobrecarga). Solo iconos y números; el nombre sale en el `title`.
- **Arriba a la derecha:** iconos de 44 px (Mochila, Menú, Pantalla completa) en todos los formatos; debajo, la tecla en escritorio (I, Esc, F) y el nombre en tableta. Debajo, los aliados.
- **Poción:** botón redondo abajo a la derecha en los tres formatos; en escritorio, la «Q» pequeña arriba a la izquierda y el número arriba a la derecha.
- **Móvil:** tira de 44 px (figura del cuerpo, dos barras finas con número, tres iconos de necesidades que abren la tira completa, botín y oro). Solo el reloj en el centro; la sala aparece 3 s al cambiar, al tocar el reloj o si un aviso la señala (`hud-room`). Aliado: icono de 44 px con su vida bajo la tira.
- **Pausa:** «Continuar» dorado, «Ajustes» secundario y, tras una línea, «Abandonar la expedición…» en rojo con confirmación.
- Retratos pequeños de personaje: siempre en busto (cabeza y hombros), no la figura entera.

## Combate (24/11: fichas, esqueleto de heridas y barra)
Maqueta y capturas: `mockups/combate-heridas-barras/` (índice; `real.cjs` repite las capturas reales y las comprobaciones).
- **Escala:** todo se mide con `--k` sobre `[data-testid=combat]`: 1 en el móvil horizontal (alto ≤ 560), 1,5 en tableta y 2 en pantallas de 1600×900 o más. Letra de las fichas y botones `4px + 8px·k` (12, 16 y 20 px).
- **Sin título:** ni zona ni orden de turnos arriba. El turno lo marca el ▼ dorado sobre quien actúa y «X está actuando…» en el registro.
- **Enemigos** (`FoeCard`, `.cb-foes`): fichas arriba a la izquierda, en fila y en el orden del campo (190 px·k; 240 si va solo). Escudo dorado con el nivel (`.lvl`, rojo si es jefe), nombre y vida con número (`hpnum-<id>`); debajo, los estados con icono, nombre y turnos («☠ Veneno 3», «❄ Congelación 2»), «Expuesto», «En guardia» y el golpe que prepara («⚠ Golpe pesado → ti ≈16 · Guardia», `intent-<id>`). En el móvil, todo en una línea y solo con icono y número («☠ 3», «⚠ a ti ≈16»; `.cb-full` / `.cb-short`); el nombre sale en el `title`. Con dos, tocar la ficha o el sprite elige objetivo: borde rojo de 2 px y ▶ (`target-<id>`), y ▼ rojo sobre el sprite. Nada de barras encima de los sprites.
- **Tu grupo** (`.cb-party`), abajo a la derecha, sobre los botones: el aliado en una tira fina (`AllyStrip`, nombre, vida y número) y tu ficha (`HeroCard`, 240 px·k). Las dos llevan el escudo del nivel delante del nombre (el aliado, si lo tiene) y tu ficha tus estados («◆ Sangrado 2»).
- **Esqueleto de heridas:** en tu ficha, `BodyFigure` como botón (`combat-body`, borde rojo si hay heridas) a ×2, ×4 o ×5. Abre «Heridas y necesidades» (el mismo `BodyPanel`); abrirlo no gasta el turno; curar sí, y solo en tu turno. Las lesiones se ven en la figura (cuadro rojo si sangra, aspa si está rota, raya si está inutilizada); no hay resumen en texto. La zona que cambia parpadea 0,6 s con borde blanco (`flash` → `.body-flash`; sin animación con «reducir movimiento»).
- **Barra inferior:** texto del combate a la izquierda (44 %, hasta 3 líneas) y botones a la derecha. En el menú principal (`.cmdgrid.main`) solo el nombre: sin subtítulo (el coste sale en el texto al señalar o mantener pulsado y en los submenús) y con los números de tecla solo con ratón. Botones de 44 px·k de alto.
- **Escena:** enemigos con los pies en `bottom: 41 %` (voladores 52 %); en el móvil bajan 18 px (`.foe`). Sombras pegadas a los pies (`.fighter-shadow`, `translate: -50% 15%`).
- Los avisos (`Toasts`) no salen en combate: el último aparece como línea dorada en el registro (`combat-note`).

## Menús y fichas (fase 6)
- Ningún texto por debajo de 12 px en el móvil (raíz de 11 px: botones y selectores fijados a 12 px; clase `.min12` para casos sueltos).
- Selectores secundarios en tableta y móvil: columna de iconos al lateral (`.vtabs-col.is-icon`, 52 px).
- Iconos de sección sin recuadros discontinuos.
- Pantallas de una sola tarea (Copia de seguridad): una acción grande por columna dentro de su recuadro; alternativas pequeñas debajo; notas con icono «i»; todo alineado a la izquierda y el bloque centrado en la pantalla.
- Pestañas de zona: nombre + barra de progreso + cuenta; la activa en dorado con línea inferior.

## Estaciones de fabricar (fase 7)
- Una sola página por estación (`StationDetail` envuelve a `CraftPanel`): no hay «Usar» ni pantalla aparte de «Mejorar». En ruinas, la estación a la izquierda y a la derecha encargado, nivel 1, lo que falta (con pistas e «Ir») y «Reconstruir».
- Escritorio: columna de la estación (280 px) con los tres niveles abiertos y la mejora abajo; recetas y ficha llegan al borde inferior. Tableta y móvil: la estación se pliega en la barra `station-upgrade-<id>` («Niveles y mejora ▾»). En el móvil «Tus materiales» va en una columna dentro de la página; la pestaña lateral `vendor-side` se oculta con CSS (`[data-detail-built]`, `[data-craft-built]`).
- Ficha de receta: objeto a 192/128/64 px, nombre a 28/22/17 px, estadísticas en casillas (Hueco, Nivel y cada estadística, en verde o rojo) y «Necesitas» pegado a los botones de fabricar. Sin la descripción del objeto. «Solo las que puedo hacer» es una casilla (`craft-only-can`) al principio de la lista.
- Textos: 12 px como mínimo en toda la interfaz; solo se aceptan más pequeños los signos ◆ y ▶ y el número de nivel del escudo en combate.


## Seguro de equipo por bajada (24/11)
Plan: `docs/plan-seguro-equipo.md`. Maquetas y capturas reales: `mockups/seguro-equipo/` (`real.cjs` las repite con 42 comprobaciones).
- **Ventana al pulsar «Descender»** (`InsureModal`, `ui/InsurePanels.tsx`, `insure-modal`): título; a la izquierda la cuadrícula de 2 × 4 casillas (`insure-<ranura>`, en el orden Arma, Secundaria, Cabeza, Torso / Manos, Pies, Anillo, Amuleto), cada una con el icono, el coste arriba a la izquierda y el nombre de la ranura debajo. Marcada: borde dorado de 2 px, fondo #201a10 y sello. Vacía: apagada con «—». Estación en ruinas: candado y apagada; al tocarla, aviso. A la derecha el recibo: «Asegurado» con «Todo»/«Nada», una línea por pieza marcada (sello, nombre y precio), «Tienes N» y «Total N ●», y los botones «Asegurar y bajar» (dorado; «Te faltan N» sin oro) y «Bajar sin asegurar». Casillas de 72 px (80 en pantallas grandes, 50 en el móvil). No sale en la primera bajada, si no hay nada asegurable o si se desactiva en Ajustes › Partida (`insure-ask`).
- **Sello** (`kit/Seal.tsx`): escudo dorado con marca, 12×12 a escala entera, con `title`. En las casillas del inventario de la bajada (`.slot-seal`, abajo a la derecha, ×2 en pantallas de 1600 px o más), en la ficha del objeto («Asegurada esta bajada»), en el resumen, en la tarjeta del mercader y en el recibo.
- **Resumen al caer** (`summary-reforged`): «Te esperan N piezas reforjadas en el Bastión: Maese Brand (…) y Valerius (…)».
- **Bastión:** aviso al volver; la tarjeta del mercader lleva «Pieza reforjada» con el sello (solo el sello en el móvil); en su interior, punto dorado en la pestaña **Seguro** y caja «Pendiente · Recoger».
- **Pestaña «Seguro»** (`InsureTab`, `insure-tab`): **solo Valerius** (24/11, una función por mercader), con la Forja, la Forja de armaduras o el Laboratorio reconstruidos, o con piezas pendientes. Si hay piezas pendientes, el mercader se abre directamente en esta pestaña. Contenido:
  - arriba, «Piezas reforjadas» con «Recoger» y «Recoger todo» (`reforged-*`), cada pieza con el color de su rareza;
  - «Cómo funciona» (`insure-how`): cuatro cajas con sello (Solo una bajada · Si caes, te la reforjo · Solo lo que llevas puesto · El 4 % de su valor); en el móvil, solo los títulos en una fila;
  - «Lo que <mercader> te reforja»: una ficha por ranura que cubre (`insure-card-<ranura>`) con borde izquierdo del color de la rareza, nombre en ese color, rareza, ranura, durabilidad, estadísticas (verde suma, rojo resta), atributos y runas, coste y botón «Asegurar»/«Asegurada» (dorado, 44 px). Estación en ruinas: candado. Ranura vacía: apagada;
  - «Próxima bajada»: recibo con las piezas marcadas, «Tienes», «Total» y que se cobra al pulsar «Descender». A la derecha en pantallas de más de 1300 px; debajo en tableta y móvil.
- **Quién asegura:** siempre Valerius (reforja con Brand). Cada pieza necesita reconstruida la estación de quien la fabrica: Forja (armas, anillos, dagas y tomos), Forja de armaduras (armaduras y escudos) o Laboratorio (amuletos) (`reforgerFor` en `core/insuranceLoss.ts`).
- **Una función por mercader (24/11):** «Reparar» solo en Brand (ya no en Orik ni en Nira); «Desguace» solo en Orik; «Seguro» solo en Valerius. Tiendas, venta y estaciones, sin cambios. Plan: `docs/plan-mercaderes-funciones.md`.

## Barra superior que se ajusta sola (25/11)
- `kit/PillBar.tsx` mide el ancho que necesitan las pestañas con nombre y el sitio libre (barra menos retrato y oro/botones). Si no cabe, añade `.tight`: iconos solos, nombre en la activa y en el `title` de las demás. No depende de cortes fijos de anchura; al ensanchar vuelven los nombres.
- Zonas táctiles: también el retrato (`nav-chip`) tiene 44 px de ancho mínimo.

## Estaciones que se pliegan según su sitio (25/11)
- La estación reconstruida decide por el ancho real de su panel, no por el formato: si no llega a 1000 px, niveles y mejora van plegados en la cabecera (como en tableta y móvil). La ficha de receta también mide su ancho y reduce icono y título. Los nombres largos pasan a dos líneas, nunca «…».

## Textos y nombres (25/11)
- En móvil horizontal la letra base es 12 px: ningún texto por debajo. Los nombres de objetos, piezas y mercaderes van a dos líneas (o con guiones) en vez de «…»; las descripciones de una línea en listas sí pueden cortarse porque la ficha las muestra enteras.

## Mapa de zonas ilustrado (25/11)
- Dibujo del descenso en `src/game/ui/mapArt.ts` (160×150 px, provisional; el definitivo puede ser un PNG del mismo tamaño). `MAP_NODES` y `MAP_BANDS` colocan marcadores y franjas en %. Escala entera según alto; en móvil los marcadores son decorativos y se elige en la lista (44 px).

### Ventana del seguro (Descender)
`InsureModal` (InsurePanels.tsx, clases `.insm*`): columna de casillas + lista de filas conmutables + pie con cifras y botones. La pestaña «Seguro» de los mercaderes conserva su diseño (`InsureTab`).

### Alijo
- Equipo: `CharacterEquip` (Alijo.tsx) mide el arco con ResizeObserver y escala el personaje a entero. Mochila en panel propio.
- Heridas: `BodyPanel full` pinta `BlockBody` (clases `.doll*`), `.body-banner` y `.body-states`; fuera del Alijo se usa la figura con etiquetas. Mochila: `CureBag` (filtro Curación apaga por `data-item`).

### Estación en ruinas
`StationDetail` con nivel 0 devuelve `RuinPanel`: solo nombre, dibujo (flex:1, alto `calc(100vh - 128px)` en escritorio/tableta), fichas `.ruin-req` (ok/bad; la que falta es botón a su fuente, texto en `title`) y «Reconstruir».

### Misiones (diario)
Tres columnas 28/42/30 (`.qj`). Estados por color del borde izquierdo: dorado en progreso, verde completada. Sin historial de entregadas (el juego no lo guarda).
