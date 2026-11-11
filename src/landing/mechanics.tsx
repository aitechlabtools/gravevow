// Sección «Mecánicas» de la landing: cuadrícula de mecánicas (agrupadas) y bloque de aliados.
// Solo mecánicas que existen en el juego. Textos sin cifras exactas (como mucho «más de X»).
// Los iconos son los del juego (shared/art.ts → ICONS); `newIcon` marca los que son provisionales (lista de assets).
import { useState } from 'react';
import { iconUrl, monsterUrl } from '../shared/art';
import { RISK, type RiskLevel } from '../config/wanderers';

interface Mech { icon: string; title: string; text: string; newIcon?: string }

export const MECH_GROUPS: { title: string; items: Mech[] }[] = [
  {
    title: 'En la expedición',
    items: [
      { icon: 'torch', title: 'Ningún mapa se repite', text: 'Diez escenarios del Bastión al Trono de las Cadenas. Cada bajada se genera de nuevo, con su élite y su jefe al fondo.' },
      { icon: 'sword_dread', title: 'Cada arma pelea distinto', text: 'Cada arma trae sus propios ataques: sangrar, quemar, congelar, aturdir. Cambias de arma y cambias de táctica.' },
      { icon: 'chalice', title: 'De común a legendario', text: 'Botín con atributos como «del vampiro» y piezas legendarias únicas, como la Cadena de Belzar.' },
      { icon: 'key', title: 'Cofres con su llave', text: 'Los baúles se abren sin más. Los cofres de hierro, las arcas y los relicarios piden su llave… y guardan lo mejor.' },
      { icon: 'gem_red', title: 'Todo o nada', text: 'Lo que llevas encima se pierde si caes. El almacén del Bastión y el bolsillo seguro, nunca.' },
      { icon: 'sack', title: 'El oro pesa', text: 'Si lo llevas encima, lo arriesgas. Ocupa sitio en la mochila: guárdalo en saquitos, mételo en el bolsillo seguro o súbelo vivo al Bastión.', newIcon: 'Saco de oro (provisional)' },
      { icon: 'pick', title: 'Vetas en cada mapa', text: 'Pica el mineral de cada zona. Arriba, Maese Brand lo convierte en armas.' },
    ],
  },
  {
    title: 'En el Bastión',
    items: [
      { icon: 'hammer_fire', title: 'La forja de Maese Brand', text: 'Recetas con los materiales que subes de cada zona. Cada pieza sale del yunque con su propia calidad.' },
      { icon: 'coin', title: 'Encargos y reputación', text: 'Los mercaderes del Bastión te piden trabajos. Elige cuáles aceptas y cúmplelos: te abren mejor mercancía y descuentos.' },
      { icon: 'bag3', title: 'Grizk', text: 'Un goblin que compra joyas, tesoros y gemas mejor que nadie, vende mochilas más grandes y alquila espadas.', newIcon: 'Mochila (provisional)' },
      { icon: 'robe_gold', title: 'Atuendos sin ventajas', text: 'Se compran con el oro del juego y solo cambian cómo te ves.' },
    ],
  },
  {
    title: 'Para crecer',
    items: [
      { icon: 'amulet_heart', title: 'Hasta el nivel 100', text: 'Cinco habilidades por clase: en cada hito eliges cuál desbloquear y cuál llevas.' },
      { icon: 'tome_dark', title: 'El Bestiario', text: 'Cada criatura que derrotas queda apuntada. Cuanto más peleas con ella, más sabes: sus habilidades, su fuerza y su botín.' },
      { icon: 'lantern', title: 'En el ordenador y en el móvil', text: 'En el navegador, con teclado y ratón o con controles táctiles. En el móvil se puede instalar como una app.', newIcon: 'Móvil o mando (icono nuevo)' },
    ],
  },
];

/** Cuántas tarjetas se ven en el móvil antes de «Ver todas las mecánicas». */
const PHONE_VISIBLE = 6;

