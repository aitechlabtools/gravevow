# Crypt Raiders · Estado del trabajo (traspaso entre chats)

Última actualización: 5 de noviembre de 2026.
Este documento resume todo lo hablado y hecho para que otro chat de Claude pueda continuar sin perder contexto.
Léelo junto con CLAUDE.md (reglas permanentes del proyecto).

## Novedades del 25/11 (9): Alijo › Equipo, versión 3
- Aventurero · Equipo (muñeco de ranuras + mochila con bolsillo seguro y oro) · Almacén, según la captura del usuario. Móvil sin cambios (personaje con casillas alrededor). Capturas `mockups/plan-interfaz-2/alijo/v3-*`.

## Novedades del 25/11 (8): Habilidades, versión 3 (todo a la vista)
- Atributos · héroe · Habilidades (fichas por mano, hitos de clase en rombos y detalle con Equipar/Elegir). Los atributos marcan lo que cambia la habilidad elegida. Sin pestañas. Mini tutorial `tab.personaje` actualizado (3 pasos). Prueba: `habilidades/pestanas.cjs`.

## Novedades del 25/11 (7): Habilidades rehecha
- Héroe grande con su círculo a la izquierda y un panel con pestañas Ataques · Habilidades de clase a la derecha, en los tres formatos (ver guia-interfaz › Habilidades). Fuera el camino vertical de hitos: ahora línea horizontal y solo el próximo hito. Ninguna regla cambia.
- Retoque: el héroe en un panel con cabecera (clase, nombre y nivel) y barra de pista abajo; tarjetas de ataque con icono e indicadores rotulados. Tocar una tarjeta de clase ya no cambia de pestaña (`habilidades/pestanas.cjs`).
- Fichas verticales que llenan el panel en Ataques y en Habilidades de clase (estructura de las capturas del usuario).
- Capturas: `mockups/plan-interfaz-2/habilidades/capturar.cjs` (`NV=40` hito por elegir, `CLASE=mage`).

## Novedades del 25/11 (6): mismo diseño en móvil y tableta
- Regla: escritorio, tableta y móvil llevan siempre el mismo diseño, adaptado al espacio.
- Heridas en tableta: arreglado el solape del cuerpo con «Tus curas» (consulta de contenedor a 500 px; antes 540).
- Móvil: Misiones con el diario (Detalle · Tablón en pestañas), Alijo › Equipo con el personaje y las casillas alrededor, Heridas con la mochila de curas, estación en ruinas con el dibujo al lado y el seguro con la lista desplazable. Quitada la vista antigua de Misiones del móvil (`Misiones.tsx` ya solo monta `QuestJournal`) y `EquipmentGrid` del Alijo.
- Alijo › Equipo: almacén con título «◆ Almacén ◆» y casillas del mismo tamaño que el resto (barra de desplazamiento si no caben las 15 filas). Columnas: personaje (resto) · mochila · almacén (a su ancho).
- Capturas `movil-adaptado-*` en `mockups/plan-interfaz-2/{misiones,alijo,ruinas}`; prueba `misiones/funcional-movil.cjs`.

## Novedades del 25/11 (5): plan de interfaz 2, fase E (mapa de zonas ilustrado)
- `ZoneMap` (`screens/Jugar.tsx`) con la estructura del usuario: ✕ arriba (`btn-zone-map-close`), dibujo del descenso a la izquierda (`mapArt.ts`, 160×150 px por código, provisional; ×3/×2/×1 según alto) con nombres de estrato y 10 marcadores (`map-node-*`: elegida dorada, jefe roja, cerradas con candado), y a la derecha pestañas de zona en fila (`zone-tab-*`), subtítulo, motivo del bloqueo una vez (`zone-lock`), subzonas y ficha del jefe (`zone-boss`). En móvil los marcadores son de adorno y se elige en la lista. Tocar pestaña, franja o marcador cerrado no elige expedición. Pruebas: `mockups/plan-interfaz-2/fase-e/funcional.cjs` y `capturar.cjs`.

## Novedades del 25/11 (4): plan de interfaz 2, fase D (mercaderes y servicios)
- Letra base en móvil horizontal 12 px (antes 11; `html{font-size}` en `game.css`). Pestañas de la venta, candado de Contratos y punto de aviso a 12 px mínimo. Nombres a dos líneas: tienda (`.shop-name` con `line-clamp-2`), seguro (`.ins-card-name` con guiones), nombre y estación del mercader en la columna. Botón «Ir» de materiales y −/+ de fabricar con 44 px.
- Medición: `mockups/plan-interfaz-2/fase-d/medir.cjs` (todas las vistas de los 8 mercaderes, 7 tamaños, ruinas y reconstruidas; `SOLO=1366,844` para limitar). Ojo: los clics de Playwright cuentan como ratón y quitan `is-touch`; el script simula un toque antes de medir.

## Novedades del 25/11 (3): plan de interfaz 2, fase C (Alijo)
- Heridas en móvil: el panel lleva `.body-cq` (consulta por ancho); por debajo de 360 px el cuerpo pasa a 64 % y las etiquetas miden 44 px. En pantallas bajas la etiqueta de la cabeza va a la derecha para no pisar el tórax (en 640×360 aún se rozan 3 px). El almacén en portátil no se toca: 15 filas por página siempre piden desplazar.

## Novedades del 25/11 (2): plan de interfaz 2, fase B (estaciones)
- `StationDetail` mide su ancho: por debajo de `STATION_WIDE_MIN` (1000 px) pliega niveles y mejora en la cabecera «Niveles y mejora ▾» también en escritorio (portátil 1280–1600). `CraftPanel` mide la ficha: en escritorio estrecho usa tamaños de tableta (icono 128/96, título 22/20). Nombres de receta y botones del mercader (`.vtab-lbl`) a dos líneas en vez de «…». Comprobación: `mockups/plan-interfaz-2/fase-b-estaciones.cjs` (8 estaciones, 5 tamaños, fabricar a mochila y almacén).
- Botón «Volver al Bastión» del mercader: el castillo se quita si el botón no tiene alto (`@container`, `.vback-card`); la ficha del retrato mide `clamp(220px, 36vh, 380px)` en escritorio para que en pantallas de 720–768 px de alto el botón quede a la vista sin desplazar.

## Novedades del 25/11: plan de interfaz 2, fase A (barra superior)
- Revisado el plan de ChatGPT con mediciones reales: `docs/plan-interfaz-2.md` (fases A–E, capturas en `mockups/plan-interfaz-2/baseline/`).
- Fase A hecha: si los nombres de las pestañas no caben (portátil 1280–1450 px), `PillBar` lo mide y pone `.ui-pills.tight` (solo iconos y el nombre de la activa; nombre al pasar el ratón). Retrato `nav-chip` con 44 px de ancho mínimo. Comprobación: `mockups/plan-interfaz-2/fase-a/medir.cjs` (9 tamaños).

## Novedades del 24/11 (4): retoques de la venta
- Fuera las iniciales del comprador en todas las casillas (también en el Alijo) y la caja «Compra: …» de todos los mercaderes. Si el especialista no tiene estación, lo avisa la lista «A vender» (`sell-closed`). Pestañas y páginas elegidas de la venta, en dorado. Almacén de la venta: casillas a lo ancho hasta 80 px (`StashPanel fill`).

