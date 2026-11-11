import { useEffect, useRef, useState } from 'react';
import { actions, useGame } from '../state/store';
import { cooldownLeft, currentActor, fleeChance, opponents, type Combatant, type CombatEvent } from '../../core/combat';
import { getSkill } from '../../core/data/skills';
import { combatLoadout } from '../../core/loadout';
import { getItem } from '../../core/data/items';
import { CLASSES } from '../../core/data/classes';
import { STATUSES } from '../../core/statuses';
import { countItem } from '../../core/inventory';
import { wornSkin } from '../../core/skins';
import { allyBackUrl, heroBackUrl, monsterUrl, FLYER_SPECS, iconUrl } from '../../shared/art';
import type { Appearance, ClassId, Equipment } from '../../core/types';
import { zoneBackdrop, zoneFor } from './combatZones';
import { areaDef } from '../../core/data/zones';
import { getEnemy } from '../../core/data/enemies';
import { Bar, ItemIcon } from './inventory';
import { sfx } from '../audio';
import { ActionIcon, skillSlot, useLongPress, FX_COLOR as FX_COLORS, type Slot } from './combatActions';

const FX_COLOR = FX_COLORS;
const RANGED = new Set(['fire', 'frost', 'dark', 'holy']);

interface Float { id: number; targetId: string; text: string; color: string }

