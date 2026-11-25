# Plan: seguro de equipo (herrero y armero)

Estado: **implementado (24/11).** Seguro por bajada, solo el equipo puesto, con la estación del mercader reconstruida.

## 1. Cómo funciona hoy

- **Al morir** (`core/expedition.ts › endExpedition`, razones `died` y `timeout`): se pierden la mochila y el equipo puesto. Se salvan el bolsillo seguro (`pocket`) y el equipo de recluta (`recruit`, `keptRecruitGear`). El almacén y la página «Compartido» no bajan a la mazmorra, así que nunca se pierden. El resumen ya trae la lista de lo perdido (`summary.lost`).
- **Dónde está cada cosa:** en el perfil (`Profile`): `equipment` (8 ranuras), `backpack`, `stash` (páginas propias), `shared` (de la cuenta) y `pocket`. Al empezar la expedición se copian el equipo y la mochila (`startExpedition`). Si se extrae, vuelven al perfil tal cual.
- **Identidad de cada pieza:** cada ejemplar (`ItemStack`) tiene un `uid` que se mantiene al moverlo de sitio y al bajar y subir de la mazmorra. Armas y armaduras no se apilan (cantidad 1), así que el `uid` identifica la pieza. Cada ejemplar lleva también rareza, atributos (`affixes`), runas, calidad de forja y durabilidad.
- **Mercaderes:**
  - **Maese Brand**, herrero de armas, en la forja: Tienda, Reparar y Forja. **Valerius**, armero de placas, en la armería: Tienda y Forja de armaduras. **Eldrin**, alquimista, en el laboratorio: fabrica los amuletos.
  - Todos los mercaderes están desde el principio: `vendorUnlocked` siempre devuelve sí. El dato `unlockAt` de cada ficha ya no se usa.
  - Ninguno de los dos compra objetos. Las ventas las hace Nira, y Orik desguaza.
  - Las pestañas salen de `servicesOf` (`ui/screens/Mercaderes.tsx`) y la marca de «pendiente» en el Bastión, de `pendingOf`.
- **Precios:** `buyPrice` = valor × 0,1 (`GOLD_SCALE`). La venta, en `sellPrice`, es el 40 % del valor, ajustado por la rareza del ejemplar (k²) y +10 % por cada atributo.

Valor de compra de las piezas actuales, en monedas:

| Rareza | Mín. | Mediana | Máx. | Ejemplos |
|---|---|---|---|---|
| Común | 1 | 1 | 5 | Espada oxidada 1 · Brazales de cuero 5 |
| Poco común | 4 | 17 | 70 | Daga de hueso 4 · Botas de patio 17 · Báculo de azufre 70 |
| Rara | 11 | 60 | 134 | Botas del correveidile 11 · Varita de ceniza 134 |
| Épica | 40 | 110 | 240 | Cetro del sudario 110 · Cetro del abismo 240 |
| Legendaria | 90 | 320 | 419 | Cetro de azufre forjado 320 · Corona rota de Belzar 419 |

Oro de una incursión completa: unas 31 monedas en las Afueras, 76 en El Osario, 150 en la Cripta Carmesí y 210 en el Trono de las Cadenas. A eso se suman las ventas, que vienen a ser de 2 a 5 veces más.

## 2. Reglas finales (revisadas el 24/11: un seguro por bajada)

1. **Por bajada.** El seguro se contrata al pulsar «Descender» y cubre solo esa incursión. Al volver, pase lo que pase, se acaba: la siguiente bajada se vuelve a preguntar.
2. **Se pregunta al bajar.** Al pulsar «Descender» sale la ventana «¿Aseguras tu equipo?» con el muñeco de equipo (como en la ficha Personaje):
   - cada casilla con su coste; se toca para asegurarla (borde dorado y sello) o quitarla;
   - el botón «Todo» asegura todas las piezas puestas;
   - el total y lo que tienes, y los botones «Bajar sin asegurar» y «Asegurar y bajar · N».
   La ventana recuerda lo que marcaste la última vez. Se puede desactivar con «No volver a preguntar» (se vuelve a activar en Ajustes).
