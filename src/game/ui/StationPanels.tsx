// Bloque 2: estaciones del Refugio (tarjeta con encargado, coste y beneficio), el menú de crafteo común de todas las
// estaciones con recetas (fase 3: sin minijuegos) y la vista de runas. Todo se decide tocando; objetivos de 44 px.
import { useMemo, useState } from 'react';
import { actions, useGame } from '../state/store';
import { MODULES, MODULE_ORDER, type ModuleId } from '../../core/data/refuge';
import { needsOf } from '../../core/needs';
import { canSleepForPrep, missingFor, nextCost, ownedQty, refugeOf, upgradeBlock } from '../../core/refuge';
import { Card, usePixelScale } from './kit';
import { useLayout } from '../../config/ui';
import { MonsterSprite } from './common';
import { stationArtUrl, STATION_ART_W, STATION_ART_H } from './stationArt';
import { MATERIAL_SOURCES } from '../../config/stations';
import { VENDORS, type VendorId } from '../../core/data/vendors';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { craftBlock, fineChance, maxCraftable, needs, recipeLock, stationLevel, stationRecipes, batchLimit, recipeFor } from '../../core/crafting';
import type { CraftRecipe, CraftStation } from '../../core/data/crafting';
import { RUNES } from '../../core/data/runes';
import { runeBlock, runeSlots, type RuneLoc } from '../../core/runes';
import { stackName, stackRarity } from '../../core/data/rarity';
import { isCover } from '../../core/inventory';
import { ItemIcon } from './inventory';
import { sfx } from '../audio';
import type { ItemStack } from '../../core/types';
import type { VendorView } from './VendorsTab';

const BTN = { minHeight: 44 } as const;
const OK = '#7fbf6a';
const BAD = '#d0605a';
export type GoTo = (vendor: VendorId, view: VendorView) => void;

/** Coste con lo que tienes en verde y lo que falta en rojo; debajo, dónde conseguir lo que falta. */
function CostLines({ id, onGo }: { id: ModuleId; onGo?: GoTo }) {
  const profile = useGame((s) => s.profile)!;
  const cost = nextCost(profile, id);
  if (!cost) return null;
  const miss = missingFor(profile, id);
  return (
    <div className="flex flex-col gap-1">
      <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
        {cost.items.map((m) => {
          const have = ownedQty(profile, m.itemId);
          return <span key={m.itemId} className="inline-flex items-center gap-1" style={{ color: have >= m.qty ? OK : BAD }}><ItemIcon itemId={m.itemId} size={18} />{getItem(m.itemId).name} {have}/{m.qty}</span>;
        })}
        {cost.gold > 0 && <span style={{ color: profile.gold >= cost.gold ? OK : BAD }}>{cost.gold} oro</span>}
      </div>
      {miss.map((m) => {
        const src = MATERIAL_SOURCES[m.itemId];
        if (!src) return null;
        return (
          <div key={m.itemId} className="flex items-center gap-2 text-[12px] text-stone-400 bg-black/30 border border-stone-800 px-2 py-1" data-testid={`source-${id}-${m.itemId}`}>
            <span className="flex-1 min-w-0"><b className="text-stone-300">{getItem(m.itemId).name}:</b> {src.text}</span>
            {src.go && onGo && <button className="btn text-xs shrink-0" style={BTN} onClick={() => { sfx('click'); onGo(src.go!.vendor, src.go!.view); }}>Ir</button>}
          </div>
        );
      })}
    </div>
  );
}

