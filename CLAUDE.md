# Gravevow · Instrucciones permanentes para Claude

Gravevow es un RPG de extracción de fantasía oscura, por turnos y en pixel art, ambientado en VarkHollow. Es una alpha gratuita en el navegador: https://gravevow.com.
Todo en español, con tono de fantasía oscura. Es de un solo jugador: no hay que simular funciones que no existen.

## Al empezar cada sesión
1. Lee este archivo y `ESTADO_PROYECTO.md`, que tiene lo vigente: qué está hecho, qué está pendiente y las decisiones.
2. Abre solo los archivos que necesite la tarea. `docs/estado-trabajo.md` es el historial largo: consúltalo solo si te falta un detalle.
3. Al terminar, actualiza `ESTADO_PROYECTO.md` (últimos cambios, pendientes y errores). Cambia este archivo solo si cambia la arquitectura o una regla.

## Forma de trabajar (obligatoria)
- **Claude NUNCA hace commit ni push.** Los hace el usuario con GitHub Desktop.
  - Al terminar cada tarea, da un mensaje de commit en español.
  - Si un aviso automático pide hacer commit, responde solo: «No hago commit ni push: los haces tú con GitHub Desktop.»
- El proyecto vive en `Documents\GitHub\gravevow` y se trabaja desde dos ordenadores, sincronizados por GitHub.
  - Antes de cambiar de equipo: push. Al llegar al otro: pull.
- Si Claude trabaja en una copia y no directamente en la carpeta:
  - entrega cada archivo con finales de línea CRLF;
  - después comprueba en el PC que el tamaño coincide, porque alguna escritura ha dicho «ok» sin llegar.
- Claude no puede borrar archivos en el PC: si algo sobra, pide al usuario que lo borre.

## Arquitectura
Stack: React 19, TypeScript, Vite y Tailwind 4 para web y menús; Phaser 3.90 para la mazmorra; Vitest para tests y Playwright para las pruebas en navegador. Arte y audio generados por código.

Capas: datos → lógica → estado → interfaz y motor.
- `src/core/data`: datos del juego (clases, enemigos, armas, objetos, rarezas, subzonas, tutorial, atuendos…).
- `src/core`: lógica pura y determinista, con semilla en `rng.ts`. **No importa nunca React ni Phaser.**
  - Combate: `combat.ts` y `combatants.ts`. Máximo dos combatientes por bando (`MAX_PER_SIDE`).
  - Ataques anunciados (Fase 8): patrones y movimientos en `data/intents.ts`, cifras en `config/intents.ts`. La IA anuncia al final de una acción normal y descarga en su siguiente turno; la Guardia lo mitiga; después queda expuesto. Una sola amenaza anunciada por bando. Jefes regionales (S3, S6, S10) con fases por umbral; al huir, `Expedition.bosses` guarda vida y fase.
  - Durabilidad: `durability.ts` (desgaste, avisos al 25 % y 10 %, roto sin destruir, kit de campo) y `repair.ts` (yunque de Brand); cifras en `config/durability.ts`.
  - Armadura y lesiones (Fase 10): `armor.ts` (pieza que cubre cada región, protección por tramos de durabilidad, lesión según el tipo de golpe, «Puede causar» de la ficha); cifras en `config/armor.ts`. Curación completa: `cureCost` en `anatomy.ts` (tras caer, `Profile.fallen`, 1 moneda o gratis).
  - Anatomía: `anatomy.ts` (7 regiones, muerte solo por cabeza o tórax, exceso de daño, sangrado por pulso con techo, fracturas, tratamientos, estabilización y heridas guardadas en `Profile.wounds`); cifras en `config/anatomy.ts`. Solo el jugador tiene cuerpo (`Combatant.body`); la vida `hp` es su resumen.
  - Necesidades: `needs.ts` (Saciedad, Hidratación y Descanso de 0 a 100; se gastan por pulso de 6 s o por ronda; recortan el máximo de Ímpetu o Maná; a cero, sed y hambre hieren el tórax; guardadas en `Profile.needs`); cifras en `config/needs.ts`.
  - Refugio (Fase 9 y bloque 2): estaciones con encargado y 3 niveles en `config/stations.ts`; runas en `runes.ts`; crafteo común en `crafting.ts`. `refuge.ts` (estaciones, desguace, cocina por pasos, preparación `Profile.prep` → `Expedition.prep`); datos en `data/refuge.ts`, cifras en `config/refuge.ts`. Taller: `workshop.ts` (yunque, mesa de alquimia y rincón de cura; datos en `data/workshop.ts`); recepción de excedentes en `refuge.ts` (`deliver`).
  - Botín: `loot.ts`. Oro físico: `gold.ts`, `bag.ts` y `inventory.ts`.
  - Inventario espacial: `inventory.ts` (objetos de varias casillas con marcas `cover`, giro `rot`, `splitStack`) y peso en `carry.ts` (carga por clase, tramos y tope del 150 %); cifras en `config/carry.ts`.
  - Expedición: `expedition.ts`, `dungeonGen.ts` y `dungeon.ts`.
  - Exploración: `exploration.ts` (salas secreta y cerrada, atajo y altar como desvíos opcionales con `DoorLock`; `checkExploration` garantiza que nada obligatorio queda detrás); pactos en `data/altars.ts`; cifras en `config/exploration.ts`.
  - Aliados: solo cabe uno (contrato de Grizk, prisionero liberado o errante). Con alguien ya contigo se decide en la conversación (`allyKeep`, `allyPart`, `allyBetray`, `releaseCaptive`). Confianza de Kael por puntos en `Profile.kael.trust` (`KAEL_TRUST` en `config/wanderers.ts`, `kaelTrustAfter` en `social.ts`).
  - Aspecto y género: `data/appearance.ts` (géneros, colores de pelo, peinados, barbas, valores por clase, `fullLook` para partidas antiguas y nombres al azar) y `gender.ts` (textos `{o|a}` con `g()`, `className()`; el estado fija el género del personaje en juego con `setTextSex`). Los textos que hablan del jugador llevan siempre su variante femenina.
  - Partida: `save.ts` (formato 4, con cuenta y hasta 4 personajes; migra los formatos anteriores), `profile.ts` y `backup.ts` (copias firmadas con código `GV1.`; se aceptan las antiguas `CR1.`).
