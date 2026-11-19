# Plan de mejora visual y de usabilidad de los menús y el HUD

Fecha: 19/11/2026 · Estado: plan aprobado. **Fases 0, 1, 2 y 3 hechas** (19/11). Siguiente: maqueta de la fase 4 (HUD de exploración).

Capturas del estado actual en los tres formatos, con los problemas marcados: `mockups/plan-interfaz/index.html`
(carpeta `mockups/plan-interfaz/actual/`, script `mockups/plan-interfaz/capturar.cjs`). En el índice, cada número rojo es un
problema P-xx de la lista del apartado 1; la capa «Revisión automática» marca textos de menos de 12 px, zonas táctiles de menos
de 44 px y textos cortados, medidos en el propio juego. Las pantallas que el script no recorre (pausa, saco de botín, victoria,
mapa de zonas, Tu cuerpo, Copia de seguridad, Guía, Crear y Elegir personaje) se han revisado con las capturas de partida real que
pasó el usuario (`Gravevow_capturas.zip`, 1450×840).

**Regla de trabajo para todas las fases:** maqueta → capturas en 1920×1080, 1180×820 y 844×390 → aprobación del usuario →
implementación → capturas del resultado real. Nada se implementa sin aprobación.

---

## 1. Diagnóstico del estado actual

### 1.1 Lo que ya está bien (no se toca o se toma como referencia)
- **Bastión** (`06-bastion`): ocho retratos grandes a escala entera, marcos finos, poca información. Es la referencia.
- **Misiones y Bestiario** (`10-misiones`, `11-bestiario`): ya pasan a estilo plano (sin degradados, notas de borde fino). Trabajo en curso, sin subir.
- **Botón único de Reconstruir** en las estaciones: cambio hecho en la copia de trabajo, pendiente de aprobar la maqueta `mockups/bastion-boton-unico`.
- **Base de medidas** (`src/config/ui.ts` + bloque «Base de interfaz» de `game.css`): tres formatos, `--touch: 44px`, escalas enteras por formato. Funciona y se mantiene.
- **Zonas táctiles:** la revisión automática no encuentra ningún botón visible de menos de 44×44 px en tableta ni en móvil. Se mantiene la regla.
- **Contraste del texto principal** (pergamino sobre panel: 14:1) y del dorado (9,5:1): correctos.

### 1.2 Problemas encontrados (pantalla, archivo)

