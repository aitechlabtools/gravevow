// Landing v4 (13/11): los cinco ganchos del juego. Cada uno, una captura real y una o dos frases.
// Solo lo que funciona en la alpha. Las capturas salen de scripts/landing4-shots.cjs (escenarios guionizados).
import { Pic } from './sections';

export interface Hook { id: string; kicker: string; title: string; text: string; shot: string; alt: string; accent: string }

const DIR = './screenshots/landing/';
export const HOOKS: Hook[] = [
  { id: 'extraccion', kicker: 'Extracción por turnos', title: 'Baja. Saquea. Vuelve vivo.', accent: '#c8a46a',
    text: 'Cada bajada es un mapa nuevo y una carrera hasta el portal. Si caes, todo lo que llevas encima se queda abajo.',
    shot: DIR + 'g-portal', alt: 'El saqueador llega al portal de salida en las Puertas del Abismo' },
  { id: 'heridas', kicker: 'Heridas por zonas', title: 'Cada golpe deja marca.', accent: '#c4283b',
    text: 'Los golpes hieren la cabeza, el torso o un brazo. Sangras, te fracturas… y la armadura de cada zona aguanta hasta que se rompe.',
    shot: DIR + 'g-heridas', alt: 'Combate por turnos con el cuerpo del saqueador herido por zonas y sangrando' },
  { id: 'aliados', kicker: 'Aliados', title: 'No te fíes de nadie.', accent: '#e8b33a',
    text: 'El triángulo sobre su cabeza dice cuánto fiarte. Algunos te venderán por tu botín. Y tú también puedes traicionarlos.',
    shot: DIR + 'g-aliado', alt: 'Un mercenario errante con su triángulo de confianza ofrece su espada en la mazmorra' },
  { id: 'botin', kicker: 'Botín', title: 'Lo mejor está al fondo.', accent: '#ff8a3a',
    text: 'De común a legendario, con atributos y piezas únicas. Encanta tu equipo con runas y lúcelo.',
    shot: DIR + 'h-botin', alt: 'Botín de un cofre con piezas raras, épicas y una legendaria' },
  { id: 'bastion', kicker: 'El Bastión', title: 'Levanta las ruinas.', accent: '#5fd19a',
    text: 'Reconstruye tu refugio: cocina, cúrate, forja y fabrica tu equipo con lo que subes de las profundidades.',
    shot: DIR + 'h-bastion', alt: 'El refugio del Bastión con sus estaciones de cocina, forja y atril rúnico' },
];

export function HooksSection({ cta }: { cta: React.ReactNode }) {
  return (
    <section id="mecanicas" className="max-w-6xl mx-auto px-4 py-24 scroll-mt-14" data-testid="hooks">
      <p className="font-display text-gold tracking-[0.3em] text-sm uppercase">Mecánicas</p>
      <h2 className="font-display text-4xl md:text-5xl text-parchment leading-tight mt-2">El oro está abajo. La salida, también.</h2>
      <ol className="hooks mt-14">
        {HOOKS.map((h, i) => (
          <li key={h.id} className={`hook ${i % 2 ? 'is-flip' : ''}`} style={{ ['--hook' as string]: h.accent }} data-testid={`hook-${h.id}`}>
            <figure className="hook-shot"><Pic src={h.shot} alt={h.alt} className="w-full aspect-video object-cover block pixelated" /></figure>
            <div className="hook-text">
              <p className="hook-kicker">{h.kicker}</p>
              <h3 className="font-display text-3xl md:text-4xl text-parchment leading-tight mt-1">{h.title}</h3>
              <p className="font-body text-xl text-stone-300 leading-snug mt-3">{h.text}</p>
            </div>
          </li>
        ))}
      </ol>
      <div className="mt-16 text-center">{cta}</div>
    </section>
  );
}
