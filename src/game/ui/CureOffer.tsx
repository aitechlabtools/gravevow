// Curación completa (Fase 10): «Curarse por N de oro». Tras caer, 1 moneda (o gratis si no te queda ninguna).
// Sale al volver al Bastión (resumen), en la enfermería de Vesper y en Intendencia → Estado.
import { g } from '../../core/gender';
import { actions, useGame } from '../state/store';
import { cureCost } from '../../core/anatomy';
import { baseBody } from '../state/medicalActions';

export function useCure() {
  const profile = useGame((s) => s.profile);
  if (!profile) return null;
  const c = cureCost(baseBody(profile), !!profile.fallen, profile.gold);
  return c.price || c.free ? { ...c, fallen: !!profile.fallen } : null;
}

export function CureButton({ className = '' }: { className?: string }) {
  const c = useCure();
  if (!c) return null;
  return (
    <button className={`btn btn-gold py-2 px-4 ${className}`} style={{ minHeight: 44 }} onClick={() => actions.vesperTreat()} data-testid="cure-btn">
      {c.free ? 'Curarse gratis' : `Curarse por ${c.price} de oro`}
    </button>
  );
}

/** Aviso al volver al Bastión con heridas: qué arrastras y el botón para quedar entero. */
export function CureOffer() {
  const c = useCure();
  if (!c) return null;
  return (
    <div className="panel panel-gold p-3 flex flex-wrap items-center gap-3" data-testid="cure-offer">
      <p className="font-body text-base text-stone-200 flex-1 min-w-[16rem]">
        {c.fallen
          ? 'Los portadores te dejan junto a la hoguera. ' + g('Hermana Vesper puede dejarte enter{o|a}: vida, heridas y huesos.')
          : g('Vuelves herid{o|a}. El Bastión te ha estabilizado, pero Hermana Vesper puede dejarte enter{o|a}.')}
        <span className="text-stone-400 text-sm block">{c.free ? 'No te queda ni una moneda: esta vez no cobra.' : 'Se paga del almacén.'}</span>
      </p>
      <CureButton />
    </div>
  );
}
