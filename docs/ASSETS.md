# Recursos provisionales a sustituir

Todo el arte y el audio de la v0.1 se **genera por código**: es original, no tiene problemas de licencia y no depende de archivos externos. Es coherente, pero es provisional.

| Recurso | Dónde se genera | Sustituir por |
|---|---|---|
| Personajes (4 clases, rival), esqueleto, jefe, murciélago | `src/shared/art.ts` → `drawHumanoid`, `drawBat` | Hojas de sprites con animaciones idle, caminar (4 direcciones isométricas), atacar, recibir daño, morir y lanzar hechizo |
| Suelos, muros, puerta, pilar, trampa | `drawFloor`, `drawWall`, `drawDoor`, `drawPillar`, `drawTrap` | Tileset isométrico 32×16 (o 64×32 con zoom ajustado) |
| Cofres, antorchas, decoración, portal, bolsa | `drawChest`, `drawTorch`, `drawDecor`, `drawPortal`, `drawBag` | Sprites animados |
| Iconos de objetos (33) | `drawIcon` + tabla `ICONS` | Iconos 32×32 por objeto |
| Efectos de combate | CSS en `src/game/game.css` (proyectiles, sacudidas, números) | Partículas y animaciones dibujadas |
| Efectos de sonido (20) | `src/game/audio.ts` (WebAudio sintetizado) | Archivos OGG/MP3 con licencia comercial |
| Música (lobby y mazmorra) | `startMusic` en `src/game/audio.ts` (drones) | Pistas ambientales en bucle |
| Tipografías | `@fontsource` (Cinzel, Crimson Pro, Pixelify Sans: licencia OFL, empaquetadas en el proyecto) | Se pueden mantener |

Para sustituir un sprite basta con cargar la imagen en `src/game/engine/textures.ts` con la **misma clave** de textura (p. ej. `hero0`…`hero3`, `wall0`, `chest_common_open`).

## Aspecto del personaje (provisionales por código, para diseñar · 13/11)
Todo sobre el lienzo del cuerpo, de 20 × 26 px, alineado con él. Pelo, barba y capa se pintan en grises (base `#808080`, luz `#A0A0A0`, sombra `#5A5A5A`) y el juego los recolorea. La piel de la cara va en `#FF00FF` (luz) y `#B000B0` (sombra), como en los atuendos. Cada pieza es una hoja de 140 × 26 con 7 fotogramas de 20 × 26: frente (paso 0–3 y ataque) y espalda (reposo y ataque). La pose «herido» la tiñe el código. Hoy se dibujan en `src/shared/art.ts` (`frontHair`, `backHair`, `drawBeard` y la capa de frente en `drawHumanoid`).

| Asset | Variantes | Medidas |
|---|---|---|
| Peinados | Corto, Largo, Recogido y Rapado × Hombre y Mujer = 8 hojas, comunes a todas las clases | 140 × 26 cada una |
| Pelo bajo el sombrero de mago | Largo y Recogido × Hombre y Mujer = 4 hojas | 140 × 26 |
| Barbas | Corta y Larga = 2 hojas (valen para los dos géneros) | 140 × 26 |
| Caras | Hombre y Mujer = 2 hojas (ojos, nariz, pestañas y labios; piel en magenta) | 140 × 26 |
| Capa de frente | 1 hoja (hombros, cuello, bordes bajo las manos y broche), común a todas las clases | 140 × 26 |
| Icono de dado (Aleatorio) | 1 | 12 × 12 (se ve ×2) |
| Icono de pluma (nombre al azar) | 1 | 12 × 12 (se ve ×2) |

Las miniaturas de Género, Peinado y Barba no hay que dibujarlas: son el mismo sprite recortado a la cabeza.

## Oro físico y mochilas (provisionales, para diseñar)

Se dibujan hoy en `src/shared/art.ts` (tabla `ICONS` y sprites de mercader). Sustituir por iconos de 32×32 con la **misma clave**:

| Clave | Qué es | Notas |
|---|---|---|
| `coins1`, `coins2`, `coins3` | Monedas sueltas (montón pequeño, mediano y grande según cuántas hay, hasta 10) | 1 casilla |
| `pouch` | Saquito de oro (hasta 50 monedas) | 1 casilla; cabe en el bolsillo seguro |
| `sack` | Saco grande de oro (hasta 250 monedas) | Ocupa 2×2: icono de 64×64 |
| `bag1`, `bag2`, `bag3` | Mochilas de 24, 30 y 36 casillas | Se ven en su hueco bajo «Pies» y en la tienda |
| `vendor_collector` | El Coleccionista (goblin mercader) | Mismo tamaño y estilo que el resto de mercaderes |

## Ajustes (provisionales, para diseñar)

Hoy son glifos dentro de un recuadro discontinuo (`TABS` en `src/game/ui/Settings.tsx`) y una rueda dentada en SVG (`GearIcon` en `Lobby.tsx`).

| Icono | Medida | Notas |
|---|---|---|
| Engranaje de Ajustes | 16×16 (se ve a ×2, 32 px dentro de un botón de 44) | Claro sobre fondo oscuro; lleva encima un punto verde de 9 px cuando hay aviso |
| Sonido, Pantalla, Controles, Partida, Comunidad, Información | 16×16 cada uno (se ven a ×2, 32 px) | Uno por sección; activos en dorado #e8b33a y el resto en hueso #e9e1cc (o dos versiones) |

## Bastión y estaciones (provisionales, para diseñar)
Marcadores dibujados por código en `src/game/ui/stationArt.ts`. Misma proporción que los retratos de los mercaderes (20 × 26 px de base; en escritorio se ven a ×6, 120 × 156). PNG con transparencia, apoyado en la parte de abajo. Las estaciones son partes del Bastión en ruinas que el jugador reconstruye: cada una necesita también una **versión en ruinas** (`<clave>-ruina`, misma medida: piedra derrumbada, cascotes delante, sin candado). Hoy la versión en ruinas se genera por código (silueta apagada + cascotes).

| Clave | Qué es | Medida |
|---|---|---|
| `refuge` | Bastión en ruinas (tarjeta «Bastión» de la entrada; se ve a doble tamaño): castillo de noche con luna, torres de tejado partido, muros agrietados, piedras caídas, una brecha en la muralla y una antorcha o andamio que indique que alguien lo reconstruye. Paleta oscura, en el mismo arco que los retratos | 20 × 26 px; recomendable 40 × 52 px (o 80 × 104 para verse a ×3 en escritorio) |
| `cot` | Catre | 20 × 26 px |
| `kitchen` | Cocina con su fogón | 20 × 26 px |
| `bench` | Banco de trabajo | 20 × 26 px |
| `infirmary` | Rincón de cura | 20 × 26 px |
| `forge` | Forja | 20 × 26 px |
| `alchemy` | Mesa de alquimia | 20 × 26 px |
| `runic` | Atril rúnico | 20 × 26 px |

La tarjeta «Mercaderes» de la entrada usa el retrato de Garth.

## Intendente del Bastión (tutoriales)

- Retrato del intendente que cuenta la bienvenida al Bastión: 20 × 26 px, igual que los retratos de los mercaderes. Se muestra a escala entera.
- Mientras no exista, se usa un marcador provisional dibujado por código (`intendant` en `src/game/ui/stationArt.ts`).
