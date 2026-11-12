import { RECRUIT_NOTE } from '../../config/recruit';
import { CureOffer } from './CureOffer';
import { actions, useGame } from '../state/store';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { getEnemy } from '../../core/data/enemies';
import type { ItemStack } from '../../core/types';
import { ItemIcon } from './inventory';
import { PlayerSprite, formatTime } from './common';
import { startMusic } from '../audio';

function ItemRow({ items, empty }: { items: ItemStack[]; empty: string }) {
  if (!items.length) return <p className="text-stone-400 italic font-body">{empty}</p>;
  return (
    <div className="flex flex-wrap gap-1">
      {items.map((s) => {
        const d = getItem(s.itemId);
        return (
          <div key={s.uid} className="slot" title={d.name} style={{ borderColor: RARITY_INFO[d.rarity].color + 'aa' }} data-item={s.itemId}>
            <ItemIcon itemId={s.itemId} />{s.qty > 1 && <span className="qty">{s.qty}</span>}
          </div>
        );
      })}
    </div>
  );
}

export function SummaryScreen() {
  const summary = useGame((s) => s.summary);
  const profile = useGame((s) => s.profile);
  if (!summary || !profile) return null;
  const ok = summary.reason === 'extracted';
  const title = ok ? 'Has escapado' : summary.reason === 'timeout' ? 'La cripta se ha cerrado' : 'Has muerto';
  const kills = Object.entries(summary.kills);
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={{ background: ok ? 'radial-gradient(ellipse at 50% 20%, #2a2140 0%, #0b0910 60%)' : 'radial-gradient(ellipse at 50% 20%, #3a1018 0%, #0b0608 60%)' }} data-testid="summary">
      <div className="max-w-3xl mx-auto p-6 fade-in">
        <div className="text-center">
          <div className={`flex justify-center ${ok ? '' : 'grayscale opacity-60'}`}><PlayerSprite scale={7} animate={ok} /></div>
          <h1 className={`font-display text-5xl mt-2 ${ok ? 'text-gold' : 'text-blood'} title-glow`} data-testid="summary-title">{title}</h1>
          <p className="font-body text-xl text-stone-300 mt-2">
            {ok ? 'El portal te escupe en el patio del Bastión. Todo lo que llevas es tuyo.' : summary.reason === 'timeout' ? 'El reloj llegó a cero. Las puertas de piedra se sellaron contigo dentro.' : 'Tu cuerpo queda en las criptas. Tu equipo, también.'}
          </p>
        </div>
        <div className="grid sm:grid-cols-4 gap-2 mt-6 text-center">
          <div className="panel p-3"><div className="text-xs text-stone-400">Tiempo</div><div className="text-xl">{formatTime(summary.durationMs)}</div></div>
          <div className="panel p-3"><div className="text-xs text-stone-400">Experiencia</div><div className="text-xl text-arcane">+{summary.xpGained}</div></div>
          <div className="panel p-3"><div className="text-xs text-stone-400">Oro</div><div className={`text-xl ${ok ? 'text-gold' : 'text-blood line-through'}`}>{ok ? `+${summary.goldGained}` : summary.goldLost}</div></div>
          <div className="panel p-3"><div className="text-xs text-stone-400">Valor extraído</div><div className="text-xl text-gold">{summary.extractedValue}</div></div>
        </div>
        {summary.levelsGained > 0 && <div className="panel panel-gold p-3 mt-3 text-center text-gold text-lg">¡Subes al nivel {profile.character.level}!</div>}
        {summary.mercNote && <div className="panel p-3 mt-3 text-center font-body text-lg text-parchment" data-testid="merc-note">{summary.mercNote}</div>}
        {!!summary.blueprintsLearned?.length && <div className="panel panel-gold p-3 mt-3 text-center font-body text-lg text-parchment" data-testid="blueprints-note">Planos aprendidos: {summary.blueprintsLearned.map((b) => getItem(b).name.replace(/^Plano: /, '')).join(', ')}. Ya no se pierden.</div>}
        {summary.tutorialNote && <div className="panel panel-gold p-3 mt-3 text-center font-body text-lg text-parchment" data-testid="tutorial-note">{summary.tutorialNote}</div>}
        {summary.wandererNote && <div className="panel p-3 mt-3 text-center font-body text-lg text-parchment" data-testid="wanderer-note">{summary.wandererNote}</div>}
        {summary.recruitKit && (
          <div className="panel p-3 mt-3 text-center border-heal" data-testid="recruit-kit">
            <span className="text-heal block">{RECRUIT_NOTE}</span>
            <span className="font-body text-lg text-stone-300">Equipo de recluta en las ranuras vacías, vendas, pan y agua. No se vende ni se pierde al morir.</span>
          </div>
        )}
        <div className="panel p-4 mt-3 space-y-4">
          <div>
            <h3 className="panel-title text-sm mb-2">Botín encontrado</h3>
            <ItemRow items={summary.found} empty="No encontraste nada esta vez." />
          </div>
          {ok ? (
            <div>
              <h3 className="panel-title text-sm mb-2 text-heal">Conservas</h3>
              <ItemRow items={summary.kept} empty="Nada." />
            </div>
          ) : (
            <div>
              <h3 className="panel-title text-sm mb-2 text-blood">Perdido</h3>
              <ItemRow items={summary.lost} empty="No llevabas nada. Al menos eso." />
              <p className="font-body text-base text-stone-300 mt-2">Tu almacén y tu oro del banco siguen a salvo. Conservas la experiencia.</p>
            </div>
          )}
          {kills.length > 0 && (
            <div>
              <h3 className="panel-title text-sm mb-2">Criaturas abatidas</h3>
              <div className="font-body text-lg">{kills.map(([id, n]) => `${getEnemy(id).name} x${n}`).join(' · ')}</div>
            </div>
          )}
        </div>
        {!summary.tutorialNote && <div className="mt-4"><CureOffer /></div>}
        <div className="text-center mt-6">
          <button className="btn btn-gold text-lg px-8 py-3" onClick={() => { if (profile.settings.music) startMusic('lobby'); actions.backToLobby(); }} data-testid="btn-back-lobby" autoFocus>Volver al Bastión</button>
        </div>
      </div>
    </div>
  );
}