/** Tarjeta de una estación: bloqueada, abierta o al máximo, con su encargado y el botón para pedírsela. */
export function StationCard({ id, onGo, onEnter }: { id: ModuleId; onGo?: GoTo; onEnter?: (id: ModuleId) => void }) {
  const profile = useGame((s) => s.profile)!;
  const m = MODULES[id];
  const lvl = refugeOf(profile)[id];
  const next = m.levels[lvl + 1];
  const block = next ? upgradeBlock(profile, id) : null;
  const by = VENDORS[m.by];
  const locked = lvl < 1;
  const enter = onEnter && !locked && id !== 'cot';
  return (
    <div className={`panel p-3 flex flex-col gap-2 ${locked ? 'border-dashed' : ''}`} style={locked ? { background: 'repeating-linear-gradient(135deg,#121016 0 8px,#15131a 8px 16px)' } : undefined} data-testid={`module-${id}`}>
      <div className="flex items-center gap-2">
        <span className="text-xl" style={locked ? { filter: 'grayscale(1)', opacity: 0.6 } : undefined}>{m.icon}</span>
        <span className={`font-display tracking-[0.08em] ${locked ? 'text-stone-400' : 'text-parchment'}`}>{m.name}</span>
        <span className="ml-auto text-[12px] text-stone-400 whitespace-nowrap" data-testid={`module-level-${id}`}>{locked ? '🔒 Bloqueada' : `Nivel ${lvl}/3`}</span>
      </div>
      {!locked && <div className="flex gap-1">{[1, 2, 3].map((k) => <i key={k} className="block h-1.5 w-4" style={{ background: k <= lvl ? '#e8b33a' : '#3a3530' }} />)}</div>}
      <div className="text-sm text-stone-300">{locked ? m.purpose : <><span className="text-gold">{m.levels[lvl].name}.</span> {m.levels[lvl].effect}</>}</div>
      {locked && <div className="text-[12px] text-stone-400 italic">Mientras tanto: {m.fallback}</div>}
      <div className="text-[12px] text-stone-400">Encargado: <span style={{ color: by.color }}>{by.name}</span></div>
      {id === 'cot' && (
        <button className="btn" style={BTN} disabled={needsOf(profile.needs).rest >= 100 && !canSleepForPrep(profile)} onClick={() => { actions.sleepCot(); sfx('click'); }} data-testid="btn-cot">
          {canSleepForPrep(profile) ? 'Dormir · bajarás descansado' : `Dormir · Descanso ${Math.round(needsOf(profile.needs).rest)}`}
        </button>
      )}
      {enter && <button className="btn btn-gold" style={BTN} onClick={() => { sfx('click'); onEnter!(id); }} data-testid={`enter-${id}`}>Entrar</button>}
      {next ? (
        <div className="border-t border-stone-800 pt-2 mt-auto flex flex-col gap-2">
          <div className="text-sm"><span className="text-stone-400">{locked ? 'Desbloqueo' : `Nivel ${lvl + 1}`}: </span><span className="text-parchment">{next.name}.</span> <span className="text-stone-300">{next.effect}</span></div>
          <CostLines id={id} onGo={onGo} />
          <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.upgradeModule(id)} data-testid={`upgrade-${id}`}>
            Pedir a {by.name} que la {locked ? 'construya' : 'mejore'}
          </button>
          {block && <div className="text-xs text-[#d0905a]" data-testid={`upgrade-block-${id}`}>{block}</div>}
        </div>
      ) : <div className="text-xs text-gold mt-auto" data-testid={`upgrade-max-${id}`}>Nivel 3/3 · está al máximo.</div>}
    </div>
  );
}

/** Lo que hace el botón principal de una estación: pedirla, dormir o usarla. */
function useStationMain(id: ModuleId, onUse: (id: ModuleId) => void, onDetails: (id: ModuleId) => void) {
  const profile = useGame((s) => s.profile)!;
  const lvl = refugeOf(profile)[id];
  const by = VENDORS[MODULES[id].by];
  if (lvl < 1) {
    const block = upgradeBlock(profile, id);
    // Si ya se puede pedir, se pide; si no, el detalle dice qué falta
    return { label: `Pedir a ${by.name.replace(/^(Hermana|Maese) /, '')}`, gold: true, disabled: false, testId: `ask-${id}`,
      run: () => { sfx('click'); if (block) onDetails(id); else actions.upgradeModule(id); } };
  }
  if (id === 'cot') {
    const can = needsOf(profile.needs).rest < 100 || canSleepForPrep(profile);
    return { label: 'Usar · Dormir', gold: true, disabled: !can, testId: 'btn-cot', run: () => { actions.sleepCot(); sfx('click'); } };
  }
  return { label: 'Usar', gold: true, disabled: false, testId: `enter-${id}`, run: () => { sfx('click'); onUse(id); } };
}