## Novedades del 24/11 (3): rediseño de la pantalla de venta
- Tres columnas. Izquierda: el mercader con «Compra: …» (`vendor-buys`; si su estación está en ruinas, `sell-closed`). Centro: pestañas Mochila · Almacén · Compartido (`sell-tab-*`; el almacén con sus páginas, sin la de Compartido) y barra `sell-tools`: «Vendibles», rareza, tipo, «Todo lo vendible (mochila / esta página)», «Comunes (…)» y «Limpiar». Derecha: lista «A vender» (cantidad elegible en las pilas, «Por precio»), ficha del objeto elegido y, abajo fija, objetos, oro actual, total, oro después y el botón.
- Los filtros solo apagan casillas (`SellFilter`, `.slot-filtered`): nada cambia de sitio. La selección se recuerda entre pestañas y páginas. Lo del Compartido no se vende (como antes): sale apagado y lo dice.
- Vender N unidades: `sell(..., n)` y `sellMany` con `qty`. Precios sin cambios.
- Candado (nuevo, se guarda en el objeto: `ItemStack.locked`): «Proteger / Quitar candado» en la ficha (Bastión y venta), `actions.toggleLock`. Lo protegido no se vende ni se desguaza y queda fuera de la selección rápida. Partidas antiguas: sin el campo, sin candado.
- Confirmación solo para épico, legendario o mejor que lo equipado (antes también raro). Recompra igual. Aviso «+N oro» animado junto al botón (`sale-pop`, 0,9 s, sin bloquear); la venta desde esta pantalla ya no saca el aviso de abajo.
- Las iniciales del comprador ya no salen en la venta (siguen en el Alijo). Se quitaron «Vender todo lo que compro» y su ventana: lo sustituye «Todo lo vendible».
- Comprobación: `mockups/venta-ui/real.cjs` (32 ✓). `mockups/venta-oficio/real.cjs` queda obsoleto (usaba el botón quitado).

## Novedades del 24/11 (2): venta por oficio
- Plan en `docs/plan-venta-oficio.md` (implementado, con las recomendaciones aprobadas); maquetas y capturas reales en `mockups/venta-oficio/` (`real.cjs`: 93 comprobaciones).
- Los 8 mercaderes compran (`buysItems: true`), cada uno lo de su oficio. Reglas en `src/core/sellRoutes.ts`: `buyerOf` (especialista), `whoBuys` (si su estación sigue en ruinas, Nira), `isHeavy`, `wrongBuyerText`, `TRADE`, `PLACE`, `BUYER_TAG`.
- Reparto: Nira cuero, tela, armadura ligera y mochilas; Vesper pociones, remedios y hierba amarga; Garth comida e ingredientes; Orik metal, madera, chatarra, herramientas y antorchas; Grizk joyas, tesoros y llaves (×1,25, siempre); Brand armas y dagas secundarias; Valerius armadura pesada y escudos; Eldrin reactivos, bombas, runas, tomos y orbes. Planos: el dueño de la estación de su receta.
- Pesada = escudo, `heavy: true` en la ficha (guanteletes de forja) o solo para guerreros y clérigos.
- Precio: el especialista paga un 10 % más (`SPECIALIST_BONUS`); Nira por cuenta de otro, el de siempre. `buysThis(vendor, itemId, profile)` ahora pide el perfil.
- Interfaz: en «Vender», lo que no compra sale apagado (`slot-nobuy`) y al marcarlo o arrastrarlo avisa a quién se vende (la caja «Lo que compro» y «Vender todo lo que compro» se sustituyeron el 24/11, ver arriba). Iniciales del comprador en cada casilla del Bastión (`slot-buyer`, arriba a la derecha) y «Lo compra X · lugar» en la ficha y en la ventanita.
- Tutoriales: `vendor.*` con un paso de venta (el de Orik ya no habla de reparar), `bastion.first-sale` con un paso nuevo.

## Novedades del 22/11 (2): Contratos de Grizk más visuales
- `ContractsPanel.tsx` rehecho según `mockups/contratos`: rejilla de bustos (cabeza y pecho, escala entera) por zona, con 🔒 y el rango necesario en los bloqueados y silueta «¿?» en los desconocidos; ficha con busto grande, oficio, frase y habilidades como chips (descripción al pasar el ratón); cuatro cifras grandes con icono (vida, ataque, defensa, velocidad); duración en tres botones grandes con precio y descuento; actitud en dos botones (la explicación en el título); botón final que dice lo que falta. Fuera la nota que decía que caben mercenario y errante a la vez.
- Ordenador, tableta y móvil: en tableta y móvil se ocultan la frase y las habilidades y los bustos son más pequeños; en tableta las cifras van en 2 × 2. Estilos: bloque «Contratos de Grizk» de `game.css`. Se mantienen todos los `data-testid`.
- Probado: `e2e-merc` (contratar, Lysa bloqueada) y capturas en los tres tamaños.
- Retoque: bustos de pecho para arriba (recorte 14 × 14 del sprite, como el retrato de Grizk) y más grandes; botones de duración, actitud y contratar más bajos; el descuento ya no es una etiqueta verde, va junto al precio («15 −15 %»); en tableta y móvil el candado va en la esquina sin tapar la cara.
- Los bustos de Contratos se ajustan al hueco real de la página (`ResizeObserver` sobre `.ct`): con altura, el busto de la ficha llena el espacio sobre «Expediciones»; si la página es estrecha (menos de 1000 px, p. ej. 1440 × 900 o 1366 × 768), ficha compacta como en tableta (`.ct-narrow`). Probado sin desbordar en 1903 × 897, 1920 × 1080, 1440 × 900 y 1366 × 768.

## Novedades del 22/11: reparto con el aliado y conversación con busto
- **Reparto (ventana del botín)**, maqueta en `mockups/reparto`:
  - Franja del aliado arriba: busto pequeño, estado en una palabra (Molesto, Conforme o Contento) y barra con la marca de lo justo; el «?» explica la regla. Sin bloque de texto.
  - Montón «Para …» al lado del saco (`LootSession.pile`): lo apartado se ve ahí y se recupera tocándolo (`takeBackFromRival`) hasta cerrar; al cerrar se reparte como antes (`shareLoot` con lo del montón).
  - Selector de cantidad al tocar un objeto del saco (`QtyPicker`): −, +, 1, Mitad, Todo, y «Para mí» (`takeFromLoot`, coge solo esa parte) o «Para …» (`giveToRival` con `n`). Sustituye a «Dividir…».
  - «Reparto justo» (`fairShare`): aparta lo que falte hasta la marca, monedas primero y luego lo de menos valor.
  - Cerrar pasa a ✕ en la cabecera; la ventana de escritorio se ajusta al contenido (`Modal fit`). En táctil: franja arriba y columnas Saco | Para … | Tuyo (o el selector).
