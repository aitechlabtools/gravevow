// PROTOTIPO (maqueta): la conversación cuando ya tienes aliado y el indicador de aliado del HUD.
// ?s=errante | kael-alta | kael-baja | kael-hostil | prisionero | rojo | hud
import { MonsterSprite } from '../../../src/game/ui/common';
import { RiskBadge } from '../../../src/game/ui/DungeonScreen';
import { Bar } from '../../../src/game/ui/inventory';
import { useLayout } from '../../../src/config/ui';
import { RISK, type RiskLevel } from '../../../src/config/wanderers';

const q = new URLSearchParams(location.search);
const S = q.get('s') ?? 'errante';

type Who = { name: string; sprite: string; tag: string; risk?: RiskLevel; eye?: boolean };
const BRAM: Who = { name: 'Bram el Leñador', sprite: 'merc_bram', tag: 'Contrato de Grizk' };
const KAEL: Who = { name: 'Kael el Errante', sprite: 'rival', tag: 'Errante', risk: 'kael' };
const BRANN: Who = { name: 'Brann el Cazarrecompensas', sprite: 'wand_brann', tag: 'Ballestero', risk: 'low' };
const TOBIAS: Who = { name: 'Tobías el Ermitaño', sprite: 'merc_tobias', tag: 'Prisionero · Hechicero' };
const MALEK: Who = { name: 'Malek el Condenado', sprite: 'wand_malek', tag: 'Caballero caído', risk: 'high' };

type Opt = { kind: 'keep' | 'part' | 'betray'; label: string; line: string };
type Scene = { current: Who; next: Who; say: string; warn?: string; trust?: string; options: Opt[]; extra?: Opt };

const SCENES: Record<string, Scene> = {
  errante: {
    current: BRAM, next: BRANN,
    say: 'Brann: «Ya llevas perro, por lo que veo. Suéltalo y mi ballesta es tuya. Si no, sigue andando y no me estorbes.»',
    options: [
      { kind: 'keep', label: 'Quedarte con Bram', line: 'Brann se queda aquí. Si Bram cae, puedes volver a buscarlo.' },
      { kind: 'part', label: 'Despedir a Bram y aliarte con Brann', line: 'Bram vuelve al Bastión sano. Esta bajada del contrato se pierde, sin enfadar a Grizk.' },
      { kind: 'betray', label: 'Traicionar a Bram', line: 'Combate a muerte contra Bram, con Brann a tu lado. Grizk lo sabrá: −150 de reputación. Brann se fiará menos de ti.' },
    ],
  },
  'kael-alta': {
    current: BRAM, next: KAEL, trust: 'Confianza alta',
    say: 'Kael: «Ya tienes compañía. Yo no comparto hoguera con un leñador a sueldo… salvo que me lo pidas tú.»',
    options: [
      { kind: 'keep', label: 'Quedarte con Bram', line: 'Kael se queda aquí. Puedes volver si cambias de idea.' },
      { kind: 'part', label: 'Despedir a Bram y aliarte con Kael', line: 'Bram vuelve al Bastión sano. Esta bajada del contrato se pierde, sin enfadar a Grizk.' },
      { kind: 'betray', label: 'Traicionar a Bram', line: 'Combate a muerte contra Bram, con Kael a tu lado. −150 de reputación con Grizk. Kael se fiará menos de ti en esta bajada.' },
    ],
  },
  'kael-baja': {
    current: BRAM, next: { ...KAEL, risk: 'mid' }, trust: 'Confianza baja: te traicionó… o le traicionaste tú',
    say: 'Kael: «Otra vez tú. Me aliaré, que el oro no entiende de rencores. Pero esta vez dormiré con un ojo abierto.»',
    options: [
      { kind: 'keep', label: 'Quedarte con Bram', line: 'Kael se queda aquí, mirándote de reojo.' },
      { kind: 'part', label: 'Despedir a Bram y aliarte con Kael', line: 'Bram vuelve al Bastión. Con Kael, más riesgo de traición: si extraéis juntos y le pagas, recupera confianza.' },
      { kind: 'betray', label: 'Traicionar a Bram', line: 'Combate contra Bram con Kael a tu lado. −150 con Grizk. Kael, aún más receloso.' },
    ],
  },
  'kael-hostil': {
    current: BRAM, next: { ...KAEL, risk: 'hostile' }, trust: 'Hostil: lo has traicionado demasiadas veces',
    say: 'Kael: «Te dije que no olvidaba. Aquí se acaba.»',
    warn: '⚔ Kael ya no se alía contigo: te ataca nada más verte. Sin conversación.',
    options: [],
  },
  prisionero: {
    current: KAEL, next: TOBIAS,
    say: 'Tobías: «La luz te ha traído hasta aquí. Deja que te devuelva el favor.» Kael lo mira de reojo: «Dos bocas más que alimentar. Tú decides.»',
    options: [
      { kind: 'keep', label: 'Dejarlo encadenado', line: 'Sigue aquí. Si el hueco queda libre, puedes volver a por él.' },
      { kind: 'part', label: 'Despedir a Kael y liberar a Tobías', line: 'Kael se lleva su parte del oro encontrado hasta ahora (12) y se va sin rencor.' },
      { kind: 'betray', label: 'Traicionar a Kael', line: 'Combate contra Kael (empieza aturdido) con Tobías a tu lado. Si ganas, te quedas lo que lleva. Su confianza baja a «baja».' },
    ],
    extra: { kind: 'keep', label: 'Romper sus cadenas y dejarle marchar', line: 'No se une a ti y huye por su cuenta. Se lo contará a Grizk: +25 de reputación.' },
  },
  rojo: {
    current: KAEL, next: MALEK,
    say: 'Malek: «¿Vivo? ¿Aquí? Deja a ese perro viejo y camina conmigo. Prometo… lo de siempre.»',
    warn: '☠ Riesgo muy alto: es muy probable que Malek te traicione.',
    options: [
      { kind: 'keep', label: 'Quedarte con Kael', line: 'Malek se queda aquí, sonriendo.' },
      { kind: 'part', label: 'Despedir a Kael y aliarte con Malek', line: 'Kael se lleva su parte (12) y se va. Malek: riesgo muy alto de traición.' },
      { kind: 'betray', label: 'Traicionar a Kael', line: 'Combate contra Kael con Malek a tu lado. La confianza de Kael baja. Malek se fiará aún menos de ti.' },
    ],
  },
};

