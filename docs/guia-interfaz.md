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

## Mercenarios errantes y tutorial

- Triángulo de riesgo: `RiskBadge` (`DungeonScreen.tsx`), con color y símbolo (✓, !, !!, ☠, ⚔) para que se distinga sin color.
  En el mapa, texturas `risk_*` (`textures.ts`). Valores en `config/wanderers.ts`.
- Tutorial: el cartel `TutorialGuide` lee el paso de `core/data/tutorial.ts` y elige el texto de ratón o de toque con `useIsTouch`.
  Para resaltar un botón, el paso apunta a su `data-testid` (`target: { ui: '...' }`) y recibe la clase `.tut-pulse`;
  para señalar algo del mapa, `target: { tile: [x, y] }` y la escena pone la flecha.

## Barra de combate (distribución D)
- **Barra normal (2×2)**: Atacar (tecla 1) · Ataque especial (2) / Habilidad de clase (3) · Mochila (4) y Huir (5) a media anchura.
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

## Personaje: ataques y habilidad de clase (opción A, 4/11)
- `src/game/ui/screens/Personaje.tsx`. Escritorio y tableta: Atributos a la izquierda · héroe con sus rombos en el centro ·
  a la derecha `Segmented full` con dos pestañas del mismo ancho, «Ataques» y «Habilidad de clase», cada una a toda altura
  (nada de dos paneles apretados con scroll propio). Móvil: héroe a la izquierda y pestañas Atributos · Ataques · Habilidad
  (se abre en Atributos). Con un hito por elegir, la pestaña lleva ◆.
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
- Secciones: Sonido (general, música y efectos, y música ambiental), Pantalla (pantalla completa o, en iPhone, cómo instalar), Controles (teclado de mazmorra y combate, y táctil; primero lo del dispositivo), Partida (botón a la Copia de seguridad, Elegir personaje y Repetir el tutorial; en la mazmorra solo avisos), Comunidad e Información (versión, legales y `MailButton`).
- Escritorio y tableta: lista de secciones de 200 px a la izquierda. Móvil (alto ≤ 520): dos columnas de iconos de 44 px y el nombre de la sección en la cabecera.
- Pie fijo con «Cerrar» y «Salir al título» (este, solo en el Bastión). Esc cierra el panel; en el Bastión, Esc lo abre si no hay otra ventana (`data-modal`).
- La sección abierta y los volúmenes se guardan en la cuenta (`Settings.settingsTab`, `musicVolume`, `sfxVolume`); el audio tiene un bus de música y otro de efectos bajo el general (`setAudio`).
- El punto verde (copia de seguridad recomendada, `backup.remind`) sale en el engranaje y en Partida.
- Si un control cambia, actualiza las tablas `KEYS_DUNGEON`, `KEYS_COMBAT` y `GESTURES`.
- Prueba: `node scripts/ajustes-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Bastión: entrada, Mercaderes y Refugio (12/11)
- La pestaña «Bastión» abre una **entrada** con dos tarjetas grandes (`kit/Card`, arte a doble escala en escritorio y tableta, a escala normal en móvil): **Mercaderes** (retrato de Garth) y **Refugio** (marcador pixel art). Cada una lleva una línea de qué es, lo pendiente en verde y el número del arco (encargos listos; estaciones listas para pedir + recepción).
- **Mercaderes:** la pantalla de siempre, sin catre ni «Tu Refugio»; «◂ Bastión» arriba a la derecha. Los mercaderes ya no tienen «Encargos del Refugio»: todo lo de las estaciones vive en el Refugio (su servicio de fabricación sigue: Cocina de Garth, Forja de Brand…).
- **Refugio:** tarjetas de estación con el formato de los mercaderes, en filas de 4 (3 en tabletas estrechas; 4 compactas en móvil horizontal, con desplazamiento vertical). Cabecera: Preparación, «Recepción (N)» (abre un panel) y «◂ Bastión».
- **Tarjeta de estación** (`StationTile`): nombre · arte 20 × 26 px en el arco (oscurecido y con candado si está bloqueada) · «Nivel N/3», «Nivel 3/3 · máximo» o «Bloqueada» · «Encargado: X» · para qué sirve (no en móvil) · tres marcas de nivel en el sitio de la reputación · botón principal («Pedir a X», «Usar», «Usar · Dormir» en el Catre) · «Detalles». Marcas en el arco, abajo para que el borde redondo no las corte: «▲ Mejora» (mejora posible con lo que tienes) y «!» (bloqueada que ya puedes pedir).
- **Detalle** (`StationDetail`): la tarjeta a la izquierda; a la derecha el encargado con su retrato, para qué sirve, la alternativa mientras está bloqueada, los tres niveles con su beneficio (el actual marcado), el coste con lo que tienes y lo que falta, «Ir» a dónde conseguirlo y «Pedir a X que la construya / mejore». En la Cocina, además, comer platos para bajar preparado. «◂ Refugio» a la izquierda y «◂ Bastión» a la derecha.
- **Estaciones visibles:** las 7 siempre. Las que no has pedido salen oscurecidas, con candado y «Pedir a X»; el «!» verde avisa cuando ya tienes lo necesario.
- Prueba: `node scripts/bastion-check.cjs <url>/play/ <carpeta> [dispositivo]`.