- **Conversación con busto** (`TalkPanel` en `DungeonScreen.tsx`), maqueta en `mockups/dialogo-busto`: errantes y Kael, aliado, portal («quiere su parte»), prisionero y mercenario. Busto cuadrado grande (cabeza y pecho del sprite, escala entera), nombre con riesgo o cifra a la derecha, la frase y las elecciones en una fila del mismo ancho. Sin textos pequeños; «Todavía no» y «Cerrar» son ✕. En ordenador va abajo; en táctil, centrada.
- **Avisos en espera**: con una conversación o un reparto abiertos, los avisos (salvo errores) no se ven ni caducan; salen al cerrar (`holdsToasts` en `internals.ts`).
- Mini tutorial nuevo `exp.share` (disparador `ally:share`, la primera vez que un aliado espera su parte). Texto de `exp.kael` corregido.
- Pruebas: `reparto-check` ampliado (montón, recuperar, Reparto justo, selector); `destruir-check`, `e2e` y `e2e-merc` adaptados. Pasan en ordenador y móvil: reparto, aliados, tutorial inicial, destruir, mercenarios y mini tutoriales de la expedición.
- Nota de pruebas: el aviso de cookies tapa los botones en los guiones que no fijan `gv-consent`; para pasarlos hay que fijarlo antes (como hacen `bestiario-check` o `misiones-check`).

