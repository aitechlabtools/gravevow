// PROTOTIPO (maqueta) de la pantalla de resultados en tres páginas. Usa piezas reales del juego con datos de ejemplo.
// ?s=extract|death  &page=1|2|3  &empty=1 (sin botín)
import { useEffect, useRef, useState } from 'react';
import { HeroSprite, GoldAmount, formatTime } from '../../../src/game/ui/common';
import { ItemIcon } from '../../../src/game/ui/inventory';
import { BodyFigure, regionWord } from '../../../src/game/ui/BodyFigure';
import { REGIONS, REGION_NAME } from '../../../src/core/anatomy';
import { getItem, RARITY_INFO } from '../../../src/core/data/items';
import { stackRarity } from '../../../src/core/data/rarity';
import { getEnemy } from '../../../src/core/data/enemies';
import { monsterUrl } from '../../../src/shared/art';
import { fullBody, damageRegion, addBleed } from '../../../src/core/anatomy';
import { useLayout } from '../../../src/config/ui';
import type { ItemStack } from '../../../src/core/types';

const q = new URLSearchParams(location.search);
const death = q.get('s') === 'death';
const emptyLoot = q.get('empty') === '1';

const AP = { cloak: 0, skin: 1, sex: 'm' as const, hair: 1, style: 0, beard: 1 };
const LOOT: ItemStack[] = emptyLoot ? [] : [
  { uid: 'a', itemId: 'dread_blade', qty: 1, rarity: 'legendary' },
  { uid: 'b', itemId: 'bp_heart_of_umbravel', qty: 1 },
  { uid: 'c', itemId: 'iron_ore', qty: 4 },
  { uid: 'd', itemId: 'bandage', qty: 2 },
  { uid: 'e', itemId: 'leather_scrap', qty: 3 },
  { uid: 'f', itemId: 'silver_ore', qty: 1 },
];
const LOST: ItemStack[] = [
  { uid: 'l1', itemId: 'iron_sword', qty: 1 }, { uid: 'l2', itemId: 'chainmail', qty: 1 }, { uid: 'l3', itemId: 'iron_ore', qty: 4 },
  { uid: 'l4', itemId: 'bandage', qty: 2 },
];
const POCKET: ItemStack[] = [{ uid: 'p1', itemId: 'bp_heart_of_umbravel', qty: 1 }];
const KILLS: [string, number][] = [['starving_wolf', 3], ['carrion_crow', 2], ['mordrek', 1]];
let BODY = fullBody(120);
BODY = damageRegion(BODY, 'legL', 18).body; BODY = addBleed(BODY, 'legL', 1); BODY = damageRegion(BODY, 'abdomen', 22).body;
BODY = { ...BODY, parts: { ...BODY.parts, armR: { ...BODY.parts.armR, fracture: true, hp: Math.round(BODY.parts.armR.hp * 0.5) } } };

const RANK: Record<string, number> = { legendary: 5, epic: 4, rare: 3, uncommon: 2, common: 1 };

