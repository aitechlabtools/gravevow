// Pestañas en píldora de la barra superior, con icono pixel (kit/tabIcons.ts). La activa se pinta en pergamino; un número verde
// avisa de novedades. En el móvil se ve solo el icono y el nombre únicamente en la activa (CSS «Pestañas con icono» en game.css).
import { useLayoutEffect, useRef, useState } from 'react';
import { PixelIcon } from '../../../shared/community';
import { TAB_ICONS } from './tabIcons';

export interface PillTab<T extends string> { id: T; label: string; badge?: number; /** Mini tutorial pendiente en esta pestaña: «!» dorado. */ dot?: boolean }

export function PillBar<T extends string>({ tabs, active, onChange }: { tabs: PillTab<T>[]; active: T; onChange: (id: T) => void }) {
  // Si los nombres no caben (p. ej. portátil de 1280–1450 px), se ven solo los iconos y el nombre de la activa, como en el móvil.
  // Se mide el ancho que necesitan con nombres (`full`) y se compara con el sitio disponible; así no oscila al cambiar de modo.
  const ref = useRef<HTMLElement>(null);
  const full = useRef(0);
  const [tight, setTight] = useState(false);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    // Sitio libre = ancho de la barra menos lo que ocupan de verdad el retrato (izquierda) y oro/botones (derecha).
    const used = (n: Element | null) => {
      if (!n) return 0;
      const kids = [...n.children] as HTMLElement[];
      const gap = parseFloat(getComputedStyle(n).columnGap) || 0;
      return kids.reduce((a, k) => a + k.offsetWidth, 0) + gap * Math.max(0, kids.length - 1);
    };
    const check = () => {
      if (!el.classList.contains('tight')) full.current = el.scrollWidth;
      const bar = el.parentElement;
      let avail = el.clientWidth;
      if (bar) {
        const cs = getComputedStyle(bar);
        avail = bar.clientWidth - parseFloat(cs.paddingLeft) - parseFloat(cs.paddingRight) - 2 * (parseFloat(cs.columnGap) || 0)
          - used(el.previousElementSibling) - used(el.nextElementSibling);
      }
      setTight(full.current > avail + 1);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    if (el.parentElement) ro.observe(el.parentElement);
    return () => ro.disconnect();
  }, [tabs.length, active]);
  return (
    <nav ref={ref} className={`ui-pills ${tight ? 'tight' : ''}`} role="tablist" aria-label="Secciones del refugio">
      {tabs.map((t) => (
        <button key={t.id} role="tab" aria-label={`${t.label}${t.badge ? `, ${t.badge} listas` : ''}${t.dot ? ', novedad por ver' : ''}`} aria-selected={t.id === active} className={`pill ${t.id === active ? 'on' : ''}`} title={tight && t.id !== active ? t.label : undefined}
          onClick={() => onChange(t.id)} data-testid={`tab-${t.id}`}>
          {TAB_ICONS[t.id] && <PixelIcon rows={TAB_ICONS[t.id]} size={24} color={t.id === active ? '#1a1206' : 'currentColor'} />}
          <span className="pill-lbl">{t.label}</span>
          {t.dot && <span className={`tut-dot ${t.badge ? 'left' : ''}`} aria-label="Novedad por ver" data-testid={`tut-dot-tab-${t.id}`}>!</span>}
          {!!t.badge && <span className="nb" aria-label={`${t.badge} listas`}>{t.badge}</span>}
        </button>
      ))}
    </nav>
  );
}
