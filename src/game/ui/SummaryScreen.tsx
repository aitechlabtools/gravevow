// Resultados al salir de la mazmorra, en páginas (13/11):
//  1 · La expedición: título, personaje, tiempo, subzona, experiencia (barra animada), subida de nivel y criaturas.
//  2 · Botín conseguido (solo lo nuevo, por rareza) o, al morir, lo que se queda abajo y lo que salvó el bolsillo.
//  3 · Tu cuerpo: solo si Vesper tiene algo que curar (heridas, sangrado, fracturas, vida baja o tras caer).
// Siguiente / ◂ Atrás, Intro y flechas, deslizar en táctil. «Saltar» va al Bastión, salvo si vuelves herido: entonces a «Tu cuerpo».
import { useEffect, useRef, useState } from 'react';
import { RECRUIT_NOTE } from '../../config/recruit';
import { COIN_ID } from '../../config/gold';
import { useCure } from './CureOffer';
import { actions, toast, useGame } from '../state/store';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { getEnemy } from '../../core/data/enemies';
import { getSubzone, isSubzoneId } from '../../core/data/subzones';
import { xpForNextLevel } from '../../core/stats';
import { pendingUnlocks } from '../../core/classSkills';
import { bodyHp, REGIONS, REGION_NAME } from '../../core/anatomy';
import { needsOf } from '../../core/needs';
import { baseBody } from '../state/medicalActions';
import { g } from '../../core/gender';
import type { ItemStack } from '../../core/types';
import { ItemIcon, ItemTooltip } from './inventory';
import { BodyFigure, regionWord } from './BodyFigure';
import { PlayerSprite, GoldAmount, formatTime } from './common';
import { monsterUrl } from '../../shared/art';
import { useLayout } from '../../config/ui';
import { startMusic } from '../audio';

const EFFECT: Record<string, string> = {
  bleed: 'Pierde vida poco a poco hasta cortarlo.',
  frac: 'Rota: pega o se mueve peor hasta entablillarla.',
  off: 'Inutilizada: no responde hasta curarla.',
};

