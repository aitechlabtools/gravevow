// Pestañas en píldora de la barra superior. La activa se pinta en pergamino; un número verde avisa de novedades.
export interface PillTab<T extends string> { id: T; label: string; badge?: number; /** Mini tutorial pendiente en esta pestaña: «!» dorado. */ dot?: boolean }

export function PillBar<T extends string>({ tabs, active, onChange }: { tabs: PillTab<T>[]; active: T; onChange: (id: T) => void }) {
  return (
    <nav className="ui-pills" role="tablist" aria-label="Secciones del refugio">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-selected={t.id === active} className={`pill ${t.id === active ? 'on' : ''}`}
          onClick={() => onChange(t.id)} data-testid={`tab-${t.id}`}>
          {t.label}
          {t.dot && <span className={`tut-dot ${t.badge ? 'left' : ''}`} aria-label="Novedad por ver" data-testid={`tut-dot-tab-${t.id}`}>!</span>}
          {!!t.badge && <span className="nb" aria-label={`${t.badge} listas`}>{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
