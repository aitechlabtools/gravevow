// Atuendos: la ranura «Atuendo» del Alijo, el selector para ponérselos y la Tienda donde se compran con oro.
// Un atuendo es un traje completo y solo estético; el arma y la secundaria se siguen viendo encima.
import { g } from '../../../core/gender';
import { useState } from 'react';
import { actions, useGame } from '../../state/store';
import { SKINS, SKIN_ORDER, type SkinDef } from '../../../core/data/skins';
import { buyBlock, ownsSkin, wornSkin } from '../../../core/skins';
import { heroUrl, iconUrl } from '../../../shared/art';
import { emptyEquipment } from '../../../core/inventory';
import { HeroSprite, Modal } from '../common';
import { useLayout } from '../../../config/ui';
import { sfx } from '../../audio';

const RARITY = { rare: { name: 'Raro', color: '#4f8cff' }, epic: { name: 'Épico', color: '#b07aff' }, legendary: { name: 'Legendario', color: '#ff9a3a' } } as const;
const fmt = (n: number) => n.toLocaleString('es-ES');

/** Ranura cosmética: mismo tamaño que las pequeñas, borde violeta y rombo. No admite objetos: al tocarla, el selector. */
export function SkinSlot({ onClick }: { onClick: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const worn = wornSkin(profile);
  return (
    <div className="flex flex-col items-center gap-0.5">
      <button className="slot slot-skin" onClick={() => { sfx('click'); onClick(); }} data-testid="slot-skin" data-item={worn ?? ''}
        aria-label={worn ? `Atuendo: ${SKINS[worn].name}. Cambiar` : 'Atuendo: ninguno. Elegir'} title={worn ? SKINS[worn].name : 'Atuendo'}>
        {worn
          ? <span className="block overflow-hidden" style={{ width: 36, height: 36 }}><img src={heroUrl(ch.classId, ch.appearance, 2, 0, 'idle', emptyEquipment(), worn)} className="pixelated max-w-none" style={{ marginTop: -2, marginLeft: -2 }} alt="" /></span>
          : <img src={iconUrl('robe_gold', 3)} width={30} height={30} className="pixelated opacity-25" alt="" />}
        <span className="slot-skin-gem" aria-hidden>◆</span>
      </button>
      <span className="text-[10px] uppercase tracking-wider text-[#c79bff]">Atuendo</span>
    </div>
  );
}

/** Selector: «Sin atuendo» y los tuyos, con vista previa sobre tu personaje y tu arma. */
export function SkinPicker({ onClose, onShop }: { onClose: () => void; onShop?: () => void }) {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const layout = useLayout();
  const scale = layout === 'phone' ? 3 : 5;
  const worn = wornSkin(profile);
  const owned = SKIN_ORDER.filter((id) => ownsSkin(profile, id));
  const pick = (id: string | null) => { actions.equipSkin(id); onClose(); };
  const tile = (id: string | null, name: string, sub: string) => (
    <button key={id ?? 'none'} className={`skin-tile ${worn === id ? 'on' : ''}`} onClick={() => pick(id)} aria-pressed={worn === id} data-testid={`pick-${id ?? 'none'}`}>
      <HeroSprite classId={ch.classId} appearance={ch.appearance} equipment={profile.equipment} skin={id} scale={scale} animate={false} />
      <span className="font-display text-sm text-parchment text-center leading-tight">{name}</span>
      <span className="text-[11px] text-stone-400">{worn === id ? 'Puesto' : sub}</span>
    </button>
  );
  return (
    <Modal onClose={onClose} wide testId="skin-picker">
      <h2 className="ui-ptitle border-0 !pt-0">Atuendo</h2>
      <p className="font-body text-stone-300 text-center text-[15px] -mt-1 mb-3">Solo cambia cómo te ven. Tu armadura sigue protegiéndote debajo.</p>
      <div className="flex gap-3 justify-center flex-wrap">
        {tile(null, 'Sin atuendo', 'Se ve tu armadura')}
        {owned.map((id) => tile(id, SKINS[id].name, 'Tuyo'))}
      </div>
      <p className="text-[12px] text-stone-400 text-center mt-3">
        {owned.length ? 'Consigue más atuendos en la Tienda.' : 'Aún no tienes atuendos. Los encontrarás en la Tienda.'}
      </p>
      <div className="flex justify-center gap-2 mt-3">
        {onShop && <button className="btn" onClick={() => { onClose(); onShop(); }} data-testid="picker-to-shop">Ir a la Tienda</button>}
        <button className="btn" onClick={onClose}>Cerrar</button>
      </div>
    </Modal>
  );
}

/** Tienda de atuendos: tarjetas con vista previa (con tu arma), precio y estado. Se paga con oro del juego. */
export function Tienda() {
  const profile = useGame((s) => s.profile)!;
  const ch = profile.character;
  const layout = useLayout();
  const phone = layout === 'phone';
  const scale = phone ? 4 : layout === 'tablet' ? 7 : 9;
  const worn = wornSkin(profile);
  const [confirm, setConfirm] = useState<SkinDef | null>(null);
  const [bought, setBought] = useState<SkinDef | null>(null);
  return (
    <div className="h-full overflow-y-auto scroll-thin" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="shop">
      <div className="min-h-full flex flex-col items-center justify-center">
        <h2 className="ui-ptitle border-0 !text-[clamp(14px,1.8vw,26px)] !tracking-[0.18em]">Atuendos de VarkHollow</h2>
        {!phone && <p className="font-body text-stone-300 text-center -mt-2 mb-3">{g('Trajes completos para {tu aventurero|tu aventurera}.')} Solo cambian cómo te ven: nunca dan ventaja.</p>}
        <div className="grid w-full max-w-[1200px]" style={{ gridTemplateColumns: 'repeat(3, minmax(0,1fr))', gap: 'var(--gap)' }}>
          {SKIN_ORDER.map((id) => {
            const s = SKINS[id];
            const has = ownsSkin(profile, id);
            const on = worn === id;
            const block = buyBlock(profile, id);
            const r = RARITY[s.rarity];
            return (
              <section key={id} className={`panel ${on ? 'panel-gold' : ''} ui-card`} data-testid={`skin-card-${id}`}>
                <div className="ui-arch" style={{ height: 26 * scale + (phone ? 8 : 24) }}>
                  <div className="pb-1"><HeroSprite classId={ch.classId} appearance={ch.appearance} equipment={profile.equipment} skin={id} scale={scale} animate={false} /></div>
                </div>
                <div className="text-center">
                  <div className="font-display text-parchment leading-tight" style={{ fontSize: phone ? 14 : 20 }}>{s.name}</div>
                  <div className="text-[11px] uppercase tracking-[0.15em]" style={{ color: r.color }}>{r.name}{s.sprites ? '' : <span className="text-stone-500 normal-case tracking-normal"> · arte provisional</span>}</div>
                </div>
                {!phone && <p className="font-body text-stone-300 text-[15px] leading-snug text-center">{s.description}</p>}
                <div className="mt-auto flex flex-col gap-1.5">
                  {has ? (
                    on
                      ? <div className="btn w-full text-center opacity-80 grid place-items-center" style={{ minHeight: 'var(--btn-h)' }} data-testid={`skin-equipped-${id}`}>✓ Equipada</div>
                      : <button className="btn btn-gold w-full" style={{ minHeight: 'var(--btn-h)' }} onClick={() => actions.equipSkin(id)} data-testid={`skin-equip-${id}`}>Equipar</button>
                  ) : (
                    <>
                      <button className="btn btn-gold w-full" style={{ minHeight: 'var(--btn-h)' }} disabled={!!block} onClick={() => setConfirm(s)} data-testid={`shop-buy-${id}`}>
                        {profile.gold < s.price.amount ? `Oro insuficiente · ${fmt(s.price.amount)}` : `Comprar · ${fmt(s.price.amount)} oro`}
                      </button>
                      {block && <div className="text-[12px] text-blood text-center" data-testid={`shop-block-${id}`}>{block}</div>}
                    </>
                  )}
                </div>
              </section>
            );
          })}
        </div>
        <p className="text-[11px] text-stone-500 mt-3 text-center">Pagas con el oro que ganas jugando. No hay pagos con dinero real.</p>
      </div>

      {confirm && (
        <Modal onClose={() => setConfirm(null)} testId="skin-confirm">
          <h2 className="ui-ptitle border-0 !pt-0">¿Comprar este atuendo?</h2>
          <div className="flex items-center gap-4">
            <HeroSprite classId={ch.classId} appearance={ch.appearance} equipment={profile.equipment} skin={confirm.id} scale={4} animate={false} />
            <div className="font-body">
              <div className="font-display text-xl text-parchment">{confirm.name}</div>
              <div className="text-stone-300 mt-1">Precio: <span className="text-gold">{fmt(confirm.price.amount)} oro</span></div>
              <div className="text-stone-400 text-sm">Te quedarán {fmt(profile.gold - confirm.price.amount)} de oro. Es tuyo para siempre: no ocupa sitio y no se pierde al morir.</div>
            </div>
          </div>
          <div className="flex gap-2 mt-4 justify-end flex-wrap">
            <button className="btn" onClick={() => setConfirm(null)} data-testid="skin-confirm-cancel">Cancelar</button>
            <button className="btn btn-gold" onClick={() => { if (actions.buySkin(confirm.id)) setBought(confirm); setConfirm(null); }} data-testid="skin-confirm-ok">Comprar por {fmt(confirm.price.amount)} oro</button>
          </div>
        </Modal>
      )}
      {bought && (
        <Modal onClose={() => setBought(null)} testId="skin-bought">
          <h2 className="ui-ptitle border-0 !pt-0">¡Es tuyo!</h2>
          <p className="font-body text-lg text-center">{bought.name} ya está en tu colección. ¿Te lo pones ahora?</p>
          <div className="flex gap-2 mt-4 justify-center flex-wrap">
            <button className="btn" onClick={() => setBought(null)} data-testid="skin-bought-later">Más tarde</button>
            <button className="btn btn-gold" onClick={() => { actions.equipSkin(bought.id); setBought(null); }} data-testid="skin-bought-equip">Ponérmelo</button>
          </div>
        </Modal>
      )}
    </div>
  );
}
