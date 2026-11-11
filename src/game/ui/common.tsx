import { capacityOf, isCoins } from '../../core/gold';
import { BAG_SIZES } from '../../config/gold';
import { GoldAmountPicker } from './GoldAmountPicker';
import { canPocket, canRotate } from '../../core/inventory';
import { useIsTouch } from '../../shared/device';
import { useEffect, useState, type ReactNode } from 'react';
import type { Loc } from '../../core/inventory';
import { stackAt } from '../../core/inventory';
import { getItem } from '../../core/data/items';
import { buysThis, vendorSellPrice } from '../../core/economy';
import type { Appearance, ClassId, Equipment } from '../../core/types';
import { heroUrl, monsterUrl, iconUrl } from '../../shared/art';
import { actions, containersFor, getState, useGame } from '../state/store';
import type { InvMode } from './inventory';
import { ItemIcon } from './inventory';
import { RARITY_INFO } from '../../core/data/items';
import { combatLoadout } from '../../core/loadout';
import { getSkill } from '../../core/data/skills';
import { CLASSES } from '../../core/data/classes';
import { wornSkin } from '../../core/skins';
import { computeStats } from '../../core/stats';
import { skillCost } from '../../config/progression';

export function HeroSprite({ classId, appearance, equipment, skin, scale = 6, animate = true, pose = 'idle' as 'idle' | 'attack' | 'hurt', className = '' }: { classId: ClassId; appearance: Appearance; equipment?: Equipment; skin?: string | null; scale?: number; animate?: boolean; pose?: 'idle' | 'attack' | 'hurt'; className?: string }) {
  const [f, setF] = useState(0);
  useEffect(() => {
    if (!animate) return;
    const t = setInterval(() => setF((x) => (x + 1) % 4), 220);
    return () => clearInterval(t);
  }, [animate]);
  return <img src={heroUrl(classId, appearance, scale, animate ? f : 0, pose, equipment, skin)} className={`pixelated ${className}`} alt="" draggable={false} data-testid="hero-sprite" />;
}

/** El personaje del jugador con lo que lleva puesto ahora mismo (en la mazmorra, el equipo de la expedición). */
export function PlayerSprite(props: { scale?: number; animate?: boolean; pose?: 'idle' | 'attack' | 'hurt'; className?: string }) {
  const profile = useGame((s) => s.profile);
  const expEquipment = useGame((s) => (s.screen === 'dungeon' ? s.expedition?.equipment : undefined));
  if (!profile) return null;
  return <HeroSprite classId={profile.character.classId} appearance={profile.character.appearance} equipment={expEquipment ?? profile.equipment} skin={wornSkin(profile)} {...props} />;
}

export function MonsterSprite({ sprite, scale = 6, pose = 'idle', className = '' }: { sprite: string; scale?: number; pose?: 'idle' | 'attack' | 'hurt'; className?: string }) {
  return <img src={monsterUrl(sprite, scale, pose)} className={`pixelated ${className}`} alt="" draggable={false} />;
}

export function GoldAmount({ value, className = '' }: { value: number; className?: string }) {
  return (
    <span className={`inline-flex items-center gap-1 text-gold ${className}`} data-testid="gold">
      <img src={iconUrl('coin', 2)} width={18} height={18} className="pixelated" alt="" />
      {value}
    </span>
  );
}

export function Modal({ children, onClose, wide = false, testId }: { children: ReactNode; onClose?: () => void; wide?: boolean; testId?: string }) {
  return (
    <div className="absolute inset-0 z-50 flex items-center justify-center bg-black/70 fade-in" onMouseDown={(e) => e.target === e.currentTarget && onClose?.()} data-testid={testId}>
      <div className={`panel panel-gold p-5 ${wide ? 'max-w-4xl' : 'max-w-lg'} w-[calc(100%-2rem)] max-h-[90vh] overflow-y-auto scroll-thin`}>{children}</div>
    </div>
  );
}

export function Toasts() {
  const toasts = useGame((s) => s.toasts);
  const inCombat = useGame((s) => !!s.combat);
  const touch = useIsTouch();
  // En táctil, abajo a la derecha están los botones de poción y «Usar»: los avisos van arriba, bajo Inventario/Menú.
  const place = inCombat ? 'top-4' : touch ? 'top-16' : 'bottom-4';
  const color = { loot: 'border-gold text-gold', info: 'border-stone-500', danger: 'border-blood text-[#ff8a7a]', social: 'border-heal text-heal', good: 'border-heal' };
  return (
    <div className={`absolute right-4 ${place} z-[60] flex flex-col gap-2 w-80 max-w-[45vw] pointer-events-none`} aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`panel px-3 py-2 text-sm fade-in border-l-4 ${color[t.kind]} flex items-center gap-2`}>
          {t.icon && <img src={iconUrl(t.icon, 2)} width={24} height={24} className="pixelated" alt="" />}
          <span className="font-body text-base leading-tight">{t.text}</span>
        </div>
      ))}
    </div>
  );
}

