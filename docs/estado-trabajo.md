# Crypt Raiders · Estado del trabajo (traspaso entre chats)

Última actualización: 5 de noviembre de 2026.
Este documento resume todo lo hablado y hecho para que otro chat de Claude pueda continuar sin perder contexto.
Léelo junto con CLAUDE.md (reglas permanentes del proyecto).

## Novedades del 14/11 (2): Bastión unificado, implementado
- **Pestaña Bastión** = los 8 mercaderes en 2 filas de 4 con primer plano de medio pecho (sprite recortado a escala entera), estación, reputación y avisos. Fuera la entrada y la rejilla de estaciones (`RefugePanel` eliminado; `Dishes` y `ScrapPanel` siguen en `RefugePanels.tsx`).
- **Pantalla del mercader**: pestañas (`ui-seg`) solo con lo que tiene y su estación al final; «◂ Bastión». Pendiente con botón directo. La estación se reconstruye, usa y mejora dentro (`StationTab`).
- **Datos**: `StationId` = cot · kitchen · bench · infirmary · forge · alchemy · tannery · armory (sin `runic`). Catre `by: 'grizk'` y `STATION_FX.cotGold = [0, 5, 10, 15]` (`cotGold`, cobra `actions.sleepCot`). Valerius en «La armería» (`PLACES.armeria`). Recetas: `assignStation` en `data/crafting.ts` (atril → Laboratorio, banco → Curtiduría salvo madera y herramientas, forja → Forja de armaduras para yelmos, corazas, guanteletes y escudos). Runas: Laboratorio a nivel 3.
- **Migración** (`refugeOf`, `v: 3`): Curtiduría = nivel del Banco, Forja de armaduras = el de la Forja, Laboratorio = el mayor entre Mesa y Atril. Regalo de primera receta: Banco `c_grip`, Curtiduría `c_strap`, Forja de armaduras `c_gauntlets`.
- **Tutoriales**: `screen.bastion-entry` (tras la bienvenida, sobre `vendor-list`), `tab.refugio` (Orik, `bastion:station`), `vendor.*` apuntan a `vendor-view-station`, nuevos `station.tannery` y `station.armory`, avisos de nivel del Catre los cuenta Grizk, bienvenida apunta a `vendor-list`.
- **Pruebas actualizadas**: `bastion-check` (reescrito), `refugio-check`, `taller-check`, `e2e-bastion-minis`, `necesidades-check`, `menus-check` y varios guiones (sin `btn-merchants`). Tests: refuge, runes, tutorials, tutorials-migracion.

## Novedades del 14/11: propuesta del Bastión unificado
- Acordado con el usuario: **solo se cambia el apartado Bastión**, con la estética actual; nada de estilo nuevo ni cambios en el resto de pantallas (se descartaron las direcciones visuales de rol de mesa).
- La pestaña Bastión mostrará los 8 mercaderes en 2 filas de 4; cada uno abre su pantalla con pestañas y su estación dentro. Sin pantalla de entrada ni rejilla de estaciones.
- Reparto: Catre → Grizk (hostal, 5/10/15 oro por dormir), Forja de armas → Brand, Forja de armaduras (nueva) → Valerius en «La armería», Curtiduría (nueva, cuero y tela) → Nira, Laboratorio (alquimia + atril rúnico) → Eldrin, Banco de trabajo → Orik. Recetas existentes repartidas por material, sin recetas nuevas. Sin botón «Dormir» en la barra.
- Plan y preguntas: `docs/plan-bastion-unificado.md`. Maquetas y capturas: `mockups/hud-unificado/index.html` (`maqueta.html`, `capturar.cjs`, sprites exportados con `exportar.cjs`).

## Novedades del 13/11 (noche, 2): música de archivo en el Bastión y el menú; sin ambiente
- **Dónde suena:** menú, elegir/crear personaje, copia y todo el Bastión (todas las pestañas del lobby): `medieval-estampie` y `whisper-of-the-bow` alternándose sin repetir, con 5–15 s de silencio entre ellas. Mazmorra, combate, jefes y resultados: sin música. Al bajar, fundido de salida de 2 s; al volver, de entrada.
- **Interruptores** en `src/config/music.ts`: `listasActivadas = true` (música de archivo), `musicaActivada = false` (pistas generadas, peligro y fanfarrias), `ambienteActivado = false` (goteo, viento, lava…; el código sigue). `PLAYLISTS` decide pistas, pantallas, pausas, fundidos y volumen.
- **Reproductor:** `src/game/music/playlist.ts`, en streaming con `<audio>` conectado al bus de música (respeta los volúmenes de Ajustes); cada pista se pide al sonar (no retrasa el arranque). OGG y, si el navegador no lo lee (Safari), MP3. Arranca tras la primera interacción.
- **Audio:** originales en `assets/audio/originales/` (sin tocar). Web en `public/audio/`: `ffmpeg … -af "loudnorm=I=-16:TP=-1.5:LRA=11:<medidas de la 1.ª pasada>:linear=true,aresample=44100,afade=t=in:d=1.5,afade=t=out:st=<duración−1,5>:d=1.5"` → OGG (`libvorbis -q:a 4`) y MP3 (`libmp3lame -q:a 4`). Resultado: −16 LUFS las dos.
- **Ajustes › Sonido:** General, Música y Efectos, con la nota «La música suena en el Bastión y el menú.». Fuera Ambiente, «Música en combate» y la casilla de música. Música por defecto al 60 % (`MUSIC_DEFAULT` en `core/profile.ts`); lo guardado por cada jugador se respeta.
- **Probar:** `node scripts/musica-check.cjs <url>/play/ <carpeta> [dispositivo]` (menú → Bastión → alternancia con silencio → mazmorra y jefe en silencio → resultados → vuelve en el Bastión; sin ambiente y sin errores).

## Novedades del 13/11 (noche): música apagada hasta la banda sonora definitiva
- Interruptor único `musicaActivada = false` en `src/config/music.ts`. El director (`src/game/music/director.ts`) no toca ninguna pista, ni la capa de peligro, ni las fanfarrias (decisión: se quitan junto con la música). El ambiente de cada subzona y los efectos siguen sonando.
- Ajustes › Sonido: la barra de Música, gris y desactivada con «(Próximamente)»; el bloque Música sustituido por «Música: próximamente. Estamos preparando la banda sonora de Gravevow.» General, Efectos y Ambiente funcionan igual. Los valores guardados de música (volumen, interruptor, música en combate) no se tocan.
- La pantalla de pruebas (`/play/?debug&musica`) sigue tocando las pistas para trabajar con ellas.
- **Volver a activarla:** `musicaActivada = true` en `src/config/music.ts`. Ajustes vuelve solo a mostrar la barra y las opciones (`SOUND_MUSIC_SOON` sale de ese interruptor). Prueba: `MUSICA_APAGADA=0 node scripts/musica-check.cjs …` para la música activada; sin la variable comprueba que no suena nada.

## Novedades del 13/11: el «?» abre solo la Guía
- **Antes:** el «?» del lobby abría Ajustes en la sección Partida (copia, personajes y, al final, la Guía): parecía abrir las opciones.
- **Ahora:** abre una ventana «Guía» con solo los temas y los textos para releer (`SettingsModal guideOnly`). En Ajustes › Partida sigue estando también.
- Corregido además un error de la música: una nota de adorno al empezar podía programarse en un tiempo negativo (el navegador lo rechazaba). Ahora ninguna nota se programa en el pasado.

## Novedades del 13/11: pantalla completa en todos los dispositivos
- **Antes:** el botón solo salía en táctil (`if (!touch) return null`): no había en escritorio ni en tabletas con ratón o teclado (al mover el ratón desaparecía), ni en combate. F11 se confundía con la app instalada (el botón se ocultaba) y el icono no se enteraba de F11. En iPad sin pantalla completa la ayuda hablaba del iPhone.
- **Ahora** (`shared/fullscreen.ts`, `FullscreenButton.tsx`):
  - Se muestra según lo que admite el navegador (Fullscreen API, con prefijo `webkit` para Safari), no por el tipo de dispositivo: título, elegir personaje, copia, lobby (Jugar, Intendencia, Bastión…), mazmorra (escritorio y táctil) y combate (nuevo, arriba a la derecha).
  - Mismo icono (cuatro esquinas, nítido) y 44 px. Cambia al entrar y salir también con Esc, F11 o el gesto del sistema (`fullscreenchange`, `webkitfullscreenchange`, `resize` y `display-mode`).
  - F11 del navegador: el icono sale como «salir» y, al pulsarlo, avisa de que se sale con F11 (la página no puede quitarla). En Firefox se detecta por el tamaño de la ventana.
  - Tecla **F** en cualquier pantalla (no choca con WASD, E, Q, I, R, 1–9, Tab ni Esc); ayuda del ratón «Pantalla completa (F)». Añadida a la lista de controles de Ajustes.
  - Android: al entrar se fija la horizontal; al salir por fuera se suelta.
  - iPhone (y iPad sin la API): sigue la ayuda de «Añadir a pantalla de inicio», con el nombre del dispositivo correcto. App instalada: sin botón.
  - Ajustes › Pantalla usa la misma acción y explica la tecla F.
  - El canvas (Phaser en modo RESIZE, `pixelArt`) se reajusta solo, sin deformarse.
- **Probar:** `node scripts/pantalla-completa-check.cjs <url>/play/ <carpeta> [dispositivo]` (escritorio, `"iPad (gen 7) landscape"`, `"iPad (gen 7)"`, `"Pixel 7 landscape"`).

## Novedades del 13/11: música generativa que reacciona
- **Antes:** un acorde grave fijo en bucle (dos «pistas», `lobby` y `dungeon`), igual en todas las subzonas y en combate; sin ambiente. Por eso cansaba.
- **Ahora** (`src/game/music/`: `instruments.ts`, `engine.ts`, `director.ts`; datos en `src/config/music.ts`):
  - 6 pistas generadas con Web Audio: Menú, Bastión, Mazmorra, Cripta, Infierno y Combate (élites y jefes: la misma, más intensa y más rápida). Cada una por frases que cambian de orden, capas que entran y salen y adornos al azar.
  - Variación por subzona (`SUBZONE_MUSIC`): transposición, tempo, filtro, intensidad y disonancia; más oscuro al bajar. Ambiente propio por subzona (viento, hoguera, goteo, cadenas, huesos, agua, eco, latido, viento caliente, lava, retumbos).
  - Pausas de 10 a 30 s con solo ambiente cada 2–4 frases (respuesta del usuario: 10–30 s).
  - Director: menú → Bastión → tema de la zona → combate (fundido) → vuelta; capa de peligro con vida < 25 % o < 2 min para el portal; fanfarrias en el resumen (extracción o muerte, nivel, legendario) con la música atenuada.
  - Solo suena tras la primera interacción. Limitador suave, sin agudos por encima de ~7 kHz, sin chasquidos (comprobado en grabaciones: picos ≤ 0,7, 0 saltos bruscos).
  - Ajustes › Sonido: volumen de Ambiente nuevo y «Música en combate: Normal / Baja / Sin música» (por defecto Normal). El interruptor «Música» quita la música; el ambiente sigue con su volumen.
  - Sustituir una pista por un archivo: `file: { ogg, mp3 }` en `config/music.ts` (carga diferida). Brief y prompts en `docs/musica.md`.
  - Modo ligero (sin reverberación, máx. 3 capas) en la pantalla de pruebas; si algún móvil va justo, se puede activar por defecto.
