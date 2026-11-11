# Gravevow · Estado del proyecto

Última actualización: 11/11/2026 (Fase 3). Aquí solo va lo vigente; el historial completo está en `docs/estado-trabajo.md`.

## Cómo retomar el trabajo
- En un ordenador nuevo o en otra sesión: haz pull en GitHub Desktop y escribe a Claude «Lee CLAUDE.md y ESTADO_PROYECTO.md» seguido de la tarea.
- Al terminar: Claude actualiza este archivo y da el mensaje de commit. Tú haces commit y push.

## Hecho y funcionando (alpha v0.1)
- **Nombre y web:**
  - Gravevow (antes DREADBOUND y Crypt Raiders), en https://gravevow.com, publicado con GitHub Pages.
  - cryptraiders.es redirige con un 301.
  - Repositorio `aitechlabtools/gravevow`.
- **Interfaz (plan de 10 fases terminado):**
  - controles táctiles, pantalla completa y horizontal, app instalable;
  - controles en pantalla de mazmorra y combate;
  - base de interfaz (`kit`);
  - pantallas Jugar, Crear y Elegir personaje, Alijo, Personaje, Mercaderes (con forja y contratos), Misiones, Bestiario y Atuendos (con la Tienda).
- **Mundo:** 10 subzonas en 3 zonas: Mazmorra (1–30), Cripta (30–60) e Infierno (60–100).
  - Se pasa de zona venciendo al jefe de la última subzona de la anterior.
  - Mercenarios errantes que pueden ser aliados o traidores, entre ellos Kael y Osric, con reparto del botín.
- **Combate:**
  - barra de acciones con ataque básico por familia de arma, dos especiales por mano y una habilidad de clase;
  - Ímpetu (Guerrero) y Maná (Mago);
  - recargas que se mantienen durante toda la expedición;
  - rarezas con atributos;
  - más de 50 armas por subzona;
  - habilidades de clase a elegir en los niveles 20, 40, 60 y 80.
- **Economía:**
  - oro físico, con saco y bolsillo seguro;
  - botón «Agrupar oro» en el Alijo y en la mazmorra;
  - almacén por páginas (120 casillas), páginas de pago y una página «Compartido».
- **Partidas:**
  - hasta 4 personajes por cuenta;
  - copia de seguridad en archivo o código (`GV1.`), con opción de deshacer y recordatorio cada 7 días o 10 expediciones.
- **Tutorial de 13 pasos:**
  - pulido el 5–6/11;
  - el paso de la poción solo aparece tras la trampa;
  - con Osric solo se puede elegir la alianza;
  - la guía se oculta al canalizar el portal;
  - enseña a agrupar el oro arrastrando o con el botón.
- **Landing:**
  - logo común (`GravevowLogo`), VarkHollow, mecánicas, galería y hoja de ruta;
  - tráiler v5 (`public/trailer/gravevow-trailer.*`);
  - botones «Apoyar» (Ko-fi) y «Discord» en la landing, el lobby, el menú principal y Ajustes.
- **Legal:** aviso legal, privacidad y cookies. Los datos del titular solo van en imagen y el correo de contacto también.

## En curso / por verificar
- Comprobar en un móvil real que el arrastre de objetos se nota suave. Se optimizó el 5/11 y las pruebas automáticas pasan.
- Configuración externa, que hace el usuario:
  - **Enforce HTTPS** en GitHub Pages y que `www.gravevow.com` funcione;
  - el buzón del correo de contacto;
  - página de Ko-fi y servidor de Discord listos (los enlaces ya están puestos).
- Falta subir `public/sitemap.xml` (ya generado) y referenciarlo en `public/robots.txt`.

## Errores conocidos
- `almacen-check` falla en escritorio («la página debe verse entera sin desplazar», 117 casillas visibles). Ya fallaba antes de la Fase 1; tableta y móvil pasan. Pendiente de revisar.
- Las pruebas e2e fallan de vez en cuando por tiempo de espera en el modal de botín. Al repetirlas, pasan.

## Decisiones vigentes
- **Steam:** el juego se llamará solo «Gravevow». VarkHollow es la región del lore, no el nombre del juego.
- **Partidas:** las de cryptraiders.es se pierden con el cambio de dominio (aceptado; es una alpha). Las copias antiguas (`cryptraiders-backup` y `CR1.`) se siguen aceptando.
- **Arte:** el arte actual es provisional y está hecho por código. El usuario diseñará el definitivo; la lista de assets está en `docs/plan-subzonas.md`, sección 9.
- **Comunidad:** los enlaces de Ko-fi y Discord están solo en `src/shared/community.tsx`.
- **Atuendos:** solo estéticos y se compran con oro del juego. No hay compras con dinero real.
- **Tráileres antiguos:** se borraron de `public/`, pero siguen en el historial de git.