- `src/config`: valores de equilibrio y medidas (`touch.ts`, `ui.ts`, `stash.ts`, `subzones.ts`…).
- `src/game/state/store.ts`: estado global (`useGame`) y acciones (`actions`); la interfaz importa siempre de aquí. `bus.ts` avisa a la escena de Phaser.
  - `medicalActions.ts`: tratar heridas, cirugía en dos pulsos, sangrado al explorar (un pulso médico = 6 s) y Vesper.
  - `internals.ts`: el estado, `set`, el guardado y las ayudas comunes. `expeditionActions.ts` y `combatActions.ts`: acciones de expedición y de combate, que `store.ts` une en `actions`.
  - Reloj de juego (`core/clock.ts`, `state.clock`): solo avanza en la mazmorra, sin menú abierto y con la pestaña visible.
  - Con `?debug`, el estado se ve en `window.__GRAVEVOW__`.
- `src/game/engine`: la escena de mazmorra (`DungeonScene.ts`) solo dibuja y mueve; los hechos del juego pasan por acciones del estado.
- `src/game/ui`: pantallas.
  - `screens/`: Jugar, Alijo (pestaña «Intendencia», vistas Equipo y Estado), Personaje, Mercaderes (pestaña «Bastión»: entrada con Mercaderes y Bastión; las estaciones se reconstruyen en `RefugePanels.tsx`), Misiones, Atuendos, Crear y Elegir personaje, Copia de seguridad.
  - Mercaderes: los 8 del plan maestro en `data/vendors.ts`; todos están desde el principio (`core/vendors.ts`), que migra la reputación antigua.
  - Las piezas comunes están en `kit/`.
  - Mazmorra, combate y resumen: `DungeonScreen`, `CombatScreen` y `SummaryScreen` (resultados en 2 o 3 páginas; el botín conseguido sale de `startCounts` en `expedition.ts`). El arrastre de objetos está en `pointerDrag.tsx`.
