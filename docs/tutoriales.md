# Tutoriales de Gravevow

Mapa de los tutoriales: qué hay, qué los dispara y qué resaltan. Si cambias un tutorial, actualiza también este archivo.

## Piezas
- **Tutorial inicial de expedición**: `src/core/data/tutorial.ts` (pasos y mapa) y el cartel `TutorialGuide`. Se salta con la casilla «Saltar el tutorial» (marcada por defecto) y se repite desde Ajustes › Partida.
- **Mini tutoriales**: datos en `src/core/data/tutorials.ts`; cola y reglas en `src/core/tutorials.ts`; cartel en `src/game/ui/MiniTutorial.tsx`.
  - Se lanzan con `actions.tutorialEvent('<disparador>')`. La cola descarta lo ya visto y lo repetido, y saca uno cada vez.
  - No salen durante el tutorial inicial. Si hay una ventana abierta, esperan (salvo `overModal`). En combate solo salen los `inCombat`.
  - Los de la expedición los dispara `useExpeditionMinis` (`ExpeditionMinis.tsx`) mirando el estado.
  - Se guardan en la cuenta: `account.tutorials = { seen, disabled }`. Los `always` (subidas de nivel) salen aunque estén desactivados.
- **Guía**: Ajustes › Partida (y el «?» del menú). Agrupa por tema todo menos los `always`; lo no visto dice «Aún por descubrir».
- Depuración: `?debug` los apaga; `?debug&minis` los enseña.

- **Comer y beber** (12/11): se hace siempre desde el objeto (elegirlo y «Comer»/«Beber», `act-eat`, o doble toque). El paso `eat` del tutorial inicial resalta `btn-inventory`, el pan de la mochila y `act-eat`; `exp.need-low` explica lo mismo. Las cajas de necesidades no tienen botones: solo el aviso «Tienes comida/bebida en la mochila» (`need-food-<sat|hyd>`), que resalta esos objetos.

## Reglas para añadir uno
1. Entrada en `MINI_TUTORIALS` con id, tema, disparador, de 2 a 4 pasos (texto de escritorio y, si cambia, `touch`) y quién lo cuenta.
2. Cada `target` y `badge` es un `data-testid` que existe en `src/`. Cada disparador se lanza en algún sitio de `src/`. Lo comprueba `tests/tutorials.test.ts`.
3. Lo que se resalta y los botones del cartel miden 44 px o más en táctil.
4. Sin funciones inventadas: solo se enseña lo que existe.
5. Añade su fila a la tabla de abajo y una comprobación en el script e2e que toque.

## Mapa de mini tutoriales