export function ResultadosProto() {
  const layout = useLayout();
  const phone = layout === 'phone';
  const hurt = true;
  const pages = hurt ? 3 : 2;
  const [page, setPage] = useState(Math.min(pages, Number(q.get('page') ?? 1)));
  const [cured, setCured] = useState(false);
  const next = () => setPage((p) => Math.min(pages, p + 1));
  const prev = () => setPage((p) => Math.max(1, p - 1));
  useEffect(() => {
    const k = (e: KeyboardEvent) => { if (e.key === 'Enter' || e.key === 'ArrowRight') next(); if (e.key === 'ArrowLeft') prev(); };
    window.addEventListener('keydown', k); return () => window.removeEventListener('keydown', k);
  });
  const sx = useRef<number | null>(null);
  const last = page === pages;
  return (
    <div className="h-full flex flex-col" data-testid="summary" data-page={page}
      onPointerDown={(e) => { sx.current = e.clientX; }}
      onPointerUp={(e) => { if (sx.current !== null) { const d = e.clientX - sx.current; if (d < -50) next(); if (d > 50) prev(); } sx.current = null; }}
      style={{ background: death ? 'radial-gradient(ellipse at 50% 20%, #3a1018 0%, #0b0608 60%)' : 'radial-gradient(ellipse at 50% 20%, #2a2140 0%, #0b0910 60%)', padding: 'var(--pad)' }}>
      {/* Cabecera común: título pequeño a partir de la página 2 */}
      <div className="flex items-center justify-between" style={{ minHeight: 44 }}>
        <span className="text-[11px] tracking-[0.25em] uppercase text-stone-400">{death ? 'Has muerto' : 'Has escapado'}</span>
        <div className="flex gap-2 items-center" aria-label={`Página ${page} de ${pages}`}>
          {Array.from({ length: pages }, (_, i) => <span key={i} className={`inline-block w-2.5 h-2.5 rotate-45 ${i + 1 === page ? 'bg-gold' : 'bg-stone-600'}`} />)}
        </div>
        {!last ? <button className="text-sm text-stone-400 underline underline-offset-4 px-2" style={{ minHeight: 44, minWidth: 44 }} title={hurt ? 'Salta a Tu cuerpo: vuelves herido' : 'Volver al Bastión'}>Saltar</button> : <span style={{ width: 60 }} />}
      </div>
      <div key={page} className="flex-1 min-h-0 fade-in overflow-hidden">
        {page === 1 && <PageRun phone={phone} />}
        {page === 2 && <PageLoot phone={phone} />}
        {page === 3 && <PageBody phone={phone} cured={cured} onCure={() => setCured(true)} />}
      </div>
      <div className="flex justify-center gap-3 pt-2">
        {page > 1 && <button className="btn px-6" style={{ minHeight: 'var(--btn-h)' }} onClick={prev}>◂ Atrás</button>}
        {!last && <button className="btn btn-gold px-10 text-lg" style={{ minHeight: 'var(--btn-h)' }} onClick={next}>Siguiente ▸</button>}
        {last && (page !== 3 || cured || death) && <button className="btn btn-gold px-10 text-lg" style={{ minHeight: 'var(--btn-h)' }}>Volver al Bastión</button>}
        {last && page === 3 && !cured && !death && <button className="btn px-6" style={{ minHeight: 'var(--btn-h)' }} title="Puedes curarte más tarde en la Enfermería o en Intendencia › Estado">Ahora no</button>}
      </div>
    </div>
  );
}