/** Panel con las acciones disponibles para el objeto seleccionado. */
export function ItemActions({ loc, mode, onClear, lootId, buttonsOnly = false }: { loc: Loc | null; mode: InvMode; onClear: () => void; lootId?: string; buttonsOnly?: boolean }) {
  const s = useGame((x) => x);
  const touch = useIsTouch();
  const [picker, setPicker] = useState<'withdraw' | 'split' | null>(null);
  useHotkey('r', () => { if (loc && loc.kind === 'grid') actions.rotate(loc); }, !!loc && loc.kind === 'grid' && loc.container !== 'loot' && loc.container !== 'pocket');
  if (!loc) return <div className="text-stone-400 text-sm italic font-body">{touch ? 'Toca un objeto para ver sus acciones.' : 'Selecciona un objeto para ver sus acciones. Doble clic: acción rápida · Clic derecho: mover · Arrastra para colocar.'}</div>;
  const c = containersFor(s, lootId);
  const st = c ? stackAt(c, loc) : null;
  if (!st) return <div className="text-stone-400 text-sm italic font-body">Selecciona un objeto.</div>;
  const def = getItem(st.itemId);
  const inGrid = loc.kind === 'grid';
  const btns: ReactNode[] = [];
  const b = (label: string, fn: () => void, cls = '', testId?: string) => (
    <button key={label} className={`btn text-sm ${cls}`} onClick={fn} data-testid={testId}>{label}</button>
  );
  if (def.slot && inGrid && loc.container !== 'loot') btns.push(b('Equipar', () => { actions.quickEquip(loc); onClear(); }, 'btn-gold', 'act-equip'));
  if (loc.kind === 'equip') btns.push(b('Quitar', () => { actions.unequip(loc); onClear(); }, '', 'act-unequip'));
  // Fase 6: girar 90° (mochila y almacén; en su sitio; si no cabe, no cambia nada). Con teclado: R
  if (inGrid && loc.container !== 'loot' && loc.container !== 'pocket' && canRotate(st.itemId)) btns.push(b('Girar ⟳', () => actions.rotate(loc), '', 'act-rotate'));
  if (def.use && mode === 'dungeon' && inGrid && loc.container === 'backpack') btns.push(b('Usar', () => actions.useItem(loc), 'btn-gold', 'act-use'));
  if (mode === 'lobby' && inGrid && loc.container === 'backpack') btns.push(b('Al almacén', () => { actions.quickMove(loc, 'stash'); onClear(); }, '', 'act-stash'));
  if (mode === 'lobby' && inGrid && (loc.container === 'stash' || loc.container === 'shared')) btns.push(b('A la mochila', () => { actions.quickMove(loc, 'backpack'); onClear(); }, '', 'act-backpack'));
  if (mode === 'lobby' && inGrid && BAG_SIZES[st.itemId] && loc.container !== 'loot' && loc.container !== 'pocket') btns.push(b('Equipar mochila', () => { actions.equipBag(loc); onClear(); }, 'btn-gold', 'act-equip-bag'));
  // Oro físico: sacar monedas de un saco y dividir un montón
  if (inGrid && loc.container !== 'loot' && capacityOf(st) > 0 && (st.gold ?? 0) > 0 && mode !== 'merchant') btns.push(b('Sacar monedas', () => setPicker('withdraw'), 'btn-gold', 'act-withdraw'));
  if (inGrid && loc.container !== 'loot' && isCoins(st) && st.qty > 1 && mode !== 'merchant') btns.push(b('Dividir', () => setPicker('split'), '', 'act-split'));
  if (inGrid && loc.container !== 'loot' && !isCoins(st) && st.qty > 1 && mode !== 'merchant') btns.push(b('Dividir', () => actions.splitStack(loc), '', 'act-split-stack'));
  const unsellable = isCoins(st) || (st.gold ?? 0) > 0;
  if (mode === 'merchant' && inGrid && unsellable && (loc.container === 'backpack' || loc.container === 'stash')) btns.push(<span key="nosell" className="text-xs text-stone-400 self-center">{isCoins(st) ? 'Las monedas ya son oro.' : 'Vacía el saco para venderlo.'}</span>);
  if (mode === 'merchant' && inGrid && !unsellable && (loc.container === 'backpack' || loc.container === 'stash')) {
    const vend = s.activeVendor ?? 'nira';
    if (!buysThis(vend, def.id)) btns.push(<span key="nobuy" className="text-xs text-stone-400 self-center">Grizk solo compra joyas y tesoros.</span>);
    else btns.push(b(`Vender (${vendorSellPrice(vend, def.id, st)})`, () => { actions.sell(loc.container as 'backpack' | 'stash', loc.index); if (st.qty <= 1) onClear(); }, 'btn-gold', 'act-sell'));
    if (st.qty > 1 && buysThis(vend, def.id)) btns.push(b(`Vender todo (${vendorSellPrice(vend, def.id, st) * st.qty})`, () => { actions.sell(loc.container as 'backpack' | 'stash', loc.index, true); onClear(); }));
  }
  if ((mode === 'lobby' || mode === 'dungeon') && inGrid && loc.container === 'backpack' && canPocket(st.itemId)) btns.push(b('Al bolsillo seguro', () => { actions.quickMove(loc, 'pocket'); onClear(); }, '', 'act-pocket'));
  if (inGrid && loc.container === 'pocket') btns.push(b('A la mochila', () => { actions.quickMove(loc, 'backpack'); onClear(); }, '', 'act-unpocket'));
  if (mode === 'dungeon' && inGrid && loc.container === 'backpack') btns.push(b('Soltar', () => { actions.dropItem(loc); onClear(); }, 'btn-danger', 'act-drop'));
  const pickerModal = picker && inGrid && (picker === 'withdraw'
    ? <GoldAmountPicker title="Sacar monedas" max={st.gold ?? 0} initial={Math.min(st.gold ?? 0, 10)} onClose={() => setPicker(null)}
        from={<><ItemIcon itemId={st.itemId} size={36} /><span className="font-body text-lg">{def.name} · <b className="text-gold">{st.gold ?? 0}</b>/{capacityOf(st)}</span></>}
        confirm={(n) => `Sacar ${n}`} note="Las monedas que saques irán a una casilla libre de este mismo sitio (de 10 en 10)."
        onConfirm={(n) => actions.withdrawGold(loc, n)} />
    : <GoldAmountPicker title="Dividir montón" max={st.qty - 1} initial={Math.floor(st.qty / 2)} onClose={() => setPicker(null)}
        from={<span className="font-body text-lg">Monedas de oro · <b className="text-gold">{st.qty}</b></span>}
        confirm={(n) => `Separar ${n}`} note="Las que separes irán a la casilla libre más cercana."
        onConfirm={(n) => actions.splitGold(loc, n)} />);
  if (buttonsOnly) return <div className="flex gap-2 flex-wrap" data-testid="item-actions">{btns}{pickerModal}</div>;
  return (
    <div className="flex items-center gap-3 flex-wrap">
      <ItemIcon itemId={st.itemId} size={32} />
      <span style={{ color: RARITY_INFO[def.rarity].color }}>{def.name}</span>
      <div className="flex gap-2 flex-wrap">{btns}</div>
      {pickerModal}
    </div>
  );
}

