import { Diorama } from './Diorama';
import { GravevowLogo } from '../shared/GravevowLogo';
import { heroUrl } from '../shared/art';
import { SHOWCASE_GEAR } from '../shared/gearLook';
import { CLASSES } from '../core/data/classes';
import type { ClassId } from '../core/types';
import { DiscordButton, DonateButton, DONATE_URL, PLAY_URL, SiteFooter, SiteHeader } from './site';
import { PhoneShot, RoadmapSection, SaveSection, ShotCarousel, VarkHollowSection, type Shot } from './sections';
import { AlliesBlock, MechanicsGrid } from './mechanics';

// Landing v3 (4/11): Portada · Tráiler · VarkHollow · Mecánicas · Galería · Hoja de ruta · Cierre. Textos sin cifras exactas (como mucho «más de X»).
const HERO = {
  tagline: 'Confía en tu espada. En nadie más.',
};
export const ALPHA_NOTE = 'Esto es una alpha: el juego está en desarrollo, puede tener fallos y va a cambiar, y tu progreso podría perderse con alguna actualización.';

const LOOP = [
  { verb: 'Prepárate', text: 'En el Bastión compras, forjas, contratas y eliges qué arriesgas.' },
  { verb: 'Baja', text: 'Un mapa nuevo en cada expedición y poco tiempo para encontrar el portal.' },
  { verb: 'Lucha', text: 'Cada criatura te lleva a un duelo por turnos: dos ataques especiales por mano, una habilidad de clase y el ímpetu o el maná deciden.' },
  { verb: 'Desconfía', text: 'Los mercenarios errantes ofrecen su espada. No todos cumplen.' },
  { verb: 'Escapa', text: 'Si llegas al portal, todo es tuyo. Si caes, se queda abajo.' },
];

// Capturas reales con una partida avanzada (scripts/landing-shots.cjs). Cada una en WebP y PNG de respaldo.
const SHOT_DIR = './screenshots/landing/';
const SHOTS: Shot[] = [
  { src: SHOT_DIR + 'combate', alt: 'Combate por turnos contra Belzar con la barra de acciones: Atacar, Ataque especial, Habilidad, Mochila y Huir', caption: 'Combate por turnos contra Belzar, Señor de las Cadenas.' },
  { src: SHOT_DIR + 'especial', alt: 'Menú de ataques especiales abierto: dos de la mano derecha y dos de la izquierda, uno en recarga', caption: 'Dos ataques especiales por mano. Cada arma, los suyos.' },
  { src: SHOT_DIR + 'alijo', alt: 'Alijo con armas de todas las rarezas, de común a legendario', caption: 'El Alijo: de común a legendario.' },
  { src: SHOT_DIR + 'infierno', alt: 'Exploración de los Ríos de Fuego, en el Infierno', caption: 'Los Ríos de Fuego, en el Infierno.' },
  { src: SHOT_DIR + 'cripta', alt: 'Exploración de las Catacumbas Ahogadas', caption: 'Las Catacumbas Ahogadas, en las criptas de Umbravel.' },
  { src: SHOT_DIR + 'afueras', alt: 'Exploración de las Afueras del Bastión con bandidos y hogueras', caption: 'Las Afueras del Bastión: la primera bajada.' },
  { src: SHOT_DIR + 'forja', alt: 'Forja de Maese Brand con recetas y materiales', caption: 'Forja tus armas con los materiales de cada zona.' },
  { src: SHOT_DIR + 'tienda', alt: 'Tienda de atuendos que se compran con oro del juego', caption: 'Atuendos con oro del juego. Solo cambian cómo te ves.' },
];

function PlayButton({ big = false }: { big?: boolean }) {
  return (
    <a href={PLAY_URL} className={`btn-play ${big ? 'text-xl px-9 py-4' : 'px-6 py-3'}`} data-testid="cta-play">
      Jugar la alpha gratis
    </a>
  );
}