const KIND = {
  keep: { icon: '⛨', cls: 'btn', tone: 'text-stone-300' },
  part: { icon: '⇋', cls: 'btn btn-gold', tone: 'text-gold' },
  betray: { icon: '✕', cls: 'btn btn-danger', tone: 'text-blood' },
};

export function AliadosProto() {
  const phone = useLayout() === 'phone';
  if (S === 'hud') return <HudDemo phone={phone} />;
  const sc = SCENES[S];
  return (
    <div className="h-full relative" style={{ background: 'radial-gradient(ellipse at 50% 60%, #241a2c 0%, #0b0910 70%)' }}>
      <HudDemo phone={phone} ally={sc.current} onlyHud />
      <div className="absolute inset-0 bg-black/60 flex items-center justify-center" style={{ padding: 'var(--pad)' }}>
        <div className={`panel panel-gold ${phone ? 'p-3' : 'p-6'} w-full ${phone ? 'max-w-[820px]' : 'max-w-3xl'} max-h-full overflow-y-auto scroll-thin`}>
          <div className="flex gap-3">
            <div className={`shrink-0 ${phone ? 'w-20 h-24' : 'w-28 h-36'} bg-black/40 border-2 border-stone-700 flex flex-col items-center justify-end relative`}>
              {sc.next.risk && <span className="absolute top-1.5"><RiskBadge risk={sc.next.risk} size={phone ? 20 : 26} /></span>}
              <MonsterSprite sprite={sc.next.sprite} scale={phone ? 3 : 5} />
            </div>
            <div className="flex-1 min-w-0">
              <h2 className={`font-display ${phone ? 'text-xl' : 'text-2xl'}`}>{sc.next.name}</h2>
              <div className="text-sm">
                <span className="text-gold">● {sc.next.tag}</span>
                {sc.next.risk && <><span className="text-stone-400"> · </span><span style={{ color: RISK[sc.next.risk].color }}>{RISK[sc.next.risk].symbol} {RISK[sc.next.risk].label}</span></>}
                {sc.trust && <span className="text-stone-400"> · {sc.trust}</span>}
              </div>
              <p className={`font-body ${phone ? 'text-sm mt-1' : 'text-lg mt-2'} leading-snug`}>{sc.say}</p>
            </div>
          </div>
          {sc.warn && <div className="panel border-blood text-blood px-3 py-2 mt-3 text-sm font-body">{sc.warn}</div>}
          {/* Quién te acompaña ahora */}
          {sc.options.length > 0 && (
            <div className="flex items-center gap-2 mt-3 panel px-3 py-1.5">
              <span className="text-xs tracking-[0.2em] uppercase text-stone-400">Ya te acompaña</span>
              <MonsterSprite sprite={sc.current.sprite} scale={2} />
              <b className="text-heal">{sc.current.name}</b>
              <span className="text-stone-400 text-sm">· {sc.current.tag}</span>
              {sc.current.risk && <RiskBadge risk={sc.current.risk} size={16} />}
              <span className="text-stone-500 text-xs ml-auto">Solo cabe un aliado</span>
            </div>
          )}
          <div className={`grid gap-2 mt-3 ${phone ? 'grid-cols-3' : ''}`}>
            {[...sc.options, ...(sc.extra ? [sc.extra] : [])].map((o) => (
              <button key={o.label} className={`${KIND[o.kind].cls} text-left ${phone ? 'p-2' : 'px-4 py-2'} flex ${phone ? 'flex-col' : 'items-center'} gap-1 ${phone ? '' : 'gap-3'}`} style={{ minHeight: 44 }}>
                <span className={`font-display ${phone ? 'text-sm' : 'text-base'} flex items-center gap-2`}><span aria-hidden className="text-lg">{KIND[o.kind].icon}</span>{o.label}</span>
                <span className={`font-body ${phone ? 'text-[11px] leading-tight' : 'text-sm'} opacity-80 ${phone ? '' : 'ml-auto text-right max-w-[55%]'}`}>{o.line}</span>
              </button>
            ))}
            {sc.options.length === 0 && <button className="btn btn-danger" style={{ minHeight: 44 }}>Defenderte</button>}
          </div>
        </div>
      </div>
    </div>
  );
}