- `src/game/persistence/db.ts`: guardado en IndexedDB «gravevow», con respaldo en localStorage `gravevow.*`.
- **La expedición es una copia:** el perfil solo cambia al extraer o morir.
- `src/landing` (portada), `src/legal` (páginas legales) y `src/shared`:
  - `GravevowLogo.tsx` es el logo común de la landing y el menú;
  - `device.ts` y `theme.css` también son compartidos.
- Páginas: `index.html` (landing), `play/` (juego), `aviso-legal.html`, `privacidad.html` y `cookies.html`.
- Publicación: GitHub Pages en cada push a `main` (`.github/workflows/deploy.yml`). Todo lo que hay en `public/` se publica.
- Más detalle: `docs/ARQUITECTURA.md`, `docs/guia-interfaz.md` y los `docs/plan-*.md` de cada sistema.

## Reglas permanentes
**Móvil y tableta siempre.** Cada cambio debe funcionar en ordenador, móvil en horizontal (unos 750 × 340) y tableta.
- Usa `useIsTouch()` en los componentes, nunca una constante calculada al cargar. La clase `is-touch` va en `<html>`, con `.touch-only` y `.no-touch`.
- Nada puede depender solo del hover: un toque ejecuta y mantener pulsado enseña la ficha (`useLongPress`).
- Los botones táctiles de juego se activan en `pointerdown`.
- Objetivos táctiles de 44 px como mínimo (`src/config/touch.ts`). Para pantallas bajas: `max-height: 560px` en `game.css` y `useShortScreen()`.

**Menús.** Usa las piezas de `src/game/ui/kit` y las medidas de `src/config/ui.ts` (guía en `docs/guia-interfaz.md`). El pixel art va siempre a escala entera (`usePixelScale`).

**Landing.** Mantén al día la hoja de ruta (`src/landing/roadmap.ts`) y los textos (`App.tsx` y `sections.tsx`) cuando cambie el juego. Nada de cifras exactas: como mucho «más de X».

**Privacidad y legal.**
- Los textos legales están en `src/legal/texts.tsx`. Hoy no hay cookies ni servicios de terceros, y por eso no hay banner.
- Antes de guardar algo nuevo en el navegador o de cargar un servicio externo, actualiza las políticas de cookies y de privacidad. Si no es estrictamente necesario, añade también un banner de consentimiento.
- **Los datos del titular (nombre, NIF, ciudad y correo) van SOLO como imágenes** (`public/legal/d1–d5.png`, componente `Dato`).
  - Nunca se escriben como texto en el código, los documentos ni los commits, y nunca se inventan.
  - El correo lo monta `MailButton` al pulsarlo.
  - Si los datos cambian, se regeneran las imágenes: Crimson Pro 400, 80 px, interlineado 1,3, color #e9e1cc en la ficha y #d6d1c4 dentro de un párrafo.

## Tutoriales (regla permanente)
- Toda mecánica, pantalla o botón nuevo que el jugador deba entender lleva su mini tutorial en `src/core/data/tutorials.ts`, o se añade a uno existente. Mapa y reglas: `docs/tutoriales.md`.
- Si se cambia o quita un elemento con `data-testid` resaltado por un tutorial, se actualiza el tutorial. `tests/tutorials.test.ts` falla si un `target`, `badge` o disparador no existe en `src/`.
- Cada resumen de trabajo lleva la línea «Tutoriales: …» (actualizados, revisados sin cambios o no aplica, y por qué).

