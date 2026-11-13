// Secciones de la landing: VarkHollow, carrusel de capturas, captura en el móvil y hoja de ruta.
// Los textos de la hoja de ruta están en roadmap.ts; los de VarkHollow, aquí abajo.
import { useEffect, useRef, useState } from 'react';
import { iconUrl, monsterUrl } from '../shared/art';
import { ZONES as BACKDROPS, zoneBackdrop } from '../game/ui/combatZones';
import { ROADMAP, ROADMAP_NOTE } from './roadmap';

// ── VarkHollow ────────────────────────────────────────────────────────────────
// Lore aprobado el 4/11 (versión B, directa). Los nombres de las subzonas son los del juego (core/data/subzones.ts).
export const VARKHOLLOW = {
  title: 'Esto es VarkHollow',
  intro: 'VarkHollow es una tierra maldita. Su castillo, el Bastión de Ceniza, aún resiste; bajo él se abren las criptas de Umbravel y, más abajo, el Infierno. Tú eres un saqueador: bajas, saqueas y vuelves. Quien cae, se queda abajo.',
  chronicle: [
    'El castillo de VarkHollow ardió. Nadie sabe quién encendió el fuego, pero todos saben que empezó abajo. Su señor juró no morir mientras ardiera su casa, y cumplió.',
    'El Bastión de Ceniza es lo que quedó en pie del castillo: unos muros, unos pocos mercaderes y una puerta. Fuera, sus afueras son de los bandidos. Dentro, los salones quemados siguen guardados por quien ya no respira. Debajo, sus mazmorras bajan hasta el Osario.',
    'Las criptas de Umbravel eran de una orden de monjes. Tres criptas para tres clases de muertos: los monjes en el Osario, los pobres en las Catacumbas, los nobles en su Panteón. Ninguno descansa.',
    'Debajo, la Cripta Carmesí: la piedra suda sangre y huele a azufre. Su puerta lleva al Infierno: las Puertas del Abismo, los Ríos de Fuego y el Trono de las Cadenas, donde espera Belzar.',
    'Los saqueadores bajan por oro, por armas y por gloria. Arriba, en el Bastión, los esperan Vesper, Garth, Nira y los mercaderes que van llegando a medida que bajan. Abajo, mercenarios errantes que ofrecen su espada. Algunos cumplen. Kael el Errante, casi siempre. Los demás, mientras les convenga.',
  ],
  steam: 'En Steam se llamará Gravevow.',
};

interface Sub { name: string; levels: string; text: string }
const DEPTHS: { id: string; name: string; levels: string; backdrop: keyof typeof BACKDROPS; boss: string; bossName: string; color: string; text: string; subs: Sub[] }[] = [
  { id: 'mazmorra', name: 'La Mazmorra', levels: 'Nv 1–30', backdrop: 'osario', boss: 'boss', bossName: 'Señor del Osario', color: '#c8a46a',
    text: 'El Bastión de Ceniza y lo que hay debajo. Bandidos, una guardia que no sabe que ha muerto y, al fondo, el primer trono de huesos.',
    subs: [
      { name: 'Afueras del Bastión', levels: '1–10', text: 'Murallas rotas y hogueras de bandidos.' },
      { name: 'El Bastión en ruinas', levels: '10–20', text: 'Tapices quemados y una guardia muerta.' },
      { name: 'Las mazmorras del Bastión', levels: '20–30', text: 'Celdas, cadenas y túneles húmedos.' },
    ] },
  { id: 'cripta', name: 'La Cripta', levels: 'Nv 30–60', backdrop: 'necropolis', boss: 'veiled_queen', bossName: 'La Reina Velada', color: '#8fb8e8',
    text: 'Las criptas de Umbravel: tres tumbas para tres clases de muertos. Velas frías, agua negra y nobles que no quieren visitas.',
    subs: [
      { name: 'El Osario de Umbravel', levels: '30–40', text: 'Paredes de calaveras y polvo de hueso.' },
      { name: 'Las Catacumbas Ahogadas', levels: '40–50', text: 'Agua negra hasta el tobillo.' },
      { name: 'El Panteón de los Nobles', levels: '50–60', text: 'Mármol, oro sucio y sarcófagos.' },
    ] },
  { id: 'infierno', name: 'El Infierno', levels: 'Nv 60–100', backdrop: 'infierno', boss: 'belzar', bossName: 'Belzar, Señor de las Cadenas', color: '#ff7a3a',
    text: 'Empieza en una cripta que sangra y acaba en un trono de cadenas sobre el vacío. Lo que vive aquí nunca fue humano.',
    subs: [
      { name: 'La Cripta Carmesí', levels: '60–70', text: 'La piedra suda sangre y huele a azufre.' },
      { name: 'Las Puertas del Abismo', levels: '70–80', text: 'Roca negra y puentes de obsidiana.' },
      { name: 'Los Ríos de Fuego', levels: '80–90', text: 'Lagos de lava y ceniza que no cesa.' },
      { name: 'El Trono de las Cadenas', levels: '90–100', text: 'Más abajo no hay nada.' },
    ] },
];