export function formatTime(ms: number) {
  const s = Math.ceil(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}

export function useHotkey(key: string, fn: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled) return;
    const h = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key.toLowerCase() === key.toLowerCase()) {
        e.preventDefault();
        fn();
      }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  }, [key, fn, enabled]);
}

export { getState };

const SOURCE_LABEL = { class: 'De clase · siempre disponible', weapon: 'Del arma', offhand: 'Defensiva' } as const;

/** Habilidades disponibles con el equipo indicado, agrupadas: clase, arma y secundaria. */
export function LoadoutPanel({ classId, equipment, compact = false }: { classId: ClassId; equipment: Equipment; compact?: boolean }) {
  const equipped = useGame((s) => s.profile?.classSkills.equipped);
  const level = useGame((s) => s.profile?.character.level ?? 1);
  const maxMp = computeStats(classId, level, equipment).maxMp;
  const kit = combatLoadout(classId, equipment, equipped);
  const res = CLASSES[classId].resourceName.toLowerCase();
  const hasOff = kit.groups.some((g) => g.source === 'offhand');
  return (
    <div className="space-y-3" data-testid="loadout">
      {kit.groups.map((g) => (
        <div key={g.source}>
          <div className="text-xs text-stone-400 mb-1">{SOURCE_LABEL[g.source]} · <span className="text-stone-300">{g.label}</span></div>
          {g.source === 'weapon' && (
            <div className="flex gap-2 items-baseline"><span className="text-parchment">{kit.basicAttack.name}</span><span className="text-xs text-stone-400">ataque básico, sin coste</span></div>
          )}
          {g.skills.map((id) => {
            const sk = getSkill(id);
            return (
              <div key={id} className="mt-0.5">
                <span className={g.source === 'class' ? 'text-gold' : g.source === 'offhand' ? 'text-frost' : 'text-parchment'}>{sk.name}</span>
                <span className="text-xs text-stone-400"> · {sk.cost ? `${skillCost(sk.cost, maxMp, CLASSES[classId].resource)} ${res}` : 'sin coste'}</span>
                {!compact && <div className="font-body text-base text-stone-300 leading-snug">{sk.description}</div>}
              </div>
            );
          })}
        </div>
      ))}
      {!hasOff && <div className="text-xs text-stone-500 italic">Sin escudo ni tomo: no tienes habilidades defensivas.</div>}
    </div>
  );
}