function PageRun({ phone }: { phone: boolean }) {
  const [fill, setFill] = useState(0.35);
  useEffect(() => { const t = setTimeout(() => setFill(1), 150); return () => clearTimeout(t); }, []);
  return (
    <div className={`h-full grid items-center ${phone ? 'grid-cols-[auto_1fr] gap-4' : 'grid-cols-1 justify-items-center content-center gap-3'}`}>
      <div className={`flex flex-col items-center ${death ? 'grayscale opacity-60' : ''}`}>
        <HeroSprite classId="warrior" appearance={AP} scale={phone ? 5 : 8} animate={!death} />
      </div>
      <div className={`w-full ${phone ? '' : 'max-w-2xl text-center'}`}>
        <h1 className={`font-display ${phone ? 'text-3xl' : 'text-5xl'} ${death ? 'text-blood' : 'text-gold'} title-glow`}>{death ? 'Has muerto' : 'Has escapado'}</h1>
        <p className={`font-body text-stone-300 ${phone ? 'text-sm' : 'text-xl'} mt-1`}>{death ? 'Tu cuerpo queda en las criptas. Tu equipo, también.' : 'El portal te escupe en el patio del Bastión. Todo lo que traes es tuyo.'}</p>
        <div className={`flex ${phone ? 'gap-2 mt-2' : 'gap-3 mt-4 justify-center'} flex-wrap`}>
          <span className="panel px-3 py-1.5 text-sm">Tiempo <b className="text-parchment">{formatTime(9 * 60000 + 43000)}</b></span>
          <span className="panel px-3 py-1.5 text-sm">Subzona <b className="text-parchment">Afueras del Bastión</b> <span className="text-gold">· primera vez</span></span>
        </div>
        {/* Experiencia con barra que se llena */}
        <div className={`${phone ? 'mt-2' : 'mt-4 mx-auto max-w-md'}`}>
          <div className="flex justify-between text-sm"><span className="text-stone-400">Experiencia</span><span className="text-arcane">+{death ? 64 : 182}</span></div>
          <div className="h-3 bg-[#0d0c11] border border-stone-700 mt-1"><div className="h-full bg-arcane" style={{ width: `${fill * 100}%`, transition: 'width 700ms ease-out' }} /></div>
        </div>
        {!death && (
          <div className={`panel panel-gold ${phone ? 'p-2 mt-2' : 'p-3 mt-4 mx-auto max-w-md'} text-gold`}>
            <div className="font-display text-lg">¡Subes al nivel 20!</div>
            <div className="text-sm text-parchment font-body">Nueva habilidad de clase: la eliges al volver al Bastión.</div>
          </div>
        )}
        <div className={`${phone ? 'mt-2' : 'mt-5'}`}>
          <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">Criaturas abatidas</div>
          <div className={`flex flex-wrap gap-2 ${phone ? '' : 'justify-center'}`}>
            {KILLS.map(([id, n]) => {
              const e = getEnemy(id); const big = e.boss || e.elite;
              return (
                <div key={id} className={`panel flex items-center gap-2 pr-3 ${big ? 'panel-gold' : ''}`} title={e.name}>
                  <img src={monsterUrl(e.sprite, phone ? 2 : 3)} className="pixelated" alt="" />
                  <span className="text-sm">{phone ? '' : e.name + ' '}<b className={big ? 'text-gold' : 'text-parchment'}>×{n}</b>{big && <span className="text-gold text-xs block">{e.boss ? 'Jefe' : 'Élite'}</span>}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function PageLoot({ phone }: { phone: boolean }) {
  const items = (death ? LOST : LOOT).slice().sort((a, b) => RANK[stackRarity(b, getItem(b.itemId))] - RANK[stackRarity(a, getItem(a.itemId))]);
  const [sel, setSel] = useState<ItemStack | null>(null);
  return (
    <div className="h-full flex flex-col items-center justify-center gap-3">
      <h2 className={`font-display ${phone ? 'text-2xl' : 'text-4xl'} ${death ? 'text-blood' : 'text-gold'}`}>{death ? 'Lo que se queda abajo' : 'Botín conseguido'}</h2>
      <div className="flex gap-3 flex-wrap justify-center text-sm">
        {death ? <span className="panel px-3 py-1.5">Oro perdido <b className="text-blood line-through">38</b></span>
          : <><span className="panel px-3 py-1.5 flex items-center gap-2">Oro <GoldAmount value={emptyLoot ? 0 : 57} /></span><span className="panel px-3 py-1.5">Valor del botín <b className="text-gold">{emptyLoot ? 0 : 1873}</b></span></>}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl">
          {items.map((s, i) => {
            const r = stackRarity(s, getItem(s.itemId)); const shine = !death && (r === 'legendary' || r === 'epic');
            return (
              <button key={s.uid} className={`slot slot-big relative ${shine ? 'loot-shine' : ''} ${death ? 'grayscale-[.6] opacity-80' : ''}`} onClick={() => setSel(s)}
                style={{ borderColor: RARITY_INFO[r].color, animationDelay: `${i * 60}ms` }} title={getItem(s.itemId).name}>
                <ItemIcon itemId={s.itemId} size={phone ? 36 : 52} />{s.qty > 1 && <span className="qty">{s.qty}</span>}
              </button>
            );
          })}
        </div>
      ) : <p className="font-body italic text-stone-300 text-xl">Vuelves con las manos vacías, pero vuelves.</p>}
      {sel && <div className="panel px-3 py-2 text-sm max-w-md text-center"><b style={{ color: RARITY_INFO[stackRarity(sel, getItem(sel.itemId))].color }}>{getItem(sel.itemId).name}</b> — {getItem(sel.itemId).description}</div>}
      {death && (
        <div className="text-center">
          <div className="text-[11px] tracking-[0.2em] uppercase text-heal mb-1">A salvo en el bolsillo</div>
          <div className="flex gap-2 justify-center">{POCKET.map((s) => <div key={s.uid} className="slot" style={{ borderColor: RARITY_INFO[stackRarity(s, getItem(s.itemId))].color }}><ItemIcon itemId={s.itemId} size={36} /></div>)}</div>
          <p className="font-body text-stone-400 text-sm mt-1">Tu almacén y el oro del banco siguen a salvo. Conservas la experiencia.</p>
        </div>
      )}
    </div>
  );
}

function PageBody({ phone, cured, onCure }: { phone: boolean; cured: boolean; onCure: () => void }) {
  const body = cured ? fullBody(120) : BODY;
  // Solo lo que pide atención (sangra, rota, inutilizada); los golpes sueltos, en una línea
  const serious = REGIONS.filter((r) => ['bleed', 'frac', 'off'].includes(regionWord(body, r).cls)).slice(0, 3);
  const bruised = REGIONS.filter((r) => regionWord(body, r).cls === 'hurt').length;
  const [open, setOpen] = useState<string | null>(null);
  return (
    <div className={`h-full grid items-center justify-center ${phone ? 'grid-cols-[auto_minmax(0,22rem)] gap-6' : 'grid-cols-[auto_minmax(0,28rem)] gap-14'}`}>
      <div className={`flex justify-center transition-all duration-500 ${cured ? 'brightness-125' : ''}`}><BodyFigure body={body} unit={phone ? 14 : 26} /></div>
      <div>
        <h2 className={`font-display ${phone ? 'text-2xl' : 'text-4xl'} text-parchment`}>Tu cuerpo</h2>
        <div className={`text-stone-300 ${phone ? 'text-xs' : 'text-sm'} mt-1`}>
          Vida <b className={cured ? 'text-heal' : 'text-blood'}>{cured ? 120 : 71}/120</b>{phone ? <br /> : ' · '}Saciedad 60 · Hidratación 60 · Descanso 34
        </div>
        {!cured && (
          <ul className={`mt-2 space-y-1 font-body ${phone ? 'text-sm' : 'text-lg'}`}>
            {serious.map((r) => { const w = regionWord(body, r); return (
              <li key={r}><button className="text-left w-full flex items-baseline gap-2" style={{ minHeight: phone ? 26 : 32 }} onClick={() => setOpen(open === r ? null : r)}>
                <span className="text-parchment">{REGION_NAME[r]}</span><span className={w.cls === 'bleed' ? 'text-blood' : w.cls === 'frac' ? 'text-gold' : 'text-stone-400'}>{w.ico} {w.word}</span>
              </button>{open === r && <span className="block text-stone-400 text-sm -mt-1 mb-1">{EFFECT[w.cls]}</span>}</li>); })}
            {bruised > 0 && <li className="text-stone-400 text-sm">Y {bruised} partes con golpes.</li>}
          </ul>
        )}
        {cured ? <p className="font-body text-heal mt-3 text-lg">Vesper cose y entablilla. Quedas entero.</p> : (
          <>
            <p className={`font-body text-stone-300 italic ${phone ? 'text-sm mt-2' : 'text-lg mt-4'}`}>{death ? '«Te dejo entero por una moneda», dice Hermana Vesper.' : '«Puedo dejarte entero», dice Hermana Vesper.'}</p>
            <button className="btn btn-gold mt-2 px-6 text-lg" style={{ minHeight: 'var(--btn-h)' }} onClick={onCure}>{death ? 'Curarse por 1 de oro' : 'Curarse por 23 de oro'}</button>
          </>
        )}
        {death && <p className={`text-heal ${phone ? 'text-xs mt-2' : 'text-sm mt-3'}`}>Te esperan equipo de recluta, vendas, pan y agua.</p>}
      </div>
    </div>
  );
}

const EFFECT: Record<string, string> = { bleed: 'Pierde vida poco a poco hasta cortarlo.', frac: 'Rota: pega menos hasta entablillarla.', off: 'Inutilizada: no responde.', hurt: 'Herida: le falta vida.' };