## Novedades del 20/11: botón dorado desactivado ilegible
- En Misiones, notas y detalle, «Cobrar/Entregar/Aceptar» desactivados salían en dorado con texto gris. La regla de `game.css` (bloque «Notas de misión») forzaba el fondo dorado también en desactivado; ahora usa `:not(:disabled)` y el botón sale gris piedra como el resto de desactivados.
- Además, el texto de todos los botones desactivados (`.btn:disabled` y `.btn-gold:disabled`) pasa de `stone-500` a `stone-300` (#8c8693): se lee bien y sigue pareciendo inactivo.

## Novedades del 19/11 (3): fase 2 de la interfaz implementada (interior del mercader)
- Tienda con filas y ficha con un único «Comprar» dorado; columna del mercader con la tarjeta del Bastión, pestañas en columna con icono y tarjeta «Volver al Bastión» con la muralla. Detalle en `docs/guia-interfaz.md` y `docs/plan-mejora-interfaz.md`.
- Archivos: `ui/screens/Mercaderes.tsx`, `ui/VendorsTab.tsx` (`ShopStock`, `ShopCard`, `PriceTag`), `ui/kit/tabIcons.ts` (`VENDOR_TAB_ICONS`, `BASTION_SKYLINE`), `game.css`.
- Scripts adaptados (tocan la fila antes de comprar): `e2e`, `ciclo-check`, `fuentes-check`, `e2e-mine`, `screenshots`.
- Pruebas: tsc, 512 tests, `menus-check` (3 formatos), `e2e`, `ciclo-check`, `fuentes-check`, `e2e-mine`, `e2e-bastion-minis`: todo bien.

## Novedades del 19/11 (2): fase 1 de la interfaz implementada (paleta, botones planos y pestañas con icono)
- **Decisiones del usuario:** paleta «piedra fría»; pestañas con icono y nombre solo en la activa en el móvil; comprar tocando el objeto y «Comprar» en su ficha (fase 2); iconos hechos por Claude en la línea de Apoyar y Discord; piloto = interior del mercader; barra del móvil centrada; menús horizontales secundarios a los laterales en móvil y tableta (cuando toque cada pantalla).
- **Hecho:** paleta en `game.css` (solo el juego), paneles y botones planos, tres niveles de botón, desactivado legible, texto secundario de 2,9 a 7,5 de contraste, fondo del lobby sin degradado, pestañas con icono (`kit/tabIcons.ts`, `PixelIcon` exportado de `shared/community.tsx`), barra del móvil centrada y compacta en móviles estrechos, tableta con icono encima del nombre.
- **Maquetas y capturas:** `mockups/propuesta-paleta` (comparación de paletas y tienda), `mockups/fase1-base/index.html` (antes, maqueta y juego real; 19 pantallas × 3 formatos y la barra en varios anchos).
- **Pruebas:** tsc, 512 tests, `menus-check` en los tres formatos, `e2e-bienvenida` (escritorio, iPhone e iPad), `e2e-bastion-minis`, `e2e-guia`. Arreglos en pruebas: `menus-check` da por contestado el aviso de cookies (lo tapaba en el móvil) y `e2e-bastion-minis` busca `seg-status` en vez del texto «Estado» (ahora «Heridas»). Otras pruebas e2e también chocan con el aviso de cookies si no lo contestan; conviene añadirles lo mismo.
- Tutoriales: revisados, sin cambios (mismos `data-testid`; el resaltado de las pestañas se ve igual).

## Novedades del 19/11: plan de mejora visual y de usabilidad de la interfaz (solo plan)
- **Plan:** `docs/plan-mejora-interfaz.md` (diagnóstico con 27 problemas P-xx, valoración de la propuesta externa, base común de variables, botones, estados y familia de iconos, piloto, fases 0-7, arte nuevo y contraste medido). **Pendiente de aprobación**: no se ha cambiado código del juego.
- **Capturas del estado actual:** `mockups/plan-interfaz/index.html` (19 pantallas × 3 formatos, con los problemas marcados y la revisión automática de textos < 12 px, zonas < 44 px y textos cortados). Rehacerlas: `node mockups/plan-interfaz/capturar.cjs http://localhost:5173/play/ [formato]`.
- **Indicación del usuario:** el dorado relleno se mantiene para el botón principal y la pestaña o elemento activo, sin abusar (uno por zona).
- **Regla para las fases siguientes:** maqueta y capturas en los tres formatos → aprobación → implementación → capturas reales.
- Tutoriales: revisados, sin cambios.

## Novedades del 18/11: Misiones (tablón de notas) y Bestiario (galería de trofeos)
- **Maquetas:** `mockups/misiones-bestiario-visual` (v1, v2 corregida con la paleta del juego y comparación con el juego real). Prototipo en `proto.html`; capturas con `capturar.cjs` (maqueta) y `capturar-juego.cjs` (juego).
- **Misiones** (`screens/Misiones.tsx`, piezas en `ui/QuestNotes.tsx`): «Tus misiones N/5» como notas oscuras con clavo (chincheta roja si está fijada), retrato del mercader, el objetivo en grande (criatura, objeto, veta, cofre o portal; corona si es jefe), título, progreso grande con barra fina y recompensas en iconos (moneda, XP y blasón de reputación del color del mercader). Repetible: icono de flechas en circuito. Lista: borde dorado, aviso «● Cumplida/Lista» y Cobrar/Entregar en la propia nota (único botón visible). Al tocar una nota, detalle con descripción, Fijar, Dejar (con confirmación) y Cobrar: panel a la derecha en escritorio y tableta, pantalla completa en el móvil. Huecos libres con «Ir al Bastión». El párrafo explicativo pasa al «?» (`quests-help`). Debajo, «Tablón de encargos» con selector de mercader (`quests-<id>`) y notas con «Aceptar»/«Tablón lleno»; «Encargos antiguos» plegados al final.
- **Mercaderes:** la pestaña Misiones de cada mercader usa las mismas notas (`VendorQuestNotes`): sus aceptadas arriba y sus encargos debajo. `QuestCard` ya no existe.
- **Bestiario** (`ui/BestiaryTab.tsx`, ya sin el envoltorio `Legacy` del Lobby): casillas grandes con la criatura y una sombra en pixel art; el conocimiento es el color plano del borde (piedra #2a2830, bronce #9a6b1a, plata #c8ccd8, oro #e8b33a); jefes en casilla doble con corona, «Derrotado» o «Por derrotar» (silueta) en la esquina; victorias con calavera en la otra esquina; desconocidas «???». Cabecera compacta con iconos (derrotadas, jefes, conocidas) y pestañas de zona con su baldosa. Ficha: la criatura alterna reposo y ataque; Cómo pelea, Habilidades, Estadísticas y Botín, con candado y «Derrótala N veces más».
- **Estilo:** plano (sin degradados) solo en estas pantallas; el resto del juego no cambia. Iconos nuevos en `ui/uiIcons.ts`.
- **Pruebas:** `scripts/misiones-check.cjs` ampliado y `scripts/bestiario-check.cjs` nuevo (acepta un tamaño `ANCHOxALTO`); los dos dan el aviso de cookies por contestado.
- **Tutoriales:** `tab.misiones` actualizado (tablón, tocar una nota, Cobrar en la nota); `tab.bestiario` revisado, sin cambios.

## Novedades del 15/11: tráiler v6 remontado
- **«Cada golpe deja marca» (7,2–12,2 s):** nueva toma `c-marca` (golpe del Caballero infernal → «Heridas y necesidades» → Venda en la zona herida → contragolpe de Aldric), montada en tres trozos de la misma grabación. Rótulo arriba y solo durante el golpe (7,3–8,45 s). Puntero de pixel art añadido solo en la grabación; se fuerza en el guion que sin esquivas y que el golpe abra un sangrado leve. Sonido de venda (`marks.json` → `music.py`).
- **Pantalla completa** en todos los planos: sin recorte ni empuje de cámara (`FULL=0` recupera el recorte).
- **Alijo:** almacén con escudos, armaduras, yelmos, guantes y botas, y solo 1200 de oro (cinco bolsas) (`scripts/lib/cine.cjs`).
- **«TAMBIÉN EN EL MÓVIL» (22,0–23,5 s):** toma `n-movil` a 960×444 (×2 exacto) con el joystick; «Sal con vida» pasa a 2,3 s. Total: 30 s, el resto de cortes igual.
- La grabación marca el aviso de cookies como respondido (sin analítica), porque tapaba los botones.
- Vista previa: `mockups/trailer-golpe-marca/index.html`. Publicado en `public/trailer`.
- **Rehacerlo:** con `npx vite --port 5173` en marcha, `npm run trailer` (todo) o `node scripts/trailer6-capture.cjs http://localhost:5173/play/ /tmp/claude-0/t6 c-marca,n-intendencia,n-movil` y después `npm run trailer:render`. Si se vuelve a grabar `c-marca`, revisa los inicios de sus tres trozos en `trailer/v6/guion.json` con los tiempos que imprime la captura.
- Retoques: «¿Te atreves a bajar?» sobre negro (0–2,4 s); fuera el segundo plano del Infierno (Ríos de Fuego), el Carmesí dura 1,8 s y se entra directo al combate; en el plano del móvil, mochila vacía (sin sobrecarga) y Aldric camina con el joystick hacia un esqueleto.
- Tutoriales: revisados, sin cambios.

## Novedades del 14/11 (4): Habilidades, Alijo, Elegir personaje y Bestiario
- Nombres: Personaje → **Habilidades**, Intendencia → **Alijo**, Estado → **Heridas** (textos, tutoriales y avisos). Por dentro
  siguen `character`, `stash`, `status` y sus `data-testid`, para no tocar partidas ni pruebas.
- Habilidades: Ataques a la izquierda, héroe (más grande) en el centro y Clase a la derecha; en tableta y móvil, selector Ataques · Clase.
- Alijo: fuera «Ver detalles»; nivel y XP arriba del panel Aventurero; desglose de cada atributo al pasar el ratón o tocarlo (`HeroStats.tsx`, `statSources`).
- Elegir personaje: trayectoria compacta en cada tarjeta. Bestiario: criaturas y jefes derrotados arriba, «N derrotadas» por criatura y jefes marcados.
  El contador por tipo ya existía (`profile.bestiary[id].kills`): no cambia el guardado.
- Maquetas: `mockups/reorganizacion-habilidades/index.html` (y `mockups/habilidades`).

## Novedades del 14/11 (3): menú principal nuevo
- Columna izquierda con el logo arriba (lema centrado bajo él) y el menú abajo; a la derecha, el diorama animado de la landing
  (`src/landing/Diorama.tsx`, ahora con `fill`, `ax` y `ay`) flotando sobre el mismo negro de la página (#040308), sin corte ni degradados.
- Menú de videojuego: entradas de texto con el rombo del juramento marcando la elegida (ratón, toque o flechas y Enter);
  encima, la ficha de la partida (nombre, clase, nivel y expediciones). Apoyar, Discord y Volver a la web en una fila al pie.
- Fuera los dos personajes de las esquinas (el diorama ya los tiene). Mismos `data-testid` (`btn-play`, `btn-choose-char`, `btn-backup`, `btn-settings`…).
- Móvil horizontal: menú más pequeño y con márgenes. Todo ≥ 44 px. La app instalada se llama «Gravevow Alpha» (antes «Gravevow · Demo»).
- Maquetas en `mockups/menu-principal/index.html`.

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



## Novedades del 14/11 (5): Google Tag Manager
- GTM `GTM-WJNS8GH8` en la web, el juego y las páginas legales, solo tras «Aceptar» en el aviso de cookies (`src/shared/consent.ts`, modo de consentimiento v2, elección en `gv-consent`).
- «Configurar cookies» en el pie de la landing, en Ajustes › Legal y en la página de cookies. Retirar el consentimiento recarga la página para descargar GTM.
- Políticas de cookies y de privacidad actualizadas (fecha 14/11/2026).
- Aviso con «Rechazar», «Configurar» y «Aceptar»; panel por finalidades (Técnicas siempre activas, Análisis con interruptor). Solo se concede `analytics_storage`; publicidad preparada en `CATEGORIES` de `consent.ts` para el futuro.

- 2026-11-14: añadido public/sitemap.xml (/, /cookies.html; páginas legales excluidas) y línea Sitemap en robots.txt.
- 2026-11-14: nuevo meta título y meta descripción SEO en index.html.
- 2026-11-15: /cookies.html bloqueada en robots.txt y retirada del sitemap.
- 2026-11-15: cookies.html pasa a noindex (meta robots) y se quita su Disallow para que Google pueda leerlo y desindexarla.
- 2026-11-15: favicon.ico, PNG 48/96/192 y apple-touch-icon generados desde favicon.svg (escalado nearest) y enlazados en index.html.

## Novedades del 19/11 (6): fase 5 de la interfaz implementada (combate)
- `CombatScreen.tsx`: título solo con la zona; fuera «¿Qué hará…?»; último aviso como línea del registro (`combat-note`); busto en la ficha del jugador; barra principal en 2 + 2×2 (`.cmdpair`); orden y teclas: Atacar 1, Especial 2, Habilidad 3, Guardia 4, Mochila 5, Huir 6. Guardia azul (#5aa0ff), Mochila gris como Huir.
- `common.tsx`: `Toasts` no se pinta en combate.
- `Settings.tsx`: texto de las teclas de combate al día.
- `game.css`: bloque «Fase 5 · Combate» (botones en dos líneas, tiras del móvil, `.foe`).
- Pruebas: tsc, 512 tests, e2e, e2e-tutorial, e2e-exp-minis, e2e-merc, e2e-social, touch, mobile, menus, aliados, exploración, necesidades y pantalla completa.

## Novedades del 19/11 (5): fase 4 de la interfaz implementada (HUD de exploración)
- Un solo bloque del jugador arriba a la izquierda (escritorio y tableta): retrato en busto (cabeza y hombros, `.hud-bust`), vida, recurso y dos filas de tres columnas: necesidades (icono, número y barra) y, debajo, botín, oro y carga (icono de peso y barra: verde hasta el 80 % de la capacidad, amarilla hasta el 100 %, roja con sobrecarga; `HudLoad` en `CarryBar.tsx`, `hud-load`). Fuera la caja de botín de abajo, el botón grande de poción y el aviso «Sobrecarga» en escritorio y tableta (sigue en el móvil). `inventario-check` acepta la barra roja como aviso.
- Poción: en escritorio, botón redondo abajo a la derecha como en táctil, con «Q» pequeña arriba y el número de pociones (`btn-potion`).
- Arriba a la derecha, Mochila, Menú y Pantalla completa como iconos de 44 px en los tres formatos; debajo la tecla (escritorio) o el nombre (tableta).
- Móvil: tira de 44 px (figura del cuerpo `hud-body`, vida y recurso finos con número, necesidades en iconos que se abren al tocar `hud-needs`, botín y oro). Reloj solo en el centro; la sala (`hud-room`) sale 3 s al entrar, al tocar el reloj o si un aviso la señala. Aliado como icono de 44 px bajo la tira.
- Pausa: «Continuar» dorado, «Ajustes» y, separado, «Abandonar la expedición…» (`btn-give-up`) con la confirmación de siempre.
- Archivos: `DungeonScreen.tsx`, `NeedsBars.tsx` (`NeedsDots`), `hudIcons.tsx` (iconos de necesidades y botín), bloque «Fase 4» de `game.css`.

## Novedades del 19/11 (4) · Fase 3 del plan de interfaz (inventario)
- La ficha del objeto ya no tapa la mochila en tableta ni en móvil (ver `docs/plan-mejora-interfaz.md`, fase 3). Archivos: `screens/Alijo.tsx`, `screens/ItemCard.tsx` (`stacked`), `DungeonScreen.tsx` (inventario y saco en pantalla completa fuera del escritorio), `NeedsBars.tsx`, `game.css`.
- Mercader en escritorio: tarjeta «Volver al Bastión» más pequeña (muralla a 128 px, 64 px en ventanas de menos de 960 px de alto) para que la columna no necesite barra de desplazamiento.
- `scripts/almacen-check.cjs`: en el móvil cierra la ficha antes de «Agrupar oro». `arrastre-check.cjs` ya fallaba antes de este cambio (sin tocar).

## Novedades del 19/11 (8): fase 7 de la interfaz (revisión del conjunto) y estaciones de fabricar en una sola página
- **Revisión del conjunto:** se repitió `mockups/plan-interfaz/capturar.cjs` (capturas en `mockups/plan-interfaz/actual/`). Quedan 0 zonas táctiles de menos de 44 px y solo textos de menos de 12 px aceptados como marcas: los rombos ◆, la flecha ▶ del objetivo y el número de nivel dentro del escudo del combate. Se subieron a 12 px: el cuerpo de Heridas (estados, curas, nota del catre), números y nivel del combate, teclas de los botones, registro del combate en el móvil, oro dentro de las casillas, títulos de tarjeta (`kit/Card.tsx`), encargado de la estación y textos `text-[10/11px]` de Jugar, mazmorra y estaciones. El temporizador de la mazmorra mide 44 px de alto también en la tableta. CSS en el bloque «Fase 7» de `game.css`.
- **Estaciones de fabricar en una sola página** (maqueta `mockups/forja-reconstruir`, `estaciones.html`): sin «Usar» ni pantalla aparte de «Mejorar». En ruinas: la estación a la izquierda; a la derecha el encargado, lo que da el nivel 1, lo que falta con su pista e «Ir» y «Reconstruir» (sin la frase del encargado, sin «Mientras siga en ruinas» y sin el botón Materiales). Construida, en el escritorio: estación grande, los tres niveles abiertos y la mejora abajo (su botón alineado con «Craftear al almacén»); recetas con la casilla «Solo las que puedo hacer»; ficha con el objeto grande (192 px), nombre grande, estadísticas en casillas y «Necesitas» pegado a los botones; todo llega al borde de abajo. Tableta y móvil: la estación se pliega en la barra «Nivel x/3 · Niveles y mejora ▾»; en el móvil tus materiales van en una columna a la derecha (sin pestaña lateral). En la mejora ya no salen las pistas largas de cada material (sí en ruinas y en el Catre). Archivos: `StationPanels.tsx` (`StationDetail`, `CraftPanel`, `CostLines` con `hints`), `screens/Mercaderes.tsx` (`StationTab`).
- **Tutorial `station.<id>` (último paso):** ahora señala `station-upgrade-<id>` (bloque de mejora en el escritorio, barra «Niveles y mejora» en tableta y móvil) con texto nuevo. Mismo id de tutorial.
- **Pruebas:** tsc y 512 tests; pasan `bastion-check` (ajustado: en ruinas se ve 1 nivel; ya no se exige «Bastión» como última pestaña de Grizk), `taller-check` (la marca `craft-locked-forge` ahora es invisible), `e2e-bastion-minis` (sube la cocina desde la página), `refugio-check`, `e2e`, `e2e-tutorial`, `e2e-exp-minis`, `jugar-ficha-check`, `menus-check`, `touch-check` y `mobile-check`. Siguen fallando, por pruebas antiguas que no tocan estos cambios: `anatomia-check` (cirugía en combate), `arrastre-check`, `bombas-check` (Mochila del combate) y `migracion-minis-check` (busca `btn-merchants`, que ya no existe).

## Novedades del 19/11 (7): fase 6 de la interfaz implementada (menús, fichas, resultados y ajustes)
- **Habilidades** (`Personaje.tsx`): en tableta y móvil, Ataques · Clase es una columna de iconos de 52 px al lateral (`character-seg`, `seg-atk`, `seg-class`; el ◆ marca hito pendiente). Fuera «Mano izquierda/derecha», el rótulo «Clase» y la frase de abajo; rombos y círculo más grandes (panel de tableta a 400 px).
- **Ajustes** (`Settings.tsx`): iconos de sección sin borde discontinuo; en el móvil una columna con icono y nombre (`.set-lbl`).
- **Bestiario** (`BestiaryTab.tsx`): pestañas de zona con nombre siempre visible, barra de progreso y cuenta; la elegida en dorado con línea inferior.
- **Copia de seguridad** (`CopiaSeguridad.tsx`): centrada; dos recuadros con «Guardar copia» (dorado) y «Cargar copia», debajo «Copiar como texto» / «Compartir» / «Pegar texto» y el estado con icono «i», alineado a la izquierda. La línea de contenido de la copia pasa a «Más información» (`backup-contents`). Mismos `data-testid` de botones.
- **Resultados**: `Toasts` no se muestra en `summary`; fondo sin violeta.
- **12 px mínimo** en Jugar (accesos rápidos), Crear y Elegir personaje, Tienda, título y botones del móvil (bloque «Fase 6» de `game.css`).
- Pruebas: tsc, 512 tests, e2e, e2e-tutorial, e2e-guia, e2e-skins, e2e-bienvenida, copia-check, ajustes-check, bestiario-check, creacion-check, menus-check, touch-check y mobile-check. Capturas: `mockups/fase6-menus/index.html` (antes | real).

## Novedades del 19/11 (9) — Habilidades: elegir hito más simple
- Pestaña Habilidades › Clase: en un hito por elegir, la tarjeta entera se toca para marcarla (borde dorado) y un único botón fijo abajo confirma («Elegir <habilidad>»; apagado con «Toca una habilidad» hasta marcar una). Fuera los «Elegir esta» de cada tarjeta.
- El hito ya elegido y equipado se muestra en una línea («Nivel 1 · Grito de guerra ✓»). Coste como etiquetas ⚡ y ⟳. Textos acortados («Elige 1 · las demás no se pierden»); quitado «Solo llevas una…».
- Ataques: quitados «Los ataques dependen de tus armas» y el botón «Cambiar armas en el Alijo».
- Maqueta y capturas: mockups/hitos-elegir (real.cjs captura el juego a nivel 20).

## Novedades del 19/11 (10) — Misiones en una pantalla
- Escritorio: «Tus misiones» y el «Tablón de encargos» caben a la vez sin desplazar la pantalla; el tablón ocupa el resto y, si hay muchas notas, solo se desplaza él.
- Móvil: dos columnas (Tus misiones a la izquierda, tablón a la derecha), cada una con su desplazamiento. Tableta: la pantalla se desplaza como antes.
- El tablón siempre se ve, con todos los mercaderes que dan encargos; el que no tiene ahora sale con borde discontinuo y «sin encargos», y al tocarlo lo explica.
- Huecos libres: sin botón «Ir al Bastión»; dicen «Acepta un encargo del tablón».
- Capturas: mockups/misiones-pantalla (capturar.cjs). misiones-check ajustado (escritorio y móvil pasan).

## Novedades del 19/11 (11) — Mercaderes sin pestaña Misiones ni cajón Mochila
- Dentro del mercader ya no hay pestaña «Misiones». Debajo de su ficha sale un aviso «2 encargos nuevos · 1 aceptada ▸» (o «1 lista para entregar»); al tocarlo abre la pestaña Misiones con ese mercader elegido. Sin encargos ni misiones suyas, no sale. «Pendiente → Entregar» también lleva a Misiones. En móvil el aviso va en 12 px y en una línea («2 encargos»).
- Móvil: el cajón lateral «Mochila» ya no sale en la tienda ni en otras pestañas; solo queda para vender («A vender») y para fabricar («Materiales»). La mochila se mira en el Alijo.
- Tutorial vendor.nira: el paso de encargos señala el aviso (vendor-quests-link) con texto nuevo; mismo id.
- misiones-check ajustado. Capturas: mockups/mercader-encargos.

## Novedades del 23/11 — Botín en el móvil
- Cofres, cadáveres y bolsas en el móvil se abren en una ventana flotante (600×320 como mucho) y la mazmorra se ve oscurecida detrás; tocar fuera o ✕ la cierra.
- Dentro | Tuyo, con casillas de 44 px. Barra de abajo: sin nada tocado, «Coger el oro (n)» y «Cogerlo todo»; al tocar un montón, «− n +», «Mitad», «Todo» y «Coger n» (y «Dar n» si Kael espera su parte). Lo que no coges se queda dentro.
- Acción nueva actions.takeSome(loc, n, lootId) (las monedas van primero a saquitos y sacos). Tableta y escritorio sin cambios.
- Maqueta y prueba: mockups/botin-movil (real.cjs comprueba coger una parte de pociones y de monedas).

## Novedades del 23/11 (2) — Jefes de zona solo en la última subzona
- Ya era así en los mapas generados: cada subzona tiene su jefe fijo (subzones.ts) y el jefe de zona (zones/*.ts → boss) es el de la última (Mazmorras del Bastión: Señor del Osario; Panteón de los Nobles: Reina Velada; Trono de las Cadenas: Belzar). Sale siempre, sin probabilidad.
- Excepción corregida: el mapa hecho a mano de la primera expedición con el tutorial saltado (CRYPTS_OF_UMBRAVEL, core/dungeon.ts) tenía al Señor del Osario a nivel 1; ahora su jefe es Mordrek.
- «El trono vacío» (q_lord): minLevel 20 y descripción con la subzona. Las ya aceptadas se conservan.
- Mapa de zonas: «Jefe de la zona: X · en <última subzona>». Bestiario: la ficha de jefes y élites muestra su subzona y «Jefe de zona».
- Mini tutorial exp.boss: «El de la última subzona de cada zona abre la siguiente».
- Partidas: bossesDefeated guarda ids de enemigo, no sitios; nada cambia para quien ya abrió zonas.
- Capturas: mockups/jefes-ultima-subzona (index.html, antes/después).
- 23/11: arreglado el fallo de compilación (holdsToasts). El botín en móvil y los jefes se copiaron sobre una versión antigua de store.ts, DungeonScreen.tsx, game.css, tutorials.ts y este archivo, y borraron lo del 22/11 (reparto con Kael, holdsToasts). Ahora están fusionados: la ventana flotante del móvil usa el selector de cantidad y el reparto del 22/11 (takeFromLoot, «Para mí» / «Para Kael»); quitada mi acción duplicada takeSome.

## 24/11 — Arreglo: en el móvil la ventana del botín se cerraba sola

- Síntoma: en el móvil, al usar un cofre, una bolsa o un cadáver con el botón «Usar», la ventana no llegaba a verse. El cofre quedaba abierto, pero sin poder coger nada.
- Causa: el botón «Usar» actúa al apoyar el dedo. El «clic» de ese mismo toque caía sobre el fondo oscuro de la ventana flotante (23/11), y el fondo la cerraba.
- Arreglo (`DungeonScreen.tsx`, LootModal en el móvil): el fondo solo cierra la ventana si el toque empezó en él. Tocar fuera para cerrarla sigue funcionando.
- Comprobado: probado en el móvil con «Usar» junto a un cofre, y `mockups/botin-movil/real.cjs` pasa. También se probaron cofres de todas las zonas, sacos de enemigos y el reparto con un aliado, y todo da botín.


## 24/11 — Combate: esqueleto de heridas, fichas nuevas y barra con el texto a la izquierda
- **Qué había:** el esqueleto (`BodyFigure`) estaba en la ficha del combate desde el 11/11, pero a 18-27 px y sin poder pulsarse; el 19/11 se ocultó en el móvil. Las fichas de los enemigos tapaban a los esqueletos en el móvil en 2 contra 2.
- **Ahora** (`CombatScreen.tsx`: `FoeCard`, `AllyStrip`, `HeroCard`; CSS al final de `game.css`, bloque «Combate 24/11»): fichas de enemigos arriba a la izquierda; tu ficha con el esqueleto pulsable y la tira del aliado abajo a la derecha, sobre los botones; texto a la izquierda y botones a la derecha en todos los tamaños, sin subtítulos; sin zona ni orden de turnos; enemigos más abajo, sobre el suelo, y sombras pegadas a los pies. El esqueleto abre el menú de heridas de siempre y parpadea en la zona que cambia. Escala con `--k` (móvil 1, tableta 1,5, escritorio grande 2). Detalle en `docs/guia-interfaz.md` › Combate.
- **Retoques tras verlo:** escudo dorado con el nivel en enemigos, aliado y héroe; estados con su nombre («Veneno 3», «Congelación 2») e intención del enemigo («⚠ Golpe pesado → ti») bajo la barra de vida.
- **Reglas sin cambios:** abrir el menú no gasta turno; curar lo gasta (por `combatAct`).
- **Comprobado:** `npx tsc`, 512 tests; `mockups/combate-heridas-barras/real.cjs` (36 comprobaciones en móvil, tableta y escritorio, 1 contra 1 y 2 contra 2: sin solapes con sprites ni barra, esqueleto de 44 px o más, nada por debajo de 12 px salvo ▶, el menú no gasta turno, parpadeo); `scripts/curas-check`, `grupos-check` e `intenciones-check` pasan. `scripts/bombas-check` ya fallaba antes de este cambio (no encuentra `use-nail_bomb`): pendiente aparte.
- **Cómo probar:** con `?debug`, en la mazmorra: `__GRAVEVOW__.actions.startCombat('pve','e1','skeleton',{entityId:'e2',enemyId:'skeleton'})` (2 contra 1; para 2 contra 2, antes `setState({rival:{...getState().rival, who:'kael', disposition:'allied', hp:60, potions:1}})`). Heridas: copia `expedition.body`, cambia `parts.armL.fracture=true`, `parts.legR.bleed=2`, etc., y `setState` antes de empezar el combate.


## 24/11 — Seguro de equipo por bajada
- **Qué es:** al pulsar «Descender» se pregunta qué piezas del **equipo puesto** se aseguran para esa bajada (4 % del valor del ejemplar, mínimo 1). Si caes (o se acaba el tiempo) con ellas puestas, quien las fabrica te las reforja: Brand (armas y anillos), Valerius (armaduras y escudos) y Eldrin (amuletos). Vuelven como las bajaste, con la durabilidad entera y sin seguro. Si extraes, el seguro se gasta. Solo con la estación del mercader reconstruida.
- **Código:** `config/insurance.ts` (porcentaje, mínimo, quién reforja cada ranura), `core/insurance.ts` (coste, ranuras, pago, recogida) y `core/insuranceLoss.ts` (reforja al caer; aparte para no crear importaciones circulares desde `core/expedition.ts`). `Profile.insurePlan`, `insureAsk` y `reforged`; `ExpeditionState.insured`; `ExpeditionSummary.reforged`. `enterDungeon(zona, ranuras)` cobra y guarda los `uid`. Interfaz en `ui/InsurePanels.tsx` y `kit/Seal.tsx`; pestaña `insure` en `Mercaderes.tsx`; sello en `inventory.tsx`; nota en `SummaryScreen.tsx`; opción en Ajustes › Partida; mini tutorial `insure.first`.
- **Partidas guardadas:** todo es opcional; los perfiles antiguos cargan sin nada asegurado ni pendiente.
- **Comprobado:** `npx tsc`, 520 tests (8 nuevos en `tests/insurance.test.ts`); `mockups/seguro-equipo/real.cjs` (42 comprobaciones en escritorio, tableta y móvil: ventana, casillas de 44 px o más, cobro, sellos, resumen, marca en el Bastión, recogida, mini tutorial, sin errores).
- **Cómo probar:** con `?debug`, reconstruye la Forja o la Forja de armaduras (o en la consola: `p = __GRAVEVOW__.getState().profile; __GRAVEVOW__.setState({ profile: { ...p, refuge: { ...p.refuge, forge: 1, armory: 1, alchemy: 1 } } })`). Pulsa «Descender», marca piezas y «Asegurar y bajar». Para morir al momento: `__GRAVEVOW__.actions.finishExpedition('died')`. Vuelve al Bastión y entra en Maese Brand o Valerius.

- **Retoque (24/11):** la pestaña «Seguro» explica cómo funciona (cuatro cajas) y enseña cada pieza con el color y el nombre de su rareza, sus estadísticas, atributos, runas y durabilidad, con su botón «Asegurar». Los escudos los reforja Valerius. Capturas y comprobaciones: `mockups/seguro-equipo/pestana.cjs` (15) y `real.cjs` (42).

## 24/11 — Una función por mercader
- «Reparar» solo con Brand (fuera de Orik y Nira), «Seguro» solo con Valerius (fuera de Brand y Eldrin), «Desguace» solo con Orik. Tiendas, venta y estaciones sin cambios. El seguro funciona igual (por bajada, 4 %); todas las piezas reforjadas se recogen en Valerius, también las guardadas antes a nombre de Brand o Eldrin. Mini tutorial `insure.first` contado por Valerius.
- **Código:** `servicesOf` en `Mercaderes.tsx`; `config/insurance.ts` (todo a Valerius, con la estación de quien fabrica); `pendingFor` y `collectReforged` en `core/insurance.ts`.
- **Comprobado:** 521 tests; `mockups/seguro-equipo/pestana.cjs` (pestañas de Brand, Orik, Nira, Eldrin y Valerius en los tres tamaños) y `real.cjs` (42).
- **Cómo probar:** entra en Brand (Tienda, Reparar, Forja), Orik (Tienda, Desguace, Banco de trabajo), Nira (Tienda, Vender, Curtiduría) y Valerius (Tienda, Seguro, Forja de armaduras). El seguro se prueba como en la sección anterior; ahora se recoge en Valerius.

## 25/11 · Ventana «¿Aseguras tu equipo?» reestructurada
- Dos columnas: «Equipamiento» (casillas con ✓ dorado) y «Asegurado · n/m» (una fila por pieza asegurable, casilla, nombre con color de rareza y precio; tocar la fila marca/desmarca). Todo/Nada arriba de la lista.
- Pie: «Oro disponible», «Coste total» (rojo si falta oro) y los botones «Bajar sin asegurar» / «Asegurar y bajar» en fila.
- Móvil: filas de 44px al tacto; la lista hace scroll si no cabe. Mapa de zonas revertido al original (fase E descartada).
- Capturas: mockups/plan-interfaz-2/seguro/.

## 25/11 · Alijo reestructurado (Equipo y Heridas)
- Equipo (escritorio/tableta): «Personaje y equipo» (clase·nivel, barra XP, personaje que llena el arco con escala entera, ranuras alrededor: Arma/Manos/Pies/Anillo | Cabeza/Torso/Secundaria/Amuleto, atuendo y mochila debajo, atributos) · «Mochila» (ocupación y oro, rejilla, carga, en riesgo, Ordenar/Depositar/Materiales, bolsillo) · Almacén sin cambios.
- Heridas: Aventurero con barra de Vida + necesidades · «Estado físico» (franja de estado, cuerpo de bloques `BlockBody` solo en modo `full`, ficha con barra, «Estados activos») · Mochila con filtro Todo/Curación y «Ordenar mochila».
- Móvil sin cambios de estructura. Capturas y script: mockups/plan-interfaz-2/alijo/ (VISTA=heridas, SOLO=).

## 25/11 · Estaciones en ruinas (página intermedia simple)
- `RuinPanel` (StationPanels.tsx, clases `.ruin*`): nombre + «En ruinas», dibujo en ruinas que llena el alto libre (escala entera; móvil franja de 70 px), «Materiales necesarios» en fichas centradas (icono, nombre, tienes/necesitas; la que falta lleva a su fuente al tocarla) y «Reconstruir» con el motivo del bloqueo.
- Columnas izquierda (mercader) y derecha (tus materiales) sin cambios; estaciones reconstruidas sin cambios. Capturas y script: mockups/plan-interfaz-2/ruinas/.

## 25/11 · Misiones como diario en tres columnas
- `QuestJournal` (src/game/ui/QuestJournal.tsx, clases `.qj*`), escritorio y tableta: «Tus misiones» (tarjetas compactas con clavo/chincheta, estado y sello «Lista/Cumplida»; listas primero; «+N espacios disponibles») · «Detalle de misión» (arte, objetivo con barra, recompensas en fichas, Cobrar/Entregar, Visitar a…, Fijar, Abandonar con confirmación) · «Tablón de encargos» (filtro Todos/mercader, encargos en fichas horizontales).
- Móvil: sigue el diseño anterior (notas). «Visitar» abre al mercader (Lobby `onVisit`).
- Scripts: mockups/plan-interfaz-2/misiones/capturar.cjs y funcional.cjs (aceptar, cobrar, abandonar, visitar).

### 25/11 · Pulido Habilidades y Alijo
- Habilidades: fuera el recuadro «Efectos de la habilidad» (los efectos ya salen en los atributos y en la ficha); personaje más grande y algo más arriba; ímpetu y recarga más grandes en las cartas; al tocar un hito sin elegir, sus opciones ocupan el hueco libre del panel.
- Alijo › Equipo: columnas 25/35/40 (Aventurero · Equipo · Almacén; almacén a 10 columnas en escritorio ancho); el Aventurero usa el mismo arco que Habilidades (SkillArc compact, sin etiquetas); muñeco de ranuras más apretado; carga y botones de la mochila en un pie fijo (backpack-foot); al elegir una pieza, los atributos marcan en verde/rojo lo que ganarías o perderías (HeroStats preview, data-preview).
- **Apartado ESTADO (25/11):** nueva pestaña del menú tras Alijo (`tab-estado`, icono de cruz de hierro en kit/tabIcons.ts). Muestra lo que era Alijo › Heridas (Aventurero con necesidades, Estado físico y Mochila de curación), con el mismo componente (`<Alijo section="status">`). El Alijo ya no tiene selector Equipo / Heridas (en el móvil quedan Equipo y Almacén). Aviso de lesiones: número rojo en el icono (`tab-badge-estado`, aria «Estado, n lesiones») con las partes dañadas o fracturadas de `profile.wounds`. La mochila de Estado abre en «Curación» si estás herido y llevas curas; si no, en «Todo». Textos que decían «Alijo › Heridas» (store.ts, SummaryScreen) dicen «Estado». Mini tutorial `tab.intendencia` salta ahora con `tab:estado` y lleva el «!» en la pestaña. La pestaña del Alijo no se guardaba, así que las partidas antiguas cargan igual.

- **Arreglo grilla del Almacén (Alijo, escritorio):** se pintaba a 10 columnas pero la lógica (`LAYOUTS.stash`) usa 8; los objetos grandes salían 1×1 y sus casillas tapadas desaparecían (119/120 ocupadas parecía media página). Ahora `stashCols = LAYOUTS.stash.cols`. Regla: cualquier `GridView` del almacén debe usar las columnas de su layout.
- **Estaciones:** fuera los avisos «Te falta X (n/m)» bajo Reconstruir/Mejorar (las tarjetas de materiales ya lo marcan en rojo) y el texto «De la mochila y del almacén»; «Tus materiales» centrado con casillas de 64 px.
- **Alijo › Equipo (25/11, v4):** personaje del Aventurero más alto (en el arco con noFoot el divisor de escala es 29); muñeco de ranuras en rejilla con forma de cuerpo (cabeza · amuleto · torso · pies en el eje, arma y secundaria junto a la cabeza, manos y anillo junto al torso, atuendo y mochila abajo; sin etiquetas si la pantalla mide menos de 1000 px de alto); bolsillo seguro en una franja bajo la mochila; fuera el recuadro de oro (ya está arriba) y el «Agrupar N» del pie; un solo «Ordenar» en mochila y almacén que agrupa el oro y ordena; almacén sin el texto «pág. · n/120» y con casillas que llenan el ancho (máx. 80 px). Tutorial de bienvenida: el paso del oro señala ahora «Ordenar» (sort-backpack).
- **Alijo › Equipo (25/11, v5):** la columna Equipo mide justo la mochila (6 casillas) y todo se alinea a sus bordes (ranuras de los lados, Ordenar, bolsillo y pie); el Aventurero se queda el ancho que sobra (columnas 1fr · ancho fijo · 1,25fr); la rejilla del almacén va centrada.
- **Alijo en móvil (25/11, v2):** dos columnas. Izquierda: selector «Aventurero | Atributos» (héroe grande a escala entera con clase, nivel y XP, o HeroStats). Derecha: selector «Equipo | Almacén» (seg-gear / seg-storage): Equipo = muñeco con forma de cuerpo y carga + mochila con «Vaciar», «Ordenar» y bolsillo; Almacén = mochila + almacén (StashPanel `bare`: sin título ni contador, «Ordenar» junto a las páginas, casillas que se ajustan al hueco hasta 40 px). Casillas a 36 px. La ficha va en un cajón a la derecha (pestaña «Ficha», item-sheet-open; brilla con un objeto elegido). Escritorio y tableta: la columna Almacén mide justo la rejilla (slot × 8) y el Aventurero se queda el resto. Maqueta en mockups/alijo-movil. almacen-check: salta el aviso de cookies, agrupa con «Ordenar» y abre el cajón de la ficha. Fallo previo sin cambios: en escritorio la página del almacén no cabe entera sin desplazar (comprobación de almacen-check).
- **Alijo escritorio (25/11, v6):** tres columnas iguales (Aventurero · Equipo · Almacén, cada una con su mínimo); en escritorio las casillas bajan de 60 px según el alto de la ventana (`(alto − 450) / 9`, entre 36 y 60; 48 como tope en escritorio estrecho) para que el panel Equipo quepa sin desplazar; el almacén llena el ancho de su columna (hasta 80 px) y se desplaza en alto. A 1440 × 720 el bolsillo aún queda algo cortado.