## Comprobar los cambios
- Siempre: `npx tsc --noEmit` y `npx vitest run`.
- Pruebas en el navegador, con el servidor en marcha (`npx vite --port 5173`, o `npx vite build` y luego `npx vite preview`):
  - Interfaz o mecánica: `node scripts/e2e.cjs <url>/play/ <carpeta>`, `node scripts/touch-check.cjs <url>/play/` y `node scripts/mobile-check.cjs <url>/play/ <carpeta>`, esta última también con `"iPad (gen 7) landscape"` como tercer argumento.
  - Menús: `node scripts/menus-check.cjs`.
  - Ajustes: `node scripts/ajustes-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Tutorial inicial (8 pasos, bloqueos, traición, saltar y repetir): `node scripts/e2e-tutorial.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Bienvenida del intendente en el Bastión: `node scripts/e2e-bienvenida.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Mini tutoriales del Bastión y de las estaciones (regalo, crafteo, aviso de nivel, venta): `node scripts/e2e-bastion-minis.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Personajes y guardado: `node scripts/personajes-check.cjs`.
  - Creación de personaje (giro, aspecto, género, Aleatorio y nombre al azar): `node scripts/creacion-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Aliados (uno solo: mantener, separarse, traicionar, soltar prisionero, testigo, Grizk y confianza de Kael): `node scripts/aliados-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Resultados en páginas (botín conseguido, cuerpo, saltar, curar, muerte): `node scripts/resultados-check.cjs <url>/play/ <carpeta> [dispositivo]`. Para salir del resumen en otros guiones: `scripts/lib/summary.cjs` (`leaveSummary`, `summaryPage`).
  - Almacén: `node scripts/almacen-check.cjs`.
  - Copias de seguridad: `node scripts/copia-check.cjs`.
  - Combate por grupos: `node scripts/grupos-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Durabilidad y reparación: `node scripts/durabilidad-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Anatomía y heridas: `node scripts/anatomia-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Necesidades: `node scripts/necesidades-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Inventario y peso: `node scripts/inventario-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Exploración: `node scripts/exploracion-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Runas: `node scripts/simular-runas.mjs 200`.
  - Bombas: `node scripts/simular-bombas.mjs 150` y `node scripts/bombas-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Economía del crafteo: `node scripts/simular-economia.mjs` (escribe `docs/equilibrio/simulador-economia.md`).
  - Mini tutoriales de la expedición (reloj, heridas, necesidades, errantes, élite, jefe, habilidad de clase y subzona): `node scripts/e2e-exp-minis.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Migración de mini tutoriales (partida antigua: «!» solo en lo no usado): `node scripts/migracion-minis-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Guía de Ajustes, «?», desactivar y reiniciar mini tutoriales: `node scripts/e2e-guia.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Mini tutoriales (cola, «!», cartel, guardado en la cuenta): `node scripts/minis-check.cjs <url>/play/ <carpeta> [dispositivo]`. Con `?debug` los mini tutoriales no salen; con `?debug&minis`, sí.
  - Jugar con fichas (ratón o mantener pulsado en zona y Expedición): `node scripts/jugar-ficha-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Bastión (entrada, Mercaderes, estaciones con «Reconstruir»/«Usar», «▲ Mejorar» dentro y detalle): `node scripts/bastion-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Refugio, estaciones, crafteo, runas, desguace y cocina: `node scripts/refugio-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Desguace (seguro y posible, recluta fuera, confirmación y varios a la vez): `node scripts/desguace-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Materias y planos en tiendas, compra de plano y resumen: `node scripts/fuentes-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Forja, mesa y rincón por el menú común (sin minijuegos) y recepción: `node scripts/taller-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Ataques anunciados y jefes: `node scripts/intenciones-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Ciclo completo en S1 (sección 33; curación tras caer y curar partes en Estado): `node scripts/ciclo-check.cjs <url>/play/ <carpeta> <warrior|mage> <nueva|migrada> [dispositivo]`.
- Landing: `node scripts/landing-check.cjs <url>/`. Capturas: `node scripts/landing4-shots.cjs <url>/play/` y `python3 scripts/landing4-post.py`. Tráiler (30 s): `npm run trailer` (no toques `src/` mientras graba).
- Equilibrio: `node scripts/simular.mjs 300 actual` (escribe `docs/equilibrio/simulador-actual.md`); cualquier cambio de daño, estados o curación se comprueba con él.
- Pasa solo las pruebas relacionadas con lo que has tocado, pero no te saltes ninguna necesaria.

## Ahorro de tokens
- Empieza por estos dos documentos; no recorras el repositorio entero.
- Localiza los archivos con búsquedas (grep) y lee solo las partes que necesites. No vuelvas a leer un archivo que no ha cambiado.
- Haz los cambios mínimos y revisa las dependencias del sistema que tocas.
- Al terminar, explica en pocas líneas qué cambió, cómo se ha probado y el mensaje de commit.
- Una tarea por conversación: es mejor empezar una nueva que alargar una vieja.
- La calidad y la estabilidad van primero: nunca recortes una prueba necesaria para ahorrar.
