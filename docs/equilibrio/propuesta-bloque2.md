# Bloque 2 · Bastión y crafteo: propuesta

Propuesta sin tocar el código. Las tablas de recetas y desguace salen de unas reglas fijas, aplicadas con un script (`/tmp`, no va al repositorio). Así todas las cifras son coherentes entre sí y se pueden reajustar cambiando una sola regla. Las maquetas están en `mockups/bastion/index.html`.

Las materias y los objetos nuevos llevan ✱. «S» es la subzona: S1 son las Afueras del Bastión y S10 el Trono de las Cadenas.

## 1. Cómo funciona ahora

**Espacios.** Bastión → «Tu Refugio» tiene cinco módulos (`data/refuge.ts`):

| Módulo | Niveles | Cómo se mejora hoy |
|---|---|---|
| Catre | Paja → con jergón | 4 chatarra, 6 retales y 60 de oro; lo monta Orik |
| Cocina | Sin fogón → Fogón → Despensa | Garth (2 cobre, 40 de oro); después Orik |
| Banco de trabajo | Sin banco → Banco | Orik: 8 chatarra y 50 de oro; +25 % al desguazar |
| Rincón de cura | Sin rincón → Rincón | Vesper: 6 retales, 2 agua y 60 de oro |
| Mesa de alquimia | Sin mesa → Mesa | Eldrin (llega en S7): 4 esquirlas, 4 chatarra y 120 de oro |

Los módulos no se ven bloqueados: solo hay un botón de mejorar que, si el mercader aún no ha llegado, falla con un motivo. No hay una vista de «siguiente objetivo». La forja no es un módulo: es la tienda de Maese Brand (llega en S4) y sus recetas dependen de la reputación con él. El almacén son páginas que se compran.

**Crafteo.** Hay cuatro maneras distintas de fabricar:
- **Cocina (Garth):** 2 recetas con un minijuego de 2 o 3 pasos (elegir el fuego).
- **Yunque de Brand:** 9 recetas (3 por zona, 3 de ellas legendarias) con un minijuego de temperatura y golpes. La calidad (tosca, buena o magistral) suma 0, +10 % o +20 % a todas las estadísticas.
- **Mesa de alquimia:** 3 pociones con un minijuego de densidad.
- **Rincón de cura:** 3 curas por lotes, sin minijuego.

Tras la primera vez hay producción rápida de calidad estándar. Cada pantalla es diferente, y los materiales se cuentan de la mochila y del almacén.

**Componentes.** No existen. Solo hay 16 materias primas (menas, retales, chatarra, hueso, ectoplasma, azufre…) y casi todo el equipo se compra o se encuentra.

**Desguace (Orik).** Cada objeto da un solo material según su tipo: chatarra, retales o esquirla arcana. La cantidad sale de su valor, su rareza y su estado, con un tope del 80 % de su precio. Es de uno en uno y el equipo de recluta ya está bloqueado.

## 2. Desbloqueo de los espacios

**Reglas:**
1. Cada espacio tiene un nivel 1 que lo abre y uno o dos niveles de mejora.
2. Abrir un espacio pide tres cosas, todas a la vista:
   - haber llegado a una subzona;
   - un **encargo** del mercader que lo monta (una entrega pequeña de cosas que ya se consiguen);
   - oro y materiales.
3. Mejorarlo pide la subzona, oro y materiales. Se hace al momento, sin esperas.
4. Ningún espacio pide algo que solo fabrica él mismo. Para abrir el nivel 1 solo hacen falta materias primas.
5. Los básicos (Barracones y Cocina) están desde el principio. El Banco y el Rincón de cura se abren al acabar el tutorial y llegar a S1. Lo avanzado va ligado a bajar.

| Espacio | Nv | Pide | Coste | Lo que aporta |
|---|---|---|---|---|
| **Barracones** (catre) | 1 | Desde el inicio | — | Dormir llena el Descanso, gratis |
| | 2 | Llegar a S2 | 6 madera, 6 retales, 60 de oro (Nira) | −10 % de Descanso en la siguiente incursión |
| | 3 | Llegar a S4 | 4 lingotes de hierro, 4 telas tejidas, 200 de oro | −15 % (dentro del tope del 30 %) |
| **Cocina** | 1 | Desde el inicio (Garth) | — | Pan, cecina, vino aguado y ración; lotes de 5 |
| | 2 | Llegar a S2 + encargo de Garth «La despensa» (6 setas, 2 carnes) | 80 de oro | Queso, té, Guiso del Bastión; lotes de 10 |
| | 3 | Llegar a S5 | 4 lingotes de hierro, 6 madera, 250 de oro | Caldo especiado; lotes de 20 |
| **Banco de trabajo** | 1 | Llegar a S1 + encargo de Nira «Herramientas viejas» (6 madera) | 4 retales, 40 de oro | Empuñaduras, correas, astas, cuero y tela; equipo de cuero y tela, botas, bolsas, antorchas y kit de reparación; lotes de 5 |
| | 2 | Llegar a S4 | 4 lingotes de hierro, 8 cueros curtidos, 300 de oro | Paño de sudario; lotes de 10; +10 % de acabado fino |
| | 3 | Llegar a S7 | 4 lingotes de plata, 6 azufre, 1200 de oro | Cuero ignífugo y seda de ceniza; lotes de 20; +20 % |
| **Rincón de cura** | 1 | Llegar a S1 + encargo de Vesper «Hilo hervido» (4 telas raídas) | 30 de oro | Vendas, torniquetes y férulas |
| | 2 | Llegar a S3 | 6 telas tejidas, 2 lingotes de hierro, 150 de oro | Hemostático |
| | 3 | Llegar a S6 | 4 lingotes de plata, 6 paños de sudario, 600 de oro | Equipo de cirugía |
| **Forja** | 1 | Llegar a S2 + encargo de Orik «Un fuelle que respire» (6 chatarra, 4 retales) | 6 madera, 60 de oro | Barra de chatarra, lingotes de cobre y hierro; armas, armaduras, escudos y anillos de metal de S1–S3; llaves con plano |
| | 2 | Llegar a S4 (Maese Brand) | 6 lingotes de hierro, 4 huesos antiguos, 500 de oro | Lingote de plata; metal de S4–S6; +10 % de acabado fino |
| | 3 | Llegar a S7 (Brand y Valerius) | 6 lingotes de plata, 4 obsidianas, 2000 de oro | Obsidiana y acero infernal; metal de S7–S10; +20 % |
| **Mesa de alquimia** | 1 | Llegar a S2 + encargo de Vesper «Un alambique» (2 cobres, 4 setas) | 60 de oro | Pociones de vida y maná, tónico, antídoto, brea, pólvora de hueso, bomba de clavos y frasco de brea; cristal tallado, pergamino y tinta; báculos, varitas, tomos, orbes y amuletos de S1–S3 |
| | 2 | Llegar a S5 | 4 lingotes de plata, 4 ectoplasmas, 400 de oro | Analgésico y metralla de plata; cristal de ectoplasma; arcano de S4–S6; +10 % de acabado fino |
| | 3 | Llegar a S7 (Eldrin) | 6 azufre, 2 sangres de demonio, 1500 de oro | Frasco incendiario de azufre; cristal de azufre; arcano de S7–S10; +20 % |

El almacén sigue como ahora (páginas compradas). Los encargos usan el sistema de misiones que ya existe (`data/quests.ts`, tipo `deliver`), así que se ven en Misiones y en la ficha del espacio.

**Qué aporta cada nivel:**
- **Más recetas:** el nivel decide el tramo de subzonas cuyo equipo común y poco común puedes hacer.
- **Más rápido:** lotes más grandes, porque no hay esperas.
- **Mejor acabado:** probabilidad de que el objeto salga con una rareza más (ver 4.3).

**En la interfaz:**
- Cada espacio es una tarjeta.
- **Bloqueado:** candado, para qué sirve, una lista de requisitos con ✓ o ✗ (subzona, encargo, oro, materiales, cuántos tienes) y el botón «Ver encargo».
- **Abierto:** su nivel, el botón «Entrar» y lo que da el siguiente nivel.
- Arriba, una franja «Tu siguiente objetivo» con el requisito más cercano entre todos los espacios. Por ejemplo: «Forja · te falta llegar a Las mazmorras (S2)».

## 3. Crafteo sin minijuegos

**Se eliminan los tres minijuegos** (fogón, yunque y densidad) y la forja rápida. En su lugar, **un único menú, igual en todos los espacios:**

**A la izquierda: las recetas del espacio.**
- Filtros por tipo: Armas, Protección, Componentes, Consumibles…
- Interruptor «Solo las que puedo hacer».
- Cada fila muestra el icono, el nombre, la rareza y un punto verde si se puede hacer ya.
- Las recetas bloqueadas por nivel o plano salen al final, con candado y el motivo.

