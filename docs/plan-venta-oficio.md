# Plan: venta de objetos por oficio

Estado: IMPLEMENTADO (24/11) con las recomendaciones aprobadas: Orik compra (B), Nira al precio de siempre, especialista +10 %, guanteletes de forja pesados. Maquetas en `mockups/venta-oficio/index.html`.

## 1. Situación actual

| Mercader | ¿Compra ahora? | Qué compra | Dónde está |
|---|---|---|---|
| Nira | Sí | Todo (salvo monedas, sacos con oro y equipo de recluta) | `core/data/vendors.ts` (`buysItems: true`), `core/economy.ts` (`buysThis`, `sell`) |
| Grizk | Sí | Joyas, reliquias, anillos, amuletos y monedas, pagando ×1,25 | `config/gold.ts` (`COLLECTOR_BUYS`, `COLLECTOR_PRICE_MULT`) |
| Vesper, Garth, Orik, Brand, Valerius, Eldrin | No | Nada | `buysItems: false` |

- La pestaña «Vender» sale si `buysItems` es true (`servicesOf`, `ui/screens/Mercaderes.tsx`). La pantalla de venta (`SellView` y `SellSide`) es la misma para todos.
- La venta usa `state.activeVendor` (`store.ts`: `sell` y `sellMany`).
- En el cajón hay botones para marcar «equipo común», «materiales» y «tesoros».
- La recepción del Taller (`reception('sell')`) vende a través de Nira.
- El precio es `valor × 0,1 × 0,4`, ajustado por rareza y atributos (`sellPrice`). Grizk paga ×1,25.

**Cambios:** los 8 compran, cada uno solo lo de su oficio. Nira deja de comprar de todo y pasa a comprar lo suyo más lo de los especialistas que aún no están en marcha.

**Nombre:** en código, diálogos, docs y tests solo aparece «Valerius» (100 veces) o el identificador `valerius` (56 veces). No hay otras variantes.

## 2. Qué compra cada uno

En el código hay 314 objetos. No se venden las monedas, el oro, los sacos, las casillas tapadas ni el equipo de recluta, igual que ahora.

| Mercader | Compra | Objetos |
|---|---|---|
| **Nira** | Pieles, cueros, tela, armaduras ligeras y mochilas | Armaduras ligeras (ver §3); retales de cuero, cuero curtido, cuero ignífugo, tela raída, tela tejida, paño de sudario, seda de ceniza y correa; las 3 mochilas |
| **Vesper** | Hierbas, pociones, vendas y remedios | Pociones de vida y de maná, tónico, antídoto, venda, hemostático, torniquete, férula, analgésico, equipo de cirugía; hierba amarga |
| **Garth** | Comida, carne e ingredientes | Raciones, agua, pan, manzana, cecina, queso, vino aguado, té, guiso, caldo; carne en salazón, setas, harina, leche y vino agrio |
| **Orik** | Metal, madera, chatarra y herramientas (opción B) | Chatarra, menas, plata bendita, esquirla de obsidiana, lingotes y barra de chatarra, acero infernal, madera vieja, empuñadura, asta, hueso antiguo; picos y kit de reparación; antorchas (de brea e infernal), que se hacen en su banco |
| **Grizk** | Joyas, anillos, amuletos, gemas y tesoros | Las 14 joyas; cáliz dorado, cráneo dorado y fragmento de corona; las 5 llaves. Sigue pagando ×1,25 como ahora |
| **Brand** | Armas | Las 54 armas; daga de parada y daga ritual (secundarias de filo) |
| **Valerius** | Armaduras pesadas y escudos | Los 8 escudos y las armaduras pesadas (ver §3) |
| **Eldrin** | Pergaminos, esencias, reactivos y objetos mágicos | Esquirla arcana, ectoplasma, cristales, azufre, sangre de demonio, polvo de hueso, ala de murciélago, pergamino, tinta rúnica, brea, pólvora de hueso, las 4 runas; las 4 bombas; tomos, grimorios, orbes, farol, velo y ojo del Abismo |
| Planos (87) | Los compra quien tiene la estación de esa receta | Por ejemplo, el plano de la coraza del Bastión lo compra Valerius y el de la túnica de sombras, Nira |

Casos que no encajaban y propuesta:
- **Llaves:** Grizk, porque son «cosas que otros no quieren».
- **Bombas:** Eldrin, porque son reactivos.
- **Antorchas:** Orik, porque se hacen en su banco.
- **Herramientas:** Orik.
- **Mochilas:** Nira, porque son de cuero.
- **Planos:** el dueño de la estación de su receta.

**Orik**
- Opción A: no compra nada. Entonces el metal, la madera y las herramientas tendrían que ir a Brand o a Nira, que no es su oficio.
- Opción B: compra materiales sueltos y herramientas.
- **Recomiendo la B**: es el oficio que más encaja con lo que traes del fondo, y así ningún tipo queda forzado en otro mercader.

## 3. Ligeras o pesadas

No hay un campo de material ni de peso en los datos. El criterio más fiable es el de las clases.

**Regla: es pesada si solo la pueden llevar guerreros o clérigos. Los escudos son siempre pesados. Todo lo demás es ligero.**