/** Indicador de aliado del HUD: retrato, nombre, triángulo (o contrato) y vida. */
function HudDemo({ phone, ally, onlyHud }: { phone: boolean; ally?: Who; onlyHud?: boolean }) {
  const list: Who[] = ally ? [ally] : [KAEL, { ...KAEL, risk: 'mid' }, { ...BRANN, eye: true }, BRAM, { ...TOBIAS, tag: 'Rescatado' }];
  return (
    <div className="h-full" style={{ background: onlyHud ? undefined : 'radial-gradient(ellipse at 50% 60%, #241a2c 0%, #0b0910 70%)', padding: 'var(--pad)' }}>
      {!onlyHud && <h1 className="font-display text-gold text-2xl mb-3">Indicador de aliado (HUD de la expedición)</h1>}
      <div className={`flex ${onlyHud ? '' : 'flex-wrap'} gap-3`}>
        {list.map((a, i) => (
          <div key={i} className={`panel p-2 border-heal ${phone ? 'w-48' : 'w-64'}`} style={{ minHeight: 44 }}>
            <div className="flex items-center gap-2">
              <div className="w-10 h-10 bg-black/40 border border-stone-700 overflow-hidden flex items-end justify-center shrink-0"><MonsterSprite sprite={a.sprite} scale={2} /></div>
              <div className="min-w-0 flex-1">
                <div className="text-xs text-heal truncate">Aliado · {a.name}</div>
                <div className="flex items-center gap-1 text-[11px] text-stone-400">
                  {a.risk ? <><RiskBadge risk={a.risk} size={14} /><span style={{ color: RISK[a.risk].color }}>{a.risk === 'mid' && a.name.startsWith('Kael') ? 'Confianza baja' : RISK[a.risk].label}</span></> : <span>⛨ {a.tag}</span>}
                  {a.eye && <span className="text-blood ml-1" title="Te vio traicionar: se fía menos">👁 +15 %</span>}
                </div>
              </div>
            </div>
            <div className="mt-1"><Bar value={i % 2 ? 40 : 70} max={80} color="#5fd19a" /></div>
          </div>
        ))}
      </div>
      {!onlyHud && <p className="font-body text-stone-400 mt-4 max-w-3xl">Una sola tarjeta: quien te acompaña, sea errante, Kael, contrato de Grizk o prisionero rescatado. Tocarla abre su conversación. El triángulo cambia con la confianza; el ojo marca que te ha visto traicionar a otro.</p>}
    </div>
  );
}
