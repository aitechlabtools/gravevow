// Fase 9: el Refugio (módulos, catre y platos), el desguace de Orik y la cocina de Garth (fogón por pasos y lotes).
// Todo se decide tocando: nada depende del hover ni de reflejos.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { MODULES, MODULE_ORDER, COOK_EVENTS, DISHES, HEAT_NAME, getDish, type Heat } from '../../core/data/refuge';
import { canSleepForPrep, knownDishes, ownedQty, prepText, refugeOf, scrapYield, upgradeBlock, cookBlock } from '../../core/refuge';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { durability, hasDurability, maxDurability, wearLevel } from '../../core/durability';
import { WEAR_COLOR } from '../../config/durability';
import { REFUGE_CFG } from '../../config/refuge';
import { VENDORS } from '../../core/data/vendors';
import { needsOf } from '../../core/needs';
import { isCover } from '../../core/inventory';
import { ItemIcon } from './inventory';
import { ReceptionSection } from './WorkshopPanels';
import { sfx } from '../audio';
import type { ItemStack } from '../../core/types';

const BTN = { minHeight: 44 } as const;

function Cost({ items, gold }: { items: { itemId: string; qty: number }[]; gold: number }) {
  const profile = useGame((s) => s.profile)!;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {items.map((m) => {
        const have = ownedQty(profile, m.itemId);
        return <span key={m.itemId} className="inline-flex items-center gap-1" style={{ color: have >= m.qty ? '#c9c2ae' : '#d0605a' }}><ItemIcon itemId={m.itemId} size={18} />{getItem(m.itemId).name} {have}/{m.qty}</span>;
      })}
      {gold > 0 && <span style={{ color: profile.gold >= gold ? '#e8b33a' : '#d0605a' }}>{gold} oro</span>}
    </div>
  );
}

/** El Refugio: módulos, catre y lo que te prepara para la siguiente bajada. */
export function RefugePanel({ onBack }: { onBack: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const ref = refugeOf(profile);
  const needs = needsOf(profile.needs);
  const prep = prepText(profile.prep);
  const dishes = [...profile.backpack, ...profile.stash].filter((x): x is ItemStack => !!x && !isCover(x) && !!getItem(x.itemId).use && (getItem(x.itemId).use as { dish?: boolean }).dish === true);
  const dishIds = [...new Set(dishes.map((d) => d.itemId))];
  const eat = (itemId: string) => {
    for (const container of ['backpack', 'stash'] as const) {
      const index = profile[container].findIndex((x) => x?.itemId === itemId);
      if (index >= 0) { actions.eat({ kind: 'grid', container, index }); return; }
    }
  };
  const sleepPrep = canSleepForPrep(profile);
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-refuge">
      <div className="w-full max-w-[1200px] mx-auto flex flex-wrap items-center justify-between gap-2 mb-2">
        <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em] !m-0">El Refugio</h2>
        <button className="btn font-display tracking-[0.1em] uppercase" style={BTN} onClick={onBack} data-testid="refuge-back">◂ Bastión</button>
      </div>
      <ReceptionSection />
      <div className="w-full max-w-[1200px] mx-auto grid gap-2 md:grid-cols-3 mt-2">
        {MODULE_ORDER.map((id) => {
          const m = MODULES[id];
          const lvl = ref[id];
          const cur = m.levels[lvl];
          const next = m.levels[lvl + 1];
          const block = next ? upgradeBlock(profile, id) : null;
          return (
            <div key={id} className="panel p-3 flex flex-col gap-2" data-testid={`module-${id}`}>
              <div className="flex items-baseline justify-between gap-2">
                <span className="font-display text-parchment tracking-[0.08em]">{m.name}</span>
                <span className="text-[11px] text-stone-400">Nivel {lvl}/{m.levels.length - 1}</span>
              </div>
              <div className="text-sm"><span className="text-gold">{cur.name}.</span> <span className="text-stone-300">{cur.effect}</span></div>
              {id === 'cot' && (
                <button className="btn" style={BTN} disabled={needs.rest >= 100 && !sleepPrep} onClick={() => { actions.sleepCot(); sfx('click'); }} data-testid="btn-cot">
                  {sleepPrep ? 'Dormir · bajarás descansado' : `Dormir · Descanso ${Math.round(needs.rest)}`}
                </button>
              )}
              {next ? (
                <div className="border-t border-stone-800 pt-2 mt-auto flex flex-col gap-2">
                  <div className="text-sm"><span className="text-stone-400">Siguiente: </span><span className="text-parchment">{next.name}.</span> <span className="text-stone-300">{next.effect}</span></div>
                  <Cost items={next.cost!.items} gold={next.cost!.gold} />
                  <div className="text-[11px] text-stone-400">Lo construye {VENDORS[next.cost!.by].name}.</div>
                  <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.upgradeModule(id)} data-testid={`upgrade-${id}`}>Mejorar</button>
                  {block && <div className="text-xs text-[#d0905a]" data-testid={`upgrade-block-${id}`}>{block}</div>}
                </div>
              ) : <div className="text-xs text-stone-400 italic mt-auto">No se puede mejorar más por ahora.</div>}
            </div>
          );
        })}
      </div>
      <div className="w-full max-w-[1200px] mx-auto panel p-3 mt-2 flex flex-wrap items-center gap-3" data-testid="refuge-prep">
        <span className="font-display text-parchment tracking-[0.08em]">Preparación</span>
        <span className="text-sm text-stone-300 flex-1 min-w-[180px]" data-testid="prep-text">{prep.length ? prep.join(' · ') : 'Nada. Duerme en un jergón o come un plato de tu cocina antes de bajar.'}</span>
        {dishIds.map((id) => (
          <button key={id} className="btn inline-flex items-center gap-2" style={BTN} onClick={() => eat(id)} data-testid={`eat-${id}`}><ItemIcon itemId={id} size={20} />Comer {getItem(id).name.toLowerCase()}</button>
        ))}
      </div>
      <p className="w-full max-w-[1200px] mx-auto font-body text-sm text-stone-400 italic mt-2">La preparación dura una incursión y se gasta al bajar. Un plato nuevo sustituye al anterior; los recortes tienen un tope del 30 %.</p>
    </div>
  );
}