export function MechanicsGrid() {
  const [all, setAll] = useState(false);
  let n = 0;
  return (
    <div className={`mechs mt-16 ${all ? 'is-all' : ''}`}>
      {MECH_GROUPS.map((g) => (
        <div key={g.title} className="mech-group">
          <h3 className="mech-group-title">{g.title}</h3>
          <div className="mech-grid">
            {g.items.map((m) => {
              const extra = n++ >= PHONE_VISIBLE;
              return (
                <div key={m.title} className={`mech ${extra ? 'mech-extra' : ''}`} data-new-icon={m.newIcon ? '' : undefined}>
                  <div className="item-slot shrink-0"><img src={iconUrl(m.icon, 4)} width={48} height={48} alt="" className="pixelated" /></div>
                  <div>
                    <h4 className="font-display text-xl text-gold leading-tight">{m.title}</h4>
                    <p className="font-body text-lg text-stone-300 leading-snug mt-1">{m.text}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
      <button className="mech-more btn-ghost px-5 py-3" aria-expanded={all} onClick={() => setAll(!all)} data-testid="btn-mechanics">
        {all ? '▴ Ver menos' : `▾ Ver todas las mecánicas (${n - PHONE_VISIBLE} más)`}
      </button>
    </div>
  );
}

// ── Aliados ───────────────────────────────────────────────────────────────────
// Personajes reales del juego (core/data/wanderers.ts y mercenaries.ts) con frases suyas del juego.
interface Ally { sprite: string; flip?: boolean; name: string; role: string; quote: string; who: string; risk: RiskLevel | 'garra' | 'captive'; star?: boolean; quoteBy?: string }

export const ALLIES: Ally[] = [
  { sprite: 'rival', flip: true, name: 'Kael el Errante', role: 'Mercenario veterano', star: true, risk: 'kael',
    quote: 'Vamos juntos. Repartimos a partes iguales. Y si no, también: lo que no quieras, me lo quedo.',
    who: 'El aliado de confianza. Aparece en una de cada tres bajadas a la Mazmorra.' },
  { sprite: 'wand_sela', name: 'Sela Dedos Finos', role: 'Ladrona errante', risk: 'low',
    quote: 'Tranquilo, solo estaba mirando. ¿Ese cofre es tuyo? Qué pena.',
    who: 'Ronda la Mazmorra y la Cripta. Abre cerraduras… y bolsillos.' },
  { sprite: 'wand_malek', name: 'Malek el Condenado', role: 'Caballero caído', risk: 'high',
    quote: '¿Vivo? ¿Aquí? Entonces o eres valiente o eres idiota. Me sirven los dos.',
    who: 'Rompió las cadenas de Belzar. En el Infierno, nadie sabe a quién sirve.' },
  { sprite: 'merc_bram', name: 'Bram el Leñador', role: 'Hachero a sueldo', risk: 'garra',
    quote: 'Mis espadas se alquilan, no se regalan.', quoteBy: 'Grizk, que cobra el contrato',
    who: 'Se contrata en el Bastión. Los de Grizk cobran, pero no traicionan.' },
  { sprite: 'merc_tobias', name: 'Tobías el Ermitaño', role: 'Prisionero de los bandidos', risk: 'captive',
    quote: '¡Por fin! Tres semanas encendiendo fuegos para esos brutos. Te acompaño, a ver si salimos.',
    who: 'Encadenado en la Mazmorra. Rescátalo, sal con él y luego podrás contratarlo.' },
];

const TRUST = [
  { level: 'kael' as const, title: 'Verde', text: 'Puedes fiarte. Casi siempre.' },
  { level: 'mid' as const, title: 'Naranja', text: 'Cuidado: puede cambiar de idea si le conviene.' },
  { level: 'high' as const, title: 'Rojo', text: 'Te venderá a la primera. En el Infierno, algunos atacan nada más verte.' },
];

function Tri({ level, size = 22 }: { level: RiskLevel; size?: number }) {
  const r = RISK[level];
  return (
    <span className="tri" style={{ ['--tri' as string]: r.color, width: size, height: size * 0.9 }} aria-hidden>
      <span className="tri-sym">{r.symbol}</span>
    </span>
  );
}

const BADGE: Record<Ally['risk'], { text: string; level?: RiskLevel }> = {
  kael: { text: 'De confianza', level: 'kael' },
  low: { text: 'Riesgo medio', level: 'low' },
  mid: { text: 'Riesgo alto', level: 'mid' },
  high: { text: 'Riesgo muy alto', level: 'high' },
  hostile: { text: 'Hostil', level: 'hostile' },
  garra: { text: 'Contratado' },
  captive: { text: 'Prisionero' },
};

export function AlliesBlock() {
  return (
    <div id="aliados" className="allies mt-20 scroll-mt-14">
      <div className="grid lg:grid-cols-[1.1fr_1fr] gap-10 items-start">
        <div>
          <h3 className="font-display text-3xl md:text-4xl text-parchment">No bajas solo</h3>
          <p className="font-body text-xl text-stone-300 mt-4 leading-relaxed">
            Ahí abajo hay otros saqueadores buscando el mismo oro que tú, cada uno con su nombre, su historia y sus motivos.
            Puedes aliarte con ellos: unos te cubrirán la espalda; otros esperan el momento de clavarte el puñal y quedarse tu botín.
          </p>
          <p className="font-body text-lg text-stone-400 mt-3">Cuanto más hondo bajas, más fácil es que te traicionen. Así se reparte:</p>
          <ul className="share-how" aria-label="Cómo se reparte con un aliado">
            <li><b>Cada cofre y cada saco de combate</b> se reparte: le das lo que quieras y él lo mira por su valor, no por el número de cosas.</li>
            <li><b>Una parte justa</b> le calma y baja el riesgo de traición. Una baratija le hace fruncir el ceño. Nada, le hace pensar.</li>
            <li><b>En el portal te pide su parte del oro</b>: menos si has sido justo, más si no. Puedes pagar, negarte… o atacarle tú primero.</li>
          </ul>
        </div>
        <ul className="trust" aria-label="El triángulo sobre su cabeza: cuánto fiarte">
          {TRUST.map((t) => (
            <li key={t.level} className="trust-row">
              <Tri level={t.level} size={34} />
              <div><b className="font-display" style={{ color: RISK[t.level].color }}>{t.title}.</b> <span className="font-body text-lg text-stone-300">{t.text}</span></div>
            </li>
          ))}
        </ul>
      </div>
      <ul className="ally-row" aria-label="Algunos de los que te encontrarás">
        {ALLIES.map((a) => {
          const b = BADGE[a.risk];
          return (
            <li key={a.name} className={`ally ${a.star ? 'is-star' : ''}`}>
              <div className="ally-art">
                {b.level && <span className="ally-tri"><Tri level={b.level} size={20} /></span>}
                <img src={monsterUrl(a.sprite, 6)} width={96} alt={a.name} className={`pixelated ${a.flip ? '-scale-x-100' : ''}`} />
              </div>
              <span className="ally-badge" style={b.level ? { color: RISK[b.level].color } : undefined}>{b.text}</span>
              <h4 className="font-display text-xl text-parchment mt-1 leading-tight">{a.name}</h4>
              <p className="font-body text-stone-400 text-base">{a.role}</p>
              <blockquote className="ally-quote">«{a.quote}»{a.quoteBy && <span className="block not-italic text-sm text-stone-400 mt-1">— {a.quoteBy}</span>}</blockquote>
              <p className="font-body text-base text-stone-400 mt-2 leading-snug">{a.who}</p>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
