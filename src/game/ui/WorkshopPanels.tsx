// Fase 9 (segunda tanda): yunque de Brand y mesa de Eldrin (paso a paso, leyendo una lectura y una franja), rincón de
// cura de Vesper (por lotes) y la recepción de excedentes del Refugio. Todo se decide tocando: sin hover ni reflejos.
import { useState } from 'react';
import { actions, useGame } from '../state/store';
import { STATIONS, ALCHEMY, CARE, type Move } from '../../core/data/workshop';
import { MODULES } from '../../core/data/refuge';
import { alchemyBlock, careBlock, jobBand, jobResult, jobSteps, knownAlchemy } from '../../core/workshop';
import { ownedQty, refugeOf, scrapYield } from '../../core/refuge';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { sellPrice } from '../../core/economy';
import { vendorUnlocked } from '../../core/vendors';
import { REFUGE_CFG } from '../../config/refuge';
import { ItemIcon } from './inventory';

const BTN = { minHeight: 44 } as const;

export function Needs({ items, gold = 0, mult = 1 }: { items: { itemId: string; qty: number }[]; gold?: number; mult?: number }) {
  const profile = useGame((s) => s.profile)!;
  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs">
      {items.map((m) => {
        const have = ownedQty(profile, m.itemId);
        const need = m.qty * mult;
        return <span key={m.itemId} className="inline-flex items-center gap-1" style={{ color: have >= need ? '#c9c2ae' : '#d0605a' }}><ItemIcon itemId={m.itemId} size={18} />{getItem(m.itemId).name} {have}/{need}</span>;
      })}
      {gold > 0 && <span style={{ color: profile.gold >= gold * mult ? '#e8b33a' : '#d0605a' }}>{gold * mult} oro</span>}
    </div>
  );
}

