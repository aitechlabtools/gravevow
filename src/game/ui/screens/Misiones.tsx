// Misiones: diario con «Tus misiones», el detalle de la elegida y el «Tablón de encargos». Escritorio y tableta en tres
// columnas; móvil con el mismo diseño en dos (Detalle y Tablón con pestañas). La explicación está en el «?».
import { useState } from 'react';
import { type VendorId } from '../../../core/data/vendors';
import { useLayout } from '../../../config/ui';
import { Modal } from '../common';
import { QuestJournal } from '../QuestJournal';

export const QUESTS_HELP = 'Las misiones de caza, cofres y extracción avanzan al terminar cada expedición. Las entregas se cobran con lo que tengas en la mochila y el alijo. Fija una para tenerla presente en la mazmorra. Si dejas una misión, pierdes lo que llevabas.';

export function Misiones({ vendor, onVisit }: { vendor?: VendorId | null; onVisit?: (v: VendorId) => void }) {
  const phone = useLayout() === 'phone';
  const [help, setHelp] = useState(false);
  return (
    <div className="h-full qscreen" style={{ padding: '0 max(var(--pad), env(safe-area-inset-right)) var(--pad) max(var(--pad), env(safe-area-inset-left))' }} data-testid="screen-quests">
      <QuestJournal initial={vendor} onVisit={onVisit} onHelp={() => setHelp(true)} phone={phone} />
      {help && (
        <Modal onClose={() => setHelp(false)} testId="quests-help-modal">
          <div className="panel-title mb-2">Misiones</div>
          <p className="font-body text-lg text-stone-200 leading-snug">{QUESTS_HELP}</p>
          <button className="btn mt-3" style={{ minHeight: 44 }} onClick={() => setHelp(false)} data-testid="quests-help-ok">Entendido</button>
        </Modal>
      )}
    </div>
  );
}
