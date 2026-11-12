// Enfermería de Hermana Vesper (Fase 4): heridas que traes de la última incursión y el tratamiento completo.
import { actions, useGame } from '../state/store';
import { useCure } from './CureOffer';
import { baseBody } from '../state/medicalActions';
import { BodyPanel } from './BodyFigure';

export function InfirmaryPanel() {
  const profile = useGame((s) => s.profile)!;
  const body = baseBody(profile);
  const cure = useCure();
  const price = cure?.price ?? 0;
  return (
    <div className="space-y-3" data-testid="infirmary">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-body text-base text-stone-300 max-w-2xl">
          Al volver, la orden te estabiliza gratis: corta las hemorragias y deja cada parte del cuerpo al menos a la mitad. Los huesos rotos siguen rotos hasta que alguien los trate.
        </p>
        {cure ? (
          <button className="btn btn-gold py-2 px-4" style={{ minHeight: 44 }} disabled={!cure.free && profile.gold < cure.price}
            onClick={() => actions.vesperTreat()} data-testid="vesper-treat">
            {cure.free ? 'Curarse gratis' : `Curarse por ${cure.price} de oro`}
          </button>
        ) : <span className="btn py-2 px-4 opacity-60" style={{ minHeight: 44 }} data-testid="vesper-treat">Estás entero</span>}
      </div>
      <BodyPanel body={body} note={price ? 'Así entrarías en la próxima incursión.' : undefined} />
      <p className="font-body text-sm text-stone-400 italic">El oro se coge del almacén. Para la mazmorra, Vesper vende vendas, torniquetes y férulas; con más confianza, hemostáticos y equipos de cirugía.</p>
    </div>
  );
}