export function CombatScreen() {
  const combat = useGame((s) => s.combat)!;
  const expedition = useGame((s) => s.expedition);
  const profile = useGame((s) => s.profile)!;
  const cs = combat.state;
  const actor = currentActor(cs);
  const playerTurn = actor?.control === 'player';
  const [target, setTarget] = useState<string | null>(null);
  const [floats, setFloats] = useState<Float[]>([]);
  const [anim, setAnim] = useState<{ step: number; actorId: string | null; hit: Set<string>; fx: string | null; fromLeft: boolean }>({ step: 0, actorId: null, hit: new Set(), fx: null, fromLeft: true });
  const floatId = useRef(0);

  const sideA = cs.combatants.filter((c) => c.side === 'A');
  const sideB = cs.combatants.filter((c) => c.side === 'B');
  const player = cs.combatants.find((c) => c.control === 'player')!;
  const foes = opponents(cs, player);
  const tgt = foes.find((f) => f.id === target) ?? foes[0];

  // Animaciones y sonidos a partir de los eventos del último paso
  useEffect(() => {
    if (cs.step === 0 || cs.step === anim.step) return;
    const evs: CombatEvent[] = cs.events;
    const act = evs.find((e) => e.type === 'action') as Extract<CombatEvent, { type: 'action' }> | undefined;
    const hit = new Set<string>();
    const nf: Float[] = [];
    let anyCrit = false, anyDmg = false, anyMiss = false;
    for (const e of evs) {
      if (e.type === 'damage') {
        if (e.source === 'hit') hit.add(e.targetId);
        anyDmg = true;
        anyCrit ||= e.crit;
        nf.push({ id: ++floatId.current, targetId: e.targetId, text: `${e.crit ? '¡' : ''}-${e.amount}${e.crit ? '!' : ''}`, color: e.status ? STATUSES[e.status].color : e.crit ? '#f8dc7a' : '#ff6a5a' });
      } else if (e.type === 'heal' && e.amount > 0) nf.push({ id: ++floatId.current, targetId: e.targetId, text: `+${e.amount}`, color: '#5fd19a' });
      else if (e.type === 'mana' && e.amount > 0) nf.push({ id: ++floatId.current, targetId: e.targetId, text: `+${e.amount}`, color: '#6fa8ff' });
      else if (e.type === 'miss') { anyMiss = true; nf.push({ id: ++floatId.current, targetId: e.targetId, text: 'Esquiva', color: '#d9d3c1' }); }
      else if (e.type === 'status' && e.applied) nf.push({ id: ++floatId.current, targetId: e.targetId, text: STATUSES[e.status].name, color: STATUSES[e.status].color });
      else if (e.type === 'skip') nf.push({ id: ++floatId.current, targetId: e.actorId, text: 'Pierde el turno', color: STATUSES[e.status].color });
    }
    const actorC = act ? cs.combatants.find((c) => c.id === act.actorId) : null;
    setAnim({ step: cs.step, actorId: act?.actorId ?? null, hit, fx: act && RANGED.has(act.fx) ? act.fx : null, fromLeft: actorC?.side === 'A' });
    // La pose de golpe y la de ataque duran un momento: si no, el personaje se quedaba rojo hasta el turno siguiente.
    const step = cs.step;
    setTimeout(() => setAnim((a) => (a.step === step ? { ...a, actorId: null, hit: new Set() } : a)), 650);
    setFloats((f) => [...f, ...nf]);
    const ids = new Set(nf.map((x) => x.id));
    setTimeout(() => setFloats((f) => f.filter((x) => !ids.has(x.id))), 1150);
    if (act?.fx === 'fire') sfx('fire');
    else if (act?.fx === 'frost') sfx('frost');
    else if (act?.fx === 'dark' || act?.fx === 'holy') sfx('magic');
    else if (act?.fx === 'item') sfx('heal');
    else if (act?.fx === 'shield' || act?.fx === 'defend') sfx('equip');
    if (anyCrit) setTimeout(() => sfx('crit'), 120);
    else if (anyDmg) setTimeout(() => sfx('hit'), 120);
    else if (anyMiss) sfx('miss');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cs.step]);

  // Turnos de la IA con un ritmo legible
  useEffect(() => {
    if (cs.outcome || !actor || actor.control === 'player') return;
    const t = setTimeout(() => actions.combatAI(), 950);
    return () => clearTimeout(t);
  }, [cs.step, cs.outcome, actor]);



  // Barra D: Atacar · Ataque especial · Habilidad · Mochila y Huir. «Ataque especial» y «Mochila» se abren en el mismo sitio.
  const [menu, setMenu] = useState<'main' | 'special' | 'bag'>('main');
  const [page, setPage] = useState(0);
  const [focus, setFocus] = useState(0);
  useEffect(() => { setMenu('main'); setPage(0); setFocus(0); }, [cs.step]);

  const doAttack = () => tgt && actions.combatAct({ type: 'attack', targetId: tgt.id });
  const doSkill = (id: string) => actions.combatAct({ type: 'skill', skillId: id, targetId: getSkill(id).target === 'enemy' ? tgt?.id : undefined });

  const myRes = CLASSES[profile.character.classId].resource;
  const usableItems = ['health_potion', 'focus_tonic', 'mana_potion', 'antidote'].filter((id) => expedition && countItem(expedition.backpack, id) > 0 && (!getItem(id).resource || getItem(id).resource === myRes));
  const kit = combatLoadout(profile.character.classId, expedition?.equipment ?? profile.equipment, profile.classSkills.equipped);
  const res = player.resourceName;
  const twoHanded = kit.left.skills.length === 0;
  // Arriba los 2 de la mano derecha (rojo); abajo los 2 de la izquierda (azul). Un arma a dos manos llena los 4.
  const specialIds = twoHanded ? kit.right.skills.slice(0, 4) : [...kit.right.skills.slice(0, 2), ...kit.left.skills.slice(0, 2)];
  const specials: (Slot & { hand: 'right' | 'left'; cd: number })[] = specialIds.filter((id) => player.skills.includes(id)).map((id, i) => {
    const hand = twoHanded || i < 2 ? 'right' : 'left';
    return { ...skillSlot(id, String(i + 1), hand === 'right' ? 'weapon' : 'offhand', hand === 'right' ? `Mano derecha · ${kit.right.label}` : `Mano izquierda · ${kit.left.label}`, player, () => doSkill(id)), hand, cd: cooldownLeft(player, id) };
  });
  const ready = specials.filter((x) => !x.disabled).length;
  const waiting = specials.filter((x) => x.cd > 0).length;
  const classSlot = player.skills.includes(kit.classSkill) ? skillSlot(kit.classSkill, '3', 'class', CLASSES[profile.character.classId].name, player, () => doSkill(kit.classSkill)) : null;
  const classCd = classSlot ? cooldownLeft(player, kit.classSkill) : 0;
  const bagEntries: Slot[] = usableItems.map((id) => ({
    id, key: '', name: getItem(id).name, fx: 'bag', source: 'basic' as const, sourceLabel: `x${countItem(expedition!.backpack, id)}`, cost: 0, disabled: false,
    desc: getItem(id).description, lines: [], onUse: () => actions.combatAct({ type: 'item', itemId: id }), testId: `use-${id}`, itemId: id,
  }));
  const pages = Math.max(1, Math.ceil(bagEntries.length / 4));
  const shownBag = bagEntries.slice(page * 4, page * 4 + 4);
  const list: Slot[] = menu === 'special' ? specials : shownBag;
  const focused = list[focus] ?? list[0];
  const fleeTxt = cs.canFlee ? `${Math.round(fleeChance(player, foes) * 100)} %` : combat.kind.startsWith('betrayal') ? 'A muerte' : 'Imposible';
  const openSpecial = () => { setMenu('special'); setFocus(0); };
  const openBag = () => { setMenu('bag'); setPage(0); setFocus(0); };
  const mainCmds = [
    { label: 'Atacar', sub: `${player.basicAttack.name} · sin coste`, color: '#ff6a5a', icon: player.basicAttack.fx ?? 'slash', onUse: doAttack, testId: 'act-attack', disabled: false },
    { label: 'Ataque especial', sub: specials.length ? `${ready} listo${ready === 1 ? '' : 's'}${waiting ? ` · ${waiting} en recarga` : ''}` : 'Ninguno', color: '#a56bff', icon: specials[0]?.fx ?? 'slash', onUse: openSpecial, testId: 'act-special', disabled: !specials.length },
    { label: classSlot?.name ?? 'Habilidad', sub: !classSlot ? '—' : classCd ? `Recarga: ${classCd} turno${classCd > 1 ? 's' : ''}` : classSlot.cost ? `${classSlot.cost} ${res.toLowerCase()}` : 'sin coste', color: '#e8b33a', icon: classSlot?.fx ?? 'holy', onUse: () => classSlot && !classSlot.disabled && classSlot.onUse(), testId: 'act-class', disabled: !classSlot || classSlot.disabled },
    { label: 'Mochila', sub: usableItems.length ? `${bagEntries.length} usable${bagEntries.length > 1 ? 's' : ''}` : 'Nada', color: '#e8b33a', icon: 'bag', onUse: openBag, testId: 'act-bag', disabled: !usableItems.length },
    { label: 'Huir', sub: fleeTxt, color: '#8c8693', icon: 'flee', onUse: () => actions.combatAct({ type: 'flee' }), testId: 'act-flee', disabled: !cs.canFlee },
  ];
  // Coste de la habilidad señalada (ratón, teclado o mantener pulsado): se marca en la barra de recurso
  const spendPreview = !playerTurn || cs.outcome ? 0 : menu === 'special' ? (focused?.itemId ? 0 : (focused as { cd?: number } | undefined)?.cd ? 0 : focused?.cost ?? 0) : menu === 'main' && focus === 2 && classSlot && !classCd ? classSlot.cost : 0;
  const useEntry = (e: Slot | undefined) => { if (e && !e.disabled) e.onUse(); };
  const back = () => { setMenu('main'); setFocus(menu === 'special' ? 1 : 3); };
  const nextPage = () => { setPage((p) => (p + 1) % pages); setFocus(0); };

  // Teclado: 1-5 en la barra; dentro de un submenú 1-4, Esc vuelve y Tab pasa de página (Mochila)
  useEffect(() => {
    const h = (e: KeyboardEvent) => {
      if (cs.outcome) {
        if (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') { e.preventDefault(); actions.closeCombat(); }
        return;
      }
      if (!playerTurn) return;
      const n = Number(e.key);
      // Tab cambia de objetivo cuando hay dos enemigos (en la Mochila pasa de página)
      if (e.key === 'Tab' && menu !== 'bag' && foes.length > 1) { e.preventDefault(); const i = foes.findIndex((f) => f.id === tgt?.id); setTarget(foes[(i + 1) % foes.length].id); return; }
      if (menu === 'main') {
        if (n >= 1 && n <= 5) { e.preventDefault(); const c = mainCmds[n - 1]; if (!c.disabled) c.onUse(); }
        return;
      }
      if (e.key === 'Escape' || e.key === 'Backspace') { e.preventDefault(); back(); return; }
      if (e.key === 'Tab' && menu === 'bag' && pages > 1) { e.preventDefault(); nextPage(); return; }
      if (n >= 1 && n <= list.length) { e.preventDefault(); useEntry(list[n - 1]); return; }
      if (['ArrowDown', 'ArrowUp', 'ArrowLeft', 'ArrowRight'].includes(e.key) && list.length) { e.preventDefault(); setFocus((f) => (f + (e.key === 'ArrowDown' || e.key === 'ArrowUp' ? 2 : 1)) % list.length); }
      if (e.key === 'Enter') { e.preventDefault(); useEntry(focused); }
    };
    window.addEventListener('keydown', h);
    return () => window.removeEventListener('keydown', h);
  });

  // Escena
  const room = useGame((s) => s.hud.room);
  const seed = useGame((s) => s.dungeon?.seed);
  const dzone = useGame((s) => s.dungeon?.zone);
  const dsub = useGame((s) => s.dungeon?.subzone);
  const zone = zoneFor(areaDef(dsub, dzone).backdrops, room || 'sala', seed, foes.some((f) => f.boss));
  const bg = zoneBackdrop(zone);
  const allies = sideA.filter((c) => c.control !== 'player');
  const playerX = allies.length > 1 ? 19 : allies.length ? 22 : 27;
  const lastLines = cs.log.slice(-2);

  return (
    <div className="absolute inset-0 z-40 flex flex-col fade-in bg-void" data-testid="combat">
      <div className="relative flex-1 min-h-0 overflow-hidden combat-stage">
        {bg && <img src={bg} alt="" className="absolute inset-0 w-full h-full object-cover pixelated" />}
        <div className="absolute left-1/2 -translate-x-1/2 top-[2.5%] text-center pointer-events-none">
          <div className="font-display text-xs tracking-[0.25em] uppercase" style={{ color: zone.accent, textShadow: `0 0 12px ${zone.accent}` }}>◆ {zone.name} ◆</div>
          <div className="font-display text-parchment text-lg md:text-xl mt-0.5 drop-shadow-[0_2px_0_#000]" data-testid="combat-title">{combat.title}</div>
          <div className="flex items-center justify-center gap-1 mt-1 text-[10px] text-stone-400 turnbar" aria-label="Orden de turnos">
            <span className="mr-1">Ronda {cs.round}</span>
            {cs.order.map((id, i) => {
              const c = cs.combatants.find((x) => x.id === id)!;
              if (c.hp <= 0) return null;
              const on = i === cs.turnIndex && !cs.outcome;
              const w = c.name.split(' ');
              const short = w[0] + (w.length > 1 && /^I+$/.test(w[w.length - 1]) ? ` ${w[w.length - 1]}` : '');
              return <span key={id + i} className={`px-1.5 py-0.5 border bg-black/60 ${on ? 'border-gold text-gold' : 'border-stone-700 text-stone-300'} ${c.side === 'B' ? 'italic' : ''}`}>{short}</span>;
            })}
          </div>
        </div>
        {anim.fx && <div key={`p${anim.step}`} className={`proj absolute w-5 h-5 rounded-full ${anim.fromLeft ? 'proj-up' : 'proj-down'}`} style={{ background: FX_COLOR[anim.fx], boxShadow: `0 0 24px 8px ${FX_COLOR[anim.fx]}` }} />}

        {/* Enemigos al fondo; tu grupo en primer plano */}
        {sideB.map((c, i) => {
          const x = 75 + (i - (sideB.length - 1) / 2) * 16;
          const fly = c.sprite in FLYER_SPECS;
          const elite = !!(c.ref && c.ref !== 'rival' && getEnemy(c.ref).elite);
          const h = c.boss ? 45 : fly ? 20 : c.sprite === 'rat' ? 15 : c.sprite === 'hound' ? 24 : c.sprite === 'imp' ? 30 : elite ? 42 : 38;
          return <StageFighter key={c.id} c={c} x={x} bottom={fly ? 55 : 44} h={h} shadowW={c.boss ? 15 : 11} shadowBottom={fly ? 42 : 44.5} flip anim={anim} floats={floats}
            active={actor?.id === c.id} selectable={playerTurn && c.hp > 0 && sideB.length > 1} selected={tgt?.id === c.id && sideB.length > 1} onSelect={() => setTarget(c.id)} fly={fly} />;
        })}
        {allies.map((c, i) => <StageFighter key={c.id} c={c} x={allies.length > 1 ? 36 + i * 13 : 39} bottom={allies.length > 1 ? 11 - i * 3 : 9} h={allies.length > 1 ? 37 : 40} shadowW={allies.length > 1 ? 11 : 12} shadowBottom={allies.length > 1 ? 11.5 - i * 3 : 9.5} anim={anim} floats={floats} active={actor?.id === c.id} dim />)}
        <StageFighter c={player} x={playerX} bottom={4.5} h={52} shadowW={17} shadowBottom={5} anim={anim} floats={floats} active={actor?.id === player.id} hero={{ classId: profile.character.classId, appearance: profile.character.appearance, equipment: expedition?.equipment ?? profile.equipment, skin: wornSkin(profile) }} />

        <div className={`absolute left-[3%] top-[5%] flex flex-col info-stack ${sideB.length > 1 ? 'gap-1.5 info-duo' : 'gap-2'}`}>
          {sideB.map((c) => <InfoFrame key={c.id} c={c} level={c.level} duo={sideB.length > 1} target={foes.length > 1 && c.hp > 0 ? { on: tgt?.id === c.id, pick: () => setTarget(c.id) } : undefined} />)}
        </div>
        <div className="absolute right-[3%] bottom-[6%] flex flex-col items-end gap-2 info-stack info-stack-br">
          {allies.map((c) => <InfoFrame key={c.id} c={c} small />)}
          <InfoFrame c={player} nums level={profile.character.level} sub={CLASS_NAME[profile.character.classId]} spend={spendPreview} />
        </div>
      </div>

      {/* Barra inferior: mensaje (o ficha) + órdenes */}
      <div className="combat-bar grid grid-cols-[1fr_minmax(0,1.15fr)] gap-2.5 p-2.5 border-t-2 border-[#6b4a12] bg-[#0b0a0f]" data-testid="combat-actions">
        {cs.outcome ? (
          <div className="col-span-2 panel p-4"><Result /></div>
        ) : (
          <>
            <div className="panel px-4 py-3 font-body text-lg md:text-xl leading-snug overflow-hidden" data-testid="combat-log" aria-live="polite">
              {menu !== 'main' && playerTurn && focused ? (
                <EntryInfo e={focused} res={res} />
              ) : (
                <>
                  {lastLines.map((l, i) => <div key={cs.log.length - 2 + i} className={i === lastLines.length - 1 ? 'text-parchment' : 'text-stone-400'}>{l}</div>)}
                  {playerTurn ? <div className="text-gold">¿Qué hará {player.name}?<span className="caret">▼</span></div> : <div className="text-stone-400 italic">{actor ? `${actor.name} está actuando…` : '…'}</div>}
                </>
              )}
            </div>
            <div className={`cmdgrid ${menu !== 'main' && playerTurn ? 'sub' : ''}`} data-testid={!playerTurn || menu === 'main' ? 'main-menu' : menu === 'special' ? 'special-menu' : 'bag-menu'}>
              {!playerTurn || menu === 'main' ? (
                <>
                  {mainCmds.slice(0, 3).map((c, i) => <Cmd key={c.testId} k={i + 1} label={c.label} sub={c.sub} color={c.color} icon={c.icon} disabled={!playerTurn || c.disabled} testId={c.testId} onClick={c.onUse} on={playerTurn && i === focus} onHover={() => setFocus(i)} />)}
                  <div className="cmdsplit">
                    {mainCmds.slice(3).map((c, i) => <Cmd key={c.testId} k={i + 4} label={c.label} sub={c.sub} color={c.color} icon={c.icon} disabled={!playerTurn || c.disabled} testId={c.testId} onClick={c.onUse} on={playerTurn && i + 3 === focus} onHover={() => setFocus(i + 3)} half />)}
                  </div>
                </>
              ) : (
                <>
                  <div className="cmdback">
                    <button className="cmd back" style={{ ['--c' as string]: '#8c8693' }} onClick={back} data-testid="btn-menu-back"><span className="text-xl leading-none">◂</span><span className="cmd-label">Volver</span><kbd>Esc</kbd></button>
                    {menu === 'bag' && pages > 1 && <button className="cmd back" style={{ ['--c' as string]: '#e8b33a' }} onClick={nextPage} data-testid="btn-page-next"><span className="cmd-label">{page + 1} / {pages} ▸</span><span className="text-[11px] opacity-65">Página</span><kbd>Tab</kbd></button>}
                  </div>
                  {list.map((e, i) => (
                    <Cmd key={e.id} k={i + 1} label={e.name} sub={e.itemId ? e.sourceLabel ?? '' : e.cost ? `${e.cost} ${res.toLowerCase()}` : 'sin coste'}
                      color={e.itemId ? '#e8b33a' : (e as { hand?: string }).hand === 'left' ? '#5aa0ff' : '#ff6a5a'} icon={e.fx} itemId={e.itemId}
                      cd={(e as { cd?: number }).cd} disabled={e.disabled} testId={e.testId} on={i === focus} onHover={() => setFocus(i)}
                      onLong={() => setFocus(i)} onClick={() => useEntry(e)} />
                  ))}
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const SRC_COLOR: Record<string, string> = { basic: '#d9d3c1', class: '#e8b33a', weapon: '#a56bff', offhand: '#8fa8c8' };
const CLASS_NAME: Record<string, string> = { warrior: 'Guerrero', mage: 'Mago', rogue: 'Pícaro', cleric: 'Clérigo' };

function Cmd({ k, label, sub, color, icon, itemId, disabled, on, onClick, onHover, onLong, testId, half, cd }: { k: number; label: string; sub: string; color: string; icon: string; itemId?: string; disabled?: boolean; on?: boolean; onClick?: () => void; onHover?: () => void; onLong?: () => void; testId: string; half?: boolean; cd?: number }) {
  const lp = useLongPress(() => onLong?.());
  return (
    <button className={`cmd ${on && !disabled ? 'on' : ''} ${half ? 'half' : ''} ${cd ? 'cd' : ''}`} aria-disabled={disabled || undefined} style={{ ['--c' as string]: color }} disabled={disabled && !onLong} {...(onLong ? lp.handlers : {})}
      onClick={() => { if (lp.consume() || disabled) return; onClick?.(); }} onPointerEnter={(e) => { if (e.pointerType === 'mouse') onHover?.(); }} data-testid={testId}>
      <span className="cur">▶</span><kbd>{k}</kbd>
      {itemId ? <ItemIcon itemId={itemId} size={24} /> : <ActionIcon fx={icon} size={24} color={color} />}
      <span className="flex flex-col leading-tight min-w-0"><span className="cmd-label">{label}</span><span className="text-[11px] opacity-65 truncate">{cd ? `Recarga: ${cd} turno${cd > 1 ? 's' : ''}` : sub}</span></span>
      {cd ? <span className="cdturns" aria-label={`Faltan ${cd} turnos`}>{cd}</span> : null}
    </button>
  );
}

function EntryInfo({ e, res }: { e: Slot; res: string }) {
  return (
    <div className="flex flex-col gap-1 h-full" data-testid="entry-info">
      <div className="flex items-baseline justify-between gap-2">
        <span className="font-display text-parchment text-lg">{e.name}</span>
        <span className="font-pixel text-xs text-[#9cc3ff] whitespace-nowrap">{e.itemId ? e.sourceLabel : e.cost ? `${e.cost} ${res.toLowerCase()}` : 'sin coste'}</span>
      </div>
      {e.lines.length > 0 && <div className="font-pixel text-[11px]" style={{ color: SRC_COLOR[e.source] }}>{[e.sourceLabel && !e.itemId ? e.sourceLabel : '', ...e.lines].filter(Boolean).join(' · ')}</div>}
      <div className="text-base text-stone-200 leading-snug">{e.desc}</div>
      {e.reason && <div className="font-pixel text-xs text-[#ff7a6a]">{e.reason}</div>}
    </div>
  );
}

function InfoFrame({ c, nums, sub, small, level, spend = 0, target, duo }: { c: Combatant; nums?: boolean; sub?: string; small?: boolean; level?: number; spend?: number; target?: { on: boolean; pick: () => void }; duo?: boolean }) {
  const kind = c.boss ? 'boss' : c.side === 'A' && c.control !== 'player' ? 'ally' : '';
  // Con dos enemigos, tocar su ficha lo marca como objetivo (zona táctil grande)
  const pick = target ? { role: 'button', tabIndex: -1, 'aria-pressed': target.on, onClick: target.pick, style: { cursor: 'pointer', outline: target.on ? '2px solid #c4283b' : undefined, outlineOffset: 1 } } : {};
  return (
    <div className={`frame ${kind} ${small ? 'frame-sm' : ''} ${duo ? 'frame-duo' : ''}`} data-testid={`info-${c.id}`} {...pick}>
      <div className="flex items-center gap-2.5">
        {!small && level !== undefined && <span className={`lvl ${c.boss ? 'boss' : ''}`} title={`Nivel ${level}`}>{level}</span>}
        <div className="flex-1 min-w-0">
          <div className={`fname ${c.side === 'B' ? 'text-[#ffb3a8]' : ''}`}>{target?.on ? <span className="text-blood" data-testid={`target-${c.id}`} aria-label="Objetivo">▶ </span> : ''}{c.name}{kind === 'ally' ? <span className="text-heal text-xs"> · aliado</span> : ''}</div>
          {sub && !small && <div className="text-[11px] text-stone-400 truncate">{sub}</div>}
        </div>
        {small && <span className="text-xs text-stone-400">{c.hp} / {c.stats.maxHp}</span>}
      </div>
      <div className="hprow"><span className="text-[#ff7a6a]">PV</span><Bar value={c.hp} max={c.stats.maxHp} color="#c4283b" testId={`hp-${c.id}`} />{nums && <b className="hpnum" data-testid={`hpnum-${c.id}`}>{c.hp}<i> / {c.stats.maxHp}</i></b>}</div>
      {!small && c.stats.maxMp > 0 && <div className="hprow"><span className={c.resourceName === 'Ímpetu' ? 'text-[#ffc08a]' : 'text-[#9cc3ff]'}>{c.resourceName === 'Ímpetu' ? 'IM' : 'MA'}</span><Bar value={c.mp} max={c.stats.maxMp} color={c.resourceName === 'Ímpetu' ? '#e08a3d' : '#3d7be0'} spend={spend} testId={`mp-${c.id}`} />{nums && <b className="hpnum" data-testid={`mpnum-${c.id}`}>{c.mp}<i> / {c.stats.maxMp}</i></b>}</div>}
      {!small && (!duo || c.defending || c.statuses.length > 0) && (
        <div className="flex justify-between items-center mt-1 min-h-[16px] gap-2">
          <span className="flex flex-wrap gap-1">
            {c.defending && <span className="chip" style={{ color: '#d9d3c1', borderColor: '#8c8693' }}>En guardia</span>}
            {c.statuses.map((st) => <span key={st.id} className="chip" style={{ color: STATUSES[st.id].color, borderColor: STATUSES[st.id].color }} title={STATUSES[st.id].description}>{STATUSES[st.id].name} {st.turns}</span>)}
          </span>
        </div>
      )}
    </div>
  );
}

function StageFighter({ c, x, bottom, h, shadowW, shadowBottom, flip, anim, floats, active, selectable, selected, onSelect, hero, fly, dim }: {
  c: Combatant; x: number; bottom: number; h: number; shadowW: number; shadowBottom: number; flip?: boolean;
  anim: { step: number; actorId: string | null; hit: Set<string> }; floats: Float[]; active: boolean; selectable?: boolean; selected?: boolean; onSelect?: () => void;
  hero?: { classId: ClassId; appearance: Appearance; equipment: Equipment; skin: string | null }; fly?: boolean; dim?: boolean;
}) {
  const dead = c.hp <= 0;
  const acting = anim.actorId === c.id;
  const hurt = anim.hit.has(c.id);
  const pose = hurt ? 'hurt' : acting ? 'attack' : 'idle';
  const motion = acting ? (flip ? 'lunge-left' : 'lunge-right') : hurt ? 'hit-shake' : '';
  // Tu grupo se ve de espaldas (primer plano); los enemigos, de frente
  const src = hero ? heroBackUrl(hero.classId, hero.appearance, 8, pose, hero.equipment, hero.skin) : !flip ? allyBackUrl(c.sprite, 8, pose) : monsterUrl(c.sprite, 8, pose);
  return (
    <>
      <div className="fighter-shadow" style={{ left: `${x}%`, bottom: `${shadowBottom}%`, width: `${shadowW}%`, opacity: dead ? 0.3 : 1 }} />
      <div className={`absolute ${selectable ? 'cursor-pointer' : ''}`} style={{ left: `${x}%`, bottom: `${bottom}%`, height: `${h}%`, translate: '-50% 0' }} onClick={selectable ? onSelect : undefined} data-testid={`fighter-${c.id}`}>
        {(active || selected) && !dead && <div className={`absolute left-1/2 -translate-x-1/2 -top-6 text-xl ${selected ? 'text-blood' : 'text-gold'} turn-arrow`}>▼</div>}
        <div key={`${anim.step}-${c.id}`} className={`h-full ${dead ? 'death-fade' : motion || (fly ? 'bob' : 'breathe')}`}>
          <img src={src} alt={c.name} draggable={false} className={`h-full w-auto pixelated ${flip ? '-scale-x-100' : ''}`} style={dim ? { filter: 'brightness(.85)' } : undefined} />
        </div>
        {floats.filter((f) => f.targetId === c.id).map((f, i) => (
          <div key={f.id} className="dmg-float absolute left-1/2 font-pixel text-2xl font-semibold" style={{ top: `${10 + i * 12}%`, color: f.color, textShadow: '2px 2px 0 #000, -1px -1px 0 #000' }}>{f.text}</div>
        ))}
      </div>
    </>
  );
}

function Result() {
  const combat = useGame((s) => s.combat)!;
  const o = combat.state.outcome;
  const r = combat.rewards;
  const title = o === 'victory' ? '¡Victoria!' : o === 'fled' ? 'Has escapado' : 'Has caído';
  const color = o === 'victory' ? 'text-gold' : o === 'fled' ? 'text-stone-300' : 'text-blood';
  return (
    <div className="flex flex-col h-full" data-testid="combat-result">
      <div className={`font-display text-3xl ${color}`}>{title}</div>
      {r && (
        <div className="mt-2 text-sm space-y-1">
          <div><span className="text-arcane">+{r.xp} XP</span></div>
          {(r.items.length > 0 || r.gold > 0) && (
            <div className="flex flex-wrap gap-1 items-center">
              <span className="text-stone-300 mr-1">En el saco:</span>
              {r.gold > 0 && <span className="flex items-center gap-1 bg-black/30 px-1 text-gold" data-testid="combat-bag-gold"><img src={iconUrl(r.gold <= 3 ? 'coins1' : r.gold <= 7 ? 'coins2' : 'coins3', 3)} width={20} height={20} alt="" className="pixelated" />{r.gold} {r.gold === 1 ? 'moneda' : 'monedas'}</span>}
              {r.items.map((it) => <span key={it.uid} className="flex items-center gap-1 bg-black/30 px-1"><ItemIcon itemId={it.itemId} size={20} />{getItem(it.itemId).name}{it.qty > 1 ? ` x${it.qty}` : ''}</span>)}
            </div>
          )}
          {r.bagId && <div className="text-stone-300" data-testid="combat-bag-note">Ha caído un saco a tus pies: al continuar, coge lo que quieras.</div>}
        </div>
      )}
      {o === 'defeat' && <p className="font-body text-lg text-stone-300 mt-2">La cripta reclama tu cuerpo y todo lo que llevabas encima.</p>}
      {o === 'fled' && <p className="font-body text-lg text-stone-300 mt-2">Te alejas a toda prisa. El enemigo vuelve a su guarida… por ahora.</p>}
      <button className="btn btn-gold mt-auto self-start" onClick={() => actions.closeCombat()} data-testid="btn-combat-continue" autoFocus>Continuar <kbd className="opacity-60">Enter</kbd></button>
    </div>
  );
}