| Id | Pantalla | Problema | Archivo |
|---|---|---|---|
| P-01 | Todo el lobby, móvil | La barra de pestañas no cabe en 844 px: «Jugar» queda tapada por el retrato y «Tienda» cortada a la derecha. Rótulos a 11 px. Es el problema más grave de navegación. | `kit/PillBar.tsx`, `Lobby.tsx`, `.ui-pills` en `game.css` |
| P-02 | Todo el juego | **Texto secundario con poco contraste:** `text-stone-400` (#625d69, 2,9:1) se usa 156 veces y `text-stone-500` (#4d4954, 2,1:1) 19 veces. Por debajo de 4,5:1. | 28 archivos de `src/game/ui` |
| P-03 | Todo el juego | **Tres lenguajes de iconos mezclados:** SVG vectoriales con brillo (`ActionIcon`, combate), pixel art por código (`uiIcons.ts`, `stationArt.ts`, objetos en `shared/art.ts`) y emojis o símbolos de texto (🔒 ×7, ✕ ×9, ✓, ★, ⛨, ⚠, 👁, ♥, ◆ ×18, ▲ ×12…). Los emojis dependen del sistema y no son pixel art. | `combatActions.tsx`, `hudIcons.tsx`, `uiIcons.ts`, varios |
| P-04 | Todo el juego | **Valores sueltos:** 309 colores hexadecimales distintos (493 en los `.tsx`), 30 degradados en `game.css` y 8 en componentes; 185 tamaños de letra fijos `text-[Npx]` (68 a 11 px, 18 a 10 px, 1 a 9 px). | `game.css`, `combatZones.ts`, `CombatScreen.tsx`, `Personaje.tsx`… |
| P-05 | Mercader › Tienda | Título «Tienda de Nira» que repite la pestaña activa y el nombre de la columna izquierda. | `screens/Mercaderes.tsx` |
| P-06 | Mercader › Tienda | 36 botones dorados idénticos (uno por objeto): no hay jerarquía; los objetos de otra clase o bloqueados se ven igual de «comprables». | `screens/Mercaderes.tsx`, `VendorsTab.tsx` |
| P-07 | Mercader › Tienda / Vender | El oro sale dos veces: barra superior y pie de la mochila. | `screens/Mercaderes.tsx` |
| P-08 | Mercader › Tienda, móvil | Nombres y datos de objeto por debajo de 12 px; solo caben 4 filas, con mucho hueco por fila. Descripciones cortadas con «…» en escritorio y tableta. | `screens/Mercaderes.tsx` |
| P-09 | HUD de exploración | Saciedad, Hidratación y Descanso abreviadas «Sac», «Hid», «Des» a 10 px. | `DungeonScreen.tsx`, `NeedsBars.tsx` |
| P-10 | HUD de exploración | Inventario y Menú son botones de texto en escritorio y de icono en táctil (dos lenguajes). | `DungeonScreen.tsx` |
| P-11 | HUD de exploración, escritorio | Botín y oro encima en una caja aparte, en la esquina contraria a la vida. | `DungeonScreen.tsx` |
| P-12 | HUD de exploración, móvil | El panel del jugador corta «Guerrero · Nv 45» y las necesidades van a 10 px. | `DungeonScreen.tsx` |
| P-13 | Combate | El nombre del enemigo sale dos veces (tarjeta y título central). | `CombatScreen.tsx` |
| P-14 | Combate, resultados | Los avisos (`Toasts`) se quedan encima del combate y tapan al enemigo en el móvil. | `common.tsx` (`Toasts`), `App.tsx` |
| P-15 | Combate, móvil | La ficha del jugador se monta sobre el sprite del enemigo. | `CombatScreen.tsx` |
| P-16 | Combate | «¿Qué hará Aldric?» ocupa una línea entera de la escena. | `CombatScreen.tsx` |
| P-17 | Resultados | Los avisos de la expedición se apilan sobre la pantalla de resultados. | `common.tsx`, `SummaryScreen.tsx` |
| P-18 | Alijo, inventario de la expedición, almacén | «Agrupar oro» y «Ordenar» están escritos tres veces por separado, con tamaños distintos (`text-xs` a 34 px de alto en ratón, `text-sm` a 44 px) y el de la expedición sin `data-testid`. No es un duplicado funcional (mochila y almacén son destinos distintos), pero sí de código y de aspecto. | `Alijo.tsx` 106-114, `DungeonScreen.tsx` 607-608, `StashPanel.tsx` 59-60 |
| P-19 | Alijo › Heridas | 20-22 textos de menos de 12 px (avisos «En el Bastión no se gastan…» repetidos en cada caja). | `NeedsBars.tsx`, `BodyFigure.tsx` |
| P-20 | Jugar | Los cinco accesos de la derecha (Misiones, Reputación, Bestiario…) con rótulo de 11 px; Apoyar y Discord también a 11 px. | `screens/Jugar.tsx` |
| P-21 | Bestiario, tableta y móvil | «???» y etiquetas a 11 px; la marca «Por derrotar» con texto diminuto. | `BestiaryTab.tsx` |
| P-22 | Ajustes, móvil | 24 textos de menos de 12 px; en el móvil la lista de secciones son iconos-glifo (provisionales). | `Settings.tsx` |
| P-23 | Combate, tableta | Subtítulos de los botones cortados («Mitad de daño», «Tajo desgarrador»). | `CombatScreen.tsx` |
| P-24 | Lobby | Fondo con degradado radial violeta (`Lobby.tsx`) y la barra de XP en violeta: el violeta decora sin significar nada. | `Lobby.tsx` |
| P-25 | Pausa (captura del usuario) | Ventana pequeña centrada con tres botones apilados; «Abandonar» en rojo al mismo nivel que «Continuar»: la acción con consecuencias está a un toque. | `DungeonScreen.tsx` |
| P-26 | Saco de botín (captura del usuario) | Dos cuadrículas de igual peso; no se ve qué es tuyo y qué del saco sin leer el título; «Cogerlo todo» es la acción principal y está en una esquina. | `DungeonScreen.tsx`, `inventory.tsx` |
| P-27 | Copia de seguridad (captura del usuario) | Tres bloques de texto con el mismo peso; el aviso amarillo compite con las dos acciones. | `screens/CopiaSeguridad.tsx` |

Estados: la selección de objeto ya se distingue sin color (doble contorno y brillo, `.slot.selected`), y el riesgo de los errantes
lleva símbolo además de color (`RiskBadge`). **Falta** lo mismo para: pestaña activa (solo cambia el relleno), botón desactivado
(solo opacidad 0,4), objeto equipado en la tienda y receta bloqueada (candado emoji).

---

## 2. Valoración de la propuesta externa

| Punto | Decisión | Motivo |
|---|---|---|
| 1. Bastión como referencia | **Se acepta** | Ya es el estilo de referencia y Misiones y Bestiario lo siguen. |
| 2. Paleta gris neutra (#0A0A0A, #151515, #202020, #3A3A3A, #E4DFD4, #A6A6A6) | **Se cambia: prueba lado a lado antes de decidir.** | El contraste del texto es igual de bueno que el actual (13,7:1 frente a 14:1) y el secundario mejora mucho (7,5:1 frente a 2,9:1 del `stone-400` que más se usa). Pero el gris puro quita el tinte frío-violeta de la piedra, que es parte de la identidad (logo, Bastión, mazmorras). Propuesta: probar **dos variantes** (gris neutro tal cual y «piedra fría»: los mismos valores de luminosidad con un 3-4 % de tinte violeta, p. ej. #0a090c, #151419, #201e25, #3a3841) y elegir con capturas. El borde #3A3A3A sobre #151515 da solo 1,6:1: sirve de adorno, no para marcar estados (ver 3.3). |
| 2. Menos violeta decorativo | **Se acepta** | El violeta queda para lo arcano: maná, mago, XP, objetos mágicos. Fuera del fondo del lobby (P-24). |
| 2. Dorado para monedas, precios y recompensas | **Se cambia** según la indicación del usuario (19/11): el **dorado relleno se mantiene** para el botón principal y la pestaña o elemento activo, **sin abusar**: como máximo un botón dorado relleno por zona de la pantalla. Precios y monedas en texto dorado, no en botón dorado (P-06). |
| 2. Conservar colores de rareza, estado y personajes | **Se acepta** | |
| 2. Pocos degradados, brillos y sombras | **Se acepta** | Ya es la regla en Misiones y Bestiario. Se mantiene la luz cálida detrás de los retratos del Bastión (excepción ya acordada). |
| 3. Quitar texto repetido, manteniendo costes, requisitos, estados y consecuencias | **Se acepta** | Casos concretos: P-05, P-07, P-13, P-19. |
| 3. Familia de iconos pixel art con ayudas | **Se acepta**, con la forma de consultar la ayuda en táctil del juego: mantener pulsado (`HoldTip`, ya usado en Jugar y combate), nunca solo el paso del cursor. |
| 3. Etiquetas cortas en las acciones importantes | **Se acepta** | Ya pasa en combate y Jugar. Donde hay icono sin texto (HUD táctil), el icono lleva rótulo visible en tableta y ayuda al mantener pulsado en el móvil. |
| 3. Unificar controles iguales sobre el mismo contenido | **Se acepta con matiz**: Ordenar mochila y Ordenar almacén **no se unen** (destinos distintos); se unifica su **componente** (P-18). |
| 3. Acción principal, secundarias y con consecuencias | **Se acepta** | Tres niveles de botón (ver 3.2). |
| 3. Estados con algo más que color | **Se acepta** | Ver 3.3. |
| 3. Unificar piezas | **Se acepta** sobre lo que ya existe en `kit/` y `game.css`, sin crear un sistema paralelo. |
| 4. Pantalla piloto: mercaderes | **Se cambia**: el piloto es **el interior del mercader** (Tienda y Vender), no la rejilla del Bastión (ver apartado 4). |
| 4. Orden por módulos | **Se acepta con cambios**: antes de todo, la comparación de paleta; y la barra de pestañas del móvil (P-01) se adelanta porque es un fallo, no una mejora. |
| 5. No tocar mecánicas, economía, guardados ni inventario | **Se acepta** | Lo que lo roce va aparte (apartado 7). |
| Lo que no trae | **Se añade** | Móvil horizontal, táctil, tutoriales, contraste medido, rendimiento, arte nuevo y la tipografía (que **no cambia**: Cinzel, Crimson Pro y Grenze se quedan; solo se tocan tamaños, espaciado e interlineado). |

---

## 3. Base común

### 3.1 Variables (dónde y cómo)
No hace falta un archivo nuevo de variables: ya hay dos sitios y se usan los dos.
- **`src/shared/theme.css` (`@theme`)**: colores con nombre de uso, además de los actuales. Tailwind genera las clases solas
  (`bg-surface`, `text-muted`…), así que los componentes no llevan hexadecimales.
  - `--color-bg`, `--color-surface`, `--color-surface-hi` (pasar el cursor), `--color-line`, `--color-line-strong`
  - `--color-text`, `--color-text-muted` (sustituye a `stone-300/400` en texto), `--color-text-off` (desactivado, ≥ 4,5:1)
  - `--color-accent` = dorado actual; `--color-danger`; `--color-ok`
  - Rarezas, estados, personajes y recursos (vida, ímpetu, maná, XP): se pasan a variables con su nombre, sin cambiar su valor.
- **`src/game/game.css`, bloque «Base de interfaz»**: medidas (ya están), más `--radius: 0`, `--bw: 2px` (borde), `--focus` y los tres
  niveles de botón. **Un único archivo nuevo opcional**: `src/game/ui/kit/tokens.ts` solo si el código de combate (`combatZones.ts`,
  148 colores) o del lienzo necesita los mismos colores en JavaScript; si no, no se crea.
- La paleta se cambia en un solo sitio: si se aprueba la variante X, se cambian los valores de `theme.css` y todo lo que ya use
  variables cambia a la vez. Por eso la fase 1 primero **sustituye valores sueltos por variables sin cambiar el aspecto**.

### 3.2 Botones (tres niveles y uno de peligro)
| Nivel | Uso | Aspecto | Clase |
|---|---|---|---|
| Principal | La acción de la pantalla o zona (Descender, Comprar en la ficha, Cobrar, Reconstruir, Extraer) | **Dorado relleno** (el actual `.btn-gold`, ahora plano), texto oscuro | `.btn-primary` |
| Secundario | Acciones normales (Ordenar, Agrupar oro, Volver) | Superficie con borde, texto claro | `.btn` |
| Discreto | Navegación y ayudas (Saltar, ◂ Atrás, ?) | Sin fondo, solo texto o icono, borde al pasar o enfocar | `.btn-ghost` |
| Con consecuencias | Abandonar, Traicionar, Destruir, Vender raro | Borde y texto rojos (no relleno), siempre con confirmación o pulsación larga como ya hacen Destruir y Vender | `.btn-danger` |

Regla del dorado (pedida por el usuario): **un dorado relleno por zona**. Pestaña activa en dorado (como hoy en las pestañas del mercader).

### 3.3 Estados (todos con una señal además del color)
| Estado | Señal |
|---|---|
| Foco (teclado) | Contorno de 2 px separado 2 px (`--focus`). Ya existe en `.btn:focus-visible`; se lleva a pestañas, casillas y tarjetas. |
| Pasar el cursor | Superficie un tono más clara (`--color-surface-hi`). Solo ratón (`@media (hover: hover)`). |
| Pulsado | Baja 1 px (ya existe). |
| Elegido / pestaña activa | Relleno dorado **y** rombo ◆ o barra inferior de 3 px. |
| Equipado | Marca «E» o escudo en la esquina de la casilla (icono pixel), además del borde. |
| Desactivado / bloqueado | Texto `--color-text-off` (≥ 4,5:1, no opacidad 0,4) **y** candado pixel; motivo en una línea o en la ayuda («Nv 34», «De confianza»). |
| Mejor que lo puesto | ▲ verde (ya existe, `.slot-up`); se pasa a icono pixel. |

### 3.4 Componentes (lo que hay y lo que se añade)
Se amplía `src/game/ui/kit` en lugar de crear otra carpeta:
- **Existen y se reutilizan:** `Panel`, `PillBar`, `SubHead`, `Segmented`, `Drawer`, `Card`, `QtyPicker`, `ItemSlot`/`GridView`, `ItemCard`, `HoldTip` (hoy dentro de `Jugar.tsx`).
- **Se añaden:**
  - `IconButton`: icono pixel + rótulo opcional, 44 px mínimo, ayuda con `HoldTip`. Sustituye los botones de icono sueltos (HUD, lobby, ajustes).
  - `ContainerTools`: «Agrupar oro» + «Ordenar» de un contenedor (`target: 'backpack' | 'stash'`), un único componente para P-18. Mantiene los `data-testid` actuales.
  - `PriceTag`: moneda pixel + cantidad, en dorado si llega el oro y en `text-off` con «falta N» si no.
  - `Hint`: ayuda unificada (pasar el cursor en ratón, mantener pulsado en táctil). Se saca `HoldTip` de `Jugar.tsx` al kit.
  - `Toasts` con zonas: arriba en el centro en la mazmorra, ocultos durante combate y resultados (se guardan y se ven después).

### 3.5 Familia de iconos
**Medidas:** base de **12×12 px** para iconos de interfaz pequeños (se ven ×2 = 24 px o ×3 = 36 px) y **16×16 px** para pestañas,
acciones de combate y HUD (×2 = 32 px dentro de un botón de 44). Objetos: 32×32 como hoy. Retratos y estaciones: 20×26 como hoy.
**Estilo:** contorno exterior de 1 px en #07060a, luz arriba a la izquierda, máximo 4 tonos por icono sacados de la paleta del juego,
sin suavizado, siempre a escala entera (`image-rendering: pixelated`, tamaño = base × entero, posición en píxel entero).

Inventario de lo que hay:
| Familia | Dónde | Tamaño base | Técnica | Estado |
|---|---|---|---|---|
| Objetos (33 + oro y mochilas) | `shared/art.ts` (`ICONS`) | 32×32 | código | provisional, ver `docs/ASSETS.md` |
| Mercaderes, intendente, estaciones (+ ruinas) | `shared/art.ts`, `stationArt.ts` | 20×26 | código | provisional |
| XP, reputación, repetible, clavo, chincheta, candado, corona, calavera, libro, sombra | `uiIcons.ts` | 5×5 a 16×4 (9×9 la mayoría) | código | provisional, ya en la familia |
| Mochila y menú del HUD táctil | `hudIcons.tsx` | 12×12 | SVG de rejilla | provisional |
| Acciones de combate (ataque, especial, clase, mochila, huir, guardia, efectos) | `combatActions.tsx` (`ActionIcon`) | 24 vector | **SVG con brillo** | fuera de la familia |
| Engranaje, pantalla completa | `Lobby.tsx`, `FullscreenButton.tsx` | SVG | vector | fuera de la familia |
| Secciones de Ajustes | `Settings.tsx` | glifos | texto | fuera de la familia |
| Estados y avisos | varios | emoji/símbolo | texto | fuera de la familia (🔒 ✕ ✓ ★ ⚠ 👁 ♥ ⛨ ⛓ ☠) |

**Se pueden hacer ya por código** (con `draw()` de `uiIcons.ts`, provisionales hasta que dibujes los definitivos): candado (existe),
✓, ✕, ⚠, ▲ mejora, ▼ peor, ◆ rombo, «!» aviso, moneda pequeña, equipado, ojo (te vio traicionar), corazón/vida, gota/hidratación,
pan/saciedad, luna/descanso, flechas ◂ ▸. Son formas simples de 9×9 a 12×12.

**Necesitan arte tuyo** (ver apartado 6): los siete de las pestañas, las acciones de combate y los iconos de Ajustes.

---

## 4. Pantalla piloto: el interior del mercader (Tienda y Vender)

Se descarta el Bastión porque ya es la referencia. Opciones valoradas:
- **Alijo**: es la pantalla con más piezas comunes, pero la bienvenida (11 pasos) apunta a 6 elementos suyos; un piloto que puede cambiar varias veces la haría tocar una y otra vez. Va en la fase 3, con la base ya probada.
- **HUD**: es el de más impacto en partida, pero el más arriesgado (lienzo de Phaser, 14 mini tutoriales y el tutorial inicial apuntan a él) y su diseño en el móvil es un problema propio. Va después.
- **Interior del mercader (elegida):**
  1. Es la pantalla que se abre desde la referencia: si queda bien, el salto Bastión → mercader se ve coherente al momento.
  2. Reúne casi todas las piezas comunes: pestañas, lista de objetos, casillas, ficha, mochila, precios, botón principal, estados (bloqueado, otra clase, no llega el oro) y la zona de venta.
  3. Tiene los problemas más visibles (P-05 a P-08) y es justo el ejemplo que marcaste del dorado.
  4. Riesgo bajo con los tutoriales: los `vendor.*` solo resaltan las pestañas (`vendor-view-*`), que no cambian de `data-testid`.
  5. Lo que salga (lista, `PriceTag`, `ContainerTools`, mochila lateral) se reutiliza directamente en Alijo y en la expedición.

---

## 5. Fases

Cada fase: maqueta y capturas en `mockups/<fase>/` con índice y antes/después → aprobación → implementación → capturas reales →
`docs/estado-trabajo.md` y `docs/guia-interfaz.md` actualizados → línea «Tutoriales: …». Colores planos, 44 px, escala entera.
Ningún `data-testid` cambia de nombre; si un elemento resaltado por un tutorial cambia de sitio, el texto del paso se revisa
y se comprueba con `tests/tutorials.test.ts` y el e2e correspondiente.

### Fase 0 · Comparación de paleta (pequeña)
- **Qué:** solo maqueta. Tres versiones de las mismas 4 pantallas (Bastión, Tienda de Nira, Alijo, combate): actual, gris neutro de la propuesta y «piedra fría». Se inyecta la paleta por CSS sobre el juego real, sin tocar código.
- **Medición:** tabla de contraste de cada combinación (texto, secundario, desactivado, borde, dorado, rojo).
- **Archivos:** ninguno del juego. `mockups/paleta/` (script de captura con estilos inyectados).
- **Tutoriales:** sin cambios. **Riesgo:** ninguno.
- **Capturas:** 4 pantallas × 3 paletas × 3 formatos, en una página para comparar.
- **Decisión tuya:** paleta, y tono del texto desactivado.

### Fase 1 · Base común y barra del móvil (media) — HECHA el 19/11
Hecho: paleta, paneles y botones planos, niveles de botón, desactivado legible, pestañas con icono (también tableta: icono encima del nombre). Queda para las fases siguientes: `IconButton`, `ContainerTools`, `PriceTag`, `Hint` y los iconos de estado en pixel art (se crean al usarlos en la fase 2), y pasar los colores sueltos de los componentes a variables pantalla a pantalla.

- **Qué:**
  1. Variables de 3.1 en `theme.css` y `game.css` con los valores **actuales** (sin cambio visual) y sustitución de `text-stone-400/500` de texto por `text-muted`/`text-off` (aquí sí cambia: P-02, mejora de contraste).
  2. Botones de 3.2 y estados de 3.3 en `game.css`, quitando degradados de `.btn`, `.btn-gold`, `.panel`.
  3. Componentes `IconButton`, `ContainerTools`, `PriceTag`, `Hint` en `kit/`.
  4. **P-01:** la barra de pestañas en el móvil pasa a icono + rótulo corto en dos líneas o a iconos con el rótulo solo en la activa (dos opciones en la maqueta), sin desplazamiento horizontal. Mientras no haya iconos tuyos, rótulos cortos y letra a 12 px con menos espaciado.
  5. Iconos de estado hechos por código (lista de 3.5) en `uiIcons.ts`; fuera los emojis.
- **Archivos:** `theme.css`, `game.css`, `kit/*`, `PillBar.tsx`, `Lobby.tsx`, `uiIcons.ts` y los 28 archivos con `text-stone-400/500` (cambio mecánico de clase).
- **Tutoriales:** `bienvenida` (resalta `lobby-nav` y varias `tab-*`): mismos ids; si en el móvil los rótulos pasan a icono, se revisa el texto del paso que nombra las pestañas. Los «!» de pestaña (`tut-dot-tab-*`) deben seguir viéndose sobre el icono.
- **Riesgos:** cambio de color en muchos sitios a la vez → capturas de todas las pestañas con `menus-check` antes y después. Sin efecto en guardados.
- **Capturas:** las 19 pantallas del índice (antes/después) y la barra en el móvil con las dos opciones.

### Fase 2 · Piloto: interior del mercader (media) — HECHA el 19/11
- **Hecho:** filas de tienda que se tocan + ficha con un solo «Comprar · N oro» dorado (móvil: ficha encima con Cerrar; escritorio: doble clic compra). Columna izquierda = tarjeta del Bastión (nombre, busto, lugar, estación, reputación, sin frase) + pestañas en columna con icono pixel art (`VENDOR_TAB_ICONS`) en los tres formatos + tarjeta «◂ Volver al Bastión» con la muralla (`BASTION_SKYLINE`); en el móvil, botón normal. Sin títulos de panel. Mochila con carga, sin oro. Maqueta y capturas: `mockups/fase2-mercader/`.
- **Qué:**
  - Fuera el título «Tienda de N» (P-05); el nombre del mercader queda solo en la columna izquierda.
  - Lista de la tienda: fila = icono 32 (×1 o ×2) + nombre + datos, precio con `PriceTag` en texto dorado (P-06). Tocar la fila abre la ficha (`ItemCard`) con **un** botón dorado «Comprar · N oro». En escritorio, doble clic compra directamente (como hoy el botón). Los de otra clase o bloqueados: atenuados con candado y motivo, sin botón.
  - Oro solo en la barra superior (P-07); en la mochila, la carga.
  - Móvil (P-08): filas de 52 px con texto a 13-14 px, dos columnas de lista; la ficha a pantalla completa (como `QuestDetailOverlay`).
  - Vender: misma lista, «Vender N objetos · X oro» es el único dorado.
- **Archivos:** `screens/Mercaderes.tsx`, `VendorsTab.tsx`, `screens/ItemCard.tsx`, `kit/*`.
- **Tutoriales:** `vendor.nira` y demás `vendor.*` (resaltan `vendor-view-*`): sin cambios de destino. `bastion.first-sale` (sin resaltado): revisar texto si menciona el botón de precio. `screen.bastion-entry` resalta `vendor-nira`: sin cambios.
- **Riesgos:** comprar pasa de un toque a dos en táctil → se mide en la maqueta; si molesta, se deja el botón de precio pero en estilo secundario y solo el de la fila elegida en dorado. Economía y precios sin cambios.
- **Capturas:** Tienda, Vender, Reparar y Curtiduría de Nira en los tres formatos, antes/después.

### Fase 3 · Inventario (grande) — HECHA el 19/11
- **Hecho:** la ficha del objeto nunca tapa la mochila. Móvil: pestañas Equipo/Almacén/Heridas en columna de iconos a la izquierda (`seg-*` iguales) y ficha fija a la derecha, apilada (icono, texto, botones; `ItemCard stacked`); en Almacén la ficha ocupa el sitio de la mochila (✕ la devuelve). Tableta: la ficha ocupa la columna del Aventurero. Inventario de la expedición y saco de botín en tableta y móvil: pantalla completa en tres columnas (saco: «Del saco» | «Tuyo» | acciones con «Cogerlo todo» dorado abajo). Necesidades con nombre completo a 12 px (P-09) y un solo aviso «En el Bastión no se gastan» al pie (P-19). Pendiente: `ContainerTools` común (P-18) e icono de «equipado». Maqueta y capturas: `mockups/fase3-inventario/`.
- **Pantallas:** Alijo › Equipo, Almacén y Heridas; inventario de la expedición; saco de botín; ficha del objeto.
- **Qué:** `ContainerTools` en los tres sitios (P-18); estado «equipado» con icono; saco de botín con «Tuyo / Del saco» y «Cogerlo todo» como principal abajo (P-26); avisos repetidos de Heridas en una sola línea al pie (P-19); necesidades con nombre completo e icono (P-09).
- **Archivos:** `screens/Alijo.tsx`, `StashPanel.tsx`, `inventory.tsx`, `DungeonScreen.tsx` (modal de inventario y saco), `NeedsBars.tsx`, `BodyFigure.tsx`, `screens/ItemCard.tsx`.
- **Tutoriales afectados:** `bienvenida` (`alijo-backpack`, `group-gold-backpack`, `alijo-pocket`, `empty-backpack`), `tab.intendencia` (`intendencia-status`, `body-quick`), `exp.backpack-full`, `exp.need-low` (`hud-needs`, `btn-inventory`), `exp.armor-broken`, `unlock.stash-page` (`stash-pages`), `unlock.shared-page`, el paso `eat` del tutorial inicial (`act-eat`). Se mantienen los ids; se revisa que cada uno siga visible en los tres formatos con `e2e-bienvenida`, `e2e-exp-minis` y `e2e-tutorial`.
- **Riesgos:** arrastrar y soltar (`pointerDrag`) depende de `data-drop` en las casillas: no se tocan. Reglas de inventario sin cambios.
- **Capturas:** las 4 vistas del Alijo, inventario y saco en la mazmorra, ficha de objeto; tres formatos.

### Fase 4 · HUD de exploración (grande)
- **Qué:**
  - Un solo bloque del jugador arriba a la izquierda: retrato, vida, recurso, necesidades con icono (P-09) y debajo botín y oro encima (P-11). Fuera la caja de abajo.
  - Arriba a la derecha, `IconButton` para Inventario, Menú y pantalla completa en **todos** los formatos (P-10); en escritorio con la tecla en una línea pequeña debajo («I», «Esc»).
  - Pausa: «Continuar» dorado, «Ajustes» secundario y «Abandonar» rojo separado y con confirmación (P-25).
- **Móvil horizontal (844×390):** la escena tiene que verse.
  - Arriba a la izquierda, tira compacta de 40 px de alto: retrato 24 px, vida y recurso en dos barras finas con número, necesidades como tres puntos de color con icono que se abren al tocar (P-12). Nada de texto de clase y nivel (está en el retrato al tocarlo).
  - Arriba en el centro, el reloj solo (la sala, al tocar el reloj o 3 s al entrar en una sala nueva).
  - Arriba a la derecha, tres iconos de 44 px.
  - Abajo, joystick a la izquierda y Usar/Poción a la derecha, como hoy.
  - Aliado: icono de 44 px con su vida bajo la tira del jugador; la tarjeta completa al tocarlo.
- **Tableta:** como el escritorio, con iconos de 44 px y rótulo visible.
- **Archivos:** `DungeonScreen.tsx`, `TouchControls.tsx`, `NeedsBars.tsx`, `hudIcons.tsx`.
- **Tutoriales afectados:** `exp.clock` (`hud-timer`), `exp.vital-wound`, `exp.fracture`, `exp.bleeding` (`hud-body`), `exp.backpack-full` (`hud-player`, `btn-inventory`), `exp.need-low` (`hud-needs`), `exp.merc-triangle` y `exp.kael` (`risk-badge`), `exp.subzone.*` ×9 (`hud-room`: **si la sala se oculta en el móvil, el tutorial debe forzar que se vea**), tutorial inicial completo (`core/data/tutorial.ts`). Los ids no cambian; `hud-body` y `hud-room` tienen que existir y verse cuando el tutorial los señale.
- **Riesgos:** solo DOM encima del lienzo; Phaser no cambia. Menos paneles con sombra y degradado = menos coste de pintado.
- **Capturas:** exploración, con aliado, con aviso de canalización, pausa, en los tres formatos.

### Fase 5 · Combate (grande)
- **Qué:** nombre del enemigo una sola vez (en su tarjeta; el título central solo dice la zona) (P-13); «¿Qué hará Aldric?» pasa al registro (P-16); avisos fuera del combate (P-14, con el `Toasts` por zonas); subtítulos sin cortar (P-23); iconos de acción en pixel art (cuando estén).
- **Móvil horizontal:** la escena ocupa los 230 px de arriba; el enemigo a la derecha y el jugador a la izquierda **sin fichas encima** (P-15): las dos fichas pasan a dos tiras finas pegadas arriba (enemigo a la derecha, jugador a la izquierda) con nombre, vida y recurso; el cuerpo y las heridas al tocar la tira. La barra de acciones 2×2 + 3 se queda (ya funciona bien en 844 px).
- **Archivos:** `CombatScreen.tsx`, `combatActions.tsx`, `common.tsx` (`Toasts`).
- **Tutoriales:** `combat.class-skill` (`act-class`), `exp.elite`, `exp.boss` (sin resaltado), paso de combate del tutorial inicial. Mismos ids.
- **Riesgos:** ninguno en reglas; las animaciones del combate no se tocan.
- **Capturas:** combate normal, especial, mochila, élite y jefe; tres formatos.

### Fase 6 · Menús, fichas, resultados y ajustes (media)
- **Pantallas:** Jugar (P-20), Habilidades, Bestiario (P-21, solo tamaños), Tienda de atuendos, Resultados (P-17), Copia de seguridad (P-27), Elegir y Crear personaje, Ajustes (P-22) y menú principal (solo revisión).
- **Qué:** tamaños mínimos de 12 px en el móvil donde la revisión los marca, aplicando el piloto (botones, estados, iconos); avisos fuera de resultados.
- **Tutoriales:** `tab.personaje` (`skill-arc`, `character-panels`), `tab.bestiario`, `tab.tienda`, `screen.backup`, `screen.select`, `screen.settings` (`settings-nav`, `settings-tab-game`), `bastion.first-death` (`cure-btn`), `unlock.class-skill`. Mismos ids.
- **Capturas:** todas las pantallas citadas, tres formatos.

### Fase 7 · Revisión del conjunto (pequeña)
- Repetir `mockups/plan-interfaz/capturar.cjs` y comparar con `actual/`: 0 textos de menos de 12 px en el móvil (salvo los marcados como aceptados), 0 zonas táctiles de menos de 44 px, 0 degradados fuera de las excepciones, y todas las pruebas (`menus-check`, `bastion-check`, `e2e-*`, `tests/tutorials.test.ts`).
- Pasar la guía de estilo final a `docs/guia-interfaz.md`.

Orden y dependencias: 0 → 1 → 2 → (3, 4 y 5 en ese orden; 3 antes de 4 porque el inventario de la expedición es el mismo componente) → 6 → 7.

### Nota del usuario (19/11): menús horizontales a los laterales en móvil y tableta
En el móvil y la tableta, los menús horizontales secundarios pasan a una **columna vertical en el lateral** para ganar alto útil
(la barra superior de pestañas principal se queda arriba). Casos: páginas del almacén (1, 2, candados), Equipo · Almacén · Heridas
(`Segmented` del Alijo), pestañas del mercader (`vtabs`) y Ataques · Clase de Habilidades. Botones de 44 px como mínimo,
con icono y nombre corto (o solo número en las páginas). Se diseña en la maqueta de la fase que toque cada pantalla:
fase 2 (pestañas del mercader) y fase 3 (Alijo y almacén); Habilidades en la fase 6. Mismos `data-testid`
(`seg-*`, `vendor-view-*`, `stash-pages`): los tutoriales que los resaltan (`vendor.*`, `tab.intendencia`, `unlock.stash-page`,
`unlock.shared-page`, `bienvenida`) siguen funcionando; se revisa que el resaltado se vea bien en el lateral.

---

## 6. Arte nuevo que haría falta (para el usuario)

Todo en pixel art, contorno de 1 px #07060a, luz arriba a la izquierda, máximo 4 tonos de la paleta, PNG con transparencia.
Hasta que lleguen se usan marcadores dibujados por código.

| Prioridad | Qué | Cuántos | Medida base | Dónde se ve |
|---|---|---|---|---|
| Alta | Pestañas: Jugar, Habilidades, Alijo, Bastión, Misiones, Bestiario, Tienda | 7 | 16×16 | Barra superior (×2), sobre todo en el móvil (P-01) |
| Alta | Acciones de combate: Atacar, Ataque especial, Habilidad de clase, Mochila, Huir, Guardia | 6 | 16×16 | Barra de combate, Habilidades |
| Alta | HUD: Inventario (mochila), Menú, Pantalla completa, Usar/Interactuar | 4 | 16×16 | HUD de la mazmorra, lobby |
| Media | Necesidades: Saciedad, Hidratación, Descanso | 3 | 12×12 | HUD, Alijo › Heridas |
| Media | Ajustes: Sonido, Pantalla, Controles, Partida, Comunidad, Información y el engranaje | 7 | 16×16 | Ajustes (ya listado en `docs/ASSETS.md`) |
| Media | Recursos: Vida, Ímpetu, Maná, XP (sustituye la chispa provisional), Oro (moneda pequeña) | 5 | 12×12 | Barras, precios |
| Baja | Estados: Equipado, Mejor, Peor, Bloqueado, Aviso, Hecho, Cerrar | 7 | 12×12 | Casillas, listas, ventanas (hay versión por código mientras tanto) |
| Baja | Marco de casilla y esquinas de panel en pixel art (opcional) | 1 juego | 12×12 por esquina | Si se quiere sustituir el borde CSS por un marco dibujado |

Los iconos de objetos, mercaderes y estaciones ya están en `docs/ASSETS.md` y no cambian de medida.

---

## 7. Cambios que tocarían mecánicas (aparte, no entran en las fases)

Ninguna fase los necesita. Se apuntan por si interesan; cada uno pide su propia decisión:
1. **Agrupar el oro automáticamente** al recogerlo, en lugar del botón «Agrupar oro». Quitaría un control, pero cambia el comportamiento del inventario (cuántas casillas ocupa el oro) y la gestión del bolsillo seguro.
2. **Ordenar al cerrar** la mochila. Cambia dónde quedan los objetos y podría molestar a quien coloca las cosas a mano.
3. **Ocultar en la tienda los objetos de otra clase** en vez de atenuarlos. Es solo de presentación, pero cambia lo que el jugador puede comprar para otros personajes (con el almacén compartido): se deja atenuado salvo que decidas lo contrario.
4. **Comprar con un solo toque** en el móvil sin ficha previa: es el comportamiento actual; si la fase 2 pasa a dos toques, cambia el ritmo de compra (no la economía).

---

## 8. Contraste: actual frente a propuesta

Ratios WCAG medidos (mínimo 4,5:1 para texto normal y 3:1 para texto grande y piezas de interfaz):

| Combinación | Actual | Propuesta (gris neutro) |
|---|---|---|
| Texto principal sobre panel | 14,0 (#e9e1cc / #16141b) | 13,7 (#e4dfd4 / #151515) |
| Texto sobre superficie al pasar el cursor | — | 12,3 (/ #202020) |
| Texto secundario | 5,2 (`stone-300`) · **2,9** (`stone-400`, 156 usos) · **2,1** (`stone-500`) | 7,5 (#a6a6a6) · 6,7 sobre #202020 |
| Desactivado (opacidad 0,4) | **3,2** | **3,2** → se propone color fijo #808080: 4,6 |
| Borde sobre panel | 1,6 (#3a3741) | 1,6 (#3a3a3a) · 1,7 sobre el fondo |
| Dorado | 9,5 | 9,5 |
| Rojo de peligro (#c4283b) | **3,2** | **3,2** → texto rojo sobre oscuro solo en letra grande o en negrita; para texto pequeño, un rojo más claro (#ff6a5a, que ya existe en `.btn-danger`: 6,5) |

Conclusión: el cambio de mayor efecto en legibilidad no es la paleta, sino **retirar `stone-400` y `stone-500` del texto** (fase 1),
que vale con cualquiera de las dos paletas.

## 9. Rendimiento, guardados y riesgos

- **Rendimiento:** variables CSS y menos degradados y sombras abaratan el pintado (hoy 25-37 elementos con degradado por pantalla en el Bastión y el combate). Los iconos por código ya usan caché (`uiIcons.ts`). El lienzo de Phaser no se toca. Riesgo: en el HUD, evitar animaciones nuevas en elementos que se repintan cada fotograma.
- **Guardados y partidas en curso:** ningún cambio toca `profile`, `account` ni `expedition`. No se renombran pestañas internas (`character`, `stash`), ids de tutoriales (se guardan como vistos en `account.tutorials.seen`) ni `data-testid`. Si en algún momento hiciera falta guardar una preferencia nueva (p. ej. «iconos con rótulo»), iría como campo opcional con valor por defecto, sin migración.
- **Pruebas:** cada fase pasa `tsc`, los tests de tutoriales y los scripts de su zona; la fase 1 además `menus-check` en los tres formatos.

## 10. Decisiones

Respuestas del usuario (19/11): se comparan las dos paletas; pestañas con icono y nombre solo en la activa (móvil); comprar = tocar el objeto y pulsar «Comprar» en su ficha; los iconos los hace Claude siguiendo la línea de Apoyar y Discord (siluetas de un color, 12×12, `community.tsx`); piloto = interior del mercader. Maqueta con las tres cosas: `mockups/propuesta-paleta/index.html`. **Paleta elegida: piedra fría** (fondo #0a090c, paneles #151419, al pasar #201e25, bordes #3a3841, texto #e6e0d2, secundario #a7a4ae, desactivado #82808a).

Preguntas iniciales:
1. **Paleta:** ¿probamos las dos variantes (gris neutro y piedra fría) o solo la de la propuesta?
2. **Barra de pestañas en el móvil (P-01):** ¿iconos con rótulo solo en la activa, o rótulos cortos en dos líneas? (Las dos irán en la maqueta de la fase 1.)
3. **Compra en la tienda:** ¿tocar fila → ficha → «Comprar» (dos toques, un solo dorado) o mantener el botón de precio en cada fila pero en estilo secundario?
4. **Arte:** ¿dibujas tú los iconos de la tabla 6 (al menos los 7 de pestañas antes de la fase 1) o avanzamos con marcadores por código?
5. **Piloto:** ¿de acuerdo con el interior del mercader en lugar del Alijo o el HUD?