## Últimos cambios
- 11/11: Fase 3 de la expansión: durabilidad. Armas y armadura (no anillos ni amuletos) tienen durabilidad según rareza y calidad de forja (`config/durability.ts`, valores de prueba). El arma pierde 1 por ataque y cada golpe recibido desgasta una pieza de armadura por turnos; se aplica al acabar el combate (`Combatant.wear`, `wearEquipment`). Avisos al 25 % y al 10 % y al romperse. Roto no se destruye: no da estadísticas ni especiales, pero queda el ataque básico y la habilidad de clase. Los picos gastados quedan a 0 en la mochila. Reparación: pestaña «Reparar» de Maese Brand (equipo, mochila y almacén; cobra del almacén) y «Kit de reparación» (Brand, rango 0; en la mazmorra repara el 40 % de lo puesto y de los picos). Barrita de desgaste en las casillas y durabilidad en las fichas. Partidas antiguas: sin campo `dur` = entero (no hace falta migrar). Pruebas: `tests/durability.test.ts` y `scripts/durabilidad-check.cjs`.
- 11/11: Fase 2 de la expansión: combate 1 contra 2 y 2 contra 2. Máximo dos por bando (`MAX_PER_SIDE`, `createCombat` lo exige); con mercenario, Kael no entra. Al tocar a un enemigo, entra también otro que ya te persiga a 4 casillas o menos (`DungeonScene.joiningEnemy`; nunca jefes ni terceros). Enemigos iguales se llaman «I» y «II»; el registro dice a quién golpeas. Objetivo: tocar su ficha o su figura, o Tab; con dos enemigos las fichas son compactas (`.frame-duo`) para no tapar al personaje. El Bloqueo frena el primer golpe y deja en guardia (mitad de daño) hasta tu turno. Si huyes tras abatir a uno, su botín cae al suelo y el muerto no revive. Pruebas: `tests/groups.test.ts` (1 contra 2: guerrero 93 % y mago 100 % de victorias, ambos pueden huir; combate que sobrevive a JSON) y `scripts/grupos-check.cjs`. `e2e.cjs` ya no falla cuando el enemigo no suelta nada; `e2e-social.cjs` paga la parte del errante en el portal antes de extraer (la prueba estaba desfasada).
- 11/11: Fase 1 de la expansión. `store.ts` separado en `internals.ts` (estado y guardado), `expeditionActions.ts` y `combatActions.ts` (la interfaz sigue importando de `store.ts`). Guardado formato 4 con migración desde el 3 (`playMs` por personaje). Reloj de juego `core/clock.ts` (`state.clock`): pulsos de 1 s, en pausa con menú, resumen o pestaña oculta; suma al `playMs` al terminar la expedición. Siguiente: Fase 2 (combate 1 contra 2 y 2 contra 2).
- 11/11: plan de la expansión analizado y decisiones del usuario guardadas en `docs/plan-expansion.md` (Fase 0). Siguiente: Fase 1 (base técnica).
- 11/11: botones Apoyar (Ko-fi, sustituye a Stripe) y Discord en la landing y el juego; privacidad y cookies actualizadas; iconos provisionales en la lista de assets.
- 11/11: `CLAUDE.md` reorganizado y este archivo creado para trabajar entre sesiones y ordenadores.
- 6/11:
  - cambio de nombre a Gravevow en el juego, la landing, los textos legales, el tráiler y las pruebas;
  - logo común con un filete que mide lo mismo que el nombre;
  - el lema cabe en una línea en el móvil.
- 5–6/11: pulido del tutorial, botón «Agrupar oro» en la mazmorra y arrastre táctil más suave.

## Próximos pasos (por decidir con el usuario)
- **Expansión por fases** (`docs/plan-expansion.md`): Fases 0 a 3 hechas; siguiente, Fase 4 (anatomía, sangrado y fracturas). Pendiente de la Fase 2 para más adelante: órdenes del mercenario (Apoyar, Concentrar, Proteger, Conservar) y aviso en el mapa de que un encuentro puede ser doble.
- Arte definitivo de los atuendos y de las subzonas.
- Clases nuevas: Pícaro y Clérigo.
- Tráiler nuevo cuando haya contenido nuevo.
- Más adelante: redes sociales, Steam, guardado en la nube y multijugador.
  - El diseño propuesto está en `docs/ARQUITECTURA.md`.
  - Antes de nada de esto hay que actualizar las políticas legales.
