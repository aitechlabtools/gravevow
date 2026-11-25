# Plan: una función por mercader (Orik, Brand y Valerius)

Estado: **implementado (24/11).**

Criterio que has dado: quitar menús repetidos; todo lo demás sigue funcionando como ahora.

## 1. Mapa actual

Las pestañas salen de `servicesOf` (`src/game/ui/screens/Mercaderes.tsx`). La tienda y la venta salen de `src/core/data/vendors.ts`, y las estaciones de `src/config/stations.ts`.

| Mercader | Pestañas hoy | Dónde |
|---|---|---|
| **Orik** (taller) | Tienda · **Reparar** · Desguace · Banco de trabajo | `servicesOf`, `RepairPanel.tsx`, `ScrapPanel`, `core/salvage.ts` |
| **Brand** (forja) | Tienda · **Seguro** · Reparar · Forja | `servicesOf`, `RepairPanel.tsx`, `InsurePanels.tsx`, `core/repair.ts` |
| **Valerius** (armería) | Tienda · **Seguro** · Forja de armaduras | `servicesOf`, `InsurePanels.tsx` |
| Nira (mercado) | Tienda · Vender · **Reparar** | `servicesOf` |
| Eldrin (laboratorio) | Tienda · **Seguro** · Laboratorio | `servicesOf`, `InsurePanels.tsx` |
| Vesper, Garth, Grizk | Tienda, enfermería, contratos y estaciones propias | sin duplicados con estos tres |

**Menús repetidos:**
- «Reparar» está en tres mercaderes (Brand, Orik y Nira) y los tres abren el mismo panel. La reparación ya es de Brand en el código y en los textos («Maese Brand repara»).
- «Seguro» también está en tres (Brand, Valerius y Eldrin).
- «Desguace» ya solo está en Orik.

## 2. Qué se mueve

| Función | Ahora | Después | Por qué |
|---|---|---|---|
| Reparar | Brand, Orik, Nira | **Solo Brand** | Ya es suya; en los otros dos era un atajo al mismo panel. |
| Seguro (asegurar y recoger lo reforjado) | Brand, Valerius, Eldrin | **Solo Valerius** | Una sola persona asegura. Reforja con la ayuda de Brand (y de Eldrin para los amuletos), pero se trata con él. |
| Desguace | Orik | Orik | Sin cambios. |
| Tiendas, venta, Forja, Forja de armaduras, Banco de trabajo, Laboratorio | — | **Sin cambios** | No están repetidas; me pediste que el resto funcione como ahora. |

No se elimina ninguna función: solo desaparecen las pestañas duplicadas.

## 3. Seguro

**Se mantiene como funciona hoy:**
- por bajada;
- se pregunta al pulsar «Descender»;
- solo cubre el equipo puesto;
- cuesta el 4 % del valor de la pieza, con un mínimo de 1 moneda;
- cada pieza necesita la estación de quien la fabrica reconstruida: la Forja para armas y anillos, la Forja de armaduras para armaduras y escudos, y el Laboratorio para amuletos.

**Lo único que cambia:**
- Valerius es el único que tiene la pestaña «Seguro».
- Todas las piezas reforjadas se recogen en Valerius.
- La ventana de «Descender» y el recibo dicen «Te lo reforja Valerius».

**Lo que el encargo pedía y no aplico, porque contradice tu criterio de que el resto funcione como ahora:**
- un seguro que dure hasta morir;
- un precio del 10-15 %;
- asegurar desde el Bastión en lugar de al bajar.

Si lo quieres, se cambia aparte.

## 4. Dependencias

- **Partidas guardadas:** puede haber piezas pendientes guardadas a nombre de Brand o de Eldrin. Pasan a recogerse en Valerius, sin pérdida. Los perfiles sin seguro cargan igual que ahora.
- **Tutoriales:**
  - el mini tutorial `insure.first` pasa a contarlo Valerius y su texto cambia;
  - ningún tutorial menciona «Reparar» en Orik o en Nira;
  - el de la primera muerte (Vesper) no cambia.
- **Misiones:** ninguna depende de reparar ni de asegurar con un mercader concreto.
- **Textos:**
  - el panel de reparación dice que el kit «lo venden Nira, Orik y Brand». Sigue siendo cierto, porque las tiendas no cambian;
  - la caja «Pendiente» y la marca «Pieza reforjada» pasan a salir solo en Valerius.
- **Iconos:** ninguno nuevo.

## 5. Archivos

- `src/game/ui/screens/Mercaderes.tsx`: `servicesOf` (Reparar solo en Brand; Seguro solo en Valerius) y `pendingOf`.
- `src/config/insurance.ts`: las piezas las reforja Valerius. Las estaciones que hacen falta no cambian.
- `src/core/insurance.ts` y `src/core/insuranceLoss.ts`: pendientes a nombre de Valerius; las antiguas se recogen allí.
- `src/game/ui/InsurePanels.tsx`: textos.
- `src/core/data/tutorials.ts` y `docs/tutoriales.md`: `insure.first`.
- `docs/estado-trabajo.md` y `docs/guia-interfaz.md`.
- `mockups/seguro-equipo/`: capturas de antes y después de Orik, Brand y Valerius.
