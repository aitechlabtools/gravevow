// Panel de menú: marco de piedra, título entre rombos y cuerpo con desplazamiento propio.
import type { ReactNode } from 'react';

export function Panel({ title, right, children, className = '', bodyClassName = '', gold = false, testId }: {
  title?: ReactNode; right?: ReactNode; children: ReactNode; className?: string; bodyClassName?: string; gold?: boolean; testId?: string;
}) {
  return (
    <section className={`panel ${gold ? 'panel-gold' : ''} ui-panel ${className}`} data-testid={testId}>
      {title !== undefined && (
        <div className="relative">
          <h2 className="ui-ptitle">{title}</h2>
          {right && <div className="absolute right-2 top-1/2 -translate-y-1/2">{right}</div>}
        </div>
      )}
      <div className={`ui-pbody ${bodyClassName}`}>{children}</div>
    </section>
  );
}

/** Encabezado pequeño dentro de un panel («Mochila · 11/24», «Bolsillo seguro»…). */
export function SubHead({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 mb-1.5 min-h-[32px]">
      <h3 className="font-display text-[13px] tracking-[0.06em] uppercase text-parchment">{children}</h3>
      {right}
    </div>
  );
}