/** Desguace en el taller de Orik: lo que se puede despiezar de la mochila y el almacén, con lo que rinde. */
export function ScrapPanel() {
  const profile = useGame((s) => s.profile)!;
  const bench = refugeOf(profile).bench;
  const [confirm, setConfirm] = useState<string | null>(null);
  const rows = (['backpack', 'stash'] as const).flatMap((container) => profile[container].map((st, index) => {
    if (!st || isCover(st)) return null;
    const y = scrapYield(st, bench);
    return y ? { container, index, st, y } : null;
  })).filter((x): x is NonNullable<typeof x> => !!x);
  return (
    <div className="space-y-3" data-testid="scrap">
      <p className="font-body text-base text-stone-300 max-w-2xl">
        «Dámelo y te devuelvo lo que vale de verdad.» Lo desguazado se pierde para siempre; a cambio, sus materiales levantan tu Refugio. Lo roto rinde menos.
        {bench >= 1 ? ' Tu banco de trabajo añade un 25 %.' : ''}
      </p>
      {rows.length === 0 ? <p className="font-body italic text-stone-400">No llevas nada que Orik pueda despiezar. Lo que tienes puesto no se toca.</p> : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {rows.map(({ container, index, st, y }) => {
            const def = getItem(st.itemId);
            const rar = stackRarity(st, def);
            const key = `${container}-${index}`;
            const valuable = ['rare', 'epic', 'legendary'].includes(rar);
            const lvl = hasDurability(def) ? wearLevel(st) : null;
            return (
              <div key={key} className="bg-black/30 border border-stone-800 p-2 flex items-center gap-2" data-testid={`scrap-${key}`}>
                <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[rar].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: RARITY_INFO[rar].color }}>{def.name}{st.qty > 1 ? ` ×${st.qty}` : ''}</div>
                  <div className="text-xs truncate">
                    <span className="text-stone-400">{container === 'backpack' ? 'Mochila' : 'Almacén'}</span>
                    {lvl && <span style={{ color: WEAR_COLOR[lvl] }}> · {lvl === 'broken' ? 'Roto' : `${durability(st)}/${maxDurability(st)}`}</span>}
                  </div>
                  <div className="text-xs inline-flex items-center gap-1 text-parchment">→ <ItemIcon itemId={y.itemId} size={16} />{getItem(y.itemId).name} ×{y.qty}</div>
                </div>
                <button className={`btn py-1 px-3 shrink-0 ${confirm === key ? 'btn-gold' : ''}`} style={BTN} data-testid={`scrap-btn-${key}`}
                  onClick={() => { if (valuable && confirm !== key) { setConfirm(key); sfx('click'); return; } setConfirm(null); actions.scrap(container, index); }}>
                  {confirm === key ? '¿Seguro?' : 'Desguazar'}
                </button>
              </div>
            );
          })}
        </div>
      )}
      <p className="font-body text-sm text-stone-400 italic">Nunca sacarás más de lo que cuesta comprarlo: aquí no se hace oro de la nada.</p>
    </div>
  );
}