export function App() {
  return (
    <div className="min-h-screen">
      <SiteHeader />

      {/* Portada: titular y botón sobre la escena animada */}
      <section id="top" className="relative min-h-[100svh] overflow-hidden">
        <Diorama className="absolute inset-0" />
        <div className="absolute inset-0 hero-fade pointer-events-none" />
        <div className="relative z-10 min-h-[100svh] max-w-6xl mx-auto px-4 pt-20 pb-16 md:pb-24 flex flex-col justify-end">
          <div>
            <GravevowLogo className="hero-logo" />
            <p className="hero-tagline font-display text-gold mt-3 tracking-wide">{HERO.tagline}</p>
            <div className="mt-6"><PlayButton big /></div>
            <p className="font-body text-stone-300 mt-3 text-base">Gratis en el navegador, en ordenador o móvil. Sin registro ni descargas.</p>
            <p className="alpha-note mt-3" data-testid="alpha-note"><span className="alpha-tag">ALPHA</span> {ALPHA_NOTE}{DONATE_URL && <> <a href="#apoyar" className="underline decoration-dotted hover:text-parchment">Si quieres que avance más rápido, puedes apoyarlo.</a></>}</p>
          </div>
        </div>
      </section>

      {/* Tráiler, justo después de la portada */}
      <section id="trailer" className="max-w-6xl mx-auto px-4 pt-16 pb-8 scroll-mt-14">
          <div className="panel overflow-hidden border border-stone-800 shadow-2xl">
            <video className="w-full aspect-video block bg-black" poster="./trailer/poster.jpg" controls muted loop playsInline preload="none" data-testid="trailer-video">
              <source src="./trailer/gravevow-trailer.webm" type="video/webm" />
              <source src="./trailer/gravevow-trailer.mp4" type="video/mp4" />
              Tu navegador no puede reproducir el vídeo.
            </video>
          </div>
          <p className="font-body text-stone-400 mt-2">Tráiler · imágenes reales de la alpha.</p>
      </section>

      <VarkHollowSection />

      {/* Mecánicas: ciclo, todas las mecánicas, clases y aliados */}
      <section id="mecanicas" className="max-w-6xl mx-auto px-4 py-24 scroll-mt-14">
        <span id="juego" aria-hidden className="block -translate-y-14" />
        <p className="font-display text-gold tracking-[0.3em] text-sm uppercase">Mecánicas</p>
        <div className="grid md:grid-cols-[1fr_1.2fr] gap-12 items-start mt-2">
          <h2 className="font-display text-4xl md:text-5xl text-parchment leading-tight">El oro está abajo. La salida, también.</h2>
          <ol className="loop" aria-label="Una expedición, paso a paso">
            {LOOP.map((s) => (
              <li key={s.verb} className="loop-step">
                <span className="font-display text-2xl md:text-3xl text-parchment">{s.verb}.</span>
                <span className="font-body text-lg text-stone-300 leading-snug">{s.text}</span>
              </li>
            ))}
          </ol>
        </div>
        <MechanicsGrid />

        <h3 id="clases" className="font-display text-3xl md:text-4xl text-parchment mt-20 scroll-mt-14">Elige quién baja</h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          {(Object.keys(CLASSES) as ClassId[]).map((id) => {
            const c = CLASSES[id];
            return (
              <article key={id} className={`class-card ${c.playable ? '' : 'is-locked'}`}>
                <div className="h-36 flex items-end justify-center">
                  <img src={heroUrl(id, { cloak: id === 'mage' ? 3 : id === 'rogue' ? 2 : id === 'cleric' ? 1 : 0, skin: id === 'cleric' ? 1 : 0 }, 6, 0, 'idle', SHOWCASE_GEAR[id])} width={110} alt={c.name} className="pixelated" />
                </div>
                <h4 className="font-display text-2xl mt-3" style={{ color: c.color }}>{c.name}</h4>
                <p className="font-body italic text-stone-300">{c.tagline}</p>
                <p className="font-body text-base text-stone-400 mt-1">{c.playable ? (id === 'warrior' ? 'Acero, sangrado e ímpetu.' : 'Fuego, hielo, sombra y maná.') : 'Próximamente'}</p>
              </article>
            );
          })}
        </div>

        <AlliesBlock />
      </section>

      {/* Galería: tráiler, capturas y móvil */}
      <section id="galeria" className="border-y border-stone-800 bg-crypt scroll-mt-14">
        <div className="max-w-6xl mx-auto px-4 py-24">
          <p className="font-display text-gold tracking-[0.3em] text-sm uppercase">Galería</p>
          <h2 className="font-display text-3xl md:text-5xl text-parchment mt-2">Así se juega ahora mismo</h2>

          <div className="mt-8"><ShotCarousel shots={SHOTS} /></div>
          <div className="grid lg:grid-cols-[1fr_1fr] gap-10 items-center mt-16">
            <div>
              <h3 className="font-display text-3xl text-parchment">También en el móvil</h3>
              <p className="font-body text-xl text-stone-300 mt-3">En horizontal y a pantalla completa, con controles táctiles. Se puede instalar como una app.</p>
              <div className="mt-6"><PlayButton /></div>
            </div>
            <PhoneShot src={SHOT_DIR + 'movil-infierno'} alt="Gravevow en un móvil en horizontal: el Infierno con el joystick, la poción y el botón Usar" />
          </div>
        </div>
      </section>

      <SaveSection />

      <RoadmapSection />

      {/* Cierre: jugar (y, en segundo plano, apoyar) */}
      <section id="apoyar" className="relative overflow-hidden border-t border-stone-800">
        <div className="absolute inset-0 demo-glow" />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-parchment">La puerta está abierta</h2>
          <p className="font-body text-xl text-stone-300 mt-4">Crea a tu saqueador y baja. Tu progreso se guarda en este navegador.</p>
          <div className="mt-8"><PlayButton big /></div>
          {DONATE_URL && <p className="font-body text-stone-400 mt-8">Gravevow lo hace una sola persona. Si te gusta, puedes ayudar a que avance. <DonateButton className="ml-1 px-3 py-1.5 text-sm align-middle" /></p>}
          <p className="font-body text-stone-400 mt-4">Cuenta qué te parece, avisa de fallos y sigue las novedades. <DiscordButton className="ml-1 px-3 py-1.5 text-sm align-middle" /></p>
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