- **Probar:** `/play/?debug&musica` (pantalla de pruebas: pistas, 10 subzonas, combate, jefe, peligro, modo ligero y fanfarrias). `node scripts/musica-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Novedades del 13/11: destruir con Orik, cuerpo del aliado, resultados sin ficha y dividir al repartir
- **Decisión del usuario:** destruir solo en el taller de Orik (pestaña «Destruir» junto a «Desguazar»), nunca desde el inventario, para que no se destruya nada por error. En la mazmorra sigue «Soltar» (bolsa en el suelo, se puede recoger).
- **Destruir** (`destroyItems`, `destroyNeedsHold` y `destroyBlock` en `core/salvage.ts`; `actions.destroy`; `DestroyPanel` y `HoldButton` en `RefugePanels.tsx`): mochila, almacén y página compartida; varios a la vez; en montones se elige cuántos. Recluta: un toque. Normal: dos toques («¿Seguro?»). Raro o mejor, o mejor que lo que llevas: mantener pulsado 1 s (ratón, dedo o Intro/Espacio). El oro no se destruye. Bloqueado en el tutorial. Cada casilla cuenta una vez: no se pierde de más.
- **Cuerpo del aliado** (`core/allyBody.ts`, `combatActions.ts`): al caer Kael, un errante, un prisionero liberado o un contratado, queda una bolsa «Cuerpo de …» en el sitio con lo que le diste, su oro y sus pociones (sin su equipo: no lleva objetos reales). Dura como las demás bolsas (hasta salir de la zona o extraer). Solo se crea al pasar de vivo a muerto y el aliado queda vacío: no se duplica nada (también si te traicionó; esa bolsa ya existía y ahora también lo vacía). Sin consecuencias con Grizk. Mini tutorial `exp.ally-body`.
- **Resultados:** la página «Botín conseguido» ya no abre fichas: icono, cantidad y borde de rareza; se mantiene el brillo.
- **Selector de cantidad común** (`kit/QtyPicker.tsx`): −10/−1/+1/+10, barra, «Mitad» y «Todo», flechas del teclado. Lo usan dividir montones (antes partía por la mitad sin preguntar), sacar y dividir monedas, destruir y el nuevo «Dividir…» al dar al aliado (`giveToRival(lootId, index, n)`: resta del montón y solo esa parte cuenta como dada).
- **Cómo probar:** `node scripts/destruir-check.cjs <url>/play/ <carpeta> [dispositivo]` (dividir, destruir recluta/montón/legendario, dar 2 de 4 y cuerpo de Kael); `node scripts/resultados-check.cjs` (sin ficha); tests en `tests/destruir-cuerpo.test.ts`.

## Novedades del 13/11: landing v4, banner de Discord, capturas y tráiler de 30 s
- **Respuestas del usuario:** la portada (diorama) se queda tal cual; la versión vertical del tráiler, más adelante; el tráiler puede enseñar un momento de la Intendencia (mochila y almacén).
- **Landing** (`src/landing`):
  - Orden: Portada · Tráiler · VarkHollow (sin cambios) · Mecánicas (5 ganchos) · Galería · Discord · Hoja de ruta · Cierre.
  - Ganchos (`hooks.tsx`): «Baja. Saquea. Vuelve vivo.», «Cada golpe deja marca.», «No te fíes de nadie.», «Lo mejor está al fondo.» y «Levanta las ruinas.», cada uno con su captura. El descenso ya lo cuenta VarkHollow y «gratis en el navegador y en el móvil» va en la portada y en cada botón.
  - Fuera: la rejilla de mecánicas, «Elige quién baja», el bloque largo de aliados y «Tu partida es tuya» (resumido en una línea del cierre). `mechanics.tsx` se queda sin usar, por si se recupera algo.
  - Hoja de ruta: «Ya en el juego» pasa de 18 a 7 puntos.
  - Banner de Discord (`discord.tsx`), después de la galería; el pie conserva su enlace. El enlace de Discord es ahora `https://discord.gg/yw2R4nwJQa` (`shared/community.tsx`).
  - SEO: descripción nueva e imagen para compartir del portal (`compartir.png`, 1200×630).
- **Capturas** (`public/screenshots/landing`, `g-*` y `h-*`, WebP con PNG de respaldo): `node scripts/landing4-shots.cjs <url>/play/` y luego `python3 scripts/landing4-post.py` (aclara las de mazmorra, recorta las de los ganchos y crea `compartir.png`). Las antiguas (`combate`, `especial`, `alijo`, `forja`, `tienda`, etc.) ya no se usan: se pueden borrar a mano.
- **Tráiler v6** (30 s, `trailer/v6`): `npm run trailer` (con el servidor en marcha) graba con `scripts/trailer6-capture.cjs` y monta con `npm run trailer:render`. Guion en `trailer/v6/guion.json`. Planos: descenso por 5 subzonas, duelo, cofre legendario, Intendencia, Kael y su traición, portal y cierre «Juega la alpha gratis · gravevow.com». Música y golpes sintetizados. Salida: `public/trailer/gravevow-trailer.mp4/.webm`, `poster.jpg` y el clip corto.
- **Revisión del usuario (13/11):** se arregla el botín mal colocado en la Intendencia (ahora entra con `dev.give`, que respeta el tamaño de cada objeto; la captura de la galería va sin ficha abierta); la captura del móvil pasa a las Catacumbas y a doble resolución; tráiler y capturas en 1920×1080 nítidos (antes 1280×720), WebP al 95 %; vuelve «Tu partida es tuya» (antes de la hoja de ruta) y se añade «Lo esencial» con 6 puntos e iconos tras los ganchos.
- **Ojo:** no edites `src/` mientras se graba: Vite recarga la página y la grabación falla.
- **Assets para diseñar (usuario):** icono de Discord en pixel art (72×72 y 22×22), arte del banner de Discord (dos figuras de 120×160, fondo 1200×420), cinco marcos o iconos de gancho (48×48) y una imagen para compartir definitiva (1200×630).

## Novedades del 13/11: un solo aliado y confianza de Kael
- **Respuestas del usuario:**
  - 3 traiciones para hostil, y hostil es permanente;
  - negarle su parte cuenta, pero menos (1 punto frente a 2);
  - cifras aprobadas: +15 % de traición del testigo, −150 y −50 con Grizk, +25 por soltar un prisionero;
  - el errante rechazado se queda donde estaba;
  - la confianza suma y resta: las bajadas leales restan puntos, así que dos traiciones y luego buen comportamiento no llevan a hostil a la tercera.
- **Cómo probar** (con `npx vite --port 5173`):
  - Abre `/play/?debug&ally=bram&captive=tobias&kael=0`, crea un personaje (tutorial saltado) y baja a Afueras. Entras con Bram y aparecen Kael y el prisionero Tobías.
  - Habla con Kael: salen las tres opciones. Habla con Tobías: cuatro opciones (con «Romper sus cadenas y dejarle marchar»).
  - Traiciona a Bram: combate con Kael a tu lado. Al ganar, Kael lleva el 👁 y al volver Grizk te lo dice (−150).
  - Confianza: `__GRAVEVOW__.dev.kaelTrust(2)` (baja) o `(6)` (hostil) y vuelve a bajar. También `?debug&kael=2`.
  - Script: `node scripts/aliados-check.cjs <url>/play/ <carpeta> [dispositivo]`.
- **Tutorial:** Osric sigue sin poder ser sustituido ni traicionado (las opciones no salen con `state.tutorial`). `e2e-tutorial` pasa.

## Novedades del 13/11: resultados en tres páginas
- **Antes:** «Botín encontrado» apuntaba lo cogido sin restar lo soltado o gastado, con las monedas como objetos. «Conservas» listaba todo lo que llevabas, también el equipo con el que bajaste. El oro y el valor contaban lo que ya llevabas.
- **Ahora:**
  - Al bajar se guarda lo que llevas: unidades por objeto y rareza en equipo, mochila y bolsillo, sin monedas, y las monedas aparte.
  - Al salir, botín = lo que hay de más, y oro = monedas al salir menos monedas al bajar.
  - Valor = objetos nuevos + oro conseguido, redondeado.
  - Las expediciones empezadas antes del cambio caen al cálculo antiguo.
- **Páginas:**
  - 1 · Expedición.
  - 2 · Botín (o lo perdido y lo que salvó el bolsillo).
  - 3 · Tu cuerpo, solo si `useCure()` da algo al llegar (no sale en el tutorial).
  - «Saltar» (`summary-skip`) lleva al Bastión, o a la página 3 si vuelves herido.
  - En la página 3, «Ahora no» (`cure-later`) avisa de que se puede curar en la Enfermería o en Intendencia › Estado.
  - Muerte: la misma estructura, con la cura por 1 de oro (o gratis) y el aviso de recluta en la página 3.
- **Decisiones** (preguntas sin respuesta, se tomó lo propuesto):
  - se guarda la lista de subzonas visitadas;
  - mercenario, errante y tutorial van en la página 1, y los planos en la 2;
  - se mantiene «◂ Atrás»;
  - el hito de habilidad se avisa y se elige en el Bastión.
- **Cómo probar:**
  - Extraer herido con algo nuevo: página 1 → Siguiente (o →, o deslizar) → botín sin lo que bajaste → Siguiente → curarse.
  - Extraer sano: 2 páginas.
  - Morir: lo perdido y el bolsillo, luego la cura por 1 de oro.
  - Script: `node scripts/resultados-check.cjs <url>/play/ <carpeta> [dispositivo]`.

## Novedades del 13/11: creación de personaje (giro, capa, aspecto y género)
- Aprobado por el usuario: solo frente y espalda; peinados comunes a todas las clases; rasgos de mujer sutiles (pestañas y labios, sin cambiar el mentón); etiqueta «Género»; nombre de clase con género en todas partes; barba «Ninguna» por defecto; sin giro automático ni color de acento.
- Fases hechas:
  1. Vista que gira: `CrearPersonaje.tsx` (`create-stage` con `data-view`, `turn-left`/`turn-right`, arrastre ≥ 30 px, la capa enseña la espalda).
  2. Capa visible de frente: `capeFront` en `drawHumanoid`.
  3. Pelo y barba: `HAIR_COLORS`, `BEARDS`, `drawBeard`.
  4. Peinados: `HAIR_STYLES`, `frontHair` y `backHair`.
  5. Aleatorio y nombre: `look-random`, `name-random`, `randomName(sex)` con `NAME_PARTS`.
  6. Género: `look-sex-0/1`, `female` en el sprite y concordancia de textos (`core/gender.ts`).