**A la derecha: la receta elegida.**
- El objeto resultante con sus estadísticas (la misma ficha que en la tienda).
- Los componentes, con «tienes / necesitas» en verde o en rojo, y lo que falta («faltan 3»).
- El selector de cantidad (−, número, +, «Máx.»), limitado por el lote del nivel y por lo que tienes.
- El destino y el botón «Craftear».
- En móvil apaisado las dos columnas se mantienen. La lista se estrecha y la ficha se desplaza dentro de su caja. Todos los botones miden 44 px.

**Si falta un componente**, al tocarlo se despliega «Dónde conseguirlo»:
- subzonas, enemigos y vetas;
- mercader que lo vende;
- receta que lo produce, con el botón «Ir a su receta». Si es de otro espacio, abre ese espacio con la receta elegida; si ese espacio está cerrado, abre su tarjeta con los requisitos.

**Componentes.** Se toman solos de la mochila y del almacén:
- primero del almacén, para no vaciarte la mochila;
- nunca de lo equipado ni del bolsillo seguro.

**Al fabricar se abre una ventana con lo que ha salido (decidido):**
- el objeto con su icono, su rareza (y si salió con «acabado fino») y su ficha completa: estadísticas, clase, nivel y, si es un lote, la cantidad;
- dos botones de 44 px: **«A la mochila»** y **«Al almacén»**. El botón del almacén está resaltado, porque es la opción por defecto;
- si en la mochila no cabe, su botón sale apagado y dice «No cabe»; si tampoco cabe en el almacén, el único botón es «A la recepción»;
- cerrar la ventana sin elegir lo manda al almacén, para que nunca se pierda nada;
- en el menú de crafteo ya no hace falta el interruptor de destino.

**Lo que fabricas sale al momento y con la calidad estándar.** No se cobra oro por fabricar: el coste es el material. El oro va a abrir y mejorar espacios.

**Pregunta 1, calidad de la forja.** Al quitar el yunque desaparecen tosca, buena y magistral para lo nuevo. Las armas ya forjadas conservan su +10 % o +20 %, así que nadie pierde nada y el guardado no cambia. Si quedó un minijuego a medias en una partida (`Profile.cooking` o `Profile.workshop`), al cargar se entrega el resultado estándar, porque los materiales ya estaban pagados.

## 4. Todos los objetos con componentes

### 4.1 Árbol

Hay tres escalones:
- **Materias primas:** salen de las expediciones o de los mercaderes.
- **Componentes intermedios:** se hacen en los espacios (lingotes, empuñaduras, correas, astas, cuero curtido, telas, cristales, pergamino, tinta, brea y pólvora).
- **Objetos finales.**

El metal y los acentos cambian con la profundidad:

| Tramo | Metal | Cuero y tela | Cristal | Acento | Material fino |
|---|---|---|---|---|---|
| S1 | Barra de chatarra (hierro si el objeto es «de hierro») | Cuero curtido, tela tejida | Cristal tallado | Polvo de hueso | — |
| S2–S3 | Lingote de hierro | Cuero curtido, tela tejida | Cristal tallado | Polvo de hueso | — |
| S4–S6 | Lingote de plata | Cuero curtido, paño de sudario | Cristal de ectoplasma | Ectoplasma (S4–S5), plata bendita (S6) | Plata bendita |
| S7–S8 | Lingote de obsidiana | Cuero ignífugo, seda de ceniza | Cristal de azufre | Azufre | Sangre de demonio |
| S9–S10 | Acero infernal | Cuero ignífugo, seda de ceniza | Cristal de azufre | Sangre de demonio | Sangre de demonio |

Así, lo potente necesita lo que solo hay abajo. Por ejemplo, la Hoja forjada en el abismo (S9) pide 8 aceros infernales, y cada uno lleva una sangre de demonio.

**Reparto por espacio:**
- **Forja:** lingotes; armas de metal (espadas, hachas, mazas, lanzas, dagas, mandobles); armaduras, yelmos y guanteletes del Guerrero; escudos de metal y de hueso; anillos; llaves (con plano); picos.
- **Banco de trabajo:** empuñaduras, correas, astas, cuero y telas; ropa, capuchas y guantes del Mago; botas; escudo de madera; mochilas y saquitos; antorchas; kit de reparación.
- **Cocina:** comida y bebida, con los valores de `config/food.ts` del bloque 1.
- **Rincón de cura:** vendas, torniquetes, férulas, hemostático y equipo de cirugía.
- **Mesa de alquimia:** pociones, antídoto, analgésico, brea, pólvora y bombas; también todo lo del Mago: cristales, pergamino, tinta, báculos, varitas, tomos, orbes y amuletos (decidido: sin Atril aparte).

Siguen siendo materias primas, sin receta: la manzana, el agua, la carne y las setas (las vende Garth o se recogen).

**Fuera del crafteo:**
- el oro y las monedas;
- los tesoros que se venden a Grizk (cáliz, cráneo dorado, gema de sangre, moneda antigua y fragmento de corona);
- el equipo de recluta.

### 4.2 Recetas: cómo se desbloquean

- **Común y poco común:** vienen con el nivel del espacio que cubre esa subzona (nv 1: S1–S3; nv 2: S4–S6; nv 3: S7–S10).
- **Raro y épico:** necesitan **un plano**.
  - Los planos caen en cofres de sala cerrada, élites y jefes de su subzona.
  - Se aprenden al extraer y ya no se pierden.
  - Algunos los venden Brand, Valerius y Eldrin con reputación alta. Así la reputación sigue sirviendo, que es lo que hacen hoy las recetas de Brand.
- **Legendario (decidido: también se fabrica):** pide un **plano legendario**, que solo sueltan los jefes y las élites de S8–S10, y la Forja, el Banco o la Mesa de alquimia a nivel 3. Sus recetas usan siempre materiales de S8–S10 (acero infernal, sangre de demonio, cristal de azufre), aunque el objeto sea de una subzona anterior, como el Corazón de Umbravel. Así, conseguir un legendario sigue exigiendo bajar al fondo. Las tres recetas de Brand siguen en la Forja con plano legendario; quien ya tenga ese objeto lo conserva.

### 4.3 Rareza y crafteo

- El objeto sale con la rareza de su receta.
- Puede salir **una rareza mejor** («acabado fino»). La probabilidad se suma así:
  - +25 % si añades un material fino opcional: 1 plata bendita en S4–S6 o 1 sangre de demonio en S7–S10. En S1–S3 no hay hueco fino.
  - +10 % o +20 % por el nivel del espacio.
- Topes:
  - una receta común o poco común llega como mucho a **raro**;
  - una receta rara o épica llega como mucho a **épico**;
  - el acabado fino nunca convierte nada en legendario: un legendario solo sale de su propio plano.
- Bajar sigue mereciendo la pena por tres razones: los planos raros, épicos y legendarios salen abajo, el metal de lo potente también, y los legendarios piden materiales de S8–S10.

## 5. Desguace

1. **Siempre da** un poco del material base: chatarra, retales o esquirla arcana, según el objeto. Equivale a ~10 % del valor de sus componentes.
2. **Puede dar** cada componente de su receta, cada uno con una probabilidad según la rareza. Ese porcentaje se multiplica por 1,25 con el Banco de trabajo, y por 0,35 si el objeto está roto:

   | Rareza | Probabilidad |
   |---|---|
   | Común | 20 % |
   | Poco común | 25 % |
   | Raro | 30 % |
   | Épico | 35 % |
   | Legendario | 40 % |

   El legendario se desguaza según su propia receta.
3. **Antes de confirmar** se ve «Seguro» y «Posible», con cada porcentaje. Si el objeto es raro o mejor, o está marcado como favorito, se pide confirmación.
4. **No se puede desguazar** el equipo de recluta, lo equipado ni los objetos de misión.
5. **Varios a la vez**, con la misma selección múltiple de la venta (tocar para marcar y «Desguazar seleccionados»). El resumen se suma: «Seguro: 6 chatarra · Posible: hasta 3 lingotes de hierro…».

## 6. Economía: no hay bucles de beneficio

Valores a precio de ficha. Comprar cuesta el 100 % del valor y vender da el 40 %. Hay 139 objetos de equipo fabricables, 11 de ellos legendarios.

| Comprobación | Resultado | Conclusión |
|---|---|---|
| Coste en materiales ÷ precio de compra del objeto | Mediana 71 %; entre 52 % y 100 % en todo lo que vale 40 o más | Fabricar compensa algo frente a comprar |
| Comprar materiales → fabricar → vender | Los materiales cuestan como mínimo 1,3 veces lo que se cobra al vender | Siempre se pierde |
| Fabricar → desguazar → fabricar | Lo recuperado, en el peor caso (épico con Banco), es el 60 % de lo invertido | Cada vuelta pierde al menos un 40 % |
| Refinar (materia → lingote) y vender | El intermedio vale lo mismo que sus materias | Ni se gana ni se pierde |
| Comprar un objeto para desguazarlo | Se recupera ≤ 37 % de su precio en materiales | Siempre se pierde |
| Desguazar en vez de vender botín | Lo desguazado, vendido, rinde ~34 % de lo que da vender el objeto (mediana) | Desguazar es para conseguir material, no oro |
| Suerte de rareza (+1) y vender | Un raro hecho con receta poco común se vende por ~50 % del valor; costó 70 % | Se pierde |

