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
  - Durabilidad: `durability.ts` (desgaste, avisos al 25 % y 10 %, roto sin destruir, kit de campo) y `repair.ts` (yunque de Brand); cifras en `config/durability.ts`.
  - Anatomía: `anatomy.ts` (7 regiones, muerte solo por cabeza o tórax, exceso de daño, sangrado por pulso con techo, fracturas, tratamientos, estabilización y heridas guardadas en `Profile.wounds`); cifras en `config/anatomy.ts`. Solo el jugador tiene cuerpo (`Combatant.body`); la vida `hp` es su resumen.
  - Necesidades: `needs.ts` (Saciedad, Hidratación y Descanso de 0 a 100; se gastan por pulso de 6 s o por ronda; recortan el máximo de Ímpetu o Maná; a cero, sed y hambre hieren el tórax; guardadas en `Profile.needs`); cifras en `config/needs.ts`.
  - Botín: `loot.ts`. Oro físico: `gold.ts`, `bag.ts` y `inventory.ts`.
  - Expedición: `expedition.ts`, `dungeonGen.ts` y `dungeon.ts`.
  - Partida: `save.ts` (formato 4, con cuenta y hasta 4 personajes; migra los formatos anteriores), `profile.ts` y `backup.ts` (copias firmadas con código `GV1.`; se aceptan las antiguas `CR1.`).
- `src/config`: valores de equilibrio y medidas (`touch.ts`, `ui.ts`, `stash.ts`, `subzones.ts`…).
- `src/game/state/store.ts`: estado global (`useGame`) y acciones (`actions`); la interfaz importa siempre de aquí. `bus.ts` avisa a la escena de Phaser.
  - `medicalActions.ts`: tratar heridas, cirugía en dos pulsos, sangrado al explorar (un pulso médico = 6 s) y Vesper.
  - `internals.ts`: el estado, `set`, el guardado y las ayudas comunes. `expeditionActions.ts` y `combatActions.ts`: acciones de expedición y de combate, que `store.ts` une en `actions`.
  - Reloj de juego (`core/clock.ts`, `state.clock`): solo avanza en la mazmorra, sin menú abierto y con la pestaña visible.
  - Con `?debug`, el estado se ve en `window.__GRAVEVOW__`.
- `src/game/engine`: la escena de mazmorra (`DungeonScene.ts`) solo dibuja y mueve; los hechos del juego pasan por acciones del estado.
- `src/game/ui`: pantallas.
  - `screens/`: Jugar, Alijo, Personaje, Mercaderes, Misiones, Atuendos, Crear y Elegir personaje, Copia de seguridad.
  - Las piezas comunes están en `kit/`.
  - Mazmorra, combate y resumen: `DungeonScreen`, `CombatScreen` y `SummaryScreen`. El arrastre de objetos está en `pointerDrag.tsx`.
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

## Comprobar los cambios
- Siempre: `npx tsc --noEmit` y `npx vitest run`.
- Pruebas en el navegador, con el servidor en marcha (`npx vite --port 5173`, o `npx vite build` y luego `npx vite preview`):
  - Interfaz o mecánica: `node scripts/e2e.cjs <url>/play/ <carpeta>`, `node scripts/touch-check.cjs <url>/play/` y `node scripts/mobile-check.cjs <url>/play/ <carpeta>`, esta última también con `"iPad (gen 7) landscape"` como tercer argumento.
  - Menús: `node scripts/menus-check.cjs`.
  - Tutorial: `node scripts/e2e-tutorial.cjs`.
  - Personajes y guardado: `node scripts/personajes-check.cjs`.
  - Almacén: `node scripts/almacen-check.cjs`.
  - Copias de seguridad: `node scripts/copia-check.cjs`.
  - Combate por grupos: `node scripts/grupos-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Durabilidad y reparación: `node scripts/durabilidad-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Anatomía y heridas: `node scripts/anatomia-check.cjs <url>/play/ <carpeta> [dispositivo]`.
  - Necesidades: `node scripts/necesidades-check.cjs <url>/play/ <carpeta> [dispositivo]`.
- Pasa solo las pruebas relacionadas con lo que has tocado, pero no te saltes ninguna necesaria.

## Ahorro de tokens
- Empieza por estos dos documentos; no recorras el repositorio entero.
- Localiza los archivos con búsquedas (grep) y lee solo las partes que necesites. No vuelvas a leer un archivo que no ha cambiado.
- Haz los cambios mínimos y revisa las dependencias del sistema que tocas.
- Al terminar, explica en pocas líneas qué cambió, cómo se ha probado y el mensaje de commit.
- Una tarea por conversación: es mejor empezar una nueva que alargar una vieja.
- La calidad y la estabilidad van primero: nunca recortes una prueba necesaria para ahorrar.