- Cómo probar: crear personaje › pestaña Aspecto; girar con las flechas o arrastrando; tocar una capa (gira y vuelve); Género Mujer cambia el título a «Guerrera»; Aleatorio y la pluma del nombre. Script: `node scripts/creacion-check.cjs <url>/play/ <carpeta> [dispositivo]`.
- Textos adaptados con `{o|a}` o rehechos neutros:
  - Kael: «Mira quién sigue viv{o|a}», «{Justo y honrado|Justa y honrada}», «mala racha, {chico|chica}».
  - Sela: «Tranquil{o|a}». Hermano Odo: «{viajero|viajera}». Malek: «¿Viv{o|a}?». Iskra: «Generos{o|a}».
  - Registro y avisos: «Estás agotad{o|a}», «Bajarás preparad{o|a}», «Ya estás descansad{o|a}», «Quedas enter{o|a}» (dos frases de Vesper).
  - Curación: «Vuelves herid{o|a}… dejarte enter{o|a}», «Los portadores… dejarte enter{o|a}», «Vas herid{o|a}» (Jugar), «Estás enter{o|a}» (Intendencia › Estado y Enfermería).
  - Tutoriales: Cocina «preparad{o|a}», Enfermería «rot{o|a}», tienda «de tont{o|a}»; el Catre pasa a «a punto».
  - Estaciones: el Catre «te deja a punto» (tres frases).
  - Atuendos: «para {tu aventurero|tu aventurera}». Intendencia: panel «{Aventurero|Aventurera}».
  - Nombres de clase: `className()` en creación, lobby, selección, mazmorra, Intendencia, combate (etiqueta de la habilidad de clase) y aviso de hito.
- No necesitan cambio: «Has caído», «Has muerto», «Has escapado» (participio invariable) y los textos en segunda persona sin adjetivo. No hay logros en el juego.

## Novedades del 12/11: tutoriales (bloque 3), fase 1 hecha
- Plan y respuestas: docs/plan-tutoriales.md (herida de la rata, intendente nuevo, migración opción a, regalo por personaje, avisos de nivel fuera de «desactivar», «Saltar el tutorial» marcado).
- Fase 1: `core/data/tutorials.ts` (datos), `core/tutorials.ts` (lógica), `ui/MiniTutorial.tsx` (capa, `TutDot`, `useTutBadge`), acciones en el store, `account.tutorials`. Para enseñar algo nuevo: entrada en el archivo de datos + `actions.tutorialEvent('<disparador>')`.
- Siguiente: fase 2, tutorial inicial de expedición.

## Novedades del 12/11: Bastión con entrada (Mercaderes y Refugio)
- Plan: docs/plan-bastion-refugio.md; maquetas: mockups/bastion-refugio. Respuestas: recepción en panel y platos en la Cocina; botón «Detalles»; las 7 estaciones visibles y bloqueadas hasta pedirlas; Garth en la tarjeta de Mercaderes; fuera «Encargos del Refugio» de los mercaderes.
- Código: `screens/Mercaderes.tsx` (BastionEntry, áreas entry/merchants/refuge), `RefugePanels.tsx` (RefugePanel nuevo, Dishes), `StationPanels.tsx` (StationTile, StationTiles, StationDetail, LevelMarks, StationArt), `stationArt.ts` (marcadores 20 × 26).
- testids: `btn-merchants`, `btn-refuge` (Entrar), `merchants-back`, `refuge-back`, `module-<id>`, `ask-<id>`, `enter-<id>`, `btn-cot`, `details-<id>`, `station-detail-<id>`, `upgrade-<id>`, `detail-back`, `btn-reception`, `refuge-dishes`.

## Novedades del 5/11: varios personajes, almacén por páginas y copia de seguridad (en curso)
- Plan aprobado: docs/plan-personajes-copia.md. Maquetas: mockups/personajes-copia (index.html).
- Decisiones: bestiario de cada personaje; atuendos comprados de la cuenta y el puesto de cada personaje; precios de páginas
  aprobados (2.500 / 6.000 / 12.000 / 25.000; Compartido 15.000; 120 casillas por página) y se devuelve el oro de «Ampliar (+8)»;
  importar sustituye la partida entera; recordatorio de copia a los 7 días o 10 expediciones; botón «Compartir archivo» en el móvil.
- **Fase 1 hecha (sin cambios visibles):** partida en formato 3 (src/core/save.ts): cuenta (atuendos comprados, ajustes, tutorial,
  página Compartido, último personaje, datos de copia, id para la nube) + hasta 4 personajes (lo demás, con `stashPages`).
  - El juego sigue trabajando con `state.profile` (personaje activo + cuenta): `composeProfile` lo monta y `applyProfile` lo reparte
    al guardar (store.ts: `save`, `activeId`, `syncSave`).
  - Persistencia (db.ts): clave nueva `save`; la antigua `profile` se convierte sola al hueco 1 y NO se borra (respaldo).
    `save-undo` queda preparada para deshacer importaciones. Con ?debug, `__CRYPTRAIDERS__.getSave()` enseña la partida.
  - Tests: tests/save.test.ts (migración v1/v2 con almacén ampliado y lleno, ida y vuelta, 4 huecos, borrar, reparación). 199 tests.
- **Fase 2 hecha: varios personajes.**
  - Menú: «Continuar como…» y «Elegir personaje» (sustituye a «Nuevo personaje», que borraba). Ajustes ya no borra personajes.
  - Pantalla «Elige quién baja» (screens/ElegirPersonaje.tsx, screen 'select'): 4 huecos con sprite y atuendo, nombre, clase,
    nivel, oro y última partida; los vacíos crean un personaje en ese hueco; borrar pide escribir el nombre.
  - Lobby: tocar el nombre arriba a la izquierda abre «Cambiar de personaje» (y «Ver todos · Nuevo personaje»).
  - Tutorial: si ya lo jugó algún personaje, los nuevos empiezan con «Saltar el tutorial» marcado (y sin los avisos de bienvenida);
    se puede desmarcar para jugarlo.
  - store.ts: `roster`, `activeId`, `accountTutorialDone`, `createSlot`; acciones openSelect, newCharacter, selectCharacter,
    deleteCharacterById (deleteCharacter borra el activo).
  - Prueba nueva: `node scripts/personajes-check.cjs <url>/play/ <carpeta>` (tres formatos, 44 px, recarga).
- **Fase 3 hecha: almacén por páginas.**
  - Valores en src/config/stash.ts: 120 casillas por página (8 × 15, en escritorio se ve entera sin desplazar), páginas 2–5 a
    2.500 / 6.000 / 12.000 / 25.000, «Compartido» a 15.000 (una vez, para todos los personajes).
  - Las páginas propias van seguidas en `profile.stash` (página k = casillas k·120…): contar, gastar materiales y entregar
    encargos siguen mirando todo el almacén propio. «Compartido» es `profile.shared` (de la cuenta), contenedor 'shared'.
    Lógica en src/core/stashPages.ts; panel en src/game/ui/StashPanel.tsx (Alijo y Vender de los mercaderes).
  - Pestañas: candado y precio en las no compradas (la siguiente se compra con confirmación); «Compartido» en verde azulado
    con su icono y el texto «Compartido» en escritorio. Mover a otra página: arrastrar a la pestaña o tocar el objeto y luego
    la pestaña. «Al almacén» va a la página que se ve. «Ordenar» solo ordena la página vista.
  - Migración: el almacén antiguo (40 + filas de «Ampliar») pasa a la página 1 y se devuelve el oro pagado (una sola vez),
    con un aviso en el título («El almacén tiene páginas»). Los avisos de una vez viven en `account.notes`.
  - Pruebas: tests/stashPages.test.ts y `node scripts/almacen-check.cjs <url>/play/ <carpeta>` (tres formatos).
- **Fase 4 hecha: copia de seguridad** (pantalla «Copia de seguridad» del menú, screen 'backup', screens/CopiaSeguridad.tsx).
  - src/core/backup.ts: archivo `crypt-raiders-copia-AAAA-MM-DD.json` con { format, v, game, exportedAt, summary, data, sig }
    y código de texto `CR1.` + JSON comprimido con fflate (deflate) en base64url (unos 1.400 caracteres con un personaje).
    Firma: hash de 64 bits con sal; si se edita a mano, se rechaza («La copia está dañada o se ha modificado a mano»).
    Los datos pasan por sanitizeSave al cargar: copias de formatos anteriores se migran igual.
  - Guardar: Exportar archivo, Compartir archivo (solo donde el navegador puede compartir archivos: móviles) y Copiar código
    (con el texto visible por si el portapapeles falla). Cargar: Importar archivo y Pegar código (con «Pegar del portapapeles»).
  - Antes de cargar: qué contiene (personajes, clase, nivel, fecha, atuendos, Compartido) y aviso de que sustituye la partida;
    la actual se guarda en `save-undo` y aparece «Deshacer la última carga».
  - Recordatorio: «Última copia: hace X días · N expediciones desde entonces»; en el menú, aviso discreto junto a «Copia de
    seguridad» a los 7 días o 10 expediciones (o sin ninguna copia con alguna expedición hecha). `account.backup.expeditionsAt`.
  - Al arrancar se pide `navigator.storage.persist()`. Aviso de Safari en iPhone/iPad (isIosSafari / isStandalone en device.ts).
  - Pie del menú: «Tu progreso se guarda en este navegador: haz copias de seguridad.»
  - Nueva dependencia: fflate (package.json y package-lock.json).
  - Pruebas: tests/backup.test.ts y `node scripts/copia-check.cjs <url>/play/ <carpeta>` (exporta en ordenador e importa en un
    iPhone emulado con archivo y en una tableta pegando el código; copia editada; deshacer).
- **Fase 5 hecha: menú principal.** Con partida: «Continuar como [último personaje]», «Elegir personaje», «Copia de seguridad»
  (con el recordatorio discreto), «Ajustes» y «Volver a la web». Sin partida (primera vez): «Nuevo personaje» y «Tengo una copia»
  (abre la copia con el bloque «Cargar una partida» destacado), «Ajustes» y «Volver a la web». En pantallas bajas el logo y los
  botones se compactan (game.css: .title-wrap, .title-menu). Pie: «Tu progreso se guarda en este navegador: haz copias de seguridad.»
- Fase 6 (landing y textos legales) aplazada al final de todo, para incluir también el oro físico.
- **Oro físico:** plan aprobado (docs/plan-oro-fisico.md, mockups/oro-fisico). Respuestas: las mochilas mejores no se
  pierden; el Coleccionista compra joyas, tesoros, cálices y gemas; el encargo «Coleccionista» de Orvel pasa a «Numismático»;
  con la mochila llena, las monedas se quedan en el saco del suelo con aviso.
- **Fase O1 hecha: objetos de varias casillas.** Objeto nuevo `gold_sack` (Saco de oro, 2×2; aún no se puede conseguir).
  - El objeto vive en su casilla de arriba a la izquierda; las otras tres guardan una marca `cover` (uid «cover:<uid>»),
    así todo lo que busca casillas libres las ve ocupadas. core/inventory.ts: LAYOUTS (mochila 6, almacén y Compartido 8 con
    páginas de 15 filas, bolsillo 3), canPlace, removeAt, repairGrid, addToGrid/sortGrid con forma; transfer y quickMove.
  - Reglas: se mueve a un hueco de 2×2 libre (puede desplazarse sobre su propio hueco), no se intercambia, no se suelta nada
    encima, no cabe en el bolsillo ni se equipa, no queda entre dos páginas; ordenar pone los sacos primero.
  - Almacén con 8 columnas en todos los formatos (Alijo y Vender). Icono provisional «sack» (y «pouch») en art.ts.
  - Pruebas: tests/multicell.test.ts y el paso «saco de 2×2» de scripts/almacen-check.cjs.