/** Marcas de nivel (en el sitio de la reputación de los mercaderes). */
export function LevelMarks({ lvl, testId }: { lvl: number; testId?: string }) {
  return (
    <div className="flex gap-1 justify-center" aria-label={`Nivel ${lvl} de 3`} data-testid={testId}>
      {[1, 2, 3].map((k) => <i key={k} className="block h-2 flex-1 max-w-[30%] border border-black" style={{ background: k <= lvl ? 'linear-gradient(#f2c75a,#8a5d14)' : '#2a2830' }} />)}
    </div>
  );
}

/** Arte de la estación dentro del arco: oscurecida y con candado si está bloqueada; «▲ Mejora» o «!» si hay algo que hacer. */
export function StationArt({ id, scale }: { id: ModuleId; scale: number }) {
  const profile = useGame((s) => s.profile)!;
  const lvl = refugeOf(profile)[id];
  const ready = !upgradeBlock(profile, id);
  const locked = lvl < 1;
  return (
    <>
      <div className="pb-2 pt-4" style={locked ? { filter: 'grayscale(1) brightness(0.4)' } : undefined}>
        <img src={stationArtUrl(id)} className="pixelated" alt="" draggable={false} style={{ width: STATION_ART_W * scale, height: STATION_ART_H * scale }} />
      </div>
      {locked && <span className="absolute inset-0 grid place-items-center text-2xl" aria-hidden>🔒</span>}
      {!locked && ready && <span className="st-up" data-testid={`upgrade-ready-${id}`}>▲ Mejora</span>}
      {locked && ready && <span className="st-dot" aria-label="Ya puedes pedirla" data-testid={`ask-ready-${id}`}>!</span>}
    </>
  );
}

/** Tarjeta de estación con el formato de los mercaderes: nombre, arte, nivel, encargado, marcas, botón principal y «Detalles». */
export function StationTile({ id, onUse, onDetails, hideDetails = false }: { id: ModuleId; onUse: (id: ModuleId) => void; onDetails: (id: ModuleId) => void; hideDetails?: boolean }) {
  const profile = useGame((s) => s.profile)!;
  const scale = usePixelScale('vendor');
  const phone = useLayout() === 'phone';
  const m = MODULES[id];
  const lvl = refugeOf(profile)[id];
  const by = VENDORS[m.by];
  const main = useStationMain(id, onUse, onDetails);
  return (
    <Card title={m.name} testId={`module-${id}`} art={<StationArt id={id} scale={scale} />}>
      <div className={`text-center text-[11px] uppercase tracking-[0.12em] ${lvl < 1 ? 'text-stone-500' : 'text-gold'}`} data-testid={`module-level-${id}`}>
        {lvl < 1 ? 'Bloqueada' : lvl >= 3 ? 'Nivel 3/3 · máximo' : `Nivel ${lvl}/3`}
      </div>
      <div className="text-center text-[12px]" style={{ color: by.color }}>Encargado: {by.name}</div>
      {!phone && <div className="text-center text-[12px] text-stone-400 leading-snug">{m.purpose}</div>}
      <LevelMarks lvl={lvl} />
      <div className="mt-auto flex flex-col gap-1">
        <button className={`btn w-full font-display tracking-[0.12em] uppercase ${main.gold ? 'btn-gold' : ''}`} style={{ minHeight: 'max(44px, var(--btn-h))' }}
          disabled={main.disabled} onClick={main.run} data-testid={main.testId}>{main.label}</button>
        {!hideDetails && <button className="btn w-full text-xs" style={BTN} onClick={() => { sfx('click'); onDetails(id); }} data-testid={`details-${id}`}>Detalles</button>}
      </div>
    </Card>
  );
}

