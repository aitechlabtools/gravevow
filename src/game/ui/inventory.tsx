import { basicAttackOf, isTwoHanded, itemSpecials } from '../../core/data/weapons';
import { durability, isBroken, maxDurability, wearLevel } from '../../core/durability';
import { WEAR_COLOR } from '../../config/durability';
import { AFFIXES, stackName, stackRarity, stackStats } from '../../core/data/rarity';
import { QUALITIES } from '../../core/data/forge';
import { useState, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { dragJustEnded, startPointerDrag, useDrag } from './pointerDrag';
import type { EquipSlot, Equipment, Grid, ItemStack, Stats } from '../../core/types';
import { EQUIP_SLOTS, STAT_KEYS } from '../../core/types';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { CLASSES, STAT_LABELS } from '../../core/data/classes';
import { canPlace, isCover, LAYOUTS, stackSize, type Loc } from '../../core/inventory';
import { fmtWeight, stackWeight } from '../../core/carry';
import { capacityOf, isCoins } from '../../core/gold';
import { sellPrice } from '../../core/economy';
import { iconUrl } from '../../shared/art';
import { actions, useGame } from '../state/store';
import { getSkill } from '../../core/data/skills';

export const SLOT_LABELS: Record<EquipSlot, string> = {
  mainHand: 'Arma', offHand: 'Secundaria', helmet: 'Cabeza', armor: 'Torso', gloves: 'Manos', boots: 'Pies', ring: 'Anillo', amulet: 'Amuleto',
};
const SLOT_HINT_ICON: Record<EquipSlot, string> = {
  mainHand: 'sword', offHand: 'shield', helmet: 'helm', armor: 'tunic', gloves: 'gloves', boots: 'boots', ring: 'ring', amulet: 'amulet',
};

export type InvMode = 'lobby' | 'merchant' | 'dungeon';

export const DRAG_MIME = 'application/x-gravevow';

export function ItemIcon({ itemId, size = 36 }: { itemId: string; size?: number }) {
  const def = getItem(itemId);
  return <img src={iconUrl(def.icon, 3)} width={size} height={size} alt={def.name} className="pixelated" draggable={false} />;
}

function statLine(k: keyof Stats, v: number) {
  const sign = v > 0 ? '+' : '';
  return `${sign}${v} ${STAT_LABELS[k]}`;
}

export function ItemTooltip({ stack, equipment, mode }: { stack: ItemStack; equipment?: Equipment; mode?: InvMode }) {
  const def = getItem(stack.itemId);
  const who = useGame((s) => s.profile?.character);
  const r = RARITY_INFO[stackRarity(stack, def)];
  const equipped = def.slot && equipment ? equipment[def.slot] : null;
  const cmp = equipped && equipped.uid !== stack.uid ? getItem(equipped.itemId) : null;
  return (
    <div className="panel p-3 w-64 text-sm" style={{ borderColor: r.color }}>
      <div className="font-semibold text-base leading-tight" style={{ color: r.color }}>{stackName(stack, def)}</div>
      <div className="text-stone-300 text-xs mb-2">
        {r.name} · {def.slot ? SLOT_LABELS[def.slot] : categoryName(def.category)}
        {stack.qty > 1 ? ` · x${stack.qty}` : ''}
      </div>
      <div className="text-xs mb-1 text-stone-400" data-testid="tooltip-carry">{(() => { const f = stackSize(stack); return `${f.w}×${f.h} casillas · Peso ${fmtWeight(stackWeight(stack))}`; })()}</div>
      {capacityOf(stack) > 0 && <div className="text-xs mb-1 text-gold" data-testid="tooltip-gold">Lleva {stack.gold ?? 0}/{capacityOf(stack)} monedas</div>}
      {def.uses !== undefined && <div className="text-xs mb-1 text-stone-300" data-testid="tool-uses">Usos: {stack.uses ?? def.uses}/{def.uses}{def.mineTime ? ` · pica en ${def.mineTime} s` : ''}</div>}
      {def.uses === undefined && maxDurability(stack) > 0 && <div className="text-xs mb-1" style={{ color: WEAR_COLOR[wearLevel(stack)] }} data-testid="tooltip-dur">{isBroken(stack) ? 'Rota: no da estadísticas ni especiales. Repárala con Brand o un kit.' : `Durabilidad: ${durability(stack)}/${maxDurability(stack)}`}</div>}
      {stack.quality !== undefined && <div className="text-xs mb-1" style={{ color: ['#9a9a9a', '#5fbf4a', '#e8b33a'][stack.quality] }}>Calidad {QUALITIES[stack.quality].name.toLowerCase()}{QUALITIES[stack.quality].bonus ? ` (+${Math.round(QUALITIES[stack.quality].bonus * 100)}%)` : ''}{stack.forgedBy ? ` · Forjada por ${stack.forgedBy}` : ''}</div>}
      {stack.affixes?.length ? <div className="text-xs mb-1 text-gold">{stack.affixes.map((a) => AFFIXES[a]?.description).filter(Boolean).join(' ')}</div> : null}
      {def.stats && (() => {
        const st = stackStats(stack, def);
        return (
          <ul className="mb-2">
            {STAT_KEYS.filter((k) => st[k]).map((k) => (
              <li key={k} className={st[k]! > 0 ? 'text-heal' : 'text-blood'}>{statLine(k, st[k]!)}</li>
            ))}
          </ul>
        );
      })()}
      {def.use && <div className="text-frost mb-2">Uso: {def.description}</div>}
      <div className="font-body italic text-stone-300 leading-snug">{def.use ? '' : def.description}</div>
      {(def.slot === 'mainHand' || def.slot === 'offHand') && (
        <div className="text-xs mt-2 pt-2 border-t border-stone-700">
          {def.slot === 'mainHand' && <div className="text-stone-300">Ataque básico: <span className="text-parchment">{basicAttackOf(def).name}</span></div>}
          {itemSpecials(def).length > 0 && <div className="text-stone-300">Ataques especiales{isTwoHanded(def) ? ' (a dos manos)' : ''}: <span className={def.slot === 'offHand' ? 'text-frost' : 'text-parchment'}>{itemSpecials(def).map((g) => getSkill(g).name).join(', ')}</span></div>}
        </div>
      )}
      {def.classes && <div className={`text-xs mt-2 ${who && !def.classes.includes(who.classId) ? 'text-blood' : 'text-stone-300'}`}>Clases: {def.classes.map((c) => CLASSES[c].name).join(', ')}</div>}
      {def.levelReq && def.slot && (
        <div className={`text-xs ${who && who.level < def.levelReq ? 'text-blood' : 'text-heal'}`} data-testid="tooltip-level">
          Requiere nivel {def.levelReq}{who && who.level < def.levelReq ? ` (tienes ${who.level}): puedes guardarlo, pero no equiparlo` : ''}
        </div>
      )}
      {cmp && (
        <div className="mt-2 pt-2 border-t border-stone-600 text-xs">
          <div className="text-stone-300 mb-1">Comparado con {cmp.name}:</div>
          {STAT_KEYS.map((k) => {
            const d = (def.stats?.[k] ?? 0) - (cmp.stats?.[k] ?? 0);
            if (!d) return null;
            return <div key={k} className={d > 0 ? 'text-heal' : 'text-blood'}>{d > 0 ? '▲' : '▼'} {statLine(k, d)}</div>;
          })}
        </div>
      )}
      <div className="flex justify-between mt-2 text-xs text-gold">
        <span>Valor: {def.value * stack.qty} oro</span>
        {mode === 'merchant' && <span>Venta: {sellPrice(def.id, stack)}</span>}
      </div>
    </div>
  );
}

/** Compara una pieza con la que llevas puesta en su ranura (con rareza y atributos). null si no es equipable. */
export function compareWithEquipped(stack: ItemStack, equipment: Equipment | undefined) {
  const def = getItem(stack.itemId);
  if (!def.slot || !equipment) return null;
  const worn = equipment[def.slot];
  if (worn && worn.uid === stack.uid) return null;
  const a = stackStats(stack, def);
  const b = worn ? stackStats(worn, getItem(worn.itemId)) : ({} as Partial<Stats>);
  const diffs = STAT_KEYS.map((k) => [k, (a[k] ?? 0) - (b[k] ?? 0)] as const).filter(([, d]) => d !== 0);
  const better = diffs.filter(([, d]) => d > 0).length, worse = diffs.filter(([, d]) => d < 0).length;
  return { worn, wornName: worn ? stackName(worn, getItem(worn.itemId)) : null, diffs, better, worse };
}

/** ¿Es una mejora clara para el personaje (puede llevarlo y gana en más atributos de los que pierde)? */
export function isUpgrade(stack: ItemStack, equipment: Equipment | undefined, who: { classId: string; level: number } | undefined): boolean {
  const def = getItem(stack.itemId);
  if (!def.slot || !who || (def.classes && !def.classes.includes(who.classId as never)) || (def.levelReq && who.level < def.levelReq)) return false;
  const c = compareWithEquipped(stack, equipment);
  if (!c) return false;
  const sum = c.diffs.reduce((t, [, d]) => t + d, 0);
  return c.better > c.worse || (c.better === c.worse && sum > 0);
}

function categoryName(c: string) {
  return ({ potion: 'Consumible', material: 'Material', relic: 'Reliquia', jewel: 'Joya', key: 'Llave', quest: 'Objeto de misión', coin: 'Moneda', gold: 'Oro', container: 'Saco de oro', weapon: 'Arma', shield: 'Escudo', tool: 'Herramienta' } as Record<string, string>)[c] ?? c;
}

interface SlotProps {
  stack: ItemStack | null;
  loc: Loc;
  lootId?: string;
  equipment?: Equipment;
  mode?: InvMode;
  selected?: boolean;
  placeholderIcon?: string;
  label?: string;
  onSelect?: (loc: Loc) => void;
  onQuick?: (loc: Loc, stack: ItemStack) => void;
  onAlt?: (loc: Loc, stack: ItemStack) => void;
  /** Al tocar una casilla VACÍA (sirve para «toca el objeto y luego toca dónde va»). */
  onEmpty?: (loc: Loc) => void;
  /** Casilla grande (armas). */
  big?: boolean;
  /** Hay un objeto elegido esperando destino: las casillas vacías se marcan como posibles destinos. */
  awaiting?: boolean;
  /** Posición en la rejilla (columna y fila, desde 1) y tamaño en casillas (objetos grandes: 2×2). */
  cell?: { col: number; row: number; w: number; h: number };
  /** Objeto elegido esperando destino (ranuras de equipo: se ilumina la suya). */
  movingItemId?: string;
  /** Marcado para vender. */
  marked?: boolean;
  /** Fase 6: esta casilla entra en el hueco que ocuparía el objeto arrastrado (cabe o no). */
  fit?: 'ok' | 'bad';
}

// Último tipo de puntero usado (para no tratar «mantener pulsado» en táctil como clic derecho)
let lastPointer = 'mouse';
if (typeof window !== 'undefined') window.addEventListener('pointerdown', (e) => { lastPointer = e.pointerType; }, true);

export function ItemSlot({ stack, loc, lootId, equipment, mode, selected, placeholderIcon, label, onSelect, onQuick, onAlt, onEmpty, big, cell, movingItemId, marked, fit }: SlotProps) {
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const rarity = stack ? RARITY_INFO[stackRarity(stack, getItem(stack.itemId))] : null;
  const who = useGame((s) => s.profile?.character);
  const sdef = stack ? getItem(stack.itemId) : null;
  const tooHigh = !!(sdef?.slot && who && sdef.levelReq && who.level < sdef.levelReq);
  const wrongClass = !!(sdef?.slot && who && sdef.classes && !sdef.classes.includes(who.classId));
  const eqNow = useGame((s) => s.profile?.equipment);
  const upgrade = !!stack && loc.kind === 'grid' && !!sdef?.slot && isUpgrade(stack, eqNow, who);
  const testId = loc.kind === 'equip' ? `slot-equip-${loc.slot}` : `slot-${loc.container}-${loc.index}`;
  const dropRaw = JSON.stringify({ type: 'loc', loc, lootId });
  const drag = useDrag();
  const over = !!drag && !drag.back && drag.over === dropRaw;
  const dragging = !!drag && !drag.back && JSON.stringify(drag.from) === JSON.stringify(loc);
  // Ranuras de equipo: al mover un objeto (arrastrándolo o elegido), solo se ilumina la ranura donde encaja; las demás se apagan
  const moving = drag && !drag.back ? drag.itemId : movingItemId;
  const fits = loc.kind === 'equip' && !!moving ? getItem(moving).slot === loc.slot : null;
  return (
    <div
      data-testid={testId}
      data-item={stack?.itemId ?? ''}
      className={`slot ${big ? 'slot-big' : ''} ${over ? 'drag-over' : ''} ${selected && !dragging ? 'selected' : ''} ${dragging ? 'is-lifted' : ''} ${marked ? 'is-marked' : ''} ${fits === true ? 'drop-ok' : fits === false ? 'drop-dim' : ''} ${fit ? 'fit-' + fit : ''}`}
      style={{
        ...(rarity ? { borderColor: rarity.color + 'aa', boxShadow: `inset 0 0 0 1px #07060a, inset 0 0 14px ${rarity.color}33` } : {}),
        ...(cell ? { gridColumn: `${cell.col} / span ${cell.w}`, gridRow: `${cell.row} / span ${cell.h}` } : {}),
        ...(cell && (cell.w > 1 || cell.h > 1) ? { width: `calc(var(--slot) * ${cell.w} + ${(cell.w - 1) * 4}px)`, height: `calc(var(--slot) * ${cell.h} + ${(cell.h - 1) * 4}px)` } : {}),
      }}
      data-drop={dropRaw}
      onPointerDown={(e) => { if (stack) { setTip(null); startPointerDrag(e, loc, stack.itemId, lootId, stackSize(stack), stack.uid); } }}
      onClick={(e) => { if (dragJustEnded()) return; if (stack && e.shiftKey && onAlt) { onAlt(loc, stack); return; } if (stack) onSelect?.(loc); else onEmpty?.(loc); }}
      onDoubleClick={() => stack && !dragJustEnded() && onQuick?.(loc, stack)}
      onContextMenu={(e) => {
        e.preventDefault();
        // En táctil, mantener pulsado es para arrastrar: no hace la acción del clic derecho
        if (stack && lastPointer !== 'touch') onAlt?.(loc, stack);
      }}
      onPointerEnter={(e) => {
        // Solo con ratón: en táctil la ficha del objeto sustituye a esta ventanita
        if (!stack || e.pointerType !== 'mouse') return;
        const r = (e.currentTarget as HTMLElement).getBoundingClientRect();
        setTip({ x: r.right + 8, y: r.top });
      }}
      onPointerLeave={() => setTip(null)}
      title={!stack && label ? label : undefined}
    >
      {stack ? (isCoins(stack)
        ? <img src={iconUrl(stack.qty <= 3 ? 'coins1' : stack.qty <= 7 ? 'coins2' : 'coins3', 3)} width={36} height={36} alt="Monedas de oro" className="pixelated" draggable={false} />
        : <ItemIcon itemId={stack.itemId} size={cell && Math.min(cell.w, cell.h) > 1 ? 84 : big ? 48 : 36} />) : placeholderIcon ? <img src={iconUrl(placeholderIcon, 3)} width={30} height={30} className="pixelated opacity-15" alt="" draggable={false} /> : null}
      {stack && stack.qty > 1 && <span className="qty">{stack.qty}</span>}
      {stack && (() => { const w = wearLevel(stack); return w === 'ok' ? null : <span className="slot-wear" data-testid="slot-wear" data-wear={w} style={{ background: WEAR_COLOR[w], width: w === 'broken' ? '100%' : `${Math.max(8, Math.round((durability(stack) / maxDurability(stack)) * 100))}%` }} title={w === 'broken' ? 'Rota' : 'Desgastada'} />; })()}
      {marked && <span className="mark-coin" aria-label="Marcado para vender" data-testid="slot-marked" />}
      {stack && capacityOf(stack) > 0 && <span className="qty" data-testid="slot-gold" style={{ color: stack.gold ? '#f2c75a' : '#a8a29e', fontSize: cell && cell.w > 1 ? 13 : 10 }}>{stack.gold ?? 0}/{capacityOf(stack)}</span>}
      {stack && loc.kind === 'grid' && !tooHigh && !wrongClass && upgrade && <span className="slot-up" title="Mejor que lo que llevas puesto" data-testid="slot-upgrade">▲</span>}
      {stack && loc.kind === 'grid' && (tooHigh || wrongClass) && (
        <span className="absolute left-0.5 top-0 text-[10px] leading-none px-0.5 bg-black/80 text-blood" data-testid="slot-locked" title={wrongClass ? 'Tu clase no puede usarlo' : `Requiere nivel ${sdef!.levelReq}`}>
          {wrongClass ? '✕' : `Nv${sdef!.levelReq}`}
        </span>
      )}
      {tip && stack && !drag && createPortal(
        <div className="fixed z-[100] pointer-events-none" style={{ left: Math.min(tip.x, window.innerWidth - 270), top: Math.min(tip.y, window.innerHeight - 280) }}>
          <ItemTooltip stack={stack} equipment={equipment} mode={mode} />
        </div>,
        document.body,
      )}
    </div>
  );
}

export function GridView(props: {
  grid: Grid;
  container: 'backpack' | 'stash' | 'shared' | 'loot' | 'pocket';
  cols: number;
  /** Primera casilla del contenedor que se pinta (páginas del almacén: el `grid` es solo esa página). */
  offset?: number;
  lootId?: string;
  equipment?: Equipment;
  mode?: InvMode;
  selected?: Loc | null;
  onSelect?: (loc: Loc) => void;
  onQuick?: (loc: Loc, stack: ItemStack) => void;
  onAlt?: (loc: Loc, stack: ItemStack) => void;
  onEmpty?: (loc: Loc) => void;
  /** Venta: casillas marcadas para vender (contorno y moneda). */
  marked?: (loc: Loc) => boolean;
}) {
  // Fase 6: al arrastrar sobre esta rejilla, se marcan las casillas que ocuparía el objeto (verde si cabe, rojo si no)
  const drag = useDrag();
  const L0 = LAYOUTS[props.container];
  let fitCells: Set<number> | null = null, fitOk = false;
  if (drag && !drag.back && drag.over && drag.size && drag.size.w * drag.size.h > 1 && L0 && L0.cols === props.cols) {
    try {
      const o = JSON.parse(drag.over) as { type?: string; loc?: Loc };
      const off = props.offset ?? 0;
      if (o.type === 'loc' && o.loc?.kind === 'grid' && o.loc.container === props.container) {
        const k = o.loc.index - off, { w, h } = drag.size;
        if (k >= 0 && k < props.grid.length) {
          fitOk = canPlace(props.grid, L0, k, w, h, drag.uid);
          fitCells = new Set();
          const col = k % L0.cols;
          for (let y = 0; y < h; y++) for (let x = 0; x < w && col + x < L0.cols; x++) fitCells.add(k + y * L0.cols + x);
        }
      }
    } catch { /* destino que no es una casilla */ }
  }
  return (
    <div className="grid gap-1 slot-grid" style={{ gridTemplateColumns: `repeat(${props.cols}, var(--slot))` }} data-testid={`grid-${props.container}`}>
      {props.grid.map((s, k) => {
        const i = k + (props.offset ?? 0);
        // Las casillas tapadas por un objeto grande no se pintan: el objeto ocupa su hueco (2×2)
        if (isCover(s)) return null;
        const L = LAYOUTS[props.container];
        const fixed = !!L && L.cols === props.cols;
        const f = s && fixed ? stackSize(s) : { w: 1, h: 1 };
        const cell = fixed ? { col: (k % props.cols) + 1, row: Math.floor(k / props.cols) + 1, w: f.w, h: f.h } : undefined;
        const loc: Loc = { kind: 'grid', container: props.container, index: i };
        const sel = props.selected?.kind === 'grid' && props.selected.container === props.container && props.selected.index === i;
        return <ItemSlot key={i} cell={cell} stack={s} loc={loc} lootId={props.lootId} equipment={props.equipment} mode={props.mode} selected={sel} marked={props.marked?.(loc)} fit={fitCells?.has(k) ? (fitOk ? 'ok' : 'bad') : undefined} onSelect={props.onSelect} onQuick={props.onQuick} onAlt={props.onAlt} onEmpty={props.onEmpty} awaiting={!!props.selected && !!props.onEmpty} />;
      })}
    </div>
  );
}

export function EquipmentView({ equipment, portrait, selected, onSelect, mode }: { equipment: Equipment; portrait: ReactNode; selected?: Loc | null; onSelect?: (l: Loc) => void; mode?: InvMode }) {
  const slot = (s: EquipSlot) => (
    <div className="flex flex-col items-center gap-0.5" key={s}>
      <ItemSlot
        stack={equipment[s]}
        loc={{ kind: 'equip', slot: s }}
        equipment={equipment}
        mode={mode}
        placeholderIcon={SLOT_HINT_ICON[s]}
        label={SLOT_LABELS[s]}
        selected={selected?.kind === 'equip' && selected.slot === s}
        onSelect={onSelect}
        onQuick={(l) => actions.unequip(l)}
        onAlt={(l) => actions.unequip(l)}
      />
      <span className="text-[10px] text-stone-300 uppercase tracking-wider">{SLOT_LABELS[s]}</span>
    </div>
  );
  const [left, right] = [EQUIP_SLOTS.slice(0, 4), EQUIP_SLOTS.slice(4)];
  return (
    <div className="flex items-center gap-3" data-testid="equipment">
      <div className="flex flex-col gap-1">{left.map(slot)}</div>
      <div className="flex-1 flex items-center justify-center min-w-[120px]">{portrait}</div>
      <div className="flex flex-col gap-1">{right.map(slot)}</div>
    </div>
  );
}

export function StatsList({ stats, base, resourceName }: { stats: Stats; base?: Stats; resourceName: string }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-0.5 text-sm" data-testid="stats">
      {STAT_KEYS.map((k) => {
        const bonus = base ? stats[k] - base[k] : 0;
        return (
          <div key={k} className="flex justify-between" data-stat={k}>
            <span className="text-stone-300">{k === 'maxMp' ? resourceName : STAT_LABELS[k]}</span>
            <span>
              {stats[k]}
              {bonus !== 0 && <span className={bonus > 0 ? 'text-heal' : 'text-blood'}> ({bonus > 0 ? '+' : ''}{bonus})</span>}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function Bar({ value, max, color, label, testId, spend = 0 }: { value: number; max: number; color: string; label?: string; testId?: string; /** Trozo que se gastaría (se marca parpadeando al final de la barra). */ spend?: number }) {
  const pct = max > 0 ? Math.max(0, Math.min(100, (value / max) * 100)) : 0;
  const lack = spend > value;
  const spendPct = max > 0 && spend > 0 ? Math.min(pct, (Math.min(spend, value) / max) * 100) : 0;
  return (
    <div className="w-full" data-testid={testId}>
      {label && (
        <div className="flex justify-between text-xs mb-0.5">
          <span>{label}</span>
          <span>{Math.round(value)}/{max}</span>
        </div>
      )}
      <div className="bar">
        <div style={{ width: `${pct}%`, background: `linear-gradient(180deg, ${color} 0%, ${color} 55%, rgba(0,0,0,0.35) 100%)`, backgroundColor: color }} />
        {spend > 0 && (lack
          ? <span className="bar-spend lack" style={{ left: 0, width: `${pct}%` }} data-testid={testId ? `${testId}-spend` : undefined} />
          : <span className="bar-spend" style={{ left: `${pct - spendPct}%`, width: `${spendPct}%` }} data-testid={testId ? `${testId}-spend` : undefined} />)}
      </div>
    </div>
  );
}
