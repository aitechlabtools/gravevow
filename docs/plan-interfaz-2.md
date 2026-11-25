# Plan de interfaz 2 — revisión del plan de ChatGPT

Fecha: 25/11/2026 · Estado: aprobado. **Plan terminado: fases A–E hechas (25/11).**

## 0. Punto de partida

El plan de ChatGPT («Plan maestro UI/UX») se hizo **solo con capturas, sin ver el código**. Tiene buenas reglas (no tocar mecánicas, no rediseñar el combate, no menú lateral en móvil, no inventar controles), y las mantengo. Pero ignora que:

- Ya hicimos un plan de interfaz completo (`docs/plan-mejora-interfaz.md`, fases 0–7, terminado el 19/11): paleta, botones, pestañas con icono, ficha de objeto, HUD, combate, menús y estaciones.
- Ya hay base de medidas (`src/config/ui.ts`, bloque «Base de interfaz» de `game.css`, `--touch: 44px`, escalas enteras) y un script de revisión automática (`mockups/plan-interfaz/capturar.cjs`).
- Varias capturas suyas son anteriores a cambios recientes (venta por oficio, almacén ancho, «Compra» quitada, botón único de reconstruir…).

Por eso **no adopto** su fase 1 de «tokens nuevos» (#100F14, #D9B05E…): ya tenemos paleta y cambiarla tocaría todo el juego sin un problema que lo justifique. Tampoco la «plantilla común de comerciante» completa: la plantilla ya es común (`Mercaderes.tsx`).

## 1. Medición real (25/11)

Recorrí 19 pantallas en 6 tamaños (1920×1080, 1366×768, 1180×820, 1024×768, 844×390, 667×375) más el banco de Orik reconstruido en 8 tamaños. Capturas en `mockups/plan-interfaz-2/baseline/`.

**Sin problemas:** ningún desbordamiento horizontal de página; ningún botón de menos de 44 px en tableta ni en 844×390; textos de menos de 12 px casi inexistentes (1–3 por pantalla, en etiquetas de esquina).

**Problemas confirmados:**

| Id | Dónde | Problema | Tamaños |
|---|---|---|---|
| R-01 | Barra superior | En portátil no caben las pestañas: «Tienda» desaparece y «Bestiario» se corta bajo el oro. **Es el más grave** (se pierde una entrada). | 1366×768, 1280×720 (y anchos 1200–1500) |
| R-02 | Estación reconstruida (banco, forja, cocina…) | Cinco columnas compiten: la ficha de receta se queda en ~110 px, la imagen se corta, «Necesitas» sale como «M. 0/1», los botones de destino se cortan abajo. | 1280–1600 de ancho y tableta 1024–1180 |
| R-03 | Estación, títulos | «Banco de trabajo» y recetas largas («Farol del ba…») cortados. | tableta y móvil |
| R-04 | Alijo › Heridas | 8 botones de menos de 44 px. | 667×375 |
| R-05 | Toda la app | Un botón de menos de 44 px en la barra superior. | 667×375 |
| R-06 | Alijo, portátil | El almacén ocupa mucho alto y obliga a desplazar; el panel Aventurero tiene hueco. Mejorable, no roto. | 1366×768 |

**Lo que ChatGPT señalaba y no se confirma:** scroll horizontal global (no existe hoy), tienda con hueco vacío (con catálogo largo está bien; con corto queda hueco, aceptable), móvil del Alijo (funciona con su riel lateral).

**Dato clave para R-02:** en móvil (844×390) la estación **ya tiene la solución**: los niveles y la mejora se pliegan en una cabecera «Banco de trabajo · Nivel 1/3 · Niveles y mejora ▾» y la receta se lee bien. En portátil se muestra la versión ancha cuando no hay sitio para ella.

## 2. Plan por fases (orden mío)

Cada fase: maqueta/capturas → tu aprobación → implementación → capturas antes/después en 1920×1080, 1366×768, 1180×820, 1024×768, 844×390 y 667×375 → tests + comprobaciones.

### Fase A — Barra superior en portátil (R-01, R-05) · HECHA 25/11
- Usar la barra compacta (iconos + pestaña activa con nombre, como ya hace el móvil) también cuando el ancho no da para los rótulos completos, decidido por **medición real** (si no caben, compacta), no por un corte fijo de anchura.
- Revisar el botón pequeño en 667×375.
- Archivos: `kit/PillBar.tsx`, `Lobby.tsx`, `game.css`. Sin cambio de lógica.

### Fase B — Estaciones reconstruidas (R-02, R-03) · HECHA 25/11 (las 8 a la vez: es el mismo componente)
- Usar la versión plegada (cabecera «Niveles y mejora ▾») siempre que el panel no tenga sitio para las cinco columnas, no solo en móvil. Con eso quedan tres columnas: lista de recetas · ficha · tus materiales.
- En portátil/tableta, si aún falta sitio, «Tus materiales» pasa debajo de la ficha en vez de columna propia.
- Títulos de estación y recetas a dos líneas en lugar de «…».
- Se conservan: filtro «Solo las que puedo hacer», −/1/+, «A la mochila» y «Craftear al almacén», mejora, reconstruir, mensaje de Orik.
- Piloto en el banco de Orik; luego las otras 7 estaciones (es el mismo componente, `StationPanels.tsx`/`WorkshopPanels.tsx`, así que se propaga casi solo; se comprueba una a una).

### Fase C — Alijo (R-04, R-06) · HECHA 25/11 (R-06 descartado: el almacén tiene 15 filas por página)
- Heridas en 667×375: agrandar las zonas táctiles de los 8 botones a 44 px.
- Portátil: ajustar proporciones para que mochila y almacén se vean con menos desplazamiento. **Sin tocar** número de casillas, páginas, multicelda, arrastrar ni transferencias.

### Fase D — Repaso de mercaderes y servicios · HECHA 25/11
- Pasada pantalla por pantalla (tienda, venta, desguace, contratos, catre, reparar, seguro, enfermería) en los 6 tamaños con el script; solo se corrige lo que salga medido. Venta ya revisada esta semana.

### Fase E — Mapa de zonas · HECHA 25/11 (mapa ilustrado con la estructura del usuario)
- La idea de ChatGPT de un corte vertical Bastión → Cripta → Infierno es bonita, pero es diseño nuevo, no un arreglo. Propongo dejarla para después, con maqueta aparte, si te apetece.

### No se toca
Combate (estructura actual), menú principal, elegir/crear personaje, hub Jugar, Habilidades, Bastión (rejilla de 8), Misiones, Bestiario, Tienda de atuendos, exploración, victoria y resumen: medidos y sin fallos. Solo se revisarán si la Fase A les afecta.

## 3. Pruebas
- Que puedo ejecutar: typecheck, los 528 tests, el script de revisión en 6 tamaños, `mockups/venta-ui/real.cjs`, y un script nuevo por fase que compara oro, materiales e inventario antes/después de fabricar, mejorar y mover objetos.
- Que no puedo: dispositivo táctil real (solo emulación), Safari/iOS real, rendimiento en móvil real. Esas las tendrías que probar tú.

## 4. Riesgos
- Fase A afecta a todas las pantallas del lobby: revisar todas tras el cambio.
- Fase B: la versión plegada esconde niveles/mejora tras un desplegable en más tamaños; si prefieres verlos siempre, alternativa: ponerlos en una fila fina encima de las recetas.