/** Rejilla del Refugio: las 7 estaciones, bloqueadas hasta que las pidas, en filas de 4 como los mercaderes. */
export function StationTiles({ onUse, onDetails }: { onUse: (id: ModuleId) => void; onDetails: (id: ModuleId) => void }) {
  const layout = useLayout();
  const cols = layout === 'tablet' && typeof window !== 'undefined' && window.innerWidth < 1000 ? 3 : 4;
  return (
    <div className="grid w-full" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0,1fr))`, gap: 'var(--gap)' }} data-testid="station-grid">
      {MODULE_ORDER.map((id) => <StationTile key={id} id={id} onUse={onUse} onDetails={onDetails} />)}
    </div>
  );
}

/** Detalle de una estación: todo lo que antes iba en la tarjeta, más los tres niveles y el retrato del encargado. */
export function StationDetail({ id, onUse, onGo, children }: { id: ModuleId; onUse: (id: ModuleId) => void; onGo?: GoTo; children?: React.ReactNode }) {
  const profile = useGame((s) => s.profile)!;
  const phone = useLayout() === 'phone';
  const m = MODULES[id];
  const lvl = refugeOf(profile)[id];
  const next = m.levels[lvl + 1];
  const block = next ? upgradeBlock(profile, id) : null;
  const by = VENDORS[m.by];
  const locked = lvl < 1;
  return (
    <div className="grid w-full" style={{ gridTemplateColumns: phone ? '170px minmax(0,1fr)' : '300px minmax(0,1fr)', gap: 'var(--gap)' }} data-testid={`station-detail-${id}`}>
      <StationTile id={id} onUse={onUse} onDetails={() => {}} hideDetails />
      <div className="panel p-3 flex flex-col gap-2 min-w-0">
        <div className="flex gap-3 items-center">
          <div className="ui-arch shrink-0" style={{ width: phone ? 60 : 96, height: phone ? 70 : 112 }}><div className="pb-1"><MonsterSprite sprite={by.sprite} scale={phone ? 2 : 3} /></div></div>
          <div className="min-w-0">
            <div className="font-display text-parchment">Encargado: <span style={{ color: by.color }}>{by.name}</span></div>
            <div className="text-[14px] text-stone-300 italic leading-snug">{m.purpose}</div>
            {locked && <div className="text-[12px] text-stone-400">Mientras no la tengas: {m.fallback}</div>}
          </div>
        </div>
        <div className="grid gap-2" style={{ gridTemplateColumns: phone ? '1fr' : 'repeat(3, minmax(0,1fr))' }}>
          {[1, 2, 3].map((k) => (
            <div key={k} className={`border p-2 bg-[#19171f] text-[13px] leading-snug ${k === lvl ? 'border-gold' : 'border-stone-700'}`} data-testid={`station-level-${id}-${k}`}>
              <b className="block font-display text-gold text-[12px]">Nivel {k} · {m.levels[k].name}{k <= lvl ? ' ✓' : ''}</b>
              <span className="text-stone-300">{m.levels[k].effect}</span>
            </div>
          ))}
        </div>
        {next ? (
          <div className="flex flex-col gap-2 border-t border-stone-800 pt-2">
            <div className="font-display text-gold text-[13px] tracking-[0.1em] uppercase">{locked ? 'Para construirla' : `Siguiente mejora · ${next.name}`}</div>
            <CostLines id={id} onGo={onGo} />
            <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.upgradeModule(id)} data-testid={`upgrade-${id}`}>
              Pedir a {by.name} que la {locked ? 'construya' : 'mejore'}
            </button>
            {block && <div className="text-xs text-[#d0905a]" data-testid={`upgrade-block-${id}`}>{block}</div>}
          </div>
        ) : <div className="text-xs text-gold" data-testid={`upgrade-max-${id}`}>Nivel 3/3 · está al máximo.</div>}
        {children}
      </div>
    </div>
  );
}

// ── Menú de crafteo común ───────────────────────────────────────────
const GROUPS: { id: string; name: string; test: (r: CraftRecipe) => boolean }[] = [
  { id: 'parts', name: 'Componentes', test: (r) => ['material'].includes(getItem(r.result).category) && !RUNES[r.result] },
  { id: 'runes', name: 'Runas', test: (r) => !!RUNES[r.result] },
  { id: 'weapons', name: 'Armas y equipo de mano', test: (r) => ['mainHand', 'offHand'].includes(getItem(r.result).slot ?? '') },
  { id: 'armor', name: 'Protección', test: (r) => ['helmet', 'armor', 'gloves', 'boots'].includes(getItem(r.result).slot ?? '') },
  { id: 'use', name: 'Consumibles', test: (r) => getItem(r.result).category === 'potion' },
  { id: 'other', name: 'Otros', test: () => true },
];
const groupOf = (r: CraftRecipe) => GROUPS.find((g) => g.test(r))!.id;