- **Fase O2 hecha: monedas y sacos** (aún no se consiguen jugando: llegan con la economía y el Coleccionista).
  - Objetos: `gold_coins` (Monedas de oro, de 10 en 10, categoría 'gold'), `gold_pouch` (Saquito, 1 casilla, 50) y
    `gold_sack` (Saco, 2×2, 250). Capacidades en src/config/gold.ts; el contenido va en `ItemStack.gold`.
  - core/gold.ts: depositCoins, withdrawCoins, splitCoins, groupGold, goldOf/gridGold. Soltar monedas sobre un saco (por
    cualquier casilla, también entre mochila y almacén) las mete; lo que no cabe se queda.
  - Interfaz: icono de monedas según el montón (coins1/2/3), «37/50» en la esquina del saco, «Lleva X/Y monedas» en la ficha;
    acciones «Sacar monedas» y «Dividir» con el selector GoldAmountPicker (−10/−1/+1/+10, barra, 10·25·50·Todo);
    botón «Agrupar oro» en la mochila y en el almacén (la página que se ve).
  - Bolsillo seguro: admite monedas y saquitos; el saco grande no. No se venden monedas ni sacos con oro.
  - Pruebas: tests/gold.test.ts y los pasos de oro de scripts/almacen-check.cjs.
- **Fase O3 hecha: economía con oro físico (incluye la migración del oro, que estaba prevista para O6).**
  - El oro de un personaje son las monedas de sus páginas propias (no «Compartido»). `profile.gold` es solo un reflejo:
    lo pone al día `set()` del store con syncGold. Pagos y cobros en src/core/wallet.ts (spendGold, earnGold, earnGoldSafe).
    Pagar: sueltas → saquitos → sacos. Cobrar: sacos con hueco (los más llenos antes) → sueltas de 10 en 10.
  - Economía ÷10 (GOLD_SCALE en config/gold.ts): precios de compra y venta, contratos, forja (forgeCost), botín (scaleLoot,
    redondeo al azar que conserva la media) y oro de Kael. Datos editados: atuendos 150/400/900, páginas 250/600/1.200/2.500,
    «Compartido» 1.500, recompensas de encargos ÷10, «extraer por valor de» 25 y 150, tutorial 10, oro inicial 6 monedas.
    El encargo «Coleccionista» de Orvel se llama «Numismático». Saquito y saco valen 50 y 250 (de antes) = 5 y 25 monedas.
  - Vender sin sitio para el oro: se agrupan las monedas sueltas de cada página y se reintenta; si sigue sin caber, no se vende
    y se explica qué hacer. Botones sin oro: «Oro insuficiente · X». En la mochila: «Oro encima (se pierde si mueres)».
  - Migración (save.ts): personajes sin `goldPhysical` → su oro (con lo devuelto por «Ampliar») ÷10 redondeando hacia arriba,
    en sacos llenos, saquitos y monedas en su almacén (si no cabe, páginas gratis). Aviso «El oro ahora pesa». Copias incluidas.
  - Al extraer, el oro encontrado aún entra directo en el almacén (O4 lo hará físico en la mochila).
  - Pruebas: tests/wallet.test.ts (+ ayuda tests/helpers.ts `withGold`). Con ?debug, `setState` con `profile.gold` deja ese
    oro en monedas de verdad (setGoldExactly). Scripts actualizados a la escala nueva.
- **Fase O4 hecha: oro físico en las expediciones.**
  - Al ganar un combate, objetos y monedas caen en un saco en el suelo («Saco de <enemigo>») que se abre solo al continuar;
    la experiencia sigue siendo directa. Lo que no cojas se queda en el suelo. El errante muerto deja sus monedas en su bolsa.
  - Cofres: su oro son monedas dentro del cofre. Botones «Coger el oro (N)» y «Cogerlo todo».
  - Al coger monedas van primero a los saquitos y sacos con hueco de la mochila y luego sueltas (putCoinsPartial);
    con la mochila llena se quedan en el saco/cofre con el aviso «Tu mochila está llena».
  - El oro de la mochila se pierde al morir; el del bolsillo seguro no (se ve «oro a salvo: N» en el bolsillo, en el Alijo y
    en el inventario de la mazmorra). HUD: «Oro encima». Al extraer, el oro vuelve en la mochila (resumen: oro que traes).
  - Kael: su parte son monedas de tu mochila de las cogidas desde que os aliasteis (takeCoins).
  - `expedition.goldFound` queda solo como dato (oro soltado); ya no se suma al extraer.
  - e2e.cjs comprueba el saco del botín; e2e-tutorial, e2e-social y mobile-check, actualizados.
- **Fase O5 hecha: El Coleccionista y las mochilas.**
  - Mercader nuevo `coleccionista` (duende prestamista, sprite provisional `vendor_collector`): vende saquito (5), saco (25),
    Mochila reforzada (30 casillas, 150) y Mochila de explorador (36, 600). Solo tienda y vender (sin encargos).
  - Compra joyas y tesoros (categorías jewel, relic, ring, amulet, coin) pagando un 25 % más (config/gold.ts:
    COLLECTOR_BUYS, COLLECTOR_PRICE_MULT); lo demás no se lo vendes. `activeVendor` en el store decide quién compra.
  - Mochilas como objetos (`backpack_basic` 24, `backpack_30`, `backpack_36`; BAG_SIZES): casilla «Mochila» en el equipo
    (debajo de Pies), nunca vacía, no se pierde al morir. Comprar una más grande te la pone y la vieja va a tu mochila;
    cambiarla (solo en el refugio): soltar otra en la casilla, tocar y tocar, o «Equipar mochila»; a una más pequeña solo con
    las últimas casillas vacías. Se pueden vender o pasar a otro personaje por «Compartido». core/bag.ts. Iconos bag1/2/3.
  - Pruebas: tests/collector.test.ts; menus-check incluye la tienda y la venta del Coleccionista.
- **Fase O7 hecha: tutorial con oro físico y lista de assets.**
  - Tutorial: tras el primer combate, paso «gold» (coger el oro del saco del botín) y, tras equiparse, paso «pocket»
    (meter las monedas en el saquito y guardarlo en el bolsillo seguro). El cofre del tutorial trae un saquito; la victoria da al menos 4 monedas.
  - Saco del botín: la cabecera con «Coger el oro» y «Cogerlo todo» queda fija arriba al desplazar (móvil con mochila de 36).
  - docs/ASSETS.md: lista de iconos y sprites provisionales del oro, las mochilas y El Coleccionista.
- **Fase 6 hecha: landing y textos legales.**
  - Legales (fecha 5/11): aviso legal y privacidad explican la copia de seguridad (archivo o código, la guarda el jugador, no se envía nada);
    la tabla de cookies describe la partida con hasta cuatro personajes y la copia para deshacer una importación.
  - Landing: tarjetas «El oro pesa» y «El Coleccionista» en Mecánicas; apartado nuevo «Tu partida es tuya» antes de la hoja de ruta;
    hoja de ruta con oro físico, El Coleccionista, personajes y páginas, y copia de seguridad.
  - Capturas de la landing rehechas (landing-shots cierra el aviso de habilidades y usa poco oro para no llenar el almacén de sacos).
  - El tráiler se actualizará al final, con el arte definitivo.
- Plan «Personajes, páginas y copia» y plan «Oro físico»: TERMINADOS.
- Oro físico, decisiones ya tomadas: economía dividida entre 10; mochilas mejores que se compran; saco grande de 2×2 con
  250 monedas (precio 25) y saquito de 1 casilla con 50 (precio 5); monedas sueltas de 10 en 10; los vende un mercader nuevo,
  un duende, «El Coleccionista», que además compra joyas; con el almacén lleno no se completa la venta; iconos provisionales.
- Después: oro físico (monedas que ocupan casilla, saquitos y sacos, pago automático desde las páginas propias, el oro y el botín
  de los enemigos caen en un saco en el suelo). Primero análisis, economía y maquetas en mockups/oro-fisico; esperar aprobación.

## Novedades del 5/11 (tarde, casa)
- **Copia de seguridad:** si el sistema no deja compartir el archivo (Windows rechaza los .json), se descarga y se avisa;
  «Compartir archivo» solo sale en pantallas táctiles.
- **Alijo, fase 1 (selección y arrastre):** arrastrar y soltar con ratón y con dedo en mochila, almacén, bolsillo, equipo,
  pestañas de página y mochila puesta (`pointerDrag.tsx`); solo se ilumina la ranura de equipo que encaja; contorno de objeto
  elegido mucho más visible; tocar un objeto y luego una ranura de equipo ocupada lo equipa. Ver docs/guia-interfaz.md.
- **Alijo, resto de fases:** comparación con lo puesto en la ficha y ▲ en las casillas de las mejoras; «Vaciar mochila» y
  «Guardar materiales»; Mayús+clic; venta de varios marcados con total, selección rápida, confirmación de lo valioso y recompra.
  Decidido: en Vender siempre se puede marcar varios; recompra de los últimos 5 mientras sigas con el mercader; «Soltar» sigue
  igual; el oro de la venta va al almacén (ya era así). No hay barra flotante: las acciones siguen en la ficha.
  Pendiente: el tutorial (enseñar a arrastrar y a tocar y luego tocar). Maquetas en mockups/inventario.

## Novedades del 4/11 (tarde)
- **Despliegue arreglado (0.2.2.1):** los tests de equilibrio fallaban en GitHub (el mago perdía casi siempre contra los jefes
  de mitad de juego). Cambios: Último bastión 2 turnos/recarga 9, Escudo de maná 30 %/recarga 3, Maldición de debilidad con daño
  mágico x1.0, Aplastar x1.4, mago +12 de vida por nivel (antes +10), Señor del Osario ataque 23 (antes 25), Reina Velada magia 25
  (antes 27). Borrado src/shared/MobileNotice.tsx. 188 tests en verde.
- **Tráiler v5 a 45 s:** mapas de 1/3 s, combate en dos intercambios (golpe y contragolpe), móvil más pequeño, logo final 5,7 s y
  rótulo «¿Aliado… otros saqueadores también buscan el oro». Sincronía de sonido medida: golpes y portal a 1–2 fotogramas.
  - render.py redondea cada toma a fotogramas enteros (antes se acumulaba retraso y la imagen iba por detrás del sonido).
  - `HIT_LAG` (retraso entre el golpe y su destello) depende de cada grabación: 0,32 s en la actual. Si se vuelven a grabar las
    tomas (`node scripts/trailer5-capture.cjs http://localhost:5173/play/ /tmp/claude-0/t5`), hay que medirlo otra vez y elegir de
    nuevo las ventanas de «c-duelo» en guion.json con hits.json.