| Id | Tema | Disparador | Lo cuenta | «!» en | Resalta | Pasos | Notas |
|---|---|---|---|---|---|---|---|
| `bienvenida` | Bastión y estaciones | `lobby:welcome` | intendant | — | `lobby-nav`, `tab-stash`, `alijo-backpack`, `group-gold-backpack`, `alijo-pocket`, `empty-backpack`, `tab-merchants`, `bastion-merchants`, `btn-lobby-settings`, `tab-play`, `btn-enter-dungeon` | 11 | largo |
| `tab.misiones` | Mercaderes | `tab:quests` | intendant | `tab-quests` | `screen-quests` | 2 | — |
| `tab.bestiario` | Progresión | `tab:bestiary` | intendant | `tab-bestiary` | `bestiary` | 2 | — |
| `tab.tienda` | Cuenta y copia | `tab:shop` | intendant | `tab-shop` | `shop` | 2 | — |
| `tab.intendencia` | Heridas y necesidades | `stash:status` | intendant | — | `intendencia-status`, `body-quick` | 2 | — |
| `tab.personaje` | Progresión | `tab:character` | intendant | `tab-character` | `character-stats`, `class-path` | 2 | — |
| `screen.bastion-entry` | Mercaderes | `bastion:merchants` | intendant | `bastion-merchants` | `vendor-card-nira`, `vendor-nira` | 2 | — |
| `tab.refugio` | Bastión y estaciones | `bastion:refuge` | orik | `bastion-refuge` | `station-grid`, `module-cot`, `module-kitchen` | 3 | — |
| `screen.backup` | Cuenta y copia | `screen:backup` | intendant | — | `screen-backup` | 2 | — |
| `screen.select` | Cuenta y copia | `screen:select` | intendant | — | `screen-select` | 2 | — |
| `station.runes` | Bastión y estaciones | `station:runes` | eldrin | — | `runes` | 2 | — |
| `bastion.first-death` | Heridas y necesidades | `bastion:fallen` | vesper | — | `cure-btn` | 3 | — |
| `bastion.can-craft` | Bastión y estaciones | `bastion:can-craft` | intendant | — | `tab-merchants` | 2 | — |
| `bastion.first-sale` | Objetos y oro | `bastion:sale` | intendant | — | — | 2 | — |
| `bastion.first-rep` | Mercaderes | `bastion:rank-up` | intendant | — | — | 2 | — |
| `bastion.first-skin` | Cuenta y copia | `bastion:skin` | intendant | — | — | 2 | — |
| `unlock.stash-page` | Objetos y oro | `unlock:stash-page` | intendant | — | `stash-pages` | 2 | Al comprar una página del almacén. |
| `unlock.shared-page` | Cuenta y copia | `unlock:shared-page` | intendant | — | `stash-page-shared` | 2 | Al comprar «Compartido». |
| `unlock.class-skill` | Progresión | `unlock:class-skill` | intendant | — | `tab-character` | 3 | Al elegir una habilidad en el aviso de hito (sale al cerrar ese aviso). |
| `screen.settings` | Cuenta y copia | `screen:settings` | intendant | — | `settings-nav`, `settings-tab-game` | 2 | sobre ventana |
| `exp.clock` | Combate | `exp:clock` | intendant | — | `hud-timer` | 2 | — |
| `exp.vital-wound` | Heridas y necesidades | `exp:vital-wound` | intendant | — | `hud-body` | 2 | — |
| `exp.fracture` | Heridas y necesidades | `exp:fracture` | intendant | — | `hud-body` | 2 | — |
| `exp.bleeding` | Heridas y necesidades | `exp:bleeding` | intendant | — | `hud-body` | 2 | — |
| `exp.armor-broken` | Objetos y oro | `exp:armor-broken` | intendant | — | `btn-inventory` | 2 | — |
| `exp.backpack-full` | Objetos y oro | `exp:backpack-full` | intendant | — | `hud-player`, `btn-inventory` | 2 | — |
| `exp.need-low` | Heridas y necesidades | `exp:need-low` | intendant | — | `hud-needs`, `btn-inventory` | 2 | — |
| `exp.merc-triangle` | Combate | `exp:merc-triangle` | intendant | — | `risk-badge` | 2 | sobre ventana |
| `exp.kael` | Combate | `exp:kael` | intendant | — | `risk-badge` | 2 | sobre ventana |
| `exp.elite` | Combate | `exp:elite` | intendant | — | — | 2 | en combate |
| `exp.boss` | Combate | `exp:boss` | intendant | — | — | 2 | en combate |
| `combat.class-skill` | Combate | `combat:class-skill` | intendant | — | `act-class` | 2 | en combate |
| `exp.subzone.castillo` | Progresión | `subzone:castillo` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.calabozos` | Progresión | `subzone:calabozos` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.osario` | Progresión | `subzone:osario` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.catacumbas` | Progresión | `subzone:catacumbas` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.panteon` | Progresión | `subzone:panteon` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.carmesi` | Progresión | `subzone:carmesi` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.puertas` | Progresión | `subzone:puertas` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.rios` | Progresión | `subzone:rios` | intendant | — | `hud-room` | 2 | — |
| `exp.subzone.trono` | Progresión | `subzone:trono` | intendant | — | `hud-room` | 2 | — |
| `vendor.nira` | Mercaderes | `vendor:nira` | nira | `vendor-card-nira` | `vendor-view-shop`, `vendor-view-sell`, `vendor-view-quests` | 3 | — |
| `vendor.vesper` | Mercaderes | `vendor:vesper` | vesper | `vendor-card-vesper` | `vendor-view-shop`, `vendor-view-infirmary` | 2 | — |
| `vendor.garth` | Mercaderes | `vendor:garth` | garth | `vendor-card-garth` | `vendor-view-shop`, `vendor-view-cook` | 2 | — |
| `vendor.orik` | Mercaderes | `vendor:orik` | orik | `vendor-card-orik` | `vendor-view-repair`, `vendor-view-scrap` | 2 | — |
| `vendor.grizk` | Mercaderes | `vendor:grizk` | grizk | `vendor-card-grizk` | `vendor-view-shop`, `vendor-view-contracts` | 2 | — |
| `vendor.brand` | Mercaderes | `vendor:brand` | brand | `vendor-card-brand` | `vendor-view-forge`, `vendor-view-repair` | 2 | — |
| `vendor.valerius` | Mercaderes | `vendor:valerius` | valerius | `vendor-card-valerius` | `vendor-view-shop`, `vendor-view-quests` | 2 | — |
| `vendor.eldrin` | Mercaderes | `vendor:eldrin` | eldrin | `vendor-card-eldrin` | `vendor-view-shop`, `vendor-view-alchemy` | 2 | — |
| `station.kitchen` | Bastión y estaciones | `station:kitchen` | garth | `module-kitchen` | `craft-kitchen`, `recipe-c_jerky`, `craft-go`, `upgrade-open-kitchen` | 4 | — |
| `station.bench` | Bastión y estaciones | `station:bench` | orik | `module-bench` | `craft-bench`, `recipe-c_strap`, `craft-go`, `upgrade-open-bench` | 4 | — |
| `station.infirmary` | Bastión y estaciones | `station:infirmary` | vesper | `module-infirmary` | `craft-infirmary`, `recipe-c_bandage`, `craft-go`, `upgrade-open-infirmary` | 4 | — |
| `station.forge` | Bastión y estaciones | `station:forge` | brand | `module-forge` | `craft-forge`, `recipe-c_scrap_bar`, `craft-go`, `upgrade-open-forge` | 4 | — |
| `station.alchemy` | Bastión y estaciones | `station:alchemy` | eldrin | `module-alchemy` | `craft-alchemy`, `recipe-c_antidote`, `craft-go`, `upgrade-open-alchemy` | 4 | — |
| `station.runic` | Bastión y estaciones | `station:runic` | eldrin | `module-runic` | `craft-runic`, `recipe-c_cut_crystal`, `craft-go`, `upgrade-open-runic` | 4 | — |
| `station.cot.lv2` | Bastión y estaciones | `station-up:cot:2` | orik | — | — | 2 | siempre |
| `station.cot.lv3` | Bastión y estaciones | `station-up:cot:3` | orik | — | — | 2 | siempre |
| `station.kitchen.lv2` | Bastión y estaciones | `station-up:kitchen:2` | garth | — | — | 2 | siempre |
| `station.kitchen.lv3` | Bastión y estaciones | `station-up:kitchen:3` | garth | — | — | 2 | siempre |
| `station.bench.lv2` | Bastión y estaciones | `station-up:bench:2` | orik | — | — | 2 | siempre |
| `station.bench.lv3` | Bastión y estaciones | `station-up:bench:3` | orik | — | — | 2 | siempre |
| `station.infirmary.lv2` | Bastión y estaciones | `station-up:infirmary:2` | vesper | — | — | 2 | siempre |
| `station.infirmary.lv3` | Bastión y estaciones | `station-up:infirmary:3` | vesper | — | — | 2 | siempre |
| `station.forge.lv2` | Bastión y estaciones | `station-up:forge:2` | brand | — | — | 2 | siempre |
| `station.forge.lv3` | Bastión y estaciones | `station-up:forge:3` | brand | — | — | 2 | siempre |
| `station.alchemy.lv2` | Bastión y estaciones | `station-up:alchemy:2` | eldrin | — | — | 2 | siempre |
| `station.alchemy.lv3` | Bastión y estaciones | `station-up:alchemy:3` | eldrin | — | — | 2 | siempre |
| `station.runic.lv2` | Bastión y estaciones | `station-up:runic:2` | eldrin | — | — | 2 | siempre |
| `station.runic.lv3` | Bastión y estaciones | `station-up:runic:3` | eldrin | — | — | 2 | siempre |
