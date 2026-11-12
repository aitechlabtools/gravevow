import { capacityOf } from '../../../core/gold';
import { durability, isBroken, maxDurability, wearLevel } from '../../../core/durability';
import { WEAR_COLOR } from '../../../config/durability';
// Ficha del objeto elegido: qué es, qué da y qué puedes hacer con él. Si es un arma o una secundaria,
// muestra las habilidades que te daría al equiparla (así se comparan armas sin ir y volver).
import { AFFIXES, specialMods, stackName, stackRarity, stackStats } from '../../../core/data/rarity';
import { basicAttackOf, isTwoHanded, itemSpecials } from '../../../core/data/weapons';
import { useGame, containersFor } from '../../state/store';
import { stackAt, type Loc } from '../../../core/inventory';
import { getItem, RARITY_INFO } from '../../../core/data/items';
import { CLASSES, STAT_LABELS } from '../../../core/data/classes';
import { STAT_KEYS } from '../../../core/types';
import { getSkill } from '../../../core/data/skills';
import { QUALITIES } from '../../../core/data/forge';
import { compareWithEquipped, FoodLine, ItemIcon, SLOT_LABELS, type InvMode } from '../inventory';
import { ItemActions } from '../common';
import { useIsTouch } from '../../../shared/device';

const CATEGORY: Record<string, string> = { potion: 'Consumible', material: 'Material', relic: 'Reliquia', jewel: 'Joya', key: 'Llave', quest: 'Objeto de misión', coin: 'Moneda', gold: 'Oro', container: 'Saco de oro', weapon: 'Arma', shield: 'Escudo', tool: 'Herramienta' };