export function CraftPanel({ station, onBack }: { station: CraftStation; onBack?: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const all = useMemo(() => stationRecipes(station).sort((a, b) => a.level - b.level || getItem(a.result).value - getItem(b.result).value), [station]);
  const [onlyCan, setOnlyCan] = useState(false);
  const [sel, setSel] = useState<string>(all[0]?.id ?? '');
  const [qty, setQty] = useState(1);
  const [fine, setFine] = useState(false);
  const lvl = stationLevel(profile, station);
  const shown = all.filter((r) => !onlyCan || (!recipeLock(profile, r) && maxCraftable(profile, r) > 0));
  const r = all.find((x) => x.id === sel) ?? all[0];
  const lock = r ? recipeLock(profile, r) : null;
  const max = r ? maxCraftable(profile, r, fine) : 0;
  const n = Math.max(1, Math.min(batchLimit(profile, station), qty));
  const block = r ? (lock ?? craftBlock(profile, r.id, n, fine)) : 'Nada que hacer.';
  const def = r ? getItem(r.result) : null;
  const pick = (id: string) => { setSel(id); setQty(1); setFine(false); sfx('click'); };
  return (
    <div className="flex flex-col gap-2" data-testid={`craft-${station}`}>
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-parchment tracking-[0.08em]">{MODULES[station].name} · Nivel {lvl}/3</span>
        <span className="text-[12px] text-stone-400">Lotes de hasta {batchLimit(profile, station)}</span>
        <button className={`btn text-xs ml-auto ${onlyCan ? 'btn-gold' : ''}`} style={BTN} onClick={() => setOnlyCan(!onlyCan)} data-testid="craft-only-can">Solo las que puedo hacer</button>
        {onBack && <button className="btn text-xs" style={BTN} onClick={onBack} data-testid="craft-back">◂ Refugio</button>}
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(200px, 34%) minmax(0, 1fr)' }}>
        <div className="panel p-2 overflow-y-auto scroll-thin" style={{ maxHeight: 'min(62vh, 560px)' }}>
          {GROUPS.map((g) => {
            const rs = shown.filter((x) => groupOf(x) === g.id);
            if (!rs.length) return null;
            return (
              <div key={g.id}>
                <div className="font-display text-[12px] text-stone-400 mt-1 mb-1">{g.name}</div>
                <div className="flex flex-col gap-1">
                  {rs.map((x) => {
                    const it = getItem(x.result);
                    const lk = recipeLock(profile, x);
                    const can = !lk && maxCraftable(profile, x) > 0;
                    return (
                      <button key={x.id} className={`flex items-center gap-2 px-2 text-left border ${x.id === r?.id ? 'border-parchment bg-stone-800' : 'border-stone-800 bg-black/30'} ${lk ? 'opacity-55' : ''}`} style={BTN} onClick={() => pick(x.id)} data-testid={`recipe-${x.id}`}>
                        <ItemIcon itemId={x.result} size={22} />
                        <span className="truncate text-sm" style={{ color: RARITY_INFO[it.rarity].color }}>{it.name}</span>
                        {lk ? <span className="ml-auto text-[11px] text-stone-400 whitespace-nowrap">🔒 {lk.includes('plano') ? 'Plano' : `Nv ${x.level}`}</span>
                          : <span className="ml-auto w-2.5 h-2.5 rounded-full shrink-0" style={{ background: can ? OK : '#3a3530' }} />}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
          {!shown.length && <p className="text-sm text-stone-400 italic p-2">Nada que puedas hacer ahora mismo.</p>}
        </div>
        {r && def && (
          <div className="panel p-3 flex flex-col gap-2 min-w-0" data-testid="craft-detail">
            <div className="flex items-start gap-3">
              <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[def.rarity].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
              <div className="min-w-0">
                <div className="font-display text-parchment">{def.name}{r.qty > 1 ? ` ×${r.qty}` : ''}</div>
                <div className="text-[12px]" style={{ color: RARITY_INFO[def.rarity].color }}>{RARITY_INFO[def.rarity].name} · receta de nivel {r.level}</div>
                <div className="text-sm text-stone-300">{def.description}</div>
                {fineChance(profile, r, fine) > 0 && <div className="text-[12px] text-stone-400">Acabado fino: {Math.round(fineChance(profile, r, fine) * 100)} % de salir con una rareza más.</div>}
              </div>
            </div>
            <div className="font-display text-[13px] text-stone-300">Necesitas</div>
            <div className="flex flex-col gap-1">
              {needs(r, n, fine).map((m) => {
                const have = ownedQty(profile, m.itemId);
                const sub = recipeFor(m.itemId);
                const src = MATERIAL_SOURCES[m.itemId];
                return (
                  <div key={m.itemId} className="border bg-black/30 px-2 py-1 flex flex-col gap-1" style={{ borderColor: have >= m.qty ? '#3a3530' : BAD }}>
                    <div className="flex items-center gap-2 text-sm" style={BTN}>
                      <ItemIcon itemId={m.itemId} size={22} /><span className="truncate">{getItem(m.itemId).name}</span>
                      <span className="ml-auto font-semibold whitespace-nowrap" style={{ color: have >= m.qty ? OK : BAD }}>{have} / {m.qty}</span>
                    </div>
                    {have < m.qty && (sub || src) && (
                      <div className="flex items-center gap-2 text-[12px] text-stone-400">
                        <span className="flex-1">{sub ? `Se hace en ${MODULES[sub.station as ModuleId].name} (nivel ${sub.level}).` : src!.text}</span>
                        {sub && sub.station === station && <button className="btn text-xs shrink-0" style={BTN} onClick={() => pick(sub.id)}>Ir a su receta</button>}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
            {r.fine && <label className="flex items-center gap-2 text-sm" style={BTN}><input type="checkbox" className="w-5 h-5" checked={fine} onChange={(e) => setFine(e.target.checked)} data-testid="craft-fine" />Añadir {getItem(r.fine).name.toLowerCase()} (más acabado fino)</label>}
            <div className="flex flex-wrap items-center gap-2 border-t border-stone-800 pt-2 mt-auto">
              <div className="flex items-center border border-stone-700">
                <button className="btn w-11" style={BTN} onClick={() => setQty(Math.max(1, n - 1))} disabled={n <= 1} aria-label="Menos">−</button>
                <b className="w-11 text-center" data-testid="craft-qty">{n}</b>
                <button className="btn w-11" style={BTN} onClick={() => setQty(n + 1)} disabled={n >= batchLimit(profile, station)} aria-label="Más" data-testid="craft-more">+</button>
                <button className="btn text-xs" style={BTN} onClick={() => setQty(Math.max(1, max))} disabled={max < 1}>Máx.</button>
              </div>
              <button className="btn" style={BTN} disabled={!!block} onClick={() => actions.craft(r.id, n, fine, 'backpack')} data-testid="craft-to-backpack">A la mochila</button>
              <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.craft(r.id, n, fine, 'stash')} data-testid="craft-go">Craftear al almacén</button>
            </div>
            {block && <div className="text-xs text-[#d0905a]" data-testid="craft-block">{block}</div>}
          </div>
        )}
      </div>
    </div>
  );
}

// ── Runas ───────────────────────────────────────────────────────────
type Target = { loc: RuneLoc; st: ItemStack };

/** Elige un objeto (equipado, mochila o almacén), toca un hueco y toca la runa. */
export function RunePanel({ onBack }: { onBack: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const targets: Target[] = [
    ...Object.entries(profile.equipment).flatMap(([slot, st]) => (st && runeSlots(st) ? [{ loc: { kind: 'equip', slot } as RuneLoc, st }] : [])),
    ...(['backpack', 'stash'] as const).flatMap((container) => profile[container].flatMap((st, index) => (st && !isCover(st) && runeSlots(st) ? [{ loc: { kind: 'grid', container, index } as RuneLoc, st }] : []))),
  ];
  const [uid, setUid] = useState<string | null>(null);
  const [hole, setHole] = useState(0);
  const t = targets.find((x) => x.st.uid === uid) ?? null;
  const runeIds = Object.keys(RUNES);
  const where = (l: RuneLoc) => (l.kind === 'equip' ? 'Equipado' : l.container === 'backpack' ? 'Mochila' : 'Almacén');
  return (
    <div className="flex flex-col gap-2" data-testid="runes">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-display text-parchment tracking-[0.08em]">Grabar runas</span>
        <span className="text-[12px] text-stone-400 [@media(max-height:560px)]:hidden">Común y poco común: 1 hueco · rara y épica: 2 · legendaria: no se encanta. Una runa nueva sustituye a la del hueco.</span>
        <button className="btn text-xs ml-auto" style={BTN} onClick={onBack} data-testid="runes-back">◂ Refugio</button>
      </div>
      <div className="grid gap-2" style={{ gridTemplateColumns: 'minmax(200px, 38%) minmax(0, 1fr)' }}>
        <div className="panel p-2 overflow-y-auto scroll-thin flex flex-col gap-1" style={{ maxHeight: 'min(62vh, 560px)' }}>
          {targets.map(({ loc, st }) => {
            const def = getItem(st.itemId);
            return (
              <button key={st.uid} className={`flex items-center gap-2 px-2 text-left border ${st.uid === uid ? 'border-parchment bg-stone-800' : 'border-stone-800 bg-black/30'}`} style={BTN} onClick={() => { setUid(st.uid); setHole(0); sfx('click'); }} data-testid={`rune-target-${st.uid}`}>
                <ItemIcon itemId={st.itemId} size={22} />
                <span className="truncate text-sm" style={{ color: RARITY_INFO[stackRarity(st, def)].color }}>{stackName(st, def)}</span>
                <span className="ml-auto text-[11px] text-stone-400">{where(loc)} · {(st.runes ?? []).filter(Boolean).length}/{runeSlots(st)}</span>
              </button>
            );
          })}
          {!targets.length && <p className="text-sm text-stone-400 italic p-2">No tienes nada que admita runas.</p>}
        </div>
        <div className="panel p-3 flex flex-col gap-3 min-w-0">
          {!t ? <p className="text-sm text-stone-400 italic">Toca un objeto de la lista.</p> : <>
            <div className="flex items-center gap-2"><ItemIcon itemId={t.st.itemId} size={32} /><span className="font-display text-parchment">{stackName(t.st, getItem(t.st.itemId))}</span></div>
            <div className="flex gap-2" data-testid="rune-holes">
              {Array.from({ length: runeSlots(t.st) }, (_, i) => {
                const cur = t.st.runes?.[i];
                return (
                  <button key={i} className={`border flex items-center gap-2 px-3 ${hole === i ? 'border-gold' : 'border-stone-700'} bg-black/40`} style={{ minHeight: 52, minWidth: 120 }} onClick={() => { setHole(i); sfx('click'); }} data-testid={`rune-hole-${i}`}>
                    {cur ? <><ItemIcon itemId={cur} size={22} /><span className="text-sm">{getItem(cur).name}</span></> : <span className="text-sm text-stone-400">Hueco {i + 1} vacío</span>}
                  </button>
                );
              })}
            </div>
            <div className="font-display text-[13px] text-stone-300">Tus runas</div>
            <div className="grid gap-1 md:grid-cols-2">
              {runeIds.map((id) => {
                const have = ownedQty(profile, id);
                const why = runeBlock(profile, t.st, hole, id);
                return (
                  <button key={id} className="border border-stone-800 bg-black/30 px-2 flex items-center gap-2 text-left disabled:opacity-50" style={BTN} disabled={!!why} title={why ?? ''} onClick={() => actions.applyRune(t.loc, hole, id)} data-testid={`rune-apply-${id}`}>
                    <ItemIcon itemId={id} size={22} />
                    <span className="min-w-0 flex-1"><span className="block text-sm truncate">{getItem(id).name} ×{have}</span><span className="block text-[11px] text-stone-400 truncate">{why ?? getItem(id).description}</span></span>
                  </button>
                );
              })}
            </div>
          </>}
        </div>
      </div>
    </div>
  );
}
