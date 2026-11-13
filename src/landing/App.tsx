import { Diorama } from './Diorama';
import { GravevowLogo } from '../shared/GravevowLogo';
import { DonateButton, DONATE_URL, PLAY_URL, SiteFooter, SiteHeader } from './site';
import { PhoneShot, RoadmapSection, ShotCarousel, VarkHollowSection, type Shot } from './sections';
import { HooksSection } from './hooks';
import { DiscordBanner } from './discord';

// Landing v4 (13/11): Portada · Tráiler · VarkHollow · Ganchos · Galería · Discord · Hoja de ruta · Cierre. Vende la experiencia; nada que no funcione.
const HERO = {
  tagline: 'Confía en tu espada. En nadie más.',
  pitch: 'Baja a las criptas, llena la mochila y encuentra la salida antes de que alguien te traicione.',
};
export const ALPHA_NOTE = 'Esto es una alpha: el juego está en desarrollo, puede tener fallos y va a cambiar, y tu progreso podría perderse con alguna actualización.';

// Capturas reales con una partida avanzada (scripts/landing-shots.cjs). Cada una en WebP y PNG de respaldo.
const SHOT_DIR = './screenshots/landing/';
const SHOTS: Shot[] = [
  { src: SHOT_DIR + 'g-combate', alt: 'Combate por turnos en los Ríos de Fuego contra un caballero infernal', caption: 'Combate por turnos en los Ríos de Fuego.' },
  { src: SHOT_DIR + 'g-afueras', alt: 'Exploración de las Afueras del Bastión con bandidos y hogueras', caption: 'Las Afueras del Bastión: la primera bajada.' },
  { src: SHOT_DIR + 'g-cripta', alt: 'Exploración de las Catacumbas Ahogadas, con agua negra y velas frías', caption: 'Las Catacumbas Ahogadas, en las criptas de Umbravel.' },
  { src: SHOT_DIR + 'g-infierno', alt: 'Exploración de los Ríos de Fuego, en el Infierno', caption: 'Los Ríos de Fuego, en el Infierno.' },
  { src: SHOT_DIR + 'g-traicion', alt: 'Un mercenario se vuelve contra el saqueador y empieza el combate', caption: 'Cuando el aliado se vuelve contra ti.' },
  { src: SHOT_DIR + 'g-intendencia', alt: 'La Intendencia: mochila y almacén con botín de todas las rarezas', caption: 'Tu mochila y tu almacén: elige qué arriesgas.' },
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
            <p className="font-body text-xl md:text-2xl text-parchment mt-2 max-w-xl">{HERO.pitch}</p>
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

      <HooksSection cta={<PlayButton big />} />

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
            <PhoneShot src={SHOT_DIR + 'g-movil'} alt="Gravevow en un móvil en horizontal: el Infierno con el joystick, la poción y el botón Usar" />
          </div>
        </div>
      </section>

      <DiscordBanner />

      <RoadmapSection />

      {/* Cierre: jugar (y, en segundo plano, apoyar) */}
      <section id="apoyar" className="relative overflow-hidden border-t border-stone-800">
        <div className="absolute inset-0 demo-glow" />
        <div className="relative max-w-3xl mx-auto px-4 py-20 text-center">
          <h2 className="font-display text-4xl md:text-5xl text-parchment">La puerta está abierta</h2>
          <p className="font-body text-xl text-stone-300 mt-4">Crea a tu saqueador y baja. Sin registro: tu partida se guarda en este navegador y puedes hacer copias desde el juego.</p>
          <div className="mt-8"><PlayButton big /></div>
          {DONATE_URL && <p className="font-body text-stone-400 mt-8">Gravevow lo hace una sola persona. Si te gusta, puedes ayudar a que avance. <DonateButton className="ml-1 px-3 py-1.5 text-sm align-middle" /></p>}
        </div>
      </section>

      <SiteFooter />
    </div>
  );
}