- **Landing v3:** orden Portada → Tráiler → VarkHollow → Mecánicas → Galería → Hoja de ruta → «La puerta está abierta» → Pie.
  - Menú: VarkHollow · Mecánicas · Galería · Hoja de ruta (+ Jugar y Apoyar). El tráiler no va en el menú (está bajo la portada).
    Al volver arriba ya no queda ninguna opción marcada. `#juego` sigue funcionando para enlaces antiguos.
  - Portada sin subtítulo: solo el título, «Confía en tu espada. En nadie más.» y el botón.
  - Mecánicas: título «El oro está abajo. La salida, también.», los cinco pasos y 12 tarjetas en tres grupos (En la expedición,
    En el Bastión, Para crecer) en src/landing/mechanics.tsx. En el móvil se ven 6 y el botón «Ver todas las mecánicas».
  - Bloque «No bajas solo» tras «Elige quién baja»: triángulos de confianza (colores de config/wanderers.ts) y cinco personajes
    reales con sus frases del juego: Kael (destacado), Sela, Malek, Bram (frase de Garra Roja, firmada) y Tobías (prisionero).
  - Maquetas y capturas finales: mockups/landing-v3 (index.html; capturas con `node mockups/landing-v3/capturar.cjs <url> <carpeta>`).
  - Asset pendiente (lo diseña el usuario): icono de «En el ordenador y en el móvil» (móvil o mando); ahora usa la linterna.
- **Personaje reorganizado (opción A de mockups/personaje):** pestañas del mismo ancho «Ataques» (por mano, informativo, con
  «Cambiar armas en el Alijo») y «Habilidad de clase» (camino de hitos 1/20/40/60/80 con candados, progreso y candidatas en gris).
  Rombos en el orden de la barra de combate y con sus colores. Móvil: Atributos · Ataques · Habilidad. Textos pequeños +2 px en
  escritorio y tableta. «Mano izquierda» unificado en combate y Personaje. Detalles en docs/guia-interfaz.md.
  - Decidido: el Escudo de madera, el Tomo arcano y la Maza bendita se quedan con un solo especial (son objetos flojos).
- **Jugar (lobby):** el héroe llena el foco de luz en los tres formatos (screens/Jugar.tsx → `useHeroScale`: alto útil × 0,78–0,8
  entre 26 px; a lo ancho cuenta el cuerpo, 20 px, no el pedestal). En el móvil la barra superior lleva el retrato compacto
  (nombre, nivel y XP) a la izquierda y las pestañas pegadas a la derecha; en móviles de menos de ~800 px de ancho las pestañas se desplazan.

## Cómo trabajamos
- Nombre del juego: **Gravevow** (definitivo desde el 6/11; antes DREADBOUND y luego Crypt Raiders). Dominio: gravevow.com.
  En Steam también se llamará solo «Gravevow». VarkHollow es la región (el lore), no el nombre.
  cryptraiders.es solo redirige (301) a gravevow.com: las partidas de ese dominio se pierden (decisión del usuario; es una alpha).
  Guardado: IndexedDB «gravevow» y localStorage «gravevow.*». Copias: formato «gravevow-backup», código «GV1.»; se siguen
  aceptando las copias antiguas («cryptraiders-backup» y «CR1.»). Correo de contacto: solo en imagen (d4/d5) y en MailButton.
- Repositorio: aitechlabtools/gravevow (antes dreadbound y crypt-raiders; GitHub redirige los enlaces viejos). Web publicada con GitHub Pages en gravevow.com (el dominio se configura en Ajustes › Pages del repositorio).
  OJO: cada push a `main` publica la web (workflow .github/workflows/deploy.yml).
- Carpeta de trabajo en el ordenador: `Documents\GitHub\gravevow` (renombrada el 6/11).
- Claude edita los archivos directamente en esa carpeta. El usuario hace el commit y el push con GitHub Desktop
  (Claude NO hace commits ni push). Al terminar cada fase, Claude da el texto del commit en español.
- Se trabaja en dos ordenadores (casa y otro): push antes de cambiar de equipo, pull al llegar.
- Stack: React 19 + TypeScript + Vite + Tailwind 4 + Phaser 3.90. Tests: `npx tsc --noEmit`, `npx vitest run`,
  y los scripts de Playwright con el servidor `npx vite --port 5173`:
  `node scripts/e2e.cjs http://localhost:5173/play/ <carpeta>`,
  `node scripts/mobile-check.cjs http://localhost:5173/play/ <carpeta>` (y con `"iPad (gen 7) landscape"` como 3.er argumento),
  `node scripts/touch-check.cjs http://localhost:5173/play/ <carpeta>` (toques reales en 5 dispositivos).

## Reglas permanentes del usuario
- Nada de funciones falsas. Solo un jugador: nunca presentarlo como multijugador.
- La descarga sigue en «Próximamente». La Tienda de atuendos cobra solo oro del juego: sin pagos reales ni servicios externos (los datos admiten otra moneda para el futuro).
- Siempre diseñar y probar en ordenador, móvil en horizontal y tableta.
- Mantener al día la lista «Ya disponible» de la landing (src/landing/App.tsx).
- Todo el texto visible en español. Un commit por fase, con mensaje en español.
- El pixel art solo se escala a factores enteros.

## Ya hecho (antes de este plan)
Mercenarios (contratos con Garra, cautivos rescatables, postura agresiva/cauta), minería (vetas, picos con usos,
menas para la forja), cosméticos y armario + maqueta de tienda, revisión de bugs, landing y tráiler v3 actualizados.
Versión publicada: 0.1.5.

## Decisiones sobre la nueva interfaz (inspirada en la estructura de Dark and Darker y Fortnite)
- Forja y Mercenarios siguen dentro de los vendedores, que pasan a llamarse «Mercaderes».
- Sin talentos (ni siquiera «Próximamente»). Sin peso ni temporizador de vendedores.
- Elegida la opción D de las maquetas (mockups/menu-structure/opcion-d.html):
  barra superior con pestañas en píldora; pantalla Jugar minimalista: héroe grande centrado, círculo bajo los pies,
  haz de luz central, mismo fondo que el resto de menús, sin hoguera ni atrezo; tarjeta de zona arriba a la izquierda;
  panel Expedición con «Descender» abajo a la izquierda; anillo de nivel y botones rápidos abajo a la derecha;
  en móvil, el Alijo usa segmentos Equipo / Almacén.
- Maquetas publicadas: https://claude.ai/artifact/26XdkHa5AueQg8HtUPcBiN
- Plan completo: «Crypt Raiders · Plan de móvil, tableta y nuevos menús» https://claude.ai/artifact/1mGtYZhUjJ1oEWLJidZQ6t
- Recomendaciones aceptadas: en combate táctil un toque ejecuta y mantener pulsado enseña la ficha; en iPhone el botón
  de pantalla completa explica cómo «Añadir a pantalla de inicio»; la tableta en vertical se adapta en una fase posterior;
  el menú de pausa no para el reloj de la expedición.

## Plan por fases y estado
1. Controles táctiles — HECHA (commit pendiente del usuario: «Fase 1: controles táctiles fiables»).
   Detección táctil en vivo (`useIsTouch`), un toque ejecuta / pulsación larga = ficha (`useLongPress`),
   joystick que se suelta al abrir menús o cambiar de app, poción y «Usar» en pointerdown (funcionan con un segundo dedo),
   botón «Usar» siempre visible, avisos arriba en táctil, sin zoom ni resaltado al tocar, medidas en src/config/touch.ts,
   nueva prueba scripts/touch-check.cjs (pasaba en los 5 dispositivos).
2. Pantalla completa y horizontal — HECHA (commit pendiente del usuario). Pruebas pasadas el 3/11: touch-check (5 dispositivos),
   mobile-check móvil y tableta, e2e y vitest (136). Arreglado al probar: en Android, tras «Jugar» a pantalla completa,
   Chrome marca «display-mode: fullscreen» y el juego creía estar instalado y ocultaba el botón ⛶ (isStandalone en fullscreen.ts).
   touch-check ahora comprueba que el botón quita la pantalla completa; mobile-check la quita antes de girar.
   src/shared/fullscreen.ts (prefijos webkit, bloqueo de horizontal en Android), botón FullscreenButton en título,
   refugio y mazmorra; en táctil «Jugar» entra a pantalla completa; aviso «Gira el dispositivo para jugar» que congela
   la escena (estado `suspended` en el store; el reloj sigue, como en la pausa); manifest de app instalable
   (public/play/manifest.webmanifest + iconos) y metas de iOS; alturas con 100dvh.
3. HUD táctil de mazmorra y combate — HECHA (commit pendiente del usuario: «Fase 3: HUD táctil de mazmorra y combate»).
   En táctil, barra superior propia (TouchTopHud en DungeonScreen.tsx): ficha compacta, reloj y sala, iconos de 44 px
   (inventario, menú, pantalla completa; iconos provisionales en ui/hudIcons.tsx) y aliados debajo. Joystick 120 px (móvil)
   / 150 px (tableta), Usar 72, Poción 52, separación 12; todo con zonas seguras (`safe()` y `useTouchSize()` en config/touch.ts).
   Combate: órdenes y botones de 44 px, zonas seguras; arreglado que el héroe se quedaba en rojo (pose de golpe) hasta su turno.
   touch-check.cjs comprueba todas estas medidas. En escritorio no cambia nada.
4. Base de interfaz — HECHA (commit: «Fase 4: base de interfaz y barra de pestañas en píldora»).
   config/ui.ts (formatos y medidas) + variables CSS en game.css; piezas en ui/kit (PillBar, Panel, SubHead, Segmented,
   Drawer, Card, usePixelScale); docs/guia-interfaz.md; regla en CLAUDE.md; nueva prueba scripts/menus-check.cjs.
   La barra lateral se sustituye por la barra superior de píldoras (Jugar · Personaje · Alijo · Mercaderes · Misiones ·
   Bestiario · Vestuario · Tienda); «Salir al título» pasa a Ajustes. Pestañas nuevas: tab-play, tab-character, tab-stash,
   tab-merchants… (scripts actualizados). Las pantallas antiguas viven dentro hasta que cada fase las sustituya.
5. Pantalla Jugar (opción D) — HECHA (commit: «Fase 5: nueva pantalla Jugar»). screens/Jugar.tsx: héroe grande con haz de luz y
   pedestal (escala entera 14/10/5), tarjeta de zona con ilustración provisional (fondo de combate de la zona) y «Mapa de zonas»
   (ventana con las 3 zonas, niveles, jefe y bloqueo), panel Expedición con «Descender» (btn-enter-dungeon), anillo de nivel y
   accesos rápidos (Misiones, Reputación, Bestiario, Contrato → contratos de Garra Roja). La pestaña Expedición desaparece.
6. Crear personaje — HECHA (commit: «Fase 6: nueva pantalla de crear personaje»). screens/CrearPersonaje.tsx: tres columnas
   (Clases + capa + piel · la clase en grande con su círculo, a la mayor escala entera que cabe · Sobre la clase con arma,
   puntos fuertes y débiles —campos pros/cons en data/classes.ts—, habilidades iniciales y equipo inicial); abajo Volver,
   nombre y Confirmar (btn-create). Retratos de clase provisionales (el sprite recortado).
7. Alijo — HECHA (commit: «Fase 7: nuevo Alijo»). screens/Alijo.tsx + screens/ItemCard.tsx: Aventurero (retrato, atributos,
   «Ver detalles» → Personaje) · Equipo (ranuras en 3 columnas con arma y secundaria grandes, Mochila, Bolsillo seguro y ficha
   del objeto con sus acciones; la ficha de un arma muestra las habilidades que daría) · Almacén (8/5/6 columnas, Ordenar y
   Ampliar). Mover: arrastrar, o tocar un objeto y después una casilla libre (las libres se marcan). En móvil, segmentos
   Equipo/Almacén y la ficha sale abajo. La ventanita del ratón ya no aparece en táctil.