export function SummaryScreen() {
  const summary = useGame((s) => s.summary);
  const profile = useGame((s) => s.profile);
  const cure = useCure();
  const layout = useLayout();
  const phone = layout === 'phone';
  // La página del cuerpo se decide al llegar: curarse no la quita (ahí se ve que quedas entero)
  const [hurt] = useState(() => !!cure && !summary?.tutorialNote);
  const pages = hurt ? 3 : 2;
  const [page, setPage] = useState(1);
  const sx = useRef<number | null>(null);
  const next = () => setPage((p) => Math.min(pages, p + 1));
  const prev = () => setPage((p) => Math.max(1, p - 1));
  const leave = () => { if (profile?.settings.music) startMusic('lobby'); actions.backToLobby(); };
  const skip = () => (hurt && page < 3 ? setPage(3) : leave());
  useEffect(() => {
    const k = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === 'INPUT') return;
      if (e.key === 'ArrowRight' || (e.key === 'Enter' && page < pages)) { e.preventDefault(); next(); }
      else if (e.key === 'ArrowLeft') { e.preventDefault(); prev(); }
    };
    window.addEventListener('keydown', k);
    return () => window.removeEventListener('keydown', k);
  });
  if (!summary || !profile) return null;
  const ok = summary.reason === 'extracted';
  const title = ok ? 'Has escapado' : summary.reason === 'timeout' ? 'La cripta se ha cerrado' : 'Has muerto';
  const last = page === pages;
  return (
    <div className="h-full flex flex-col select-none" data-testid="summary" data-page={page} data-pages={pages}
      style={{ background: ok ? 'radial-gradient(ellipse at 50% 20%, #2a2140 0%, #0b0910 60%)' : 'radial-gradient(ellipse at 50% 20%, #3a1018 0%, #0b0608 60%)',
        padding: 'max(var(--pad), env(safe-area-inset-top)) max(var(--pad), env(safe-area-inset-right)) max(var(--pad), env(safe-area-inset-bottom)) max(var(--pad), env(safe-area-inset-left))', touchAction: 'pan-y' }}
      onPointerDown={(e) => { sx.current = e.clientX; }}
      onPointerUp={(e) => { if (sx.current !== null) { const d = e.clientX - sx.current; if (d < -60) next(); else if (d > 60) prev(); } sx.current = null; }}
      onPointerCancel={() => { sx.current = null; }}>
      <div className="flex items-center justify-between" style={{ minHeight: 44 }}>
        <span className="text-[11px] tracking-[0.25em] uppercase text-stone-400 w-44 whitespace-nowrap">{page > 1 ? title : ''}</span>
        <div className="flex gap-2 items-center" role="status" aria-label={`Página ${page} de ${pages}`} data-testid="summary-dots">
          {Array.from({ length: pages }, (_, i) => <span key={i} className={`inline-block w-2.5 h-2.5 rotate-45 ${i + 1 === page ? 'bg-gold' : 'bg-stone-600'}`} />)}
        </div>
        <span className="w-44 flex justify-end">
          {!last && (
            <button className="text-sm text-stone-400 underline underline-offset-4 px-2 hover:text-parchment" style={{ minHeight: 44, minWidth: 44 }} onClick={skip} data-testid="summary-skip"
              title={hurt ? 'Vuelves herido: pasa a «Tu cuerpo»' : 'Volver al Bastión'}>Saltar</button>
          )}
        </span>
      </div>
      <div key={page} className="flex-1 min-h-0 fade-in overflow-y-auto scroll-thin">
        {page === 1 && <PageRun phone={phone} title={title} ok={ok} />}
        {page === 2 && <PageLoot phone={phone} ok={ok} />}
        {page === 3 && <PageBody phone={phone} />}
      </div>
      <div className="flex justify-center gap-3 pt-2">
        {page > 1 && <button className="btn px-5" style={{ minHeight: 'var(--btn-h)' }} onClick={prev} data-testid="summary-prev">◂ Atrás</button>}
        {!last && <button className="btn btn-gold px-10 text-lg" style={{ minHeight: 'var(--btn-h)' }} onClick={next} data-testid="summary-next" autoFocus>Siguiente ▸</button>}
        {last && page === 3 && cure && (
          <button className="btn px-5" style={{ minHeight: 'var(--btn-h)' }} data-testid="cure-later"
            onClick={() => { toast('Puedes curarte más tarde en la Enfermería o en Intendencia › Estado.', 'info'); leave(); }}>Ahora no</button>
        )}
        {last && !(page === 3 && cure) && <button className="btn btn-gold px-10 text-lg" style={{ minHeight: 'var(--btn-h)' }} onClick={leave} data-testid="btn-back-lobby" autoFocus>Volver al Bastión</button>}
      </div>
    </div>
  );
}

