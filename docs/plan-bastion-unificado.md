# Bastión unificado: mercaderes y estaciones en una sola pantalla (propuesta, 14/11)

Estado: **implementado el 14/11** (aprobado: precios del Catre 5/10/15, costes y migración de las estaciones nuevas, baluarte de hueso con Valerius). Maquetas en `mockups/hud-unificado/index.html`.
Alcance acordado: **solo el apartado Bastión**, con la estética actual del juego. El resto de pantallas (Jugar, Personaje,
Intendencia, Misiones, Bestiario, Tienda, Ajustes, mazmorra, combate y resultados) no cambia.

## 1. Qué cambia para el jugador
1. Se elimina la «Entrada del Bastión» (tarjetas Mercaderes / Bastión) y la pantalla «El Bastión» de estaciones.
2. La pestaña **Bastión** muestra directamente los **8 mercaderes** en dos filas de 4, llenando la pantalla.
   Cada tarjeta, de arriba abajo: el nombre en una cabecera; un **primer plano de medio pecho** del mercader (su mismo
   sprite pixel art, recortado por la cabeza y el pecho y a escala entera grande: ×14 en escritorio, ×9 en tableta, ×4 en
   móvil); debajo, el icono de su estación (en ruinas si no está reconstruida), su lugar y el estado («Cocina · Nv 1/3»,
   «Forja de armas · En ruinas»); y la reputación. Sobre el retrato, un aviso si hay algo pendiente: «Misión lista»,
   «▲ Mejora» (mejora pagable) o «Se puede reconstruir» (en el móvil, solo el icono en la esquina).
   Si más adelante haces retratos dibujados a mano, sustituyen a este recorte sin cambiar la tarjeta.
3. Al tocar un mercader se abre **su pantalla**:
   - Izquierda: retrato, nombre, lugar y oficio, su frase, **Pendiente** (misión lista con «Entregar», estación por reconstruir…) y la reputación.
   - Arriba: sus **pestañas** con el selector dorado actual (`Segmented`): solo las que tiene, y al final «◂ Bastión».
   - La pestaña de la estación reúne todo: nivel, «▲ Mejorar» (o «Reconstruir» si está en ruinas), recetas con lo que tienes
     y lo que falta, el botón de fabricar y, a la derecha, tus materiales.
   - Móvil: retrato pequeño y nombre en la misma línea que las pestañas.
4. Para dormir: Bastión → Grizk → pestaña **Catre** → «Dormir». No hay botón en la barra superior.

## 2. Reparto de estaciones (una por mercader)
| Mercader | Lugar | Pestañas | Estación |
|---|---|---|---|
| Nira | El mercado | Tienda · Vender · Misiones · Reparar · **Curtiduría** | **Curtiduría** (nueva: cuero y tela) |
| Hermana Vesper | La enfermería | Tienda · Misiones · Enfermería · **Rincón de cura** | Rincón de cura |
| Garth | La cocina | Tienda · Misiones · **Cocina** | Cocina |
| Orik | El taller | Reparar · Desguace · **Banco de trabajo** | Banco de trabajo (madera y desguace) |
| Grizk | La lonja | Tienda · Vender · Contratos · **Catre** | **Catre** (antes de Orik): hostal de mercenarios |
| Maese Brand | La forja | Tienda · Misiones · Reparar · **Forja de armas** | Forja de armas |
| Valerius | **La armería** (nuevo lugar) | Tienda · Misiones · **Forja de armaduras** | **Forja de armaduras** (nueva) |
| Eldrin | El laboratorio | Tienda · **Laboratorio** | **Laboratorio** = Mesa de alquimia + Atril rúnico |

### Recetas: las mismas, repartidas por material (sin recetas nuevas)
- **Nira · Curtiduría:** cuero curtido, cuero ignífugo, correa, tela tejida, tela de mortaja, seda de ceniza, jubón acolchado,
  túnica de lino, todas las túnicas y corazas de tela o cuero (sombras, archimago, empapada, mortaja, ceniza, sangre seca,
  coraza de cadenas) y las mochilas.
- **Orik · Banco de trabajo:** empuñadura y astil (madera). Su nivel sigue dando el extra de desguace.
- **Maese Brand · Forja de armas:** lingotes (chatarra, cobre, hierro, plata, obsidiana, acero infernal) y las armas forjadas
  con calidad (`data/forge.ts`), salvo las piezas de armadura.