3. **Coste:** el 4 % del valor del ejemplar, con un mínimo de 1 moneda. Se paga con el oro del Bastión.
   - El valor del ejemplar es el valor de compra × el factor de rareza del ejemplar (k²) × (1 + 0,1 por atributo), más sus runas.
4. **Qué se asegura:** solo el **equipo puesto** al bajar (8 ranuras). Lo que va en la mochila y lo que encuentras abajo no se asegura. El equipo de recluta no se asegura, porque nunca se pierde.
5. **Quién reforja qué** (quien lo fabrica):
   - Brand: armas (mano principal y mano izquierda que no sea escudo) y anillos.
   - Valerius: casco, peto, guantes, botas y escudos.
   - Eldrin: amuletos.
6. **Si mueres (o se acaba el tiempo)** con piezas aseguradas encima:
   - quedan pendientes de recogida en su mercader;
   - el resumen te dice qué te espera y dónde;
   - al entrar en el Bastión sale un aviso;
   - el mercader lleva la marca «Pieza reforjada» hasta que la recojas.
7. **La pieza vuelve como la bajaste:** rareza, atributos, runas y calidad, con la durabilidad entera. Abajo no se puede mejorar una pieza, así que no hace falta la «foto» ni pagar diferencias.
8. **Si extraes,** el seguro se gasta sin más: no se devuelve el dinero.

## 3. Tabla de costes (4 %, mínimo 1)

| Pieza | Valor del ejemplar | Coste por bajada |
|---|---|---|
| Espada oxidada (común) | 1 | **1** |
| Botas de patio (poco común) | 17 | **1** |
| Báculo de azufre (poco común) | 70 | **3** |
| Varita de ceniza (rara) | 134 | **5** |
| Varita de ceniza (rara, 2 atributos y 1 runa) | 168 | **7** |
| Cetro del abismo (épica) | 240 | **10** |
| Cetro de azufre forjado (legendaria) | 320 | **13** |
| Corona rota de Belzar (legendaria) | 419 | **17** |

- Un equipo de principiante entero (5 piezas comunes) cuesta unas 5 monedas por bajada.
- Un equipo top entero (arma legendaria, casco legendario, peto y botas épicas, anillo y amuleto) cuesta unas 60-70 monedas por bajada. Eso es un tercio de lo que da una incursión del Infierno, así que se puede asegurar solo lo más caro.
- El porcentaje y el mínimo van en `config/insurance.ts`.

## 4. Casos límite y abusos

| Caso | Qué pasa |
|---|---|
| Partidas antiguas | Los datos nuevos son opcionales (`expedition.insured`, `profile.reforged`). Si faltan, no hay nada asegurado ni pendiente. Los objetos no cambian. |
| Expediciones a medias al actualizar | Cargan sin seguro. |
| Morir con varias piezas aseguradas | Todas quedan pendientes, cada una en su mercader. |
| Perder otra con una ya pendiente | Se acumulan, sin límite. |
| Recoger sin sitio | Va a la mochila del Bastión o al almacén; si no cabe en ninguno, sigue pendiente y sale «Haz sitio». |
| Duplicar | No se puede: la original se pierde al morir y la reforjada es nueva (otro `uid`). |
| Quitarse la pieza abajo, soltarla o perderla antes de morir (a la mochila, al bolsillo, robo de Kael, pagarle con ella) | Solo se reforja si al morir la llevabas **puesta**. |
| Asegurar y vender | No aplica: el seguro solo existe durante la bajada y abajo no se vende a los mercaderes del Bastión. |
| Sin oro para todo | Los botones dicen cuánto falta; puedes desmarcar piezas. |
| Tutorial | No se pregunta ni se asegura. |

## 5. Interfaz (para las maquetas)