8. Personaje — HECHA (commit: «Fase 8: nueva pantalla Personaje»). screens/Personaje.tsx: Atributos (nivel, XP, atributos con lo
   que suma el equipo, desglose base/equipo y trayectoria) · héroe con sus habilidades en herradura (máx. 8; ataque básico,
   clase, arma y secundaria con colores por origen) · lista de habilidades por origen con coste y descripción. Tocar o pasar
   el ratón por una habilidad la resalta en las dos partes. Solo informa (sin talentos). En móvil, segmentos Atributos/Habilidades.
9. Mercaderes, Misiones y Bestiario — HECHA (commit: «Fase 9: Mercaderes, Misiones y Bestiario»). screens/Mercaderes.tsx:
   tarjetas (retrato, rango, reputación, misiones listas, servicios; Hablar) e interior en tres zonas (mercader y servicios ·
   Tienda/Misiones/Vender/Forja/Contratos · tu mochila, tus materiales o la ficha del objeto a vender; en móvil, cajón a la
   derecha). screens/Misiones.tsx: un panel por mercader, primero los que tienen misiones listas. Bestiario centrado (ya tenía
   la estructura). Vestuario y Tienda NO se rehacen: los sustituirán las skins (docs/pendiente-skins.md).
   Atuendos (skins) — HECHO (commit: «Atuendos: trajes completos y Tienda con oro (sustituye al Vestuario)»).
   - Datos: src/core/data/skins.ts (3 atuendos: Sudario del Penitente 1.500, Guardián Hueco 4.000, Señor de la Ceniza 9.000;
     precio {moneda, cantidad}: solo se acepta 'gold'; anclajes de manos por fotograma y orden de capas). Lógica: src/core/skins.ts.
   - Partida: profile.skins {owned, equipped}, aparte del inventario; morir no lo quita. Las partidas con el Vestuario
     antiguo cargan y se descartan sus aspectos (nadie los había comprado); misiones y Leyenda ya no dan aspectos.
   - Dibujo (shared/art.ts): cuerpo · secundaria · arma por capas en anclajes. Sin hojas de sprites todavía: cada atuendo usa
     una «ficha» procedural (arte provisional, se indica en la Tienda). Para el arte final: PNG en public/skins/<id>.png
     (tonos #FF00FF/#B000B0 = piel del jugador) y sprites.sheet en los datos; loadSkinSheets() las carga.
   - Interfaz: ranura «Atuendo» bajo Manos en el Alijo → selector (con «Sin atuendo» e «Ir a la Tienda»); pestaña Tienda
     (screens/Atuendos.tsx) con confirmación y «¡Es tuyo!» → Ponérmelo. Pestaña Vestuario eliminada.
   - Prueba: node scripts/e2e-skins.cjs http://localhost:5173/play/ <carpeta> [dispositivo] y tests/skins.test.ts.
   - Tráiler: rótulo cambiado a «ATUENDOS» (trailer/v3/vestuario.png); el vídeo publicado aún no está remontado.
10. Landing — HECHA (commit pendiente del usuario: «Fase 10: landing con VarkHollow, carrusel de capturas y hoja de ruta»).
   Sección «Esto es VarkHollow» (texto A) tras la cabecera, con las tres profundidades y su jefe; capturas en carrusel
   (src/landing/sections.tsx); «Juega gratis ahora» sin listas y con el juego en un marco de móvil; hoja de ruta
   «El camino hacia las profundidades» al final, con los textos en src/landing/roadmap.ts. Textos sin cifras exactas.
   Capturas nuevas con partida avanzada (scripts/landing-shots.cjs → public/screenshots/landing, WebP + PNG;
   scripts/landing-webp.py hace las WebP). og:image y twitter:card con screenshots/landing/compartir.png.
   Guardián Hueco: «desde que cayó la orden». Sin redes sociales (el usuario no tiene).
   Las capturas antiguas de public/screenshots (combat.png, dungeon.png, etc.) ya no se usan: se pueden borrar.
Cada fase termina con: pruebas automáticas, capturas en 1920×1080, 1180×820 y 844×390, explicación de cómo probarlo
(DevTools en modo dispositivo + recargar; en el móvil real: `npm run dev -- --host`, mirar la IP con `ipconfig`
y abrir `http://IP:5173/play/` con el móvil en la misma Wi-Fi), texto del commit y esperar el visto bueno del usuario.

## Siguiente paso
Tráiler v4 (3/11, noche): 52 s, con los menús nuevos (crear, Jugar y mapa de zonas, Alijo, Personaje, Mercaderes con forja
y contratos, Tienda de atuendos), el atuendo puesto en la mazmorra y el juego en el móvil. Rótulos sin cifras exactas.
Cómo rehacerlo: node scripts/trailer4-capture.cjs <url>/play/ /tmp/claude-0/t3 (tomas nuevas; las de mazmorra y combate son
del v3, scripts/trailer3-capture.cjs) → node trailer/v4/make.cjs (rótulos) → python3 trailer/v4/render.py → python3 trailer/v4/music.py
→ ffmpeg (vídeo + música) → public/trailer/cryptraiders-trailer.mp4. El póster (cierre con el logo) no cambia.
Botón «Apoyar» (donaciones con Stripe): ACTIVO con el enlace real desde el 3/11 (DONATE_LINK en src/landing/site.tsx).
Si se pone un enlace «test_», el botón solo sale en desarrollo. Antes: Se activa poniendo el Payment Link de Stripe en DONATE_URL
(src/landing/site.tsx): entonces aparece junto a «Jugar» en la cabecera, en el pie, en el Aviso legal y como apartado
«Si apoyas el proyecto» en la Política de privacidad (y una frase en la de cookies). Es un enlace externo: la web no carga Stripe.
Páginas legales (paso 7) y revisión de calidad (paso 8): HECHAS el 3/11 (commit pendiente del usuario:
«Páginas legales: aviso legal, privacidad y cookies; pie común y revisión de accesibilidad»).
aviso-legal.html, privacidad.html y cookies.html (src/legal), pie común con enlaces (src/landing/site.tsx), enlaces discretos en
Ajustes del juego. Auditoría: sin cookies, sin terceros (fuentes con @fontsource en el propio sitio), solo IndexedDB «cryptraiders»
→ sin banner. Arreglado: el juego creaba una base vacía «dreadbound» al buscar partidas antiguas. Grises de la web aclarados para
contraste AA (axe sin errores). Datos del titular puestos el 3/11 como IMÁGENES (public/legal/d1–d5.png) para que los bots no los copien; domicilio:
solo la ciudad por ahora. Botón «Escribir un correo» que monta la dirección al pulsarlo. Máxima protección: los datos solo se cargan al pulsar «Ver datos del
titular»; robots.txt y meta robots (noindex, noimageindex) en aviso legal y privacidad. Falta que un profesional revise los textos.
Fase 10: HECHA el 3/11 (noche). El plan de 10 fases está terminado. Subzonas, errantes, Kael y tutorial: HECHO el 4/11 (ver abajo). Pendiente de decidir lo siguiente con el usuario
(por ejemplo: arte definitivo de los atuendos, Pícaro y Clérigo, remontar el tráiler con el rótulo «ATUENDOS»).
Cambio de nombre a Crypt Raiders: HECHO (código, landing, app instalable, tráiler y póster).
Idea aceptada para la Fase 7 (Alijo): la ficha de un arma muestra las habilidades que daría antes de equiparla.
Nota: en el PC del trabajo (pci-pau) Claude no tiene terminal; prueba en una copia en la nube (GitHub + cambios)
y copia los archivos a la carpeta.

Texto de commit sugerido para lo entregado (si se sube todo junto):
«Maquetas de menús (opción D), Fase 1: controles táctiles fiables y Fase 2: pantalla completa, horizontal y app instalable»

## Subzonas, mercenarios errantes, Kael y tutorial — HECHO el 4/11 (commit pendiente del usuario)
Plan y decisiones en docs/plan-subzonas.md. El usuario pidió ejecutarlo entero sin parar en cada fase (el arte es provisional,
hecho por código; él diseñará el definitivo con la lista de assets del plan, sección 9).
- S1 Datos: src/core/data/subzones.ts (10 subzonas: afueras, castillo, calabozos · osario, catacumbas, panteon ·
  carmesi, puertas, rios, trono), zones/index.ts (areaDef, subzoneLock, defaultSubzone). Dentro de una zona basta el nivel;
  entre zonas, el jefe de la última subzona de la anterior. Perfil: tutorialDone, kael {missStreak, met}, lastSubzone.
- S2 Jugar: tarjeta con la subzona («La Cripta · 5/10», «Demasiado fácil») y Mapa de zonas con filas de subzona (en móvil,
  una pestaña por zona). Prueba: scripts/subzones-check.cjs.
- S3 Curva: config/subzones.ts → +0/+1/+2 niveles por profundidad de sala, élite +2, jefe +3 (tope: máximo +3);
  bases de las comunes igualadas entre zonas (ZONE_NORMALIZE) y +0,66 %/nivel; menos XP y oro 5+ niveles por encima
  (50 %/75 %) y 10+ (10 %/50 %); cofres con más oro/tiradas en las subzonas hondas y equipo de su nivel (loot.ts).
- S4–S6 Escenarios y criaturas: baldosas por subzona (shared/art.ts → TILESETS, drawFloorTs/drawWallTs), estilos de mapa
  (subzones.ts → map: salas y pasillos), decorado propio (20 piezas), fondos de combate (ui/combatZones.ts) y 39 criaturas
  nuevas (core/data/zones/subzoneEnemies.ts: 25 comunes, 7 élites, 7 jefes; dibujos en MONSTER_SPECS/BEAST_SPECS/FLYER_SPECS).
  Todos los jefes tienen 2.ª fase al 50 % (combat.ts → phase2). Bestiario por subzonas. Equilibrio: tests/balance.test.ts
  («Balance por subzona»). Hoja de arte para revisar: mockups/subzonas/hoja.html (con el servidor: /mockups/subzonas/hoja.html?sub=afueras).
  Capturas en el juego: scripts/subzone-shots.cjs.
- S7–S8 Errantes y Kael: config/wanderers.ts (probabilidades, triángulos, 20 % del oro, robo, hostiles 20 % en 8–10, Kael 33 %
  con garantía tras 4) y core/data/wanderers.ts (Kael, Brann, Sela, Odo, Varga, Malek, Iskra; Osric solo en el tutorial).
  core/social.ts reescrito: el dado se tira al aliarse; el reparto lo cambia; un traidor espera 1 min y un momento de
  debilidad (poca vida tras un combate, cofre con llave o cerca del portal) y SIEMPRE avisa antes. Sin duelo amistoso.
  Kael: solo en la Mazmorra, linterna verde y aviso al acercarte, recuerda cuántas veces os habéis visto.
  Pruebas: tests/wanderers.test.ts y scripts/e2e-social.cjs (reescrito).
- S9 Tutorial: core/data/tutorial.ts (mapa a mano en las Afueras, 11 pasos con textos de ratón y de toque, recompensa),
  store (startTutorial, tutorialCheck, finishTutorial, replayTutorial), guía en DungeonScreen (TutorialGuide) y flecha en la
  escena. No se puede perder (vuelves al último punto seguro). «Saltar el tutorial» al crear personaje si ya se completó en este
  navegador (localStorage cryptraiders.tutorialDone) y «Repetir el tutorial» en Ajustes (sin recompensas ni cambios).
  Con ?debug las pruebas se lo saltan; con ?debug&tutorial se juega. Prueba: scripts/e2e-tutorial.cjs [url] [carpeta] [dispositivo].
- Ayudas de desarrollo (?debug): __CRYPTRAIDERS__.actions.enterDungeon('rios'), __CRYPTRAIDERS__.dev.forceKael = true,
  dev.forceWanderer = 'iskra', dev.forceHostile = true, dev.forceBetrayal = true.
- Landing y hoja de ruta actualizadas (diez escenarios, errantes, tutorial).
- Pendiente para el usuario: arte definitivo (lista de assets en el plan) y nombres si quiere cambiarlos.

## Combate nuevo: barra D, armas por subzona y rarezas — C1–C6 HECHAS el 4/11 (commits pendientes del usuario)
Plan, decisiones y maquetas: docs/plan-combate.md y mockups/combate (barra) y mockups/armas/hoja.html (armas nuevas).
Decisiones del usuario: distribución D; Ímpetu (físico, Guerrero; Tónico de concentración) y Maná (mágico, Mago y futuras clases
mágicas; poción de maná); las recargas pasan de un combate al siguiente dentro de la expedición; rareza y atributos para todo;
legendarias como en el plan; desbloqueo de habilidades de clase A ELEGIR en los niveles 20/40/60/80.
- C1 Datos: data/weapons.ts (familias, básico por familia, itemSpecials: 2 por mano o 4 a dos manos; mano vacía: Golpe bajo y
  Golpe a lo loco / Guardia y Empujón), loadout.ts (right/left/classSkill), recargas (skills.ts → COOLDOWNS y `cooldown`;
  combat.ts → cooldownLeft/tickCooldowns; expedition.cooldowns), costes a la mitad (COST_WITH_COOLDOWN), data/rarity.ts
  (RARITY_RULES, AFFIXES, stackStats, stackName), ItemStack.rarity/affixes, pociones según clase (loot.ts → adaptDrops; las
  guardadas se convierten al cargar). Dev: __CRYPTRAIDERS__.dev.give(id, rareza, atributos), dev.setLevel(n), dev.resetCooldowns().
- C2 Barra D en CombatScreen.tsx (Atacar · Ataque especial · Habilidad · Mochila+Huir; submenús en el mismo sitio; círculo de
  recarga; registro en una línea en móvil). Ímpetu en naranja. Guía: docs/guia-interfaz.md («Barra de combate»).
- C3 Habilidades de clase: CLASSES[c].classSkills (5 por clase), core/classSkills.ts (pendingUnlocks, unlock/equip),
  Profile.classSkills, ui/ClassSkills.tsx (tarjetas en Personaje y aviso en el pueblo). Mecánicas nuevas en combat.ts: escudo
  (shield/ward), aguante (endure), parpadeo (evade), debilidad (weaken), golpes a todos (aoe), robo de vida, pacto de sangre.
  Capturas automáticas: ?debug&noclass oculta el aviso.
- C4 data/subzoneItems.ts: 27 armas/secundarias y 23 piezas nuevas (curvas ITEM_CURVES), 19 especiales nuevos, legendarias
  con especial único (Velo de la Reina, Martillo de Ignaroth, Cadena de Belzar, Ojo del Abismo, Corona rota; y la Gran hoja de
  obsidiana y el Cetro de azufre forjado). REUSED_BY_SUBZONE reparte las antiguas. Dos manos: inventory.ts → fixHands.
  Botín: loot.ts → subzoneChestTable(…, sub). Iconos y aspecto provisionales en shared/art.ts y shared/gearLook.ts.
- C5 Rareza sorteada al caer (rarity.ts → RARITY_ROLL, rollStacks; más alta en subzonas hondas, cofres con llave, élites y
  jefes), atributos con efecto (vampiro, sangrado, verdugo, escarcha, sabio; veloz/piedra/ermitaño suman estadísticas),
  especiales mejorados (rara −1 recarga al primero; épica además +15 %), precio de venta según rareza.
- C6 Equilibrio: 188 pruebas en verde. Ajustes: Escudo de maná 30 % y recarga 3; Maldición de debilidad hace daño (x1.0);
  Aplastar x1.4; Último bastión 2 turnos y recarga 9; recargas del plan −1 turno. La simulación usa la habilidad de clase que
  tendría un jugador a su nivel y la mejor arma de su familia de la subzona. Victorias contra jefes (simulación): Mago 16–75 %,
  Guerrero 29–99 %. A vigilar: el jefe del Umbral Carmesí es casi seguro para el Guerrero (99 %).
- Pendiente: hablar con el usuario cómo actualizar la landing y la hoja de ruta (pidió comentarlo antes); arte definitivo
  (lista de assets en docs/plan-combate.md, sección 11).

## Landing v2, alpha y tráiler v5 — HECHO el 4/11 (commit pendiente del usuario)
Decisiones: titular A («Confía en tu espada. En nadie más.»), lore versión B (aprobado el nuevo: el Bastión es lo que quedó en pie
del castillo; tres criptas para tres clases de muertos; el fuego empezó abajo), sin clip en la portada (el usuario lo quitó),
sin sección ni botón de Windows, tráiler de 60 s.
- Landing (src/landing): menú fijo de 4 enlaces (VarkHollow, El juego, Galería, Hoja de ruta) que resalta la sección visible; en
  móvil ☰ con Apoyar dentro y Jugar siempre visible. Orden: Portada · VarkHollow (intro, crónica desplegable y descenso por las
  10 subzonas, plegado en móvil) · El juego (ciclo, 6 rasgos, clases, Kael) · Galería (tráiler, capturas, móvil) · Hoja de ruta ·
  Cierre (#apoyar). Nota de alpha bajo el botón. Prueba: node scripts/landing-check.cjs [url] [carpeta].
- «Demo» → «alpha» en la landing, metaetiquetas, páginas legales (apartado «La alpha y tu progreso»), título del juego y textos.
  Borrado src/shared/MobileNotice.tsx (no se usaba y estaba desfasado).
- Subzonas renombradas: Afueras del Bastión, El Bastión en ruinas, Las mazmorras del Bastión.
- Capturas de la landing: node scripts/landing-shots.cjs <url>/play/ y python scripts/landing-webp.py (nuevas: especial, afueras).
- Tráiler v5 (60 s, MP4 H.264 + WebM VP9, póster): guion y rótulos editables en trailer/v5/guion.json y trailer/v5/make.cjs.
  Rehacerlo entero: npm run dev y luego npm run trailer (graba las tomas y monta); solo montaje: npm run trailer:render.
  En la landing se reproduce silenciado, en bucle y con playsinline. También genera public/trailer/clip.* (sin uso ahora).

## Ímpetu, maná y botín del combate — HECHO el 5/11 (commit pendiente del usuario)
- Antes el recurso no se acababa nunca (+2 por turno, costes fijos de 1 a 5) y los tónicos no servían.
- Ímpetu (guerrero y pícaro): ya no se recupera solo. +3 al acertar un ataque normal y +1 al recibir un golpe (config/progression.ts).
- Maná: se recupera al final del turno, el 3 % del máximo aprox. (mínimo 1). Meditación y Sifón recuperan en proporción al máximo.
- Costes que crecen con el máximo: skillCost (referencia 25 de ímpetu y 50 de maná); costOf(c, id) en core/combat.ts. Se ve el coste real
  en combate, en Personaje y en el panel de habilidades.
- Tónicos y pociones de maná: 25 o el 35 % del máximo (antes 18 %).
- Combate: números junto a cada barra (PV 39/283, IM 30/44). Al señalar una habilidad (ratón, teclado o mantener pulsado) parpadea en la
  barra el trozo que gastaría (rojo si no llega).
- Victoria: las monedas ya no salen junto a la XP; aparecen dentro de «En el saco» con su icono (hay que cogerlas del saco).

## Reparto con el errante aliado — HECHO el 5/11 (commit pendiente del usuario)
- El reparto se mide por VALOR (core/social.ts → shareVerdict/shareLoot): dar ≥25 % del valor del botín es justo (baja el
  riesgo), algo pero menos es tacaño (no cambia) y nada es avaricioso (lo sube). Medidor en la ventana del botín.
- También piden reparto los sacos de combate en los que luchó el errante (Bag.allyShare) y los cofres de un solo objeto raro o mejor
  (quedárselo solo es tacaño). Las monedas que le das van a su bolsa.
- En el portal (actions.requestExtract) te pide su parte del oro ganado desde que os aliasteis, contando el bolsillo seguro:
  10 % si repartiste bien, 20 % normal, 30 % si fuiste avaricioso. Pagar (mochila → bolsillo → objetos, core/share.ts),
  negarte (combate a muerte sin huida) o atacarle primero (empieza aturdido). «Todavía no» cierra la ventana.
- Kael guarda rencor (profile.kael.grudge, máx. 3): si le niegas su parte o le atacas, la próxima vez llega con riesgo naranja;
  cada bajada en la que le pagas, se le pasa uno.
- Prueba: node scripts/reparto-check.cjs <url>/play/ <carpeta> [dispositivo].

## Misiones y mercaderes — HECHO el 5/11 (commit pendiente del usuario)
- El aviso verde de «Misiones» contaba también misiones completadas que aún no te ofrecen (de otro nivel o fuera de las 3 que
  se ven): ahora usa readyQuestCount (core/quests.ts), el mismo cálculo que el tablón, en la barra, en Jugar y en Mercaderes.
- Mercaderes: «Hablar» ya no sale en dorado en Maese Brand (restos de la maqueta) y los botones quedan alineados abajo.
- Misiones: textos más grandes (nombre, descripción, progreso, recompensas y nota) y botones de 44 px.
- Tablón y misiones aceptadas (core/quests.ts): cada mercader enseña todas las de tu nivel (primero las de tu zona); aceptas
  hasta 5 (MAX_ACTIVE_QUESTS) y solo avanzan las aceptadas. Dejar una la devuelve al tablón y pierde lo hecho. Las repetibles
  vuelven al tablón al cobrarlas. Fijar: recordatorio en Jugar y en la mazmorra (con las bajas de la bajada en curso).
  Las de zonas muy por debajo (nivel − zona > 39) se pliegan en «Encargos antiguos». Partidas antiguas: las misiones con
  progreso pasan a aceptadas (migrateQuests, una sola vez). Prueba: node scripts/misiones-check.cjs <url>/play/ <carpeta> [dispositivo].

## Retoques de landing y menús — HECHO el 5/11 (commit pendiente del usuario)
- Landing, VarkHollow: la línea del descenso pasa por el centro de los rombos.
- Landing, aliados: más aire entre el texto y las fichas, y tres puntos que explican el reparto (cofres y sacos por valor,
  qué pasa si das poco o nada, y la parte del oro en el portal).
- Juego: los títulos de pantalla con `border-0` (Atuendos, Mercaderes, Misiones) ya no sacan la raya de debajo.
- Hoja de ruta: «Ya en el juego» resumida en puntos cortos.
- Ventana del botín con aliado: el aviso explica la marca de la barra y que repartir rebaja lo que pide en el portal.

## Legibilidad de textos — HECHO el 5/11 (commit pendiente del usuario)
- Tipografías: solo tres. Cinzel (títulos), Crimson Pro (textos largos) y Grenze (interfaz: botones, etiquetas y datos),
  que sustituye a Pixelify Sans (el 5 parecía una S). La variable sigue llamándose --font-pixel (shared/theme.css).
  Números a la misma altura con font-variant-numeric: lining-nums. Se quitaron Pixelify Sans y Jersey 10.
- Tamaños mínimos (game.css, bloque «Legibilidad»): las tallas de 9-12 px y text-xs pasan a 14 px; text-sm, 13 y 14 px a 16 px;
  text-base a 17 px. En pantallas bajas (móvil en horizontal) 12/14/16 px. También suben chips, etiquetas de servicios,
  barras del combate, accesos rápidos y la lista de atributos del Alijo.
- Créditos de tipografías en las páginas legales (Cinzel, Crimson Pro y Grenze, SIL OFL). Capturas: node scripts/legibilidad-shots.cjs <url>/play/ <carpeta> [antes].

## Encargos guardados
- Skins de traje completo: HECHO (docs/plan-skins.md, maquetas en mockups/skins).
- Fase 10 (cierre): HECHO (docs/pendiente-landing.md).

## Tutorial (pulido)
- Pasos de inventario (capucha y bolsillo seguro): el personaje no se mueve hasta hacerlos.
- Hoguera: fila de pinchos de pared a pared; el paso de la poción empieza al herirte y no te mueves hasta curarte.
- Al vencer a Osric cae un solo saco («Pertenencias de Osric») con todo su botín.
- Arreglado: las flechas del teclado no movían al personaje en la mazmorra (App.tsx cancelaba la tecla y Phaser la ignoraba).

Cambio de nombre a Gravevow (6/11): HECHO. Juego, app instalable, landing (logo con filete rojo y rombo), textos legales
(dominio, tabla de almacenamiento, fecha), imágenes del correo d4/d5, botón de correo, tráiler v5 renderizado de nuevo
(gravevow-trailer.mp4/.webm y póster) y scripts de prueba. Pendiente del usuario: dominio en Hostinger y GitHub Pages,
redirección de cryptraiders.es y nombre en Stripe. Repositorio y carpeta ya renombrados a «gravevow».

Apoyar (Ko-fi) y Discord (11/11): HECHO. Enlaces en src/shared/community.tsx (Ko-fi sustituye a Stripe en todas partes).
Landing: botones Apoyar y Discord (morado azulado) junto a Jugar; en móvil, solo icono de 44×44 junto a Jugar y con texto
en el menú plegado; también en el cierre y en el pie. Juego: dos botones cuadrados (Apoyar con corazón y Discord) encima del
anillo de nivel en la pestaña Jugar, en el menú principal (bajo «Volver a la web») y en Ajustes. Todos en pestaña nueva
(target _blank, rel noopener noreferrer) con ayuda al pasar el ratón. Si el navegador sale de pantalla completa al abrirlos,
la partida sigue intacta y se vuelve con el botón de pantalla completa. Privacidad y cookies actualizadas (Ko-fi y Discord,
fecha 11/11). Iconos provisionales apuntados en docs/plan-subzonas.md, sección 9.


## 12/11/2026 · Fase 10: reequilibrio, curación y prueba completa
Encargo del usuario: el juego era demasiado difícil. Diagnóstico con simulador (tools/simulador, scripts/simular.mjs), objetivos y
resultados en docs/equilibrio (README.md, simulador-antes.md y simulador-actual.md). Cambios de datos: config/anatomy.ts (lesiones),
config/armor.ts (cobertura, protección por tramos de durabilidad, lesión por tipo de golpe, sangrado de habilidades al 50 %),
config/subzones.ts (ENEMY_DAMAGE y RECOVER_AFTER_WIN), kit inicial con 3 pociones. Lógica: core/armor.ts, combat.ts (armadura,
fx del golpe, unbreakable para el tutorial, también contra el tributo), durability.ts (desgaste de la pieza golpeada),
expedition.ts (Profile.fallen), anatomy.ts (vesperPrice nuevo y cureCost). Interfaz: CureOffer.tsx (resumen, Estado, Vesper),
BodyFigure.tsx (estado en palabra, lista de curas con quién las vende, destino de arrastre `body` en pointerDrag.tsx),
ficha del enemigo con «Puede causar», textos del tutorial. Pruebas: tests/armor.test.ts, tests/cycle.test.ts,
scripts/ciclo-check.cjs (clase, partida nueva o migrada, dispositivo). Maquetas: mockups/curacion/index.html.
Cómo probar: npx vitest run; node scripts/ciclo-check.cjs <url>/play/ <carpeta> warrior nueva (y mage migrada, con
"iPhone 13 Pro Max landscape" e "iPad (gen 7) landscape"); node scripts/simular.mjs 300 actual.

## 12/11 · Ajustes por secciones
Panel nuevo en src/game/ui/Settings.tsx con seis secciones (Sonido, Pantalla, Controles, Partida, Comunidad, Información) y pie
fijo. Volúmenes de música y efectos reales (audio.ts: buses sfxBus y musicBus, setAudio), guardados en la cuenta con la última
sección (Settings.musicVolume, sfxVolume, settingsTab; migran solos con valores por defecto). Tabla de controles revisada
(combate 1–6, Tab, flechas, Esc; mazmorra con 1–9 y R). Partida lleva a la Copia de seguridad y a Elegir personaje. Guía y mini
tutoriales no existen: no se enseñan. Invertir controles táctiles: aplazado. Engranaje nuevo 16×16, 44 px, ayuda «Ajustes (Esc)»
y punto de copia recomendada; Esc abre Ajustes en el Bastión. Iconos provisionales apuntados en docs/ASSETS.md.
Cómo probar: npx vitest run; node scripts/ajustes-check.cjs <url>/play/ <carpeta> (y con "iPad (gen 7) landscape" e
"iPhone 13 landscape"). Maquetas: mockups/ajustes/index.html.

## 12/11 · Bastión en reconstrucción
Las estaciones son partes del Bastión de Ceniza en ruinas que el jugador reconstruye. Textos: «Refugio» → «Bastión» en interfaz,
tutoriales, Guía, landing (roadmap) y docs; ids internos (`refuge`, `btn-refuge`, `tab.refugio`) sin tocar para no romper partidas.
Interfaz: StationPanels.tsx (botón único «Reconstruir»/«Usar», tarjeta tocable, `UpgradeButton`, `CotPanel`, detalle con
«Reconstruir» o «▲ Mejorar · nivel N», sin «Pedir a…» ni «Detalles»), RefugePanels.tsx («El Bastión», «◂ Entrada»/«◂ Volver»,
«▲ Mejorar» dentro de cada estación en uso, platos en la Cocina, `initialDetail`), Mercaderes.tsx («Entrada del Bastión», tarjeta
Bastión, «Ir al Bastión» desde Forja/Cocina/Alquimia/Rincón en ruinas), kit/Card.tsx (`onClick`), stationArt.ts (castillo en
ruinas y versión en ruinas de cada estación). Datos: frases de nivel 1 de config/stations.ts, tutorials.ts (tab.refugio toca la
tarjeta de la cocina; station.* acaba señalando «▲ Mejorar»). Pruebas actualizadas: bastion-check, refugio-check, taller-check,
necesidades-check, e2e-bastion-minis. Maquetas: mockups/bastion-reconstruir/index.html.
Cómo probar: npx tsc --noEmit; npx vitest run; node scripts/bastion-check.cjs <url>/play/ <carpeta> (y con "iPhone 13 landscape"
e "iPad (gen 7) landscape"); igual refugio-check, taller-check, e2e-bastion-minis y necesidades-check.

## 12/11 · Jugar con menos texto
Jugar.tsx: quitadas las líneas fijas de la tarjeta de destino y de Expedición; nueva ficha `HoldTip` (ratón o pulsación larga
con `useLongPress`; la pulsación larga no ejecuta el clic) con niveles, mapa nuevo y lema de la zona, y pociones, oro en riesgo,
mercenario, minutos y pérdida al caer. También fuera: etiqueta «Demasiado fácil» sobre el arte (repetía la nota), «Nivel» bajo el
anillo (el nivel ya sale junto al nombre del héroe; el anillo lleva title y aria-label) y `FirstTimeHint` (lo cuenta el tutorial).
Textos: tutorial.ts (paso extract: «Si caes antes, pierdes lo que llevas») y tutorials.ts (bienvenida, último paso: portal,
pérdida y cómo ver la ficha). Prueba nueva: scripts/jugar-ficha-check.cjs. Pasan subzones-check, menus-check y e2e-tutorial.

## 12/11 · Comer y beber desde el objeto
NeedsBars.tsx: `NeedsPanel` sin lista ni botones (prop `onUse` → `onShowFood`), aviso «Tienes comida/bebida en la mochila»
(`need-food-*`), `NeedBar` con animación al subir y `foodGain`. inventory.tsx: `highlightItems` (evento `gv-hint-items`, clase
`.slot-hint` en la mochila) y `FoodLine` en la ventanita; ItemCard.tsx la enseña también. common.tsx: «Comer»/«Beber» (`act-eat`)
en la mazmorra en vez de «Usar» (solo mochila; los platos no). Alijo.tsx: doble toque come desde mochila y almacén; el aviso pasa a
Equipo si la mochila no se ve. CombatScreen.tsx: comida y bebida en la Mochila de la barra. DungeonScreen.tsx: el aviso abre la
mochila. tutorial.ts (paso eat: mochila → pan → Comer), tutorials.ts (exp.need-low, station.kitchen). Pruebas: necesidades-check,
e2e-tutorial y curas-check adaptados; inventario-check arreglado (Esc abría Ajustes). Pasan también anatomia-check y grupos-check.

## 12/11 · Intendencia › Equipo en dos columnas
Alijo.tsx: el panel Equipo mide su ancho (ResizeObserver) y en escritorio pasa a dos columnas (equipo + Oro/En riesgo | mochila +
bolsillo; `equip-two-cols`, `equip-bag-col`, `gold-box`), con casillas a 60/84 px (o 44/60 px y Aventurero a 280 px por debajo de
1600 px de ancho). Sin barra de ayuda: la ficha (`item-card-wrap`) solo al elegir. Tableta: una columna con casillas a 46 px.
`EquipmentGrid` admite `tight`. kit/Panel.tsx: `SubHead` puede partir en dos líneas. tutorials.ts: el paso de la mochila de la
bienvenida explica ficha, arrastrar y doble clic (antes iba en la barra). Capturas: mockups/intendencia (1920 × 1080, 1366 × 768,
1180 × 820). Pruebas: objetos-check, inventario-check, e2e-bienvenida (3 tamaños), almacen-check, necesidades-check, menus-check.
`arrastre-check` ya fallaba antes en escritorio (slot-backpack-7): pendiente.