**Recetas simples para lo más barato (decidido).** Catorce objetos de S1 costaban más de hacer que de comprar con la receta completa. Ahora llevan una sola materia prima y salen a ~70 % o menos: Báculo de aprendiz (3 madera vieja), Mochila de cuero (2 retales), Maza bendita (2 chatarra), Anillo de cobre (3 chatarra), Guanteletes de acero (2 menas de hierro), Yelmo de hierro (2 menas de hierro), Guantes de cuero (2 retales), Capucha de cuero (2 telas raídas), Túnica de lino (2 telas raídas), Jubón acolchado (2 telas raídas), Espada oxidada (2 chatarra), Escudo de madera (2 madera vieja) y Botas gastadas (2 retales). Al desguazarlos no hay parte segura, solo la posible, para que fabricar y desguazar siga perdiendo. La Llave de la cripta también pasa a una sola materia (1 mena de plata), pero pide plano como las demás llaves.

El simulador comprobará estas cifras en una prueba automática: ninguna cadena de recetas y desguace podrá devolver más de lo que cuesta.

## 7. Bombas y frascos (entran en este bloque)

Usar una bomba gasta el turno y se lanza desde la mochila en combate. El fuego amigo está desactivado. Las cifras son de partida y se ajustan con el simulador.

| Objeto | Desde | Objetivo | Efecto |
|---|---|---|---|
| Bomba de clavos ✱ | S1 (alquimia nv 1) | Un enemigo | Daño contundente medio; 25 % de aturdir 1 turno |
| Frasco de brea ✱ | S1 (alquimia nv 1) | Los dos enemigos | Daño de fuego bajo + quemadura 3 turnos |
| Metralla de plata ✱ | S4 (alquimia nv 2) | Un enemigo | Daño cortante alto; doble contra no muertos |
| Frasco incendiario de azufre ✱ | S7 (alquimia nv 3) | Los dos enemigos | Daño de fuego alto + quemadura fuerte |

La ficha de cada bomba dice a quién alcanza, el daño esperado, el estado que causa y que gasta el turno. En el tutorial no hay bombas.

## 8. Maquetas

Todas están en `mockups/bastion/index.html`, con capturas en ordenador (1280×720), tableta (iPad apaisado) y móvil (iPhone apaisado, 844×390):
- **Bastión:** espacios abiertos y bloqueados, con la franja «Tu siguiente objetivo».
- **Menú de crafteo:** la Forja con una receta a la que le falta un componente y su «Dónde conseguirlo» abierto.
- **Desguace:** con selección múltiple y el resumen «Seguro / Posible».
- **Objeto fabricado:** la ventana que sale al pulsar «Craftear», con la ficha y los botones «A la mochila» y «Al almacén».

## 9. Preguntas

Respuestas del usuario (12/11):
1. **Mochilas grandes:** se pueden fabricar (con plano, como en la tabla).
2. **Legendarios:** también se fabrican, con plano legendario de S8–S10 (apartado 4.2).
3. **Objetos baratos de S1:** recetas más simples (apartado 6).
4. **Llaves:** con plano, para darles algo más de dificultad.
5. **Destino:** al fabricar se abre una ventana con el objeto y los botones «A la mochila» y «Al almacén» (apartado 3 y maqueta `resultado.html`).
6. **Objetos del Mago:** se hacen en la Mesa de alquimia; no hay Atril rúnico.

## 10. Plan por fases

1. **Datos y lógica común.** Materias nuevas (madera, tela, hierba, harina, leche y vino), intermedios, una receta para cada objeto, planos y `core/crafting.ts` (receta → comprobar → tomar → entregar). Los minijuegos pendientes se resuelven al cargar. Pruebas, incluida la de economía, que comprueba que no hay bucles.
2. **Espacios y desbloqueo.** Seis espacios con niveles y encargos, pantalla del Bastión con candados y «Tu siguiente objetivo». Prueba en 3 tamaños.
3. **Menú de crafteo común.** Sustituye la cocina, el yunque, la alquimia y el rincón: filtros, «Dónde conseguirlo», «Ir a su receta», destino y lotes. `crafteo-check` en 3 tamaños; se retiran `refugio-check` y `taller-check`.
4. **Fuentes de materias y planos.** Botín, vetas y mercaderes para las materias nuevas; planos en cofres, élites, jefes y tiendas.
5. **Desguace nuevo.** Seguro y posible, azar por rareza, confirmación, recluta bloqueado y selección múltiple. `desguace-check` en 3 tamaños.
6. **Bombas en combate.** Acción, ficha, estados y simulador.
7. **Equilibrio y cierre.** Simulador de economía y de combate con bombas, arreglo de `almacen-check` en ordenador, migración (las calidades de lo ya forjado se conservan), comprobación del ciclo en 3 tamaños y estado del proyecto.

## Anexo: tablas completas

### Materias primas

| Materia | Valor | De dónde sale |
|---|---|---|
| Chatarra | 4 | Desguace, cofres S1–S10 |
| Retales de cuero | 3 | Lobos, bandidos, desguace de cuero |
| Madera vieja ✱ | 3 | Cofres y muebles rotos S1–S6; Nira |
| Tela raída ✱ | 3 | Cultistas, ahorcados, desguace de túnicas; Nira |
| Hierba amarga ✱ | 4 | Brotes en S1–S3; Hermana Vesper |
| Harina ✱ | 1 | Garth |
| Leche de cabra ✱ | 2 | Garth |
| Vino agrio ✱ | 3 | Garth |
| Odre de agua | 5 | Garth; pozo del Bastión |
| Setas de galería | 3 | Galerías S1–S3; Garth |
| Carne en salazón | 5 | Garth |
| Manzana arrugada | 3 | Garth; cofres S1 |
| Ala de murciélago | 5 | Murciélagos S2 |
| Polvo de hueso | 6 | Esqueletos S2–S3 |
| Esquirla arcana | 6 | Desguace de objetos arcanos; cofres |
| Mena de cobre | 8 | Vetas S1–S3 |
| Mena de hierro | 14 | Vetas S1–S6 |
| Hueso antiguo | 18 | Osario S4, coloso de hueso |
| Mena de plata | 24 | Vetas S4–S6 |
| Ectoplasma | 28 | Espectros y plañideras S5 |
| Plata bendita | 30 | Vetas de plata (20 %), panteón S6 |
| Azufre | 40 | Vetas S7–S10, invocadores |
| Esquirla de obsidiana | 60 | Vetas S7–S10, gárgolas de obsidiana |
| Sangre de demonio | 110 | Vetas de obsidiana (10 %), demonios S9–S10 |

### Componentes intermedios

| Componente | Espacio | Nivel | Receta | Valor |
|---|---|---|---|---|
| Barra de chatarra | Forja | 1 | 2 Chatarra | 8 |
| Lingote de cobre | Forja | 1 | 2 Mena de cobre | 16 |
| Lingote de hierro | Forja | 1 | 2 Mena de hierro + 1 Chatarra | 32 |
| Lingote de plata | Forja | 2 | 2 Mena de plata | 48 |
| Lingote de obsidiana | Forja | 3 | 1 Esquirla de obsidiana + 1 Azufre | 100 |
| Acero infernal | Forja | 3 | 1 Lingote de obsidiana + 1 Sangre de demonio | 210 |
| Empuñadura | Banco de trabajo | 1 | 1 Madera vieja ✱ + 1 Retales de cuero | 6 |
| Correa | Banco de trabajo | 1 | 2 Retales de cuero | 6 |
| Asta | Banco de trabajo | 1 | 2 Madera vieja ✱ | 6 |
| Cuero curtido | Banco de trabajo | 1 | 2 Retales de cuero + 1 Odre de agua | 11 |
| Cuero ignífugo | Banco de trabajo | 3 | 1 Cuero curtido + 1 Azufre | 51 |
| Tela tejida | Banco de trabajo | 1 | 2 Tela raída ✱ | 6 |
| Paño de sudario | Banco de trabajo | 2 | 1 Tela tejida + 1 Ectoplasma | 34 |
| Seda de ceniza | Banco de trabajo | 3 | 1 Tela tejida + 1 Azufre | 46 |
| Cristal tallado | Mesa de alquimia | 1 | 2 Esquirla arcana | 12 |
| Cristal de ectoplasma | Mesa de alquimia | 2 | 1 Cristal tallado + 1 Ectoplasma | 40 |
| Cristal de azufre | Mesa de alquimia | 3 | 1 Cristal tallado + 1 Azufre | 52 |
| Pergamino | Mesa de alquimia | 1 | 1 Retales de cuero + 1 Polvo de hueso | 9 |
| Tinta rúnica | Mesa de alquimia | 1 | 1 Polvo de hueso + 1 Esquirla arcana | 12 |
| Brea | Mesa de alquimia | 1 | 2 Madera vieja ✱ | 6 |
| Pólvora de hueso | Mesa de alquimia | 1 | 2 Polvo de hueso + 1 Ala de murciélago | 17 |