const isPhone = () => typeof window !== 'undefined' && window.matchMedia('(max-width: 767px)').matches;

export function VarkHollowSection() {
  const [open, setOpen] = useState(false);
  const [unfold, setUnfold] = useState<Record<string, boolean>>({});
  const [phone, setPhone] = useState(isPhone);
  useEffect(() => { const m = window.matchMedia('(max-width: 767px)'); const on = () => setPhone(m.matches); m.addEventListener('change', on); return () => m.removeEventListener('change', on); }, []);
  return (
    <section id="varkhollow" className="relative overflow-hidden scroll-mt-14">
      <div className="absolute inset-0 vh-glow pointer-events-none" />
      <div className="relative max-w-6xl mx-auto px-4 pt-24 pb-8">
        <p className="font-display text-gold tracking-[0.3em] text-sm uppercase">El mundo</p>
        <h2 className="font-display text-4xl md:text-6xl text-parchment mt-2 leading-tight">{VARKHOLLOW.title}</h2>
        <p className="font-body text-xl md:text-2xl text-stone-300 mt-5 max-w-3xl leading-relaxed">{VARKHOLLOW.intro}</p>
        <button className="chron-btn mt-5" aria-expanded={open} aria-controls="cronica" onClick={() => setOpen(!open)} data-testid="btn-chronicle">
          {open ? '▴ Cerrar la crónica' : '▾ Leer la crónica de VarkHollow'}
        </button>
        <div id="cronica" hidden={!open} className="chron" data-testid="chronicle">
          {VARKHOLLOW.chronicle.map((p, i) => <p key={i}>{p}</p>)}
        </div>
        <ol className="depths mt-12" aria-label="El descenso por VarkHollow">
          {DEPTHS.map((d, i) => {
            const shown = unfold[d.id] ?? !phone;
            return (
              <li key={d.id} className="depth" style={{ ['--depth' as string]: d.color }}>
                <div className="depth-art">
                  <img src={zoneBackdrop(BACKDROPS[d.backdrop])} alt="" className="pixelated depth-bg" />
                  <img src={monsterUrl(d.boss, 4)} alt={d.bossName} title={d.bossName} className="pixelated depth-boss" />
                  <span className="depth-step">{i + 1}</span>
                </div>
                <div className="p-5">
                  <div className="flex items-baseline justify-between gap-3">
                    <h3 className="font-display text-2xl" style={{ color: d.color }}>{d.name}</h3>
                    <span className="font-display text-sm text-stone-400 whitespace-nowrap">{d.levels}</span>
                  </div>
                  <p className="font-body text-lg text-stone-300 leading-snug mt-2">{d.text}</p>
                  <p className="font-body text-sm text-stone-400 mt-3">Jefe final: {d.bossName}</p>
                  <button className="sub-toggle" aria-expanded={shown} aria-controls={`descenso-${d.id}`} onClick={() => setUnfold({ ...unfold, [d.id]: !shown })}>
                    {shown ? 'Ocultar el descenso' : `Ver el descenso (${d.subs.length})`}
                  </button>
                  <ol id={`descenso-${d.id}`} hidden={!shown} className="descent" aria-label={`Subzonas de ${d.name}`}>
                    {d.subs.map((s, k) => (
                      <li key={s.name} style={{ ['--k' as string]: (i * 3 + k) / 9 }}>
                        <span className="descent-mark" aria-hidden />
                        <span className="flex items-baseline justify-between gap-2"><b className="font-display text-[15px] text-parchment font-normal">{s.name}</b><span className="text-xs text-stone-400 whitespace-nowrap">Nv {s.levels}</span></span>
                        <span className="block text-[15px] text-stone-300 leading-snug">{s.text}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="font-body text-stone-300 mt-6 text-lg">Cuanto más bajas, más peligro… y mejor botín.</p>
        <p className="font-body text-stone-400 mt-1 text-base">{VARKHOLLOW.steam}</p>
      </div>
    </section>
  );
}

// ── Carrusel de capturas ──────────────────────────────────────────────────────
/** `src` sin extensión: se sirve la .webp y, si el navegador no la entiende, la .png. */
export interface Shot { src: string; alt: string; caption: string }

export function Pic({ src, alt, eager = false, className = '', w = 1920, h = 1080 }: { src: string; alt: string; eager?: boolean; className?: string; w?: number; h?: number }) {
  return (
    <picture>
      <source srcSet={`${src}.webp`} type="image/webp" />
      <img src={`${src}.png`} alt={alt} loading={eager ? 'eager' : 'lazy'} width={w} height={h} className={className} />
    </picture>
  );
}

export function ShotCarousel({ shots }: { shots: Shot[] }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const go = (n: number) => {
    const t = track.current; if (!t) return;
    const k = (n + shots.length) % shots.length;
    t.scrollTo({ left: k * t.clientWidth, behavior: 'smooth' });
  };
  useEffect(() => {
    const t = track.current; if (!t) return;
    const on = () => setI(Math.round(t.scrollLeft / Math.max(1, t.clientWidth)));
    t.addEventListener('scroll', on, { passive: true });
    return () => t.removeEventListener('scroll', on);
  }, []);
  return (
    <div className="carousel" aria-roledescription="carrusel" aria-label="Capturas del juego">
      <div className="carousel-track" ref={track} tabIndex={0}
        onKeyDown={(e) => { if (e.key === 'ArrowRight') { e.preventDefault(); go(i + 1); } if (e.key === 'ArrowLeft') { e.preventDefault(); go(i - 1); } }}>
        {shots.map((s, k) => (
          <figure key={s.src} className="carousel-slide" aria-roledescription="captura" aria-label={`${k + 1} de ${shots.length}`}>
            <Pic src={s.src} alt={s.alt} eager={k === 0} className="w-full aspect-video object-contain bg-black block" />
          </figure>
        ))}
      </div>
      <div className="flex items-center gap-4 mt-4">
        <button className="carousel-btn" onClick={() => go(i - 1)} aria-label="Captura anterior">◄</button>
        <p className="font-body text-lg text-stone-300 flex-1 min-w-0" aria-live="polite"><span className="text-stone-500 mr-2">{i + 1}/{shots.length}</span>{shots[i]?.caption}</p>
        <button className="carousel-btn" onClick={() => go(i + 1)} aria-label="Captura siguiente">►</button>
      </div>
      <div className="carousel-thumbs" role="tablist" aria-label="Elegir captura">
        {shots.map((s, k) => (
          <button key={s.src} role="tab" aria-selected={k === i} aria-label={s.caption} className={`carousel-thumb ${k === i ? 'is-on' : ''}`} onClick={() => go(k)}>
            <Pic src={s.src} alt="" className="w-full h-full object-cover block" />
          </button>
        ))}
      </div>
    </div>
  );
}

// ── Captura del móvil ─────────────────────────────────────────────────────────
export function PhoneShot({ src, alt }: { src: string; alt: string }) {
  return (
    <figure className="flex flex-col items-center">
      <div className="phone-frame"><Pic src={src} alt={alt} w={844} h={390} className="w-full h-full object-cover block" /></div>
      <figcaption className="font-body text-stone-400 mt-3">Así se ve en el móvil.</figcaption>
    </figure>
  );
}

// ── Tu partida es tuya: cómo se guarda ─────────────────────────────────────────
const SAVE_POINTS = [
  { icon: 'lantern', title: 'Se guarda en tu navegador', text: 'Sin cuentas ni registros: tu partida se queda en tu dispositivo y no se envía a ningún servidor.' },
  { icon: 'tome_dark', title: 'Haz una copia cuando quieras', text: 'Desde el juego la descargas como archivo o como código de texto, y la cargas en otro navegador u otro dispositivo. El juego te recuerda hacerla de vez en cuando.' },
  { icon: 'gem_red', title: 'Cuidado al borrar datos', text: 'Si borras los datos del navegador o juegas en modo incógnito, la partida se pierde. Con una copia la recuperas.' },
];

export function SaveSection() {
  return (
    <section id="tu-partida" className="border-t border-stone-800 scroll-mt-14" data-testid="save-section">
      <div className="max-w-6xl mx-auto px-4 py-20">
        <h2 className="font-display text-3xl md:text-5xl text-parchment">Tu partida es tuya</h2>
        <div className="grid md:grid-cols-3 gap-6 mt-10">
          {SAVE_POINTS.map((p) => (
            <div key={p.title} className="flex gap-4 items-start">
              <img src={iconUrl(p.icon, 2)} width={32} height={32} alt="" className="pixelated shrink-0 mt-1" />
              <div>
                <h3 className="font-display text-xl text-gold">{p.title}</h3>
                <p className="font-body text-lg text-stone-300 mt-1">{p.text}</p>
              </div>
            </div>
          ))}
        </div>
        <p className="font-body text-stone-500 mt-8">Los detalles están en la <a href="./privacidad.html" className="underline decoration-dotted hover:text-parchment">Política de privacidad</a>.</p>
      </div>
    </section>
  );
}

// ── Hoja de ruta ──────────────────────────────────────────────────────────────
const RM_COLOR: Record<string, string> = { ahora: '#5fd19a', pronto: '#e8b33a', multijugador: '#a35ae0' };

export function RoadmapSection() {
  return (
    <section id="hoja-de-ruta" className="border-t border-stone-800 scroll-mt-14">
      <div className="max-w-6xl mx-auto px-4 py-24">
        <h2 className="font-display text-3xl md:text-5xl text-parchment">El camino hacia las profundidades</h2>
        <p className="font-body text-xl text-stone-300 mt-3 max-w-2xl">Hacia dónde va Gravevow.</p>
        <ol className="roadmap mt-12">
          {ROADMAP.map((c, k) => (
            <li key={c.id} className="rm-col" style={{ ['--rm' as string]: RM_COLOR[c.id] }}>
              <div className="rm-head">
                <span className="rm-node"><img src={iconUrl(c.icon, 2)} width={32} height={32} alt="" className="pixelated" /></span>
                {k === 0 && <span className="rm-here">Estás aquí</span>}
              </div>
              <h3 className="font-display text-2xl mt-4" style={{ color: RM_COLOR[c.id] }}>{c.title}</h3>
              <p className="font-display text-xs tracking-[0.2em] uppercase text-stone-400 mt-1">{c.status}</p>
              <ul className="rm-list mt-4">
                {c.items.map((it) => <li key={it}>{it}</li>)}
              </ul>
            </li>
          ))}
        </ol>
        <p className="font-body text-stone-500 mt-10">{ROADMAP_NOTE}</p>
      </div>
    </section>
  );
}