/** Página 1: la expedición. */
function PageRun({ phone, title, ok }: { phone: boolean; title: string; ok: boolean }) {
  const summary = useGame((s) => s.summary)!;
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const need = xpForNextLevel(ch.level);
  const before = summary.xpBefore;
  const from = before && before.level === ch.level ? before.xp / xpForNextLevel(before.level) : 0;
  const [fill, setFill] = useState(from);
  useEffect(() => { const t = setTimeout(() => setFill(Math.min(1, ch.xp / Math.max(1, need))), 120); return () => clearTimeout(t); }, [ch.xp, need]);
  const kills = Object.entries(summary.kills);
  const sub = summary.subzone && isSubzoneId(summary.subzone) ? getSubzone(summary.subzone) : null;
  const skill = summary.levelsGained > 0 && pendingUnlocks(profile) > 0;
  const notes = [summary.tutorialNote && ['tutorial-note', summary.tutorialNote], summary.mercNote && ['merc-note', summary.mercNote], summary.wandererNote && ['wanderer-note', summary.wandererNote]].filter(Boolean) as [string, string][];
  return (
    <div className={`min-h-full grid items-center ${phone ? 'grid-cols-[auto_minmax(0,1fr)] gap-4' : 'grid-cols-1 justify-items-center content-center gap-3 py-2'}`}>
      <div className={`flex justify-center ${ok ? '' : 'grayscale opacity-60'}`}><PlayerSprite scale={phone ? 5 : 8} animate={ok} /></div>
      <div className={`w-full ${phone ? '' : 'max-w-2xl text-center'}`}>
        <h1 className={`font-display ${phone ? 'text-3xl' : 'text-5xl'} ${ok ? 'text-gold' : 'text-blood'} title-glow`} data-testid="summary-title">{title}</h1>
        <p className={`font-body text-stone-300 ${phone ? 'text-sm' : 'text-xl'} mt-1`}>
          {ok ? 'El portal te escupe en el patio del Bastión. Todo lo que traes es tuyo.' : summary.reason === 'timeout' ? 'El reloj llegó a cero. Las puertas de piedra se sellaron contigo dentro.' : 'Tu cuerpo queda en las criptas. Tu equipo, también.'}
        </p>
        <div className={`flex flex-wrap gap-2 ${phone ? 'mt-2' : 'mt-4 justify-center'}`}>
          <span className="panel px-3 py-1.5 text-sm">Tiempo <b className="text-parchment">{formatTime(summary.durationMs)}</b></span>
          {sub && <span className="panel px-3 py-1.5 text-sm" data-testid="summary-subzone">{sub.name}{summary.firstVisit && <span className="text-gold"> · primera vez</span>}</span>}
        </div>
        <div className={phone ? 'mt-2' : 'mt-4 mx-auto max-w-md'} data-testid="summary-xp">
          <div className="flex justify-between text-sm"><span className="text-stone-400">Experiencia · nivel {ch.level}</span><span className="text-arcane">+{summary.xpGained}</span></div>
          <div className="h-3 bg-[#0d0c11] border border-stone-700 mt-1"><div className="h-full bg-arcane" style={{ width: `${fill * 100}%`, transition: 'width 700ms ease-out' }} /></div>
        </div>
        {summary.levelsGained > 0 && (
          <div className={`panel panel-gold ${phone ? 'p-2 mt-2' : 'p-3 mt-4 mx-auto max-w-md'} text-gold`} data-testid="summary-levelup">
            <div className="font-display text-lg">¡Subes al nivel {ch.level}!</div>
            {skill && <div className="text-sm text-parchment font-body">Nueva habilidad de clase: la eliges al volver al Bastión.</div>}
          </div>
        )}
        {kills.length > 0 && (
          <div className={phone ? 'mt-2' : 'mt-5'}>
            <div className="text-[11px] tracking-[0.2em] uppercase text-stone-400 mb-1">Criaturas abatidas</div>
            <div className={`flex flex-wrap gap-2 ${phone ? '' : 'justify-center'}`} data-testid="summary-kills">
              {kills.map(([id, n]) => {
                const e = getEnemy(id); const big = e.boss || e.elite;
                return (
                  <div key={id} className={`panel flex items-center gap-2 pr-3 ${big ? 'panel-gold' : ''}`} title={e.name}>
                    <img src={monsterUrl(e.sprite, phone ? 2 : 3)} className="pixelated" alt="" draggable={false} />
                    <span className="text-sm">{phone ? '' : `${e.name} `}<b className={big ? 'text-gold' : 'text-parchment'}>×{n}</b>{big && <span className="text-gold text-xs block">{e.boss ? 'Jefe' : 'Élite'}</span>}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {notes.map(([id, text]) => <div key={id} className={`panel ${id === 'tutorial-note' ? 'panel-gold' : ''} ${phone ? 'p-2 mt-2 text-sm' : 'p-3 mt-3 text-lg'} font-body text-parchment`} data-testid={id}>{text}</div>)}
      </div>
    </div>
  );
}

/** Página 2: botín conseguido (o lo perdido al morir). */
function PageLoot({ phone, ok }: { phone: boolean; ok: boolean }) {
  const summary = useGame((s) => s.summary)!;
  const items = ok ? summary.gained ?? [] : summary.lost.filter((s) => s.itemId !== COIN_ID); // el oro va aparte
  const [sel, setSel] = useState<ItemStack | null>(null);
  const shown = sel ?? null;
  return (
    <div className="min-h-full flex flex-col items-center justify-center gap-3 py-2 text-center">
      <h2 className={`font-display ${phone ? 'text-2xl' : 'text-4xl'} ${ok ? 'text-gold' : 'text-blood'}`}>{ok ? 'Botín conseguido' : 'Lo que se queda abajo'}</h2>
      <div className="flex gap-2 flex-wrap justify-center text-sm">
        {ok ? (
          <>
            <span className="panel px-3 py-1.5 flex items-center gap-2" data-testid="summary-gold">Oro <GoldAmount value={summary.goldGained} /></span>
            <span className="panel px-3 py-1.5" data-testid="summary-value">Valor del botín <b className="text-gold">{summary.lootValue ?? summary.extractedValue}</b></span>
          </>
        ) : <span className="panel px-3 py-1.5">Oro perdido <b className="text-blood line-through">{summary.goldLost}</b></span>}
      </div>
      {items.length ? (
        <div className="flex flex-wrap gap-2 justify-center max-w-3xl" data-testid={ok ? 'summary-loot' : 'summary-lost'}>
          {items.map((s, i) => {
            const r = stackRarity(s, getItem(s.itemId));
            const shine = ok && (r === 'legendary' || r === 'epic');
            return (
              <button key={s.uid} className={`slot ${phone ? '' : 'slot-big'} relative ${shine ? 'loot-shine' : ''} ${ok ? '' : 'opacity-80'} ${shown === s ? 'selected' : ''}`}
                style={{ borderColor: RARITY_INFO[r].color, animationDelay: `${i * 70}ms` }} data-item={s.itemId} aria-label={getItem(s.itemId).name}
                onClick={() => setSel(shown === s ? null : s)} onMouseEnter={() => setSel(s)}>
                <ItemIcon itemId={s.itemId} size={phone ? 32 : 48} />{s.qty > 1 && <span className="qty">{s.qty}</span>}
              </button>
            );
          })}
        </div>
      ) : (
        <p className="font-body italic text-stone-300 text-xl" data-testid="summary-empty">{ok ? 'Vuelves con las manos vacías, pero vuelves.' : 'No llevabas nada. Al menos eso.'}</p>
      )}
      {shown && <div className="max-w-md text-left" data-testid="summary-item-card"><ItemTooltip stack={shown} /></div>}
      {!!summary.blueprintsLearned?.length && (
        <div className="panel panel-gold px-3 py-2 font-body text-parchment" data-testid="blueprints-note">
          Planos aprendidos: {summary.blueprintsLearned.map((b) => getItem(b).name.replace(/^Plano: /, '')).join(', ')}. Ya no se pierden.
        </div>
      )}
      {!ok && (
        <div>
          {!!summary.saved?.length && (
            <>
              <div className="text-[11px] tracking-[0.2em] uppercase text-heal mb-1">A salvo en el bolsillo</div>
              <div className="flex gap-2 justify-center" data-testid="summary-saved">
                {summary.saved.map((s) => <div key={s.uid} className="slot" style={{ borderColor: RARITY_INFO[stackRarity(s, getItem(s.itemId))].color }} title={getItem(s.itemId).name}><ItemIcon itemId={s.itemId} size={32} />{s.qty > 1 && <span className="qty">{s.qty}</span>}</div>)}
              </div>
            </>
          )}
          <p className="font-body text-stone-400 text-sm mt-1">Tu almacén y el oro del banco siguen a salvo. Conservas la experiencia.</p>
        </div>
      )}
      {ok && summary.recruitKit && <RecruitNote phone={phone} />}
    </div>
  );
}

function RecruitNote({ phone }: { phone: boolean }) {
  return (
    <div className={`panel border-heal ${phone ? 'p-2 text-xs' : 'p-3 text-sm'} text-left`} data-testid="recruit-kit">
      <span className="text-heal block">{RECRUIT_NOTE}</span>
      <span className="text-stone-300">Equipo de recluta en las ranuras vacías, vendas, pan y agua. No se vende ni se pierde al morir.</span>
    </div>
  );
}

/** Página 3: tu cuerpo y la cura de Vesper. */
function PageBody({ phone }: { phone: boolean }) {
  const summary = useGame((s) => s.summary)!;
  const profile = useGame((s) => s.profile)!;
  const cure = useCure();
  const body = baseBody(profile);
  const needs = needsOf(profile.needs);
  const [open, setOpen] = useState<string | null>(null);
  const [flash, setFlash] = useState(false);
  // Solo lo que pide atención (sangra, rota, inutilizada); los golpes sueltos, en una frase
  const serious = REGIONS.filter((r) => ['bleed', 'frac', 'off'].includes(regionWord(body, r).cls)).slice(0, 3);
  const bruised = REGIONS.filter((r) => regionWord(body, r).cls === 'hurt').length;
  const short = cure && !cure.free && profile.gold < cure.price ? cure.price - profile.gold : 0;
  const doCure = () => { actions.vesperTreat(); setFlash(true); setTimeout(() => setFlash(false), 700); };
  return (
    <div className={`min-h-full grid items-center justify-center ${phone ? 'grid-cols-[auto_minmax(0,22rem)] gap-6' : 'grid-cols-[auto_minmax(0,28rem)] gap-14 py-2'}`} data-testid="summary-body">
      <div className={`flex justify-center transition-[filter] duration-500 ${flash ? 'brightness-150' : ''}`}><BodyFigure body={body} unit={phone ? 14 : 26} testId="summary-figure" /></div>
      <div className="text-left">
        <h2 className={`font-display ${phone ? 'text-2xl' : 'text-4xl'} text-parchment`}>Tu cuerpo</h2>
        <div className={`text-stone-300 ${phone ? 'text-xs' : 'text-sm'} mt-1`}>
          Vida <b className={cure ? 'text-blood' : 'text-heal'}>{bodyHp(body)}/{body.total}</b>{phone ? <br /> : ' · '}
          Saciedad {Math.round(needs.sat)} · Hidratación {Math.round(needs.hyd)} · Descanso {Math.round(needs.rest)}
        </div>
        {cure ? (
          <>
            <ul className={`mt-2 space-y-0.5 font-body ${phone ? 'text-sm' : 'text-lg'}`}>
              {serious.map((r) => {
                const w = regionWord(body, r);
                return (
                  <li key={r}>
                    <button className="text-left w-full flex items-baseline gap-2" style={{ minHeight: phone ? 28 : 32 }} onClick={() => setOpen(open === r ? null : r)} data-testid={`summary-wound-${r}`}>
                      <span className="text-parchment">{REGION_NAME[r]}</span>
                      <span className={w.cls === 'bleed' ? 'text-blood' : w.cls === 'frac' ? 'text-gold' : 'text-stone-400'}>{w.ico} {w.word}</span>
                    </button>
                    {open === r && <span className="block text-stone-400 text-sm -mt-1 mb-1">{EFFECT[w.cls]}</span>}
                  </li>
                );
              })}
              {bruised > 0 && <li className="text-stone-400 text-sm">{serious.length ? `Y ${bruised} ${bruised === 1 ? 'parte' : 'partes'} con golpes.` : `${bruised} ${bruised === 1 ? 'parte' : 'partes'} con golpes.`}</li>}
            </ul>
            <div data-testid="cure-offer">
              <p className={`font-body text-stone-300 italic ${phone ? 'text-sm mt-1' : 'text-lg mt-4'}`}>
                {cure.fallen ? g('«Te han traído a rastras. Te dejo enter{o|a} por una moneda.»') : g('«Puedo dejarte enter{o|a}», dice Hermana Vesper.')}
              </p>
              <button className="btn btn-gold mt-2 px-6 text-lg" style={{ minHeight: 'var(--btn-h)' }} onClick={doCure} disabled={short > 0} data-testid="cure-btn">
                {cure.free ? 'Curarse gratis' : `Curarse por ${cure.price} de oro`}
              </button>
              <span className={`block text-xs mt-1 ${short ? 'text-blood' : 'text-stone-400'}`}>
                {cure.free ? 'No te queda ni una moneda: esta vez no cobra.' : short ? `Te faltan ${short} de oro en el almacén.` : 'Se paga del almacén.'}
              </span>
            </div>
          </>
        ) : <p className={`font-body text-heal ${phone ? 'mt-2' : 'mt-4 text-lg'}`} data-testid="summary-cured">{g('Vesper cose y entablilla. Quedas enter{o|a}.')}</p>}
        {summary.recruitKit && summary.reason !== 'extracted' && <div className="mt-2"><RecruitNote phone={phone} /></div>}
      </div>
    </div>
  );
}
