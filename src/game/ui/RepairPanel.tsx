// Reparaciones de Maese Brand: todo lo dañado (puesto, mochila y almacén) con su precio.
import { actions, useGame } from '../state/store';
import { repairJobs, type RepairRef } from '../../core/repair';
import { durability, maxDurability, wearLevel } from '../../core/durability';
import { getItem, RARITY_INFO } from '../../core/data/items';
import { stackRarity } from '../../core/data/rarity';
import { ItemIcon } from './inventory';
import { WEAR_COLOR } from '../../config/durability';

const WHERE: Record<RepairRef['where'], string> = { equipment: 'Puesto', backpack: 'Mochila', stash: 'Almacén' };

function refKey(r: RepairRef): string {
  return r.where === 'equipment' ? `eq-${r.slot}` : `${r.where}-${r.index}`;
}

export function RepairPanel() {
  const profile = useGame((s) => s.profile)!;
  const jobs = repairJobs(profile);
  const total = jobs.reduce((n, j) => n + j.cost, 0);
  return (
    <div className="space-y-3" data-testid="repair">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-base text-stone-300 max-w-2xl">
          Las armas se mellan al golpear y la armadura al encajar golpes. Lo roto no se pierde, pero no sirve hasta que pase por el yunque.
        </p>
        <button className="btn btn-gold py-2 px-4" style={{ minHeight: 44 }} disabled={!jobs.length || profile.gold < total}
          onClick={() => actions.repair()} data-testid="repair-all">
          {jobs.length ? `Reparar todo · ${total} oro` : 'Nada que reparar'}
        </button>
      </div>
      {jobs.length === 0 ? (
        <p className="font-body italic text-stone-400">«Todo lo que traes está entero. Vuelve cuando lo hayas maltratado.»</p>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-2">
          {jobs.map((j) => {
            const def = getItem(j.stack.itemId);
            const lvl = wearLevel(j.stack);
            const d = durability(j.stack), max = maxDurability(j.stack);
            return (
              <div key={refKey(j.ref)} className="bg-black/30 border border-stone-800 p-2 flex items-center gap-2" data-testid={`repair-${refKey(j.ref)}`}>
                <div className="slot shrink-0" style={{ borderColor: RARITY_INFO[stackRarity(j.stack, def)].color + 'aa' }}><ItemIcon itemId={def.id} /></div>
                <div className="min-w-0 flex-1">
                  <div className="truncate" style={{ color: RARITY_INFO[stackRarity(j.stack, def)].color }}>{def.name}</div>
                  <div className="text-xs truncate"><span className="text-stone-400">{WHERE[j.ref.where]} · </span><span style={{ color: WEAR_COLOR[lvl] }}>{lvl === 'broken' ? 'Rota' : `${d}/${max}`}</span></div>
                </div>
                <button className="btn py-1 px-3 shrink-0" style={{ minHeight: 44 }} disabled={profile.gold < j.cost} onClick={() => actions.repair(j.ref)}>{j.cost} oro</button>
              </div>
            );
          })}
        </div>
      )}
      <p className="font-body text-sm text-stone-400 italic">El oro se coge del almacén. En la mazmorra, un kit de reparación (lo vende Brand) remienda lo que llevas puesto y tus picos.</p>
    </div>
  );
}