### Objetos de equipo

| Objeto | Rareza | S | Cómo se fabrica | Componentes | Desguace seguro | Desguace posible |
|---|---|---|---|---|---|---|
| Jubón de recluta | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Túnica de recluta | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Jubón acolchado | Común | S1 | Banco de trabajo nv 1 | 2 Tela raída ✱ | — | 2 Tela raída ✱ (20 %) |
| Túnica de lino | Común | S1 | Banco de trabajo nv 1 | 2 Tela raída ✱ | — | 2 Tela raída ✱ (20 %) |
| Cota de malla | Poco común | S1 | Forja nv 1 | 3 Barra de chatarra + 1 Cuero curtido + 1 Correa | 1 Chatarra | 3 Barra de chatarra (25 %), 1 Cuero curtido (25 %), 1 Correa (25 %) |
| Túnica de las sombras | Raro | S2 | Plano (S2) · Banco de trabajo nv 1 | 8 Tela tejida + 2 Cuero curtido + 4 Polvo de hueso | 3 Retales de cuero | 8 Tela tejida (30 %), 2 Cuero curtido (30 %), 4 Polvo de hueso (30 %) |
| Coraza del Bastión | Épico | S3 | Plano (S3) · Forja nv 1 | 8 Lingote de hierro + 2 Cuero curtido + 2 Correa | 7 Chatarra | 8 Lingote de hierro (35 %), 2 Cuero curtido (35 %), 2 Correa (35 %) |
| Túnica del archimago | Épico | S3 | Plano (S3) · Banco de trabajo nv 1 | 8 Tela tejida + 2 Cuero curtido + 26 Polvo de hueso | 8 Retales de cuero | 8 Tela tejida (35 %), 2 Cuero curtido (35 %), 26 Polvo de hueso (35 %) |
| Túnica empapada | Poco común | S5 | Banco de trabajo nv 2 | 7 Paño de sudario + 2 Cuero curtido + 2 Ectoplasma | 11 Retales de cuero | 7 Paño de sudario (25 %), 2 Cuero curtido (25 %), 2 Ectoplasma (25 %) |
| Túnica de sudario | Raro | S5 | Plano (S5) · Banco de trabajo nv 2 | 7 Paño de sudario + 2 Cuero curtido + 2 Ectoplasma | 11 Retales de cuero | 7 Paño de sudario (30 %), 2 Cuero curtido (30 %), 2 Ectoplasma (30 %) |
| Coraza de sangre seca | Raro | S7 | Plano (S7) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 6 Azufre | 24 Retales de cuero | 8 Seda de ceniza (30 %), 2 Cuero ignífugo (30 %), 6 Azufre (30 %) |
| Coraza de plata bendita | Épico | S6 | Plano (S6) · Forja nv 2 | 8 Lingote de plata + 2 Cuero curtido + 2 Correa + 11 Plata bendita | 19 Chatarra | 8 Lingote de plata (35 %), 2 Cuero curtido (35 %), 2 Correa (35 %), 11 Plata bendita (35 %) |
| Túnica de ceniza | Raro | S7 | Plano (S7) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 8 Azufre | 26 Retales de cuero | 8 Seda de ceniza (30 %), 2 Cuero ignífugo (30 %), 8 Azufre (30 %) |
| Coraza de cadenas | Épico | S10 | Plano (S10) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 10 Sangre de demonio | 52 Retales de cuero | 8 Seda de ceniza (35 %), 2 Cuero ignífugo (35 %), 10 Sangre de demonio (35 %) |
| Armadura de acero infernal | Épico | S8 | Plano (S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Cuero ignífugo + 2 Correa + 17 Azufre | 40 Chatarra | 8 Lingote de obsidiana (35 %), 2 Cuero ignífugo (35 %), 2 Correa (35 %), 17 Azufre (35 %) |
| Coraza de sangre demoníaca | Legendario | S8 | Plano legendario (jefe o élite de S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Cuero ignífugo + 2 Correa + 24 Azufre + 2 Sangre de demonio | 52 Chatarra | 8 Lingote de obsidiana (40 %), 2 Cuero ignífugo (40 %), 2 Correa (40 %), 24 Azufre (40 %), 2 Sangre de demonio (40 %) |
| Mochila de cuero | Común | S1 | Banco de trabajo nv 1 | 2 Retales de cuero | — | 2 Retales de cuero (20 %) |
| Mochila reforzada | Poco común | S4 | Banco de trabajo nv 2 | 8 Cuero curtido + 2 Correa + 2 Paño de sudario + 24 Ectoplasma + 7 Plata bendita | 35 Retales de cuero | 8 Cuero curtido (25 %), 2 Correa (25 %), 2 Paño de sudario (25 %), 24 Ectoplasma (25 %), 7 Plata bendita (25 %) |
| Mochila de explorador | Raro | S7 | Plano (S7) · Banco de trabajo nv 3 | 8 Cuero ignífugo + 2 Correa + 2 Seda de ceniza + 24 Azufre + 24 Sangre de demonio | 137 Retales de cuero | 8 Cuero ignífugo (30 %), 2 Correa (30 %), 2 Seda de ceniza (30 %), 24 Azufre (30 %), 24 Sangre de demonio (30 %) |
| Botas gastadas | Común | S1 | Banco de trabajo nv 1 | 2 Retales de cuero | — | 2 Retales de cuero (20 %) |
| Botas del correveidile | Raro | S2 | Plano (S2) · Banco de trabajo nv 1 | 6 Cuero curtido + 2 Correa | 3 Retales de cuero | 6 Cuero curtido (30 %), 2 Correa (30 %) |
| Botas de patio | Poco común | S2 | Banco de trabajo nv 1 | 8 Cuero curtido + 2 Correa + 3 Polvo de hueso | 4 Retales de cuero | 8 Cuero curtido (25 %), 2 Correa (25 %), 3 Polvo de hueso (25 %) |
| Botas del sepulturero | Raro | S4 | Plano (S4) · Banco de trabajo nv 2 | 8 Cuero curtido + 2 Correa + 6 Ectoplasma | 9 Retales de cuero | 8 Cuero curtido (30 %), 2 Correa (30 %), 6 Ectoplasma (30 %) |
| Botas de cieno | Poco común | S5 | Banco de trabajo nv 2 | 8 Cuero curtido + 2 Correa + 8 Ectoplasma | 11 Retales de cuero | 8 Cuero curtido (25 %), 2 Correa (25 %), 8 Ectoplasma (25 %) |
| Botas de brasa | Raro | S7 | Plano (S7) · Banco de trabajo nv 3 | 8 Cuero ignífugo + 2 Correa + 7 Azufre | 23 Retales de cuero | 8 Cuero ignífugo (30 %), 2 Correa (30 %), 7 Azufre (30 %) |
| Botas de ceniza | Raro | S9 | Plano (S9) · Banco de trabajo nv 3 | 8 Cuero ignífugo + 2 Correa + 5 Sangre de demonio | 32 Retales de cuero | 8 Cuero ignífugo (30 %), 2 Correa (30 %), 5 Sangre de demonio (30 %) |
| Saquito de oro | Común | S1 | Banco de trabajo nv 1 | 2 Cuero curtido + 2 Correa | 1 Retales de cuero | 2 Cuero curtido (20 %), 2 Correa (20 %) |
| Saco de oro | Poco común | S3 | Banco de trabajo nv 1 | 8 Cuero curtido + 2 Correa + 12 Polvo de hueso | 6 Retales de cuero | 8 Cuero curtido (25 %), 2 Correa (25 %), 12 Polvo de hueso (25 %) |
| Guantes de cuero | Común | S1 | Banco de trabajo nv 1 | 2 Retales de cuero | — | 2 Retales de cuero (20 %) |
| Guanteletes de acero | Poco común | S1 | Forja nv 1 | 2 Mena de hierro | — | 2 Mena de hierro (25 %) |
| Brazales de cuero | Común | S1 | Banco de trabajo nv 1 | 2 Cuero curtido + 2 Tela tejida | 1 Retales de cuero | 2 Cuero curtido (20 %), 2 Tela tejida (20 %) |
| Guanteletes de plata | Poco común | S4 | Forja nv 2 | 2 Lingote de plata + 2 Cuero curtido + 1 Ectoplasma | 4 Chatarra | 2 Lingote de plata (25 %), 2 Cuero curtido (25 %), 1 Ectoplasma (25 %) |
| Guantes de seda fúnebre | Raro | S6 | Plano (S6) · Banco de trabajo nv 2 | 8 Cuero curtido + 2 Paño de sudario + 16 Plata bendita | 21 Retales de cuero | 8 Cuero curtido (30 %), 2 Paño de sudario (30 %), 16 Plata bendita (30 %) |
| Garras del demonio | Raro | S7 | Plano (S7) · Forja nv 3 | 6 Lingote de obsidiana + 2 Cuero ignífugo | 18 Chatarra | 6 Lingote de obsidiana (30 %), 2 Cuero ignífugo (30 %) |
| Guanteletes de forja | Raro | S8 | Plano (S8) · Banco de trabajo nv 3 | 8 Cuero ignífugo + 2 Seda de ceniza + 9 Azufre | 29 Retales de cuero | 8 Cuero ignífugo (30 %), 2 Seda de ceniza (30 %), 9 Azufre (30 %) |
| Capucha de cuero | Común | S1 | Banco de trabajo nv 1 | 2 Tela raída ✱ | — | 2 Tela raída ✱ (20 %) |
| Gorro de centinela | Común | S1 | Banco de trabajo nv 1 | 2 Tela tejida + 1 Cuero curtido | 1 Retales de cuero | 2 Tela tejida (20 %), 1 Cuero curtido (20 %) |
| Yelmo de hierro | Poco común | S1 | Forja nv 1 | 2 Mena de hierro | — | 2 Mena de hierro (25 %) |
| Sombrero del erudito | Poco común | S1 | Banco de trabajo nv 1 | 3 Tela tejida + 1 Cuero curtido | 1 Retales de cuero | 3 Tela tejida (25 %), 1 Cuero curtido (25 %) |
| Yelmo del caballero | Raro | S2 | Plano (S2) · Forja nv 1 | 2 Lingote de hierro + 2 Cuero curtido + 2 Polvo de hueso | 2 Chatarra | 2 Lingote de hierro (30 %), 2 Cuero curtido (30 %), 2 Polvo de hueso (30 %) |
| Yelmo de la guardia | Poco común | S2 | Banco de trabajo nv 1 | 8 Tela tejida + 2 Cuero curtido + 5 Polvo de hueso | 3 Retales de cuero | 8 Tela tejida (25 %), 2 Cuero curtido (25 %), 5 Polvo de hueso (25 %) |
| Capucha del plañidero | Poco común | S4 | Banco de trabajo nv 2 | 4 Paño de sudario + 2 Cuero curtido | 5 Retales de cuero | 4 Paño de sudario (25 %), 2 Cuero curtido (25 %) |
| Capucha de carcelero | Poco común | S3 | Banco de trabajo nv 1 | 8 Tela tejida + 2 Cuero curtido + 17 Polvo de hueso | 6 Retales de cuero | 8 Tela tejida (25 %), 2 Cuero curtido (25 %), 17 Polvo de hueso (25 %) |
| Máscara de hueso | Poco común | S4 | Banco de trabajo nv 2 | 6 Paño de sudario + 2 Cuero curtido | 8 Retales de cuero | 6 Paño de sudario (25 %), 2 Cuero curtido (25 %) |
| Yelmo de plata bendita | Raro | S4 | Plano (S4) · Forja nv 2 | 6 Lingote de plata + 2 Cuero curtido | 8 Chatarra | 6 Lingote de plata (30 %), 2 Cuero curtido (30 %) |
| Capucha de ceniza | Poco común | S7 | Banco de trabajo nv 3 | 7 Seda de ceniza + 2 Cuero ignífugo | 14 Retales de cuero | 7 Seda de ceniza (25 %), 2 Cuero ignífugo (25 %) |
| Corona del duque | Raro | S6 | Plano (S6) · Banco de trabajo nv 2 | 8 Paño de sudario + 2 Cuero curtido + 10 Plata bendita | 20 Retales de cuero | 8 Paño de sudario (30 %), 2 Cuero curtido (30 %), 10 Plata bendita (30 %) |
| Capucha del culto | Raro | S7 | Plano (S7) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 7 Azufre | 25 Retales de cuero | 8 Seda de ceniza (30 %), 2 Cuero ignífugo (30 %), 7 Azufre (30 %) |
| Yelmo de acero infernal | Raro | S7 | Plano (S7) · Forja nv 3 | 7 Lingote de obsidiana + 2 Cuero ignífugo | 20 Chatarra | 7 Lingote de obsidiana (30 %), 2 Cuero ignífugo (30 %) |
| Yelmo de obsidiana | Raro | S8 | Plano (S8) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 9 Azufre | 28 Retales de cuero | 8 Seda de ceniza (30 %), 2 Cuero ignífugo (30 %), 9 Azufre (30 %) |
| Corona rota de Belzar | Legendario | S10 | Plano legendario (jefe o élite de S10) · Banco de trabajo nv 3 | 8 Seda de ceniza + 2 Cuero ignífugo + 22 Sangre de demonio | 96 Retales de cuero | 8 Seda de ceniza (40 %), 2 Cuero ignífugo (40 %), 22 Sangre de demonio (40 %) |
| Anillo de cobre | Común | S1 | Forja nv 1 | 3 Chatarra | — | 3 Chatarra (20 %) |
| Amuleto de hueso | Poco común | S1 | Mesa de alquimia nv 1 | 3 Polvo de hueso + 1 Correa + 1 Cristal tallado | 1 Esquirla arcana | 3 Polvo de hueso (25 %), 1 Correa (25 %), 1 Cristal tallado (25 %) |
| Anillo de ascuas | Raro | S2 | Plano (S2) · Forja nv 1 | 3 Lingote de hierro + 2 Cristal tallado | 2 Esquirla arcana | 3 Lingote de hierro (30 %), 2 Cristal tallado (30 %) |
| Grilletes rotos | Raro | S3 | Plano (S3) · Forja nv 1 | 8 Lingote de hierro + 2 Cristal tallado + 5 Polvo de hueso | 5 Esquirla arcana | 8 Lingote de hierro (30 %), 2 Cristal tallado (30 %), 5 Polvo de hueso (30 %) |
| Amuleto relicario | Raro | S5 | Plano (S5) · Mesa de alquimia nv 2 | 8 Hueso antiguo + 2 Correa + 2 Cristal de ectoplasma + 5 Ectoplasma | 6 Esquirla arcana | 8 Hueso antiguo (30 %), 2 Correa (30 %), 2 Cristal de ectoplasma (30 %), 5 Ectoplasma (30 %) |
| Rosario de falanges | Raro | S4 | Plano (S4) · Mesa de alquimia nv 2 | 8 Hueso antiguo + 2 Correa + 2 Cristal de ectoplasma + 7 Ectoplasma | 7 Esquirla arcana | 8 Hueso antiguo (30 %), 2 Correa (30 %), 2 Cristal de ectoplasma (30 %), 7 Ectoplasma (30 %) |
| Anillo de coral negro | Raro | S5 | Plano (S5) · Forja nv 2 | 8 Lingote de plata + 2 Cristal de ectoplasma + 3 Ectoplasma | 9 Esquirla arcana | 8 Lingote de plata (30 %), 2 Cristal de ectoplasma (30 %), 3 Ectoplasma (30 %) |
| Corazón de Umbravel | Legendario | S8 | Plano legendario (jefe o élite de S8) · Mesa de alquimia nv 3 | 8 Hueso antiguo + 2 Correa + 2 Cristal de azufre + 9 Azufre | 10 Esquirla arcana | 8 Hueso antiguo (40 %), 2 Correa (40 %), 2 Cristal de azufre (40 %), 9 Azufre (40 %) |
| Anillo de brasa | Raro | S8 | Plano (S8) · Forja nv 3 | 6 Lingote de obsidiana + 2 Cristal de azufre + 2 Azufre | 13 Esquirla arcana | 6 Lingote de obsidiana (30 %), 2 Cristal de azufre (30 %), 2 Azufre (30 %) |
| Anillo de la Reina Velada | Legendario | S8 | Plano legendario (jefe o élite de S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Cristal de azufre + 9 Azufre | 21 Esquirla arcana | 8 Lingote de obsidiana (40 %), 2 Cristal de azufre (40 %), 9 Azufre (40 %) |
| Amuleto de azufre | Épico | S9 | Plano (S9) · Mesa de alquimia nv 3 | 8 Hueso antiguo + 2 Correa + 2 Cristal de azufre + 11 Sangre de demonio | 25 Esquirla arcana | 8 Hueso antiguo (35 %), 2 Correa (35 %), 2 Cristal de azufre (35 %), 11 Sangre de demonio (35 %) |
| Anillo del condenado | Épico | S10 | Plano (S10) · Forja nv 3 | 7 Acero infernal + 2 Cristal de azufre | 26 Esquirla arcana | 7 Acero infernal (35 %), 2 Cristal de azufre (35 %) |
| Corazón de Belzar | Legendario | S9 | Plano legendario (jefe o élite de S9) · Mesa de alquimia nv 3 | 8 Hueso antiguo + 2 Correa + 2 Cristal de azufre + 23 Sangre de demonio | 47 Esquirla arcana | 8 Hueso antiguo (40 %), 2 Correa (40 %), 2 Cristal de azufre (40 %), 23 Sangre de demonio (40 %) |
| Llave de la cripta | Poco común | S4 | Plano (S4) · Forja nv 2 | 1 Mena de plata | — | 1 Mena de plata (25 %) |
| Llave de hierro | Poco común | S2 | Plano (S2) · Forja nv 1 | 1 Lingote de hierro + 2 Chatarra | 1 Chatarra | 1 Lingote de hierro (25 %), 2 Chatarra (25 %) |
| Llave de hueso | Raro | S4 | Plano (S4) · Forja nv 2 | 2 Lingote de plata + 2 Chatarra | 3 Chatarra | 2 Lingote de plata (30 %), 2 Chatarra (30 %) |
| Llave de reliquia | Épico | S6 | Plano (S6) · Forja nv 2 | 4 Lingote de plata + 2 Chatarra | 5 Chatarra | 4 Lingote de plata (35 %), 2 Chatarra (35 %) |
| Llave de azufre | Épico | S7 | Plano (S7) · Forja nv 3 | 3 Lingote de obsidiana + 2 Chatarra | 8 Chatarra | 3 Lingote de obsidiana (35 %), 2 Chatarra (35 %) |
| Grimorio gastado | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Antorcha de brea | Común | S1 | Banco de trabajo nv 1 | 4 Madera vieja ✱ + 1 Brea | — | 4 Madera vieja ✱ (20 %), 1 Brea (20 %) |
| Tomo arcano | Poco común | S1 | Mesa de alquimia nv 1 | 2 Pergamino + 1 Tinta rúnica + 1 Correa | 1 Esquirla arcana | 2 Pergamino (25 %), 1 Tinta rúnica (25 %), 1 Correa (25 %) |
| Daga de parada | Poco común | S2 | Forja nv 1 | 2 Lingote de hierro + 2 Empuñadura + 2 Polvo de hueso | 2 Chatarra | 2 Lingote de hierro (25 %), 2 Empuñadura (25 %), 2 Polvo de hueso (25 %) |
| Orbe turbio | Poco común | S2 | Mesa de alquimia nv 1 | 6 Cristal tallado + 1 Lingote de hierro | 2 Esquirla arcana | 6 Cristal tallado (25 %), 1 Lingote de hierro (25 %) |
| Grimorio del eclipse | Épico | S3 | Plano (S3) · Mesa de alquimia nv 1 | 8 Pergamino + 2 Tinta rúnica + 2 Correa + 24 Polvo de hueso | 4 Esquirla arcana | 8 Pergamino (35 %), 2 Tinta rúnica (35 %), 2 Correa (35 %), 24 Polvo de hueso (35 %) |
| Grimorio fúnebre | Raro | S4 | Plano (S4) · Mesa de alquimia nv 2 | 8 Pergamino + 2 Tinta rúnica + 2 Correa + 8 Ectoplasma | 6 Esquirla arcana | 8 Pergamino (30 %), 2 Tinta rúnica (30 %), 2 Correa (30 %), 8 Ectoplasma (30 %) |
| Orbe del osario | Raro | S4 | Plano (S4) · Mesa de alquimia nv 2 | 8 Cristal de ectoplasma + 2 Lingote de plata | 7 Esquirla arcana | 8 Cristal de ectoplasma (30 %), 2 Lingote de plata (30 %) |
| Farol del barquero | Raro | S5 | Plano (S5) · Banco de trabajo nv 2 | 8 Madera vieja ✱ + 2 Brea + 17 Ectoplasma | 13 Chatarra | 8 Madera vieja ✱ (30 %), 2 Brea (30 %), 17 Ectoplasma (30 %) |
| Daga ritual del Umbral | Raro | S7 | Plano (S7) · Forja nv 3 | 7 Lingote de obsidiana + 2 Empuñadura + 2 Hueso antiguo | 19 Chatarra | 7 Lingote de obsidiana (30 %), 2 Empuñadura (30 %), 2 Hueso antiguo (30 %) |
| Orbe de magma | Raro | S8 | Plano (S8) · Mesa de alquimia nv 3 | 8 Cristal de azufre + 2 Lingote de obsidiana + 5 Azufre | 14 Esquirla arcana | 8 Cristal de azufre (30 %), 2 Lingote de obsidiana (30 %), 5 Azufre (30 %) |
| Tomo ardiente | Raro | S7 | Plano (S7) · Mesa de alquimia nv 3 | 8 Pergamino + 2 Tinta rúnica + 2 Correa + 18 Azufre | 14 Esquirla arcana | 8 Pergamino (30 %), 2 Tinta rúnica (30 %), 2 Correa (30 %), 18 Azufre (30 %) |
| Antorcha infernal | Épico | S9 | Plano (S9) · Banco de trabajo nv 3 | 8 Madera vieja ✱ + 2 Brea + 13 Sangre de demonio | 37 Chatarra | 8 Madera vieja ✱ (35 %), 2 Brea (35 %), 13 Sangre de demonio (35 %) |
| Velo de la Reina | Legendario | S8 | Plano legendario (jefe o élite de S8) · Mesa de alquimia nv 3 | 8 Cristal de azufre + 2 Lingote de obsidiana + 24 Azufre + 2 Sangre de demonio | 30 Esquirla arcana | 8 Cristal de azufre (40 %), 2 Lingote de obsidiana (40 %), 24 Azufre (40 %), 2 Sangre de demonio (40 %) |
| Ojo del Abismo | Legendario | S10 | Plano legendario (jefe o élite de S10) · Mesa de alquimia nv 3 | 8 Cristal de azufre + 2 Acero infernal + 19 Sangre de demonio | 49 Esquirla arcana | 8 Cristal de azufre (40 %), 2 Acero infernal (40 %), 19 Sangre de demonio (40 %) |
| Escudo de tablas | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Escudo de madera | Común | S1 | Banco de trabajo nv 1 | 2 Madera vieja ✱ | — | 2 Madera vieja ✱ (20 %) |
| Escudo de hierro | Poco común | S1 | Forja nv 1 | 1 Lingote de hierro + 2 Madera vieja ✱ + 1 Correa | 1 Chatarra | 1 Lingote de hierro (25 %), 2 Madera vieja ✱ (25 %), 1 Correa (25 %) |
| Escudo del Bastión | Raro | S2 | Plano (S2) · Forja nv 1 | 2 Lingote de hierro + 2 Madera vieja ✱ + 2 Correa + 4 Polvo de hueso | 3 Chatarra | 2 Lingote de hierro (30 %), 2 Madera vieja ✱ (30 %), 2 Correa (30 %), 4 Polvo de hueso (30 %) |
| Escudo de lápida | Raro | S4 | Plano (S4) · Forja nv 2 | 7 Lingote de plata + 2 Madera vieja ✱ + 2 Correa | 9 Chatarra | 7 Lingote de plata (30 %), 2 Madera vieja ✱ (30 %), 2 Correa (30 %) |
| Baluarte de hueso antiguo | Épico | S4 | Plano (S4) · Forja nv 2 | 8 Hueso antiguo + 2 Lingote de plata + 2 Correa + 12 Ectoplasma | 15 Chatarra | 8 Hueso antiguo (35 %), 2 Lingote de plata (35 %), 2 Correa (35 %), 12 Ectoplasma (35 %) |
| Escudo de escama demoníaca | Raro | S7 | Plano (S7) · Forja nv 3 | 8 Lingote de obsidiana + 2 Madera vieja ✱ + 2 Correa | 20 Chatarra | 8 Lingote de obsidiana (30 %), 2 Madera vieja ✱ (30 %), 2 Correa (30 %) |
| Escudo de cadenas | Raro | S8 | Plano (S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Madera vieja ✱ + 2 Correa + 1 Azufre | 21 Chatarra | 8 Lingote de obsidiana (30 %), 2 Madera vieja ✱ (30 %), 2 Correa (30 %), 1 Azufre (30 %) |
| Pico de minero | Común | S1 | Forja nv 1 | 2 Barra de chatarra + 2 Asta | 1 Chatarra | 2 Barra de chatarra (20 %), 2 Asta (20 %) |
| Kit de reparación | Común | S1 | Banco de trabajo nv 1 | 3 Chatarra + 1 Barra de chatarra + 2 Correa | 1 Chatarra | 3 Chatarra (20 %), 1 Barra de chatarra (20 %), 2 Correa (20 %) |
| Pico de acero | Poco común | S4 | Forja nv 2 | 3 Lingote de plata + 2 Asta | 4 Chatarra | 3 Lingote de plata (25 %), 2 Asta (25 %) |
| Espada de recluta | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Bastón de recluta | Común | S1 | Equipo de recluta: ni se fabrica ni se desguaza |  |  |  |
| Espada oxidada | Común | S1 | Forja nv 1 | 2 Chatarra | — | 2 Chatarra (20 %) |
| Báculo de aprendiz | Común | S1 | Mesa de alquimia nv 1 | 3 Madera vieja ✱ | — | 3 Madera vieja ✱ (20 %) |
| Maza bendita | Común | S1 | Forja nv 1 | 2 Chatarra | — | 2 Chatarra (20 %) |
| Varita de abedul | Común | S1 | Mesa de alquimia nv 1 | 2 Madera vieja ✱ + 1 Cristal tallado + 1 Polvo de hueso | — | 2 Madera vieja ✱ (20 %), 1 Cristal tallado (20 %), 1 Polvo de hueso (20 %) |
| Daga de hueso | Poco común | S1 | Forja nv 1 | 2 Barra de chatarra + 1 Empuñadura + 1 Polvo de hueso | 1 Chatarra | 2 Barra de chatarra (25 %), 1 Empuñadura (25 %), 1 Polvo de hueso (25 %) |
| Lanza de la guardia | Común | S1 | Forja nv 1 | 2 Asta + 2 Barra de chatarra + 1 Correa | 1 Chatarra | 2 Asta (20 %), 2 Barra de chatarra (20 %), 1 Correa (20 %) |
| Espada de hierro | Poco común | S1 | Forja nv 1 | 1 Lingote de hierro + 1 Empuñadura + 1 Chatarra | 1 Chatarra | 1 Lingote de hierro (25 %), 1 Empuñadura (25 %), 1 Chatarra (25 %) |
| Hacha de batalla | Poco común | S1 | Forja nv 1 | 2 Barra de chatarra + 2 Asta + 1 Chatarra | 1 Chatarra | 2 Barra de chatarra (25 %), 2 Asta (25 %), 1 Chatarra (25 %) |
| Báculo de brasas | Poco común | S1 | Mesa de alquimia nv 1 | 3 Asta + 1 Cristal tallado + 1 Polvo de hueso | 1 Esquirla arcana | 3 Asta (25 %), 1 Cristal tallado (25 %), 1 Polvo de hueso (25 %) |
| Espada del caballero | Raro | S2 | Plano (S2) · Forja nv 1 | 2 Lingote de hierro + 2 Empuñadura + 2 Chatarra + 4 Polvo de hueso | 3 Chatarra | 2 Lingote de hierro (30 %), 2 Empuñadura (30 %), 2 Chatarra (30 %), 4 Polvo de hueso (30 %) |
| Maza de armas | Poco común | S2 | Forja nv 1 | 2 Lingote de hierro + 2 Empuñadura + 2 Chatarra + 4 Polvo de hueso | 3 Chatarra | 2 Lingote de hierro (25 %), 2 Empuñadura (25 %), 2 Chatarra (25 %), 4 Polvo de hueso (25 %) |
| Hacha del verdugo | Raro | S2 | Plano (S2) · Forja nv 1 | 3 Lingote de hierro + 2 Asta + 2 Chatarra | 3 Chatarra | 3 Lingote de hierro (30 %), 2 Asta (30 %), 2 Chatarra (30 %) |
| Báculo del invierno eterno | Raro | S2 | Plano (S2) · Mesa de alquimia nv 1 | 8 Asta + 2 Cristal tallado + 7 Polvo de hueso | 2 Esquirla arcana | 8 Asta (30 %), 2 Cristal tallado (30 %), 7 Polvo de hueso (30 %) |
| Espada templada | Raro | S2 | Plano (S2) · Forja nv 1 | 3 Lingote de hierro + 2 Empuñadura + 2 Chatarra + 2 Polvo de hueso | 3 Chatarra | 3 Lingote de hierro (30 %), 2 Empuñadura (30 %), 2 Chatarra (30 %), 2 Polvo de hueso (30 %) |
| Báculo de cristal de caverna | Raro | S2 | Plano (S2) · Mesa de alquimia nv 1 | 8 Asta + 2 Cristal tallado + 9 Polvo de hueso | 2 Esquirla arcana | 8 Asta (30 %), 2 Cristal tallado (30 %), 9 Polvo de hueso (30 %) |
| Hacha templada | Raro | S2 | Plano (S2) · Forja nv 1 | 4 Lingote de hierro + 2 Asta + 2 Chatarra | 4 Chatarra | 4 Lingote de hierro (30 %), 2 Asta (30 %), 2 Chatarra (30 %) |
| Espada sepulcral | Poco común | S3 | Forja nv 1 | 5 Lingote de hierro + 2 Empuñadura + 2 Chatarra | 5 Chatarra | 5 Lingote de hierro (25 %), 2 Empuñadura (25 %), 2 Chatarra (25 %) |
| Báculo del osario | Poco común | S3 | Mesa de alquimia nv 1 | 8 Asta + 2 Cristal tallado + 18 Polvo de hueso | 3 Esquirla arcana | 8 Asta (25 %), 2 Cristal tallado (25 %), 18 Polvo de hueso (25 %) |
| Hacha del verdugo real | Poco común | S4 | Forja nv 2 | 4 Lingote de plata + 2 Asta + 2 Chatarra | 5 Chatarra | 4 Lingote de plata (25 %), 2 Asta (25 %), 2 Chatarra (25 %) |
| Varita de vértebra | Poco común | S4 | Mesa de alquimia nv 2 | 8 Madera vieja ✱ + 2 Cristal de ectoplasma + 5 Ectoplasma | 4 Esquirla arcana | 8 Madera vieja ✱ (25 %), 2 Cristal de ectoplasma (25 %), 5 Ectoplasma (25 %) |
| Lanza de fémur | Poco común | S4 | Forja nv 2 | 8 Asta + 2 Lingote de plata + 2 Correa + 3 Ectoplasma | 6 Chatarra | 8 Asta (25 %), 2 Lingote de plata (25 %), 2 Correa (25 %), 3 Ectoplasma (25 %) |
| Mandoble del verdugo | Raro | S3 | Plano (S3) · Forja nv 1 | 8 Lingote de hierro + 2 Empuñadura + 4 Polvo de hueso | 7 Chatarra | 8 Lingote de hierro (30 %), 2 Empuñadura (30 %), 4 Polvo de hueso (30 %) |
| Hoja del Pavor | Épico | S3 | Plano (S3) · Forja nv 1 | 8 Lingote de hierro + 2 Empuñadura + 2 Chatarra + 3 Polvo de hueso | 7 Chatarra | 8 Lingote de hierro (35 %), 2 Empuñadura (35 %), 2 Chatarra (35 %), 3 Polvo de hueso (35 %) |
| Báculo mayor del carcelero | Raro | S3 | Plano (S3) · Mesa de alquimia nv 1 | 8 Asta + 2 Cristal tallado + 26 Polvo de hueso | 4 Esquirla arcana | 8 Asta (30 %), 2 Cristal tallado (30 %), 26 Polvo de hueso (30 %) |
| Segadora de huesos | Épico | S3 | Plano (S3) · Forja nv 1 | 8 Lingote de hierro + 2 Asta + 2 Chatarra + 5 Polvo de hueso | 8 Chatarra | 8 Lingote de hierro (35 %), 2 Asta (35 %), 2 Chatarra (35 %), 5 Polvo de hueso (35 %) |
| Bastón rúnico de Umbravel | Épico | S3 | Plano (S3) · Mesa de alquimia nv 1 | 8 Asta + 2 Cristal tallado + 26 Polvo de hueso | 4 Esquirla arcana | 8 Asta (35 %), 2 Cristal tallado (35 %), 26 Polvo de hueso (35 %) |
| Hoja del guardián | Raro | S5 | Plano (S5) · Forja nv 2 | 7 Lingote de plata + 2 Empuñadura + 2 Chatarra | 9 Chatarra | 7 Lingote de plata (30 %), 2 Empuñadura (30 %), 2 Chatarra (30 %) |
| Báculo del réquiem | Raro | S5 | Plano (S5) · Mesa de alquimia nv 2 | 8 Asta + 2 Cristal de ectoplasma + 9 Ectoplasma | 6 Esquirla arcana | 8 Asta (30 %), 2 Cristal de ectoplasma (30 %), 9 Ectoplasma (30 %) |
| Espada de obsidiana | Poco común | S6 | Forja nv 2 | 8 Lingote de plata + 2 Empuñadura + 2 Chatarra + 3 Plata bendita | 12 Chatarra | 8 Lingote de plata (25 %), 2 Empuñadura (25 %), 2 Chatarra (25 %), 3 Plata bendita (25 %) |
| Báculo de azufre | Poco común | S6 | Mesa de alquimia nv 2 | 8 Asta + 2 Cristal de ectoplasma + 12 Plata bendita | 8 Esquirla arcana | 8 Asta (25 %), 2 Cristal de ectoplasma (25 %), 12 Plata bendita (25 %) |
| Tridente del ahogado | Raro | S5 | Plano (S5) · Forja nv 2 | 8 Asta + 2 Lingote de plata + 2 Correa + 13 Ectoplasma | 13 Chatarra | 8 Asta (30 %), 2 Lingote de plata (30 %), 2 Correa (30 %), 13 Ectoplasma (30 %) |
| Espada de plata forjada | Épico | S5 | Plano (S5) · Forja nv 2 | 8 Lingote de plata + 2 Empuñadura + 2 Chatarra + 8 Ectoplasma | 16 Chatarra | 8 Lingote de plata (35 %), 2 Empuñadura (35 %), 2 Chatarra (35 %), 8 Ectoplasma (35 %) |
| Báculo de ectoplasma | Épico | S5 | Plano (S5) · Mesa de alquimia nv 2 | 8 Asta + 2 Cristal de ectoplasma + 18 Ectoplasma | 11 Esquirla arcana | 8 Asta (35 %), 2 Cristal de ectoplasma (35 %), 18 Ectoplasma (35 %) |
| Maza de sangre | Raro | S7 | Plano (S7) · Forja nv 3 | 7 Lingote de obsidiana + 2 Empuñadura + 2 Chatarra | 18 Chatarra | 7 Lingote de obsidiana (30 %), 2 Empuñadura (30 %), 2 Chatarra (30 %) |
| Segur del réquiem | Épico | S6 | Plano (S6) · Forja nv 2 | 8 Lingote de plata + 2 Asta + 2 Chatarra + 12 Plata bendita | 19 Chatarra | 8 Lingote de plata (35 %), 2 Asta (35 %), 2 Chatarra (35 %), 12 Plata bendita (35 %) |
| Cetro del sudario | Épico | S6 | Plano (S6) · Mesa de alquimia nv 2 | 8 Asta + 2 Cristal de ectoplasma + 21 Plata bendita | 13 Esquirla arcana | 8 Asta (35 %), 2 Cristal de ectoplasma (35 %), 21 Plata bendita (35 %) |
| Hacha de cadenas | Raro | S7 | Plano (S7) · Forja nv 3 | 8 Lingote de obsidiana + 2 Asta + 2 Chatarra + 2 Azufre | 23 Chatarra | 8 Lingote de obsidiana (30 %), 2 Asta (30 %), 2 Chatarra (30 %), 2 Azufre (30 %) |
| Varita de ceniza | Raro | S9 | Plano (S9) · Mesa de alquimia nv 3 | 8 Madera vieja ✱ + 2 Cristal de azufre + 7 Sangre de demonio | 15 Esquirla arcana | 8 Madera vieja ✱ (30 %), 2 Cristal de azufre (30 %), 7 Sangre de demonio (30 %) |
| Estoque de los duques | Épico | S6 | Plano (S6) · Forja nv 2 | 8 Lingote de plata + 2 Empuñadura + 2 Chatarra + 18 Plata bendita | 24 Chatarra | 8 Lingote de plata (35 %), 2 Empuñadura (35 %), 2 Chatarra (35 %), 18 Plata bendita (35 %) |
| Gran hacha de azufre | Épico | S9 | Plano (S9) · Forja nv 3 | 6 Acero infernal + 2 Asta + 2 Sangre de demonio | 37 Chatarra | 6 Acero infernal (35 %), 2 Asta (35 %), 2 Sangre de demonio (35 %) |
| Mandoble del Trono | Épico | S10 | Plano (S10) · Forja nv 3 | 7 Acero infernal + 2 Empuñadura + 2 Sangre de demonio | 43 Chatarra | 7 Acero infernal (35 %), 2 Empuñadura (35 %), 2 Sangre de demonio (35 %) |
| Báculo mayor del abismo | Épico | S10 | Plano (S10) · Mesa de alquimia nv 3 | 8 Asta + 2 Cristal de azufre + 13 Sangre de demonio | 26 Esquirla arcana | 8 Asta (35 %), 2 Cristal de azufre (35 %), 13 Sangre de demonio (35 %) |
| Hoja forjada en el abismo | Épico | S9 | Plano (S9) · Forja nv 3 | 8 Acero infernal + 2 Empuñadura + 2 Chatarra | 43 Chatarra | 8 Acero infernal (35 %), 2 Empuñadura (35 %), 2 Chatarra (35 %) |
| Cetro del abismo | Épico | S9 | Plano (S9) · Mesa de alquimia nv 3 | 8 Asta + 2 Cristal de azufre + 14 Sangre de demonio | 28 Esquirla arcana | 8 Asta (35 %), 2 Cristal de azufre (35 %), 14 Sangre de demonio (35 %) |
| Gran hoja de obsidiana | Legendario | S8 | Plano legendario (jefe o élite de S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Empuñadura + 2 Chatarra + 24 Azufre + 4 Sangre de demonio | 56 Chatarra | 8 Lingote de obsidiana (40 %), 2 Empuñadura (40 %), 2 Chatarra (40 %), 24 Azufre (40 %), 4 Sangre de demonio (40 %) |
| Cetro de azufre forjado | Legendario | S8 | Plano legendario (jefe o élite de S8) · Mesa de alquimia nv 3 | 8 Asta + 2 Cristal de azufre + 26 Azufre + 10 Sangre de demonio | 38 Esquirla arcana | 8 Asta (40 %), 2 Cristal de azufre (40 %), 26 Azufre (40 %), 10 Sangre de demonio (40 %) |
| Martillo de Ignaroth | Legendario | S8 | Plano legendario (jefe o élite de S8) · Forja nv 3 | 8 Lingote de obsidiana + 2 Empuñadura + 2 Chatarra + 24 Azufre + 5 Sangre de demonio | 58 Chatarra | 8 Lingote de obsidiana (40 %), 2 Empuñadura (40 %), 2 Chatarra (40 %), 24 Azufre (40 %), 5 Sangre de demonio (40 %) |
| Cadena de Belzar | Legendario | S10 | Plano legendario (jefe o élite de S10) · Forja nv 3 | 8 Acero infernal + 2 Empuñadura + 2 Chatarra + 11 Sangre de demonio | 73 Chatarra | 8 Acero infernal (40 %), 2 Empuñadura (40 %), 2 Chatarra (40 %), 11 Sangre de demonio (40 %) |

### Consumibles, comida y bombas

| Objeto | Espacio | Nivel | Receta | Sale | Coste | Valor |
|---|---|---|---|---|---|---|
| Pan duro | Cocina | 1 | 2 Harina ✱ + 1 Odre de agua | 2 | 7 | 6 |
| Cecina | Cocina | 1 | 1 Carne en salazón | 1 | 5 | 7 |
| Queso curado | Cocina | 2 | 2 Leche de cabra ✱ | 1 | 4 | 6 |
| Vino aguado | Cocina | 1 | 1 Vino agrio ✱ + 1 Odre de agua | 2 | 8 | 12 |
| Ración de viaje | Cocina | 1 | 1 Pan duro + 1 Cecina | 2 | 10 | 12 |
| Té de raíz amarga | Cocina | 2 | 2 Hierba amarga ✱ + 1 Odre de agua | 2 | 13 | 18 |
| Guiso del Bastión | Cocina | 2 | 1 Carne en salazón + 1 Setas de galería + 1 Odre de agua | 1 | 13 | 4 |
| Caldo especiado | Cocina | 3 | 2 Setas de galería + 1 Odre de agua | 1 | 11 | 4 |
| Venda | Rincón de cura | 1 | 2 Tela raída ✱ + 1 Odre de agua | 2 | 11 | 20 |
| Torniquete | Rincón de cura | 1 | 1 Correa + 1 Madera vieja ✱ | 1 | 9 | 18 |
| Férula | Rincón de cura | 1 | 2 Madera vieja ✱ + 1 Correa | 1 | 12 | 22 |
| Hemostático | Rincón de cura | 2 | 2 Hierba amarga ✱ + 1 Polvo de hueso | 1 | 14 | 30 |
| Equipo de cirugía | Rincón de cura | 3 | 1 Lingote de hierro + 2 Tela tejida + 1 Correa | 1 | 50 | 90 |
| Poción de vida | Mesa de alquimia | 1 | 1 Hierba amarga ✱ + 1 Setas de galería + 1 Odre de agua | 1 | 12 | 20 |
| Poción de maná | Mesa de alquimia | 1 | 2 Esquirla arcana + 1 Odre de agua | 1 | 17 | 20 |
| Tónico de concentración | Mesa de alquimia | 1 | 1 Esquirla arcana + 1 Setas de galería + 1 Odre de agua | 1 | 14 | 20 |
| Antídoto amargo | Mesa de alquimia | 1 | 2 Setas de galería + 1 Esquirla arcana | 1 | 12 | 25 |
| Analgésico alquímico | Mesa de alquimia | 2 | 1 Hierba amarga ✱ + 1 Esquirla arcana + 1 Odre de agua | 1 | 15 | 24 |
| Bomba de clavos ✱ | Mesa de alquimia | 1 | 1 Pólvora de hueso + 2 Chatarra | 1 | 25 | 30 |
| Frasco de brea ✱ | Mesa de alquimia | 1 | 1 Brea + 1 Tela raída ✱ + 1 Odre de agua | 1 | 14 | 20 |
| Metralla de plata ✱ | Mesa de alquimia | 2 | 1 Pólvora de hueso + 1 Lingote de plata | 1 | 65 | 90 |
| Frasco incendiario de azufre ✱ | Mesa de alquimia | 3 | 1 Brea + 1 Azufre | 1 | 46 | 80 |
