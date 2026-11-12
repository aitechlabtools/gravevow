# Bastión: Mercaderes y Refugio (propuesta, sin código)

Fecha: 12/11/2026. Maquetas: `mockups/bastion-refugio/index.html`. Son capturas del juego real con la propuesta montada encima, en escritorio, tableta y móvil horizontal.

## 1. Cómo está organizado ahora

**Pestaña «Bastión».** Abre `screens/Mercaderes.tsx`, que tiene tres vistas según su estado:
- **`VendorCards`:**
  - Título «El Bastión».
  - Arriba a la derecha (`bastion-cot`), tres elementos:
    - el texto «Barracones · Descanso N»;
    - el botón «Dormir en el catre» (`btn-cot`);
    - el botón «Tu Refugio» (`btn-refuge`). Su texto añade «· recepción N» y «· N por construir».
  - Debajo, los 8 mercaderes en 4 columnas. La tarjeta es `kit/Card`: nombre, arco, retrato `MonsterSprite`, lugar, rol, `RepBar`, etiquetas de servicios y «Hablar».
- **`VendorInterior`:** la tienda, misiones, vender, forja, cocina, desguace… de cada mercader. Una de sus vistas es **«Encargos del Refugio»**, que monta `StationGrid by={vendor}`: las estaciones que ese mercader construye.
- **`RefugePanel`** (`RefugePanels.tsx`). Se llega con `btn-refuge` y contiene, de arriba abajo:
  - la cabecera con «◂ Bastión»;
  - la Preparación;
  - los platos que tienes para comer;
  - la **recepción de excedentes**;
  - la rejilla `StationGrid`: tarjetas `StationCard` de 3 en 3, muy cargadas (icono, nivel, descripción, «mientras tanto», encargado, coste, materiales con «Ir», «Pedir a…» y avisos);
  - al entrar en una estación: `CraftPanel`, `RunePanel` y el menú del atril, con «◂ Refugio».

**Otros accesos:**
- Las insignias de la pestaña Bastión en `Lobby.tsx` (`readyStations`).
- Desde Jugar, «Contratos» lleva a Grizk.
- `VendorCraft`: si la estación de un mercader está cerrada, ofrece pedirla allí mismo.
- Los botones «Ir» de los materiales llevan a la tienda o al desguace de un mercader (`goTo`).
- `CraftPanel` y `RunePanel` vuelven con «◂ Refugio».
- **Ajustes no lleva al Refugio**. La cocina, el desguace y el resto de servicios también se abren desde dentro del mercader.

## 2. Propuesta

**Pestaña Bastión:**
- **Entrada:** dos tarjetas grandes, «Mercaderes» y «Refugio».
  - Usan la misma `kit/Card`, con el arco y el arte a doble escala en escritorio y tableta, y a escala normal en móvil.
  - Cada una tiene una línea de qué es, una línea verde con lo pendiente y un botón «Entrar».
  - El número verde del arco es la suma de lo pendiente:
    - en Mercaderes: encargos listos para entregar;
    - en Refugio: estaciones que se pueden construir o mejorar, recepción con cosas y mini tutorial pendiente (cuando existan).
- **Mercaderes:** la pantalla actual sin el bloque `bastion-cot`, y un botón «◂ Bastión» en su lugar.
- **Refugio:** tarjetas de estación iguales que las de los mercaderes, en 4 columnas.
  - Arriba se queda una línea compacta con la Preparación, «Recepción (N)» si hay algo y «◂ Bastión».
  - La recepción y los platos para comer se abren en un panel aparte, para que no se apilen sobre las tarjetas.
- **Tarjeta de estación**, de arriba abajo:
  - nombre;
  - imagen en el arco, oscurecida y con candado si está bloqueada;
  - «Nivel N/3», «Nivel 3/3 · máximo» o «Bloqueada»;
  - «Encargado: X»;
  - una línea de para qué sirve, que se oculta en el móvil;
  - tres marcas de nivel en el sitio de la reputación;
  - un botón según el estado:
    - **Bloqueada:** «Pedir a X». Si el encargado aún no ha llegado, el botón aparece apagado y la ficha dice cuándo llega.
    - **Desbloqueada:** «Usar». En el Catre es «Usar · Dormir» y duerme directamente.
    - **Mejora posible con lo que tienes:** «Usar» y la marca verde «▲ MEJORA» en el arco.
    - **Bloqueada pero ya puedes pedirla:** un «!» verde en el arco.
