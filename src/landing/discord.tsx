// Banner de Discord (landing v4). Arte provisional: criaturas del juego y el icono de Discord en pixel art.
// Arte definitivo en la lista de assets (docs/estado-trabajo.md, landing v4).
import { DISCORD_URL, DiscordIcon, EXTERNAL } from '../shared/community';
import { monsterUrl } from '../shared/art';

export const DISCORD_COPY = {
  kicker: 'La hermandad',
  title: 'Nadie baja solo a VarkHollow',
  text: 'Únete a los saqueadores en Discord: novedades de la alpha antes que nadie, avisos de fallos y opiniones que cambian el juego.',
  cta: 'Únete a la hermandad en Discord',
};

export function DiscordBanner() {
  return (
    <section id="discord" className="discord-banner" data-testid="discord-banner" aria-labelledby="discord-title">
      <div className="discord-inner max-w-6xl mx-auto px-4">
        <div className="discord-frame">
          <img src={monsterUrl('rival', 6)} alt="" className="pixelated discord-art discord-art-l -scale-x-100" width={120} />
          <img src={monsterUrl('wand_malek', 6)} alt="" className="pixelated discord-art discord-art-r" width={120} />
          <div className="discord-body">
            <span className="discord-badge"><DiscordIcon size={34} /></span>
            <p className="font-display text-gold tracking-[0.3em] text-sm uppercase mt-4">{DISCORD_COPY.kicker}</p>
            <h2 id="discord-title" className="font-display text-3xl md:text-5xl text-parchment mt-2 leading-tight">{DISCORD_COPY.title}</h2>
            <p className="font-body text-xl text-stone-300 mt-4 max-w-2xl mx-auto leading-snug">{DISCORD_COPY.text}</p>
            <a href={DISCORD_URL} {...EXTERNAL} className="btn-discord discord-cta" data-testid="discord-banner-cta"
              aria-label={`${DISCORD_COPY.cta} (se abre en una pestaña nueva)`}>
              <DiscordIcon size={22} /> {DISCORD_COPY.cta}
            </a>
          </div>
        </div>
      </div>
    </section>
  );
}