/** Cocina de Garth: recetas que tu fogón permite, el fogón paso a paso y la producción por lotes. */
export function CookPanel() {
  const profile = useGame((s) => s.profile)!;
  const job = profile.cooking;
  const kitchen = refugeOf(profile).kitchen;
  const [qty, setQty] = useState<Record<string, number>>({});
  if (job) {
    const d = getDish(job.recipe);
    const step = job.picks.length;
    const ev = COOK_EVENTS[job.events[step]];
    return (
      <div className="space-y-3" data-testid="cook-stove">
        <div className="flex items-center gap-2"><ItemIcon itemId={d.result} size={28} /><span className="font-display text-parchment">{d.name}</span><span className="text-xs text-stone-400">Paso {step + 1} de {d.steps}</span></div>
        <p className="font-body text-lg text-parchment" data-testid="cook-event">{ev.text}</p>
        <p className="text-xs text-stone-400">Elige el fuego. Si aciertas todos los pasos, el plato sale esmerado y te sobra un ingrediente; si no, sale normal. Nunca se pierde el plato.</p>
        <div className="grid grid-cols-3 gap-2 max-w-xl">
          {(['low', 'mid', 'high'] as Heat[]).map((h) => (
            <button key={h} className="btn font-display" style={{ minHeight: 52 }} onClick={() => actions.cookStep(h)} data-testid={`heat-${h}`}>{HEAT_NAME[h]}</button>
          ))}
        </div>
        <p className="text-xs text-stone-500 italic">Los ingredientes ya están en la olla: si te vas, el guiso te espera.</p>
      </div>
    );
  }
  if (kitchen < 1) {
    return (
      <div className="space-y-2" data-testid="cook-locked">
        <p className="font-body text-base text-stone-300">«Sin fogón propio no hay receta que valga. Monta uno en tu Refugio y te enseño lo que sé.»</p>
        <p className="text-sm text-stone-400">Refugio → Cocina → {MODULES.kitchen.levels[1].name}.</p>
      </div>
    );
  }
  const known = knownDishes(profile);
  return (
    <div className="space-y-3" data-testid="cook">
      <p className="font-body text-base text-stone-300 max-w-2xl">Un plato caliente antes de bajar te hace gastar menos en la siguiente incursión. La primera vez se cocina al fogón; después, por lotes.</p>
      <div className="grid md:grid-cols-2 gap-2">
        {DISHES.map((d) => {
          const knows = known.includes(d);
          const done = (profile.cooked ?? []).includes(d.id);
          const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, qty[d.id] ?? 1));
          const block = knows ? cookBlock(profile, d.id) : null;
          const blockN = knows ? cookBlock(profile, d.id, n) : null;
          return (
            <div key={d.id} className={`panel p-3 flex flex-col gap-2 ${knows ? '' : 'opacity-60'}`} data-testid={`dish-${d.id}`}>
              <div className="flex items-center gap-2"><ItemIcon itemId={d.result} size={28} /><span className="font-display text-parchment">{d.name}</span></div>
              <div className="text-sm text-stone-300">{getItem(d.result).description}</div>
              <Cost items={d.ingredients} gold={0} />
              {!knows ? <div className="text-xs text-stone-400">Necesitas en tu Refugio: {MODULES.kitchen.levels[d.kitchen].name}.</div> : <>
                <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.startCooking(d.id)} data-testid={`cook-start-${d.id}`}>Al fogón</button>
                {done ? (
                  <div className="flex items-center gap-2">
                    <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [d.id]: n - 1 })} disabled={n <= 1} aria-label="Menos">−</button>
                    <span className="w-6 text-center text-parchment" data-testid={`batch-qty-${d.id}`}>{n}</span>
                    <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [d.id]: n + 1 })} disabled={n >= REFUGE_CFG.maxBatch} aria-label="Más">+</button>
                    <button className="btn flex-1" style={BTN} disabled={!!blockN} onClick={() => actions.cookBatch(d.id, n)} data-testid={`cook-batch-${d.id}`}>Cocinar {n}</button>
                  </div>
                ) : <div className="text-xs text-stone-400">Cocínala una vez al fogón para poder hacerla por lotes.</div>}
                {block && <div className="text-xs text-[#d0905a]">{block}</div>}
              </>}
            </div>
          );
        })}
      </div>
    </div>
  );
}