- **Ventana al pulsar «Descender»** (aprobada en la maqueta `descender2`): título, «Equipado» con el botón «Todo», el muñeco de equipo (8 casillas, el coste en cada una, las vacías apagadas con «Vacío»), y abajo el sello, «N piezas», «Tienes X monedas», «Total: N» y los botones «Bajar sin asegurar» y «Asegurar y bajar · N». En el móvil, el muñeco a la izquierda y el resto a la derecha.
- **Sello en la casilla** (solo durante la bajada): un pequeño escudo con una marca, en la esquina de la casilla, en pixel art a escala entera. Sale en el equipo de la mazmorra. En la ficha del objeto pone «Asegurada esta bajada». Nunca solo con color.
- **Al volver tras morir:**
  - el resumen añade «Te esperan 2 piezas reforjadas: Maese Brand (Varita…) y Valerius (Corona…)»;
  - al entrar en el Bastión sale un aviso;
  - en la tarjeta del mercader aparece la marca «Pieza reforjada».
- **Recogida:** en el mercader, una ventana con las piezas reforjadas y «Recoger» o «Recoger todo».
- **Mini tutorial:** la primera vez que sale la ventana del seguro, dos pasos: qué cubre (solo esta bajada) y dónde se recoge.

## 6. Archivos que tocaré

- `src/config/insurance.ts` (nuevo): porcentaje, mínimo y qué mercader cubre cada ranura.
- `src/core/insurance.ts` (nuevo): coste, asegurar, actualizar, borrar al vender o desguazar, `onDeath` (crea los pendientes) y `collect`. Tests en `tests/insurance.test.ts`.
- `src/core/types.ts`: `Profile.insured?` y `Profile.reforged?`.
- `src/core/expedition.ts › endExpedition`: al perder, llamar a `onDeath` y añadir la nota al resumen.
- `src/core/economy.ts` (venta) y `src/core/salvage.ts` (desguace): borrar el seguro.
- `src/game/state/store.ts`: las acciones `insureItem`, `collectReforged` y el aviso al entrar en el Bastión.
- `ui/screens/Mercaderes.tsx`: la pestaña `insure` en `servicesOf`, la marca en `pendingOf` y la ventana de recogida.
- `ui/inventory.tsx` (sello en la casilla), `ui/screens/ItemCard.tsx` (línea en la ficha), `ui/SummaryScreen.tsx` (nota del resumen) y `kit/tabIcons.ts` (icono «Asegurar»).
- `core/data/tutorials.ts`: el mini tutorial `vendor.insure`.
- `docs/estado-trabajo.md`, `docs/guia-interfaz.md` y `docs/tutoriales.md`.
- `mockups/seguro-equipo/`: maquetas, capturas y página índice.

## 7. Respuestas (24/11)

1. «Se acabó el tiempo» cuenta como muerte: sí.
2. Anillos y amuletos los asegura quien los fabrica: los anillos, Brand; los amuletos, Eldrin.
3. Opción A (la pieza vuelve entera). Con el seguro por bajada ya no hace falta la foto.
5. El seguro es **solo para una bajada**, más barato, y se pregunta al pulsar «Descender».
4. No aplica: Brand y Valerius están desde el principio (la pregunta partía de un dato viejo).

## 8. Añadido al aprobar (24/11)

- El seguro de cada pieza solo está disponible con la estación de su mercader **reconstruida** (Forja de Brand, Forja de armaduras de Valerius, Laboratorio de Eldrin). Las piezas de una estación en ruinas salen con candado; al tocarlas, el aviso dice qué reconstruir. Sin ninguna estación, la ventana no sale.
- Brand, Valerius y Eldrin tienen la pestaña **Seguro** (con su estación reconstruida o con piezas pendientes): recoger lo reforjado y marcar lo de la próxima bajada (se paga al pulsar «Descender»).
- Ventana final: cuadrícula de 2 × 4 casillas a la izquierda y recibo (piezas marcadas, «Tienes», «Total» y botones) a la derecha, igual en los tres tamaños.
- «Preguntar si aseguro el equipo al pulsar Descender» en Ajustes › Partida.
