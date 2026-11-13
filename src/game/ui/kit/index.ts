// Piezas comunes de los menús. Ver docs/guia-interfaz.md para montar una pantalla nueva.
export { Panel, SubHead } from './Panel';
export { PillBar, type PillTab } from './PillBar';
export { Segmented } from './Segmented';
export { Drawer } from './Drawer';
export { Card } from './Card';
export { usePixelScale, type ScaleKey } from './Pixel';
// Casillas e inventario (ya existían): la casilla mide var(--slot).
export { ItemSlot, GridView, ItemIcon, Bar } from '../inventory';
export { QtyPicker } from './QtyPicker';