- **Al tocar la tarjeta**, fuera del botón, se abre el **detalle**:
  - a la izquierda, la misma tarjeta;
  - a la derecha:
    - el retrato del encargado con su frase;
    - la alternativa mientras está bloqueada;
    - los 3 niveles con su beneficio, con el actual marcado;
    - el coste de la siguiente mejora;
    - los materiales que tienes y los que faltan, con «Ir»;
    - el botón «Pedir a X que la construya» o «… que la mejore», y «Usar».
  - Arriba: «◂ Refugio» a la izquierda y «◂ Bastión» a la derecha.
  - «Usar» abre lo que hay ahora: `CraftPanel`, el menú del atril, dormir, o el desguace de Orik en el Banco de trabajo.
- **Navegación:** Bastión pasa a tener 4 vistas (entrada, mercaderes, refugio y detalle).
  - Los «Ir» y los «Contratos» siguen abriendo el mercader directamente.
  - «◂ Volver» dentro de un mercader vuelve a Mercaderes.
  - La vista «Encargos del Refugio» de cada mercader pasa a mostrar sus estaciones como tarjetas nuevas. Al tocar una se abre su detalle.

**Móvil horizontal.** Propongo **4 columnas compactas**, igual que ahora los mercaderes, con desplazamiento vertical. No propongo carrusel, por dos razones:
- se ve el estado de varias estaciones a la vez;
- las imágenes conservan la escala entera de los retratos.

Medidas comprobadas en las maquetas: botones de 44 px como mínimo y sin desborde horizontal en los tres tamaños.

**Tutoriales.**
- Los que hay hoy no tocan esta pantalla, aparte del texto de la bienvenida actual, que nombra el Bastión. Habrá que actualizar ese texto.
- En el plan del bloque 3 (`docs/plan-tutoriales.md`) cambian:
  - el paso 4 de la bienvenida: resaltar la entrada con sus dos tarjetas;
  - `tab.bastion`, que pasa a ser `screen.bastion-entry`;
  - `tab.refugio`;
  - `station.*`, que resaltan la tarjeta y el botón «Usar».

## 3. Assets que tienes que diseñar

Todos van en pixel art, a la misma proporción que los retratos de los mercaderes. El retrato base es de 20 × 26 px y en pantalla se muestra a escala entera, ×6 en escritorio (120 × 156).

| Imagen | Medida base | Notas |
|---|---|---|
| Refugio (entrada del Bastión) | 20 × 26 px; recomendable 40 × 52 px | Se ve a doble tamaño; el doble de detalle encaja mejor |
| Mercaderes (entrada) | — | Uso el retrato de Garth; si quieres una escena de grupo, 40 × 52 px |
| Catre | 20 × 26 px | Con transparencia; apoyado abajo en el arco |
| Cocina (fogón con olla) | 20 × 26 px | |
| Banco de trabajo | 20 × 26 px | |
| Rincón de cura | 20 × 26 px | |
| Forja | 20 × 26 px | |
| Mesa de alquimia | 20 × 26 px | |
| Atril rúnico | 20 × 26 px | |

- La versión bloqueada no hace falta dibujarla: se oscurece por código y se pone el candado.
- Mientras no existan, uso marcadores dibujados por código. Se apuntarán en `docs/ASSETS.md`.

## 4. Preguntas

1. **Recepción de excedentes y platos para comer.** ¿Te parece bien sacarlos de la cuadrícula a un botón «Recepción (N)», que abre un panel, y dejar los platos dentro del detalle de la Cocina?
2. **Al tocar la tarjeta fuera de su botón,** ¿abrimos el detalle, como en las maquetas? ¿O prefieres un botón pequeño «Detalles» además de «Usar»?
3. **Estaciones cuyo encargado aún no ha llegado** (Forja, Mesa y Atril dependen de Brand y Eldrin). ¿Las mostramos bloqueadas con «Llega con el Osario», o las ocultamos hasta entonces?
4. **Imagen de Mercaderes en la entrada.** ¿Garth o otro retrato? ¿O una escena propia más adelante?
5. **La vista «Encargos del Refugio» dentro de cada mercader.** ¿La mantenemos con tarjetas nuevas, o la quitamos, ahora que el Refugio está a un toque?

## 5. Plan (tras tu aprobación)

1. Navegación de la pestaña Bastión: entrada, mercaderes, refugio y detalle. Accesos revisados.
2. `StationCard` nueva con el formato de los mercaderes y los marcadores pixel art, y el detalle con lo que hay hoy en la tarjeta.
3. Recepción y platos, según la respuesta a la pregunta 1.
4. Actualizar `guia-interfaz.md`, `ASSETS.md`, el plan de tutoriales y la bienvenida actual.
5. Pruebas en escritorio, iPad y móvil horizontal:
   - `refugio-check.cjs`, `taller-check.cjs`, `desguace-check.cjs`, `menus-check.cjs` y `e2e.cjs` adaptados;
   - un script nuevo `bastion-check.cjs` que compruebe la entrada, las insignias, 44 px, que no haya desbordes, la escala entera y la vuelta con «◂ Bastión».