/** El trabajo a medias en el yunque o en la mesa: la lectura del paso, la franja y las tres decisiones. */
export function BandStep() {
  const profile = useGame((s) => s.profile)!;
  const job = profile.workshop!;
  const st = STATIONS[job.station];
  const band = jobBand(job);
  const steps = jobSteps(job);
  const step = job.picks.length;
  const reading = job.readings[step];
  const res = getItem(jobResult(job));
  const lo = band[0] - st.spread - st.round, hi = band[1] + st.spread + st.round;
  const pct = (v: number) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100))}%`;
  return (
    <div className="space-y-3" data-testid="workshop-job">
      <div className="flex items-center gap-2"><ItemIcon itemId={res.id} size={28} /><span className="font-display text-parchment">{res.name}</span><span className="text-xs text-stone-400">Paso {step + 1} de {steps}</span></div>
      <p className="font-body text-lg text-parchment" data-testid="workshop-reading">{st.reading} {reading}{st.unit}. <span className="text-stone-400">La franja buena: {band[0]}–{band[1]}{st.unit}.</span></p>
      <div className="relative h-5 bg-black/40 border border-stone-700 max-w-xl" aria-hidden>
        <div className="absolute inset-y-0" style={{ left: pct(band[0]), width: `calc(${pct(band[1])} - ${pct(band[0])})`, background: '#e8b33a55' }} />
        <div className="absolute inset-y-[-3px] w-[3px]" style={{ left: pct(reading), background: '#ff8a3a' }} />
      </div>
      <p className="text-xs text-stone-400">Por debajo de la franja: {st.moves.up.toLowerCase()}. Dentro: {st.moves.hold.toLowerCase()}. Por encima: {st.moves.down.toLowerCase()}. {job.station === 'forge' ? 'Todo bien: magistral; un fallo: buena; más: tosca. La pieza sale siempre.' : 'Todo bien: la mezcla sale limpia y te sobra un reactivo. Si no, sale normal; nunca se pierde.'}</p>
      <div className="grid grid-cols-3 gap-2 max-w-xl">
        {(['up', 'hold', 'down'] as Move[]).map((m) => (
          <button key={m} className="btn font-display" style={{ minHeight: 52 }} onClick={() => actions.workshopStep(m)} data-testid={`move-${m}`}>{st.moves[m]}</button>
        ))}
      </div>
      <p className="text-xs text-stone-500 italic">Los materiales ya están gastados: si te vas, el trabajo te espera tal cual.</p>
    </div>
  );
}

function Busy({ other }: { other: string }) {
  return <p className="font-body text-stone-300" data-testid="workshop-busy">Tienes un trabajo a medias en {other}. Termínalo allí primero.</p>;
}

/** Mesa de alquimia de Eldrin: recetas que tu mesa permite, la mezcla paso a paso y los lotes. */
export function AlchemyPanel() {
  const profile = useGame((s) => s.profile)!;
  const [qty, setQty] = useState<Record<string, number>>({});
  const job = profile.workshop;
  if (job?.station === 'alchemy') return <BandStep />;
  if (job) return <Busy other="el yunque de Brand" />;
  if (refugeOf(profile).alchemy < 1) {
    return (
      <div className="space-y-2" data-testid="alchemy-locked">
        <p className="font-body text-base text-stone-300">«Sin una mesa propia me romperías las redomas. Monta una en tu Refugio y te enseño a destilar.»</p>
        <p className="text-sm text-stone-400">Refugio → Mesa de alquimia → {MODULES.alchemy.levels[1].name}.</p>
      </div>
    );
  }
  const known = knownAlchemy(profile);
  return (
    <div className="space-y-3" data-testid="alchemy">
      <p className="font-body text-base text-stone-300 max-w-2xl">Esquirlas arcanas, setas y agua: pociones para el fondo. La primera vez se prepara en la mesa, midiendo; después, por lotes.</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
        {ALCHEMY.map((r) => {
          const knows = known.includes(r);
          const done = (profile.crafted ?? []).includes(r.id);
          const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, qty[r.id] ?? 1));
          const block = knows ? alchemyBlock(profile, r.id) : null;
          const blockN = knows ? alchemyBlock(profile, r.id, n) : null;
          return (
            <div key={r.id} className="panel p-3 flex flex-col gap-2" data-testid={`alchemy-${r.id}`}>
              <div className="flex items-center gap-2"><ItemIcon itemId={r.result} size={28} /><span className="font-display text-parchment">{r.name}</span></div>
              <div className="text-sm text-stone-300">{getItem(r.result).description}</div>
              <Needs items={r.ingredients} />
              <button className="btn btn-gold" style={BTN} disabled={!!block} onClick={() => actions.startAlchemy(r.id)} data-testid={`alchemy-start-${r.id}`}>A la mesa</button>
              {done ? (
                <div className="flex items-center gap-2">
                  <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [r.id]: n - 1 })} disabled={n <= 1} aria-label="Menos">−</button>
                  <span className="w-6 text-center text-parchment">{n}</span>
                  <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [r.id]: n + 1 })} disabled={n >= REFUGE_CFG.maxBatch} aria-label="Más">+</button>
                  <button className="btn flex-1" style={BTN} disabled={!!blockN} onClick={() => actions.alchemyBatch(r.id, n)} data-testid={`alchemy-batch-${r.id}`}>Destilar {n}</button>
                </div>
              ) : <div className="text-xs text-stone-400">Prepárala una vez en la mesa para poder hacerla por lotes.</div>}
              {block && <div className="text-xs text-[#d0905a]">{block}</div>}
            </div>
          );
        })}
      </div>
      <p className="font-body text-sm text-stone-400 italic">Una poción hecha aquí vale menos que lo que cuesta comprar sus reactivos: sirve para bajar, no para hacer oro.</p>
    </div>
  );
}

/** Rincón de cura: Vesper te enseña a preparar vendas, torniquetes y férulas con lo que desguazas. */
export function CarePanel() {
  const profile = useGame((s) => s.profile)!;
  const [qty, setQty] = useState<Record<string, number>>({});
  if (refugeOf(profile).infirmary < 1) {
    return (
      <div className="space-y-2" data-testid="care-locked">
        <p className="font-body text-base text-stone-300">«Haz sitio en tu Refugio para un rincón limpio y te enseño a no depender de mí para una venda.»</p>
        <p className="text-sm text-stone-400">Refugio → Rincón de cura → {MODULES.infirmary.levels[1].name}.</p>
      </div>
    );
  }
  return (
    <div className="space-y-3" data-testid="care">
      <p className="font-body text-base text-stone-300 max-w-2xl">Retales hervidos y chatarra enderezada. Sin prisas ni pruebas: lo preparas y listo.</p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
        {CARE.map((r) => {
          const n = Math.max(1, Math.min(REFUGE_CFG.maxBatch, qty[r.id] ?? 1));
          const block = careBlock(profile, r.id, n);
          return (
            <div key={r.id} className="panel p-3 flex flex-col gap-2" data-testid={`care-${r.id}`}>
              <div className="flex items-center gap-2"><ItemIcon itemId={r.result} size={28} /><span className="font-display text-parchment">{getItem(r.result).name}{r.qty > 1 ? ` ×${r.qty}` : ''}</span></div>
              <Needs items={r.ingredients} gold={r.gold} mult={n} />
              <div className="flex items-center gap-2">
                <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [r.id]: n - 1 })} disabled={n <= 1} aria-label="Menos">−</button>
                <span className="w-6 text-center text-parchment">{n}</span>
                <button className="btn w-11" style={BTN} onClick={() => setQty({ ...qty, [r.id]: n + 1 })} disabled={n >= REFUGE_CFG.maxBatch} aria-label="Más">+</button>
                <button className="btn btn-gold flex-1" style={BTN} disabled={!!block} onClick={() => actions.prepareCare(r.id, n)} data-testid={`care-make-${r.id}`}>Preparar</button>
              </div>
              {block && <div className="text-xs text-[#d0905a]">{block}</div>}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/** Recepción de excedentes: lo que no cupo. Se retira, se vende, se desguaza o se descarta; mientras haya algo, no se baja. */
export function ReceptionSection() {
  const profile = useGame((s) => s.profile)!;
  const list = profile.reception ?? [];
  const [confirm, setConfirm] = useState<number | null>(null);
  const orik = vendorUnlocked(profile, 'orik');
  if (!list.length) return null;
  return (
    <div className="w-full max-w-[1200px] mx-auto panel p-3 mt-2 flex flex-col gap-2" data-testid="reception" style={{ borderColor: '#d0905a' }}>
      <div className="flex flex-wrap items-baseline gap-2">
        <span className="font-display text-parchment tracking-[0.08em]">Recepción</span>
        <span className="text-sm text-[#d0905a]">No cupo en la mochila ni en el almacén. No puedes bajar hasta vaciarla; nada se pierde solo.</span>
      </div>
      <div className="grid xl:grid-cols-2 gap-2">
        {list.map((st, i) => {
          const def = getItem(st.itemId);
          const rar = stackRarity(st, def);
          const y = orik ? scrapYield(st, refugeOf(profile).bench) : null;
          return (
            <div key={st.uid} className="bg-black/30 border border-stone-800 p-2 flex flex-wrap items-center gap-2" data-testid={`reception-${i}`}>
              <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[rar].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
              <div className="min-w-0 flex-1 truncate" style={{ color: RARITY_INFO[rar].color }}>{def.name}{st.qty > 1 ? ` ×${st.qty}` : ''}</div>
              <div className="flex flex-wrap gap-1">
                <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('withdraw', i)} data-testid={`reception-withdraw-${i}`}>Retirar</button>
                <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('sell', i)} data-testid={`reception-sell-${i}`}>Vender · {sellPrice(st.itemId, st) * st.qty}</button>
                {y && <button className="btn py-1 px-2 text-xs" style={BTN} onClick={() => actions.reception('scrap', i)} data-testid={`reception-scrap-${i}`}>Desguazar</button>}
                <button className={`btn py-1 px-2 text-xs ${confirm === i ? 'btn-gold' : ''}`} style={BTN} data-testid={`reception-discard-${i}`}
                  onClick={() => { if (confirm !== i) { setConfirm(i); return; } setConfirm(null); actions.reception('discard', i); }}>{confirm === i ? '¿Tirarlo?' : 'Descartar'}</button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