export function ItemCard({ loc, mode, onClear, compact = false }: { loc: Loc | null; mode: InvMode; onClear: () => void; compact?: boolean }) {
  const s = useGame((x) => x);
  const touch = useIsTouch();
  const c = containersFor(s);
  const st = loc && c ? stackAt(c, loc) : null;
  if (!st || !loc) {
    return (
      <div className="font-body text-stone-400 italic text-[15px] leading-snug" data-testid="item-card-empty">
        {touch ? 'Toca un objeto para ver su ficha. Después, toca una casilla libre para llevarlo allí.' : 'Elige un objeto para ver su ficha. Arrástralo para moverlo, o haz clic en él y luego en una casilla libre. Doble clic: acción rápida.'}
      </div>
    );
  }
  const def = getItem(st.itemId);
  const r = RARITY_INFO[stackRarity(st, def)];
  const who = s.profile?.character;
  const stats = def.stats || st.affixes?.length || st.runes?.some(Boolean) ? stackStats(st, def) : null;
  const specials = def.slot === 'mainHand' || def.slot === 'offHand' ? itemSpecials(def) : [];
  const statLine = stats ? STAT_KEYS.filter((k) => stats[k]).map((k) => `${stats[k]! > 0 ? '+' : ''}${stats[k]} ${k === 'maxMp' && who ? CLASSES[who.classId].resourceName : STAT_LABELS[k]}`) : [];
  const wrongClass = !!(def.slot && who && def.classes && !def.classes.includes(who.classId));
  const tooHigh = !!(def.slot && who && def.levelReq && who.level < def.levelReq);
  // Comparación con lo que llevas puesto en esa ranura (no si es lo que ya llevas)
  const cmp = loc.kind === 'grid' ? compareWithEquipped(st, s.profile?.equipment) : null;
  const wornSpecials = cmp?.worn && (def.slot === 'mainHand' || def.slot === 'offHand') ? itemSpecials(getItem(cmp.worn.itemId)) : [];
  return (
    <div className="flex gap-3 items-start" data-testid="item-card">
      <div className="slot shrink-0" style={{ borderColor: r.color + 'aa' }}><ItemIcon itemId={st.itemId} />{st.qty > 1 && <span className="qty">{st.qty}</span>}</div>
      <div className="min-w-0 flex-1">
        <div className="font-display leading-tight" style={{ color: r.color, fontSize: compact ? 15 : 18 }} data-testid="item-card-name">{stackName(st, def)}</div>
        <div className="text-[11px] text-stone-400">
          {r.name} · {def.slot ? SLOT_LABELS[def.slot] : CATEGORY[def.category] ?? def.category}
          {def.levelReq && def.slot ? ` · Nv ${def.levelReq}` : ''}
          {st.quality !== undefined ? ` · calidad ${QUALITIES[st.quality].name.toLowerCase()}` : ''}
          {st.uses !== undefined || def.uses !== undefined ? ` · usos ${st.uses ?? def.uses}/${def.uses}` : ''}
          {def.uses === undefined && maxDurability(st) > 0 ? <span style={{ color: WEAR_COLOR[wearLevel(st)] }} data-testid="item-card-dur"> · {isBroken(st) ? 'ROTA: sin estadísticas ni especiales' : `durabilidad ${durability(st)}/${maxDurability(st)}`}</span> : null}
        </div>
        <div className="text-[13px] mt-1 leading-snug">
          {statLine.length > 0 && <span className="text-heal">{statLine.join(' · ')}</span>}
          {def.slot === 'mainHand' && <span className="text-stone-300">{statLine.length ? ' · ' : ''}ataque: {basicAttackOf(def).name}</span>}
          {specials.length ? (
            <span className={def.slot === 'offHand' ? 'text-frost' : 'text-[#c79bff]'} data-testid="item-card-skills">
              {statLine.length || def.slot === 'mainHand' ? ' · ' : ''}especiales{isTwoHanded(def) ? ' (a dos manos)' : ''}: {specials.map((g) => getSkill(g).name).join(', ')}
            </span>
          ) : null}
          {specials.length && Object.keys(specialMods(st, def, specials)).length ? <span className="text-[#c79bff]" data-testid="item-card-mods">{' · '}{Object.entries(specialMods(st, def, specials)).map(([id, m]) => `${getSkill(id).name}${m.cooldown ? ` ${m.cooldown} recarga` : ''}${m.power ? ` +${Math.round(m.power * 100)} %` : ''}`).join(', ')}</span> : null}
          {st.affixes?.length ? <span className="text-gold" data-testid="item-card-affixes">{' · '}{st.affixes.map((a) => AFFIXES[a]?.description).filter(Boolean).join(' ')}</span> : null}
          {st.runes?.some(Boolean) ? <span className="text-[#b58cff]" data-testid="item-card-runes">{' · Runas: '}{st.runes.filter((x): x is string => !!x).map((r) => getItem(r).name).join(', ')}</span> : null}
          {capacityOf(st) > 0 && <span className="text-gold text-sm mr-2" data-testid="card-gold">Lleva {st.gold ?? 0}/{capacityOf(st)} monedas.</span>}
          {!statLine.length && !specials.length && <span className="font-body italic text-stone-300 text-[15px]">{def.description}</span>}
        </div>
        {def.use?.kind === 'need' && <FoodLine itemId={def.id} className="text-[13px] mt-1" />}
        {cmp && (
          <div className="mt-1.5 text-[13px] leading-snug" data-testid="item-card-compare">
            <span className="text-stone-400">{cmp.wornName ? <>Frente a <span className="text-stone-200">{cmp.wornName}</span>: </> : 'Ranura vacía: '}</span>
            {cmp.diffs.length === 0 ? <span className="text-stone-300">igual</span> : <>
              <span className={cmp.better > cmp.worse ? 'text-heal' : cmp.worse > cmp.better ? 'text-blood' : 'text-stone-200'}>mejor en {cmp.better} · peor en {cmp.worse}</span>
              <span className="text-stone-500"> — </span>
              {cmp.diffs.map(([k, d], i) => <span key={k} className={d > 0 ? 'text-heal' : 'text-blood'}>{i ? ' · ' : ''}{d > 0 ? '▲' : '▼'} {d > 0 ? '+' : ''}{d} {k === 'maxMp' && who ? CLASSES[who.classId].resourceName : STAT_LABELS[k]}</span>)}
            </>}
            {wornSpecials.length > 0 && specials.length > 0 && wornSpecials.join() !== specials.join() && <span className="block text-stone-400"> Ahora llevas: {wornSpecials.map((g) => getSkill(g).name).join(', ')}</span>}
          </div>
        )}
        {(wrongClass || tooHigh) && <div className="text-xs text-blood mt-0.5">{wrongClass ? `Solo para: ${def.classes!.map((k) => CLASSES[k].name).join(', ')}` : `Requiere nivel ${def.levelReq} (tienes ${who!.level})`}</div>}
        <div className="mt-2"><ItemActions loc={loc} mode={mode} onClear={onClear} buttonsOnly /></div>
      </div>
    </div>
  );
}