- **Valerius · Forja de armaduras:** cota de malla, placas del Bastión, de plata, de acero infernal y de sangre demoníaca
  (también la versión con calidad de `data/forge.ts`) y el baluarte de hueso (escudo). Los lingotes los hace Brand.
- **Eldrin · Laboratorio:** todo lo de la Mesa de alquimia y del Atril rúnico, en dos grupos («Alquimia» y «Runas»).

### Niveles y costes (propuesta, para aprobar)
- Las estaciones nuevas tienen 3 niveles con los **mismos costes** que la estación de la que salen sus recetas
  (Curtiduría = Banco de trabajo; Forja de armaduras = Forja). El Laboratorio usa los costes de la Mesa de alquimia.
- **Partidas guardadas (migración):** nadie pierde progreso. La Curtiduría empieza con el nivel que tenía el Banco;
  la Forja de armaduras, con el de la Forja; el Laboratorio, con el mayor entre Mesa y Atril. El Catre conserva su nivel.
- **Catre de Grizk:** dormir cuesta **5 oro** (nivel 1), **10** (nivel 2) o **15** (nivel 3); a cambio, el nivel 2 y 3 dan
  el −10 % / −15 % de Descanso gastado que ya tenían. Las mejoras cuestan lo mismo que ahora y las cobra Grizk.
  Si no tienes oro, el botón lo dice («Te faltan N de oro»). *Es el único cambio de reglas.*

## 3. Accesos que hay que redirigir (sin enlaces rotos)
- Botones «Ir» del detalle de estación y de las recetas → pantalla del mercader, en la pestaña de su estación.
- Mini tutoriales: `screen.bastion-entry` y `tab.refugio` se sustituyen por uno nuevo del Bastión unificado;
  `station.*` y `vendor.*` apuntan a los nuevos `data-testid`; `station.cot.*` lo cuenta Grizk; `station.runes`, `station.alchemy`
  y `station.runic` pasan al Laboratorio; nuevos `station.tannery` (Nira) y `station.armory` (Valerius).
- La bienvenida del intendente (`bienvenida`) deja de resaltar `bastion-merchants`.
- Resultados (curar con Vesper, reparar), aviso «puedes fabricar» (`bastion.can-craft`) y Jugar → mercader correspondiente.
- Migración de mini tutoriales (`tutorialsMigration.ts`) y `docs/tutoriales.md`.

## 4. Plan por fases (cada una con capturas antes y después, pruebas y tu confirmación)
1. **Datos y reglas** (≈ media sesión): estaciones nuevas y unidas en `config/stations.ts`, recetas reasignadas en
   `data/crafting.ts` y `data/forge.ts`, Catre de Grizk con precio, migración de partidas en `save.ts`, Valerius en «La armería».
   Tests de Vitest de la migración, del precio del Catre y de que ninguna receta queda sin estación.
2. **Pantalla Bastión con las 8 tarjetas** (≈ media sesión): nueva vista en `screens/Mercaderes.tsx` (fuera la entrada y la
   rejilla de estaciones de `RefugePanels.tsx`), con avisos de pendiente.
3. **Pantalla del mercader con pestañas** (≈ una sesión): retrato y Pendiente a la izquierda, `Segmented` arriba, la estación
   como pestaña (crafteo común, Catre con Dormir, Laboratorio con dos grupos), «Reconstruir» y «▲ Mejorar» dentro.
4. **Accesos, tutoriales y Guía** (≈ media sesión): redirecciones, mini tutoriales, `docs/tutoriales.md`, `docs/guia-interfaz.md`.
5. **Pruebas** (≈ media sesión): `bastion-check`, `refugio-check`, `e2e-bastion-minis`, `e2e-bienvenida`, `taller-check`,
   `menus-check`, `resultados-check`, `tsc` y `vitest`, en escritorio, tableta y móvil.

## 5. Preguntas abiertas
1. ¿Te parecen bien los precios del Catre (5 / 10 / 15 oro)?
2. ¿Las estaciones nuevas con los costes de las de origen y la migración que conserva el nivel?
3. ¿El baluarte de hueso (escudo) con Valerius o con Brand?