- **Pesadas → Valerius (16 piezas):**
  - Cota de malla, coraza del Bastión, coraza de plata bendita, armadura de acero infernal, coraza de sangre demoníaca, coraza de sangre seca y coraza de cadenas.
  - Yelmo de hierro, del caballero, de plata bendita, de acero infernal, de la guardia y de obsidiana.
  - Guanteletes de acero, de plata y garras del demonio.
- **Ligeras → Nira (30 piezas):**
  - Todas las túnicas, capuchas, sombreros y botas.
  - Jubón acolchado.
  - Guantes y brazales de cuero, guantes de seda fúnebre.
  - Gorro de centinela, máscara de hueso, corona del duque y corona rota de Belzar.
- **A tu criterio:** los guanteletes de forja no tienen restricción de clase y por la regla serían ligeros, aunque por el nombre son de metal. Propongo añadir un campo `heavy` para marcar a mano las excepciones como esta.

## 4. Mercaderes no disponibles

Ahora todos los mercaderes están en el Bastión desde el principio; «Desconocido» es solo el rango de reputación. Lo que de verdad falta al principio es su estación.

**Propuesta:** el especialista compra cuando su estación está reconstruida (nivel 1 o más). Mientras siga en ruinas, lo compra Nira.
- En la pestaña «Vender» del especialista se lee: «Aún no compro nada: reconstruye mi estación. Mientras, lo compra Nira en El Mercado».
- Grizk compra siempre, como ahora.
- Nira no depende de nada: es el mercado general.

**Precio en Nira mientras tanto:**
- Opción 1: el mismo precio que ahora.
- Opción 2: un 75 % del precio.
- **Recomiendo la opción 1**: hoy Nira paga el 100 % de todo, así que bajarlo recortaría el oro de los primeros días sin necesidad.

## 5. Precios

Se mantienen los actuales.

**Propuesta, sin aplicar:** que el especialista pague un +10 % sobre ese precio. Así compensa ir a él en vez de a Nira. Grizk ya paga ×1,25.

## 6. Comodidad

- **a) «Vender todo lo que compro»**
  - Un botón en el cajón de venta de cada mercader, que sustituye a los tres botones de marcar. Debajo pone qué compra ese mercader.
  - Abre una confirmación con la lista de objetos, su oro y el total.
  - Solo coge de la mochila, no del almacén, para no vaciar lo que guardas a propósito.
  - Lo equipado no está en esas casillas, así que nunca entra. Las piezas de tu personaje que estén en la mochila salen marcadas con un aviso, como ya hace ahora la confirmación de «Vender».
  - Marcar a mano y arrastrar sigue funcionando igual.
- **b) Inventario**
  - Cada casilla de la mochila lleva en la esquina las dos primeras letras del comprador, en su color (Ni, Gr, Br…).
  - En la ficha del objeto se añade «Lo compra Grizk · La Lonja».
  - No depende solo del color: siempre lleva texto.
- **c) Mercader equivocado**
  - En su pestaña «Vender», lo que no compra sale apagado y en gris.
  - Si lo marcas, lo arrastras o haces doble clic, aparece un aviso: «Brand solo compra armas. Las joyas las compra Grizk en La Lonja».

## 7. Dependencias

- **Tutoriales:**
  - `vendor.nira` dice «si traes chatarra, la compro»: lo cambio a «compro cuero, tela y armadura ligera; y lo de quien aún no tenga su taller».
  - Añado una línea «Vender» a los otros 7 (cada uno dice qué compra).
  - `bastion.first-sale` se revisa.
  - **Se ha colado un error del cambio anterior:** `vendor.orik` aún dice «te arreglo lo que traigas abollado». Lo corrijo en esta tanda.
- **Misiones:** ninguna pide vender.
- **Reputación:** vender no da reputación, ni ahora ni con el cambio.
- **Iconos:** la pestaña «Vender» ya tiene el suyo.
- **Partidas guardadas:** no se guarda nada nuevo. El reparto se calcula a partir de la ficha del objeto, así que las partidas antiguas cargan igual.
- **Recompra:** la lista de recompra (las 5 últimas ventas) sigue igual.
- **Recepción del Taller:** su botón «Vender» sigue pagando como Nira. Propongo dejarlo así, porque es un atajo de esa pantalla.

## 8. Archivos

- **Nuevo:** `src/core/sellRoutes.ts`, con `buyerOf(item)`, `whoBuys(p, item)`, `isHeavy` y la tabla de oficios.
- **Datos y reglas:** `src/core/economy.ts` (`buysThis` y el mensaje de error con el comprador correcto) y `src/core/data/vendors.ts` (todos con `buysItems`).
- **Interfaz:** `src/game/ui/screens/Mercaderes.tsx` (cajón de venta, casillas apagadas, confirmación), `src/game/ui/inventory.tsx` (iniciales en la esquina y línea de la ficha) y `src/game/game.css`.
- **Tutoriales:** `src/core/data/tutorials.ts` y `docs/tutoriales.md`.
- **Tests y docs:** `tests/sellRoutes.test.ts` (que ningún tipo se quede sin comprador y el reparto de ligeras y pesadas), `docs/estado-trabajo.md` y `docs/guia-interfaz.md`.
