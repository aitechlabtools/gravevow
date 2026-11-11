// La forja de Maese Brand: recetas, materiales y el yunque. La calidad sale del trabajo (leyendo la temperatura y
// golpeando dentro de la franja); tras la primera vez, forja rápida de calidad tosca.
import { actions, useGame } from '../state/store';
import { RECIPES, QUALITIES } from '../../core/data/forge';
import { FORGE_BANDS, FORGE_STEPS } from '../../core/data/workshop';
import { forgeCost, materialsFor } from '../../core/forge';
import { anvilBlock } from '../../core/workshop';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { REP_RANKS, rankOf } from '../../config/reputation';
import { ItemIcon } from './inventory';
import { BandStep, Needs } from './WorkshopPanels';

const BTN = { minHeight: 44 } as const;

export function ForgePanel() {
  const profile = useGame((s) => s.profile)!;
  const rank = rankOf(profile.reputation.brand ?? 0);
  const job = profile.workshop;
  if (job?.station === 'forge') return <BandStep />;
  if (job) return <p className="font-body text-stone-300" data-testid="workshop-busy">Tienes una mezcla a medias en la mesa de Eldrin. Termínala allí primero.</p>;
  return (
    <div className="space-y-3" data-testid="forge">
      <p className="font-body text-base text-stone-300 max-w-2xl">
        «Mira el color, no el reloj.» En el yunque, cada golpe se da leyendo la temperatura: armas a {FORGE_BANDS.weapon[0]}–{FORGE_BANDS.weapon[1]}° ({FORGE_STEPS.weapon} golpes), protecciones a {FORGE_BANDS.armor[0]}–{FORGE_BANDS.armor[1]}° ({FORGE_STEPS.armor}).
        Calidad: {QUALITIES.map((q) => `${q.name.toLowerCase()}${q.bonus ? ` +${Math.round(q.bonus * 100)} %` : ''}`).join(' · ')}.
      </p>
      <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
        {RECIPES.map((r) => {
          const res = getItem(r.result);
          const locked = rank < r.rank;
          const block = anvilBlock(profile, r.id);
          const done = (profile.crafted ?? []).includes(r.id);
          return (
            <div key={r.id} className={`bg-black/30 border border-stone-800 p-3 flex flex-col gap-2 ${locked ? 'opacity-60' : ''}`} data-testid={`recipe-${r.id}`}>
              <div className="flex items-center gap-2">
                <div className="slot" style={{ borderColor: RARITY_INFO[res.rarity].color + 'aa' }}><ItemIcon itemId={r.result} /></div>
                <div className="min-w-0">
                  <div className="truncate" style={{ color: RARITY_INFO[res.rarity].color }}>{res.name}</div>
                  <div className="text-xs text-stone-400 truncate">Nv {res.levelReq} · {Object.entries(res.stats ?? {}).map(([k, v]) => `${v! > 0 ? '+' : ''}${v} ${k}`).join(' ')}</div>
                </div>
              </div>
              {locked ? (
                <div className="text-xs text-stone-400">🔒 Te la enseña con el rango «{REP_RANKS[r.rank].name}»</div>
              ) : (
                <>
                  <Needs items={materialsFor(r)} gold={forgeCost(r)} />
                  <div className="mt-auto flex gap-2">
                    <button className="btn btn-gold flex-1" style={BTN} disabled={!!block} onClick={() => actions.startForging(r.id)} data-testid={`forge-${r.id}`}>Al yunque</button>
                    {done && <button className="btn flex-1" style={BTN} disabled={!!block} onClick={() => actions.quickForge(r.id)} data-testid={`forge-quick-${r.id}`}>Rápida · tosca</button>}
                  </div>
                  {block && <div className="text-xs text-[#d0905a]">{block}</div>}
                </>
              )}
            </div>
          );
        })}
      </div>
      <p className="font-body text-sm text-stone-400 italic">Los materiales y el trabajo de Brand se pagan al empezar. La pieza va a tu mochila; si no cabe, al almacén o a la recepción del Refugio.</p>
    </div>
  );
}
