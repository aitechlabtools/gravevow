// Pantalla de pruebas de la música (13/11), solo en desarrollo: /play/?debug&musica
// Cada pista y cada variación de subzona, combate normal y de jefe, peligro y fanfarrias.
import { useEffect, useState } from 'react';
import { musicEngine, setLabOverride } from '../music/director';
import { DEFAULT_VARIATION, MUSIC_CFG, SUBZONE_MUSIC, TRACKS, type FanfareId, type TrackId } from '../../config/music';
import { getSubzone } from '../../core/data/subzones';

const ZONE_OF: Record<string, TrackId> = { afueras: 'mazmorra', castillo: 'mazmorra', calabozos: 'mazmorra', osario: 'cripta', catacumbas: 'cripta', panteon: 'cripta', carmesi: 'infierno', puertas: 'infierno', rios: 'infierno', trono: 'infierno' };
const FAN: [FanfareId, string][] = [['extract', 'Extracción'], ['death', 'Muerte'], ['level', 'Subida de nivel'], ['legendary', 'Legendario']];
const B = { minHeight: 44 } as const;

export function MusicLab() {
  const [open, setOpen] = useState(true);
  const [status, setStatus] = useState('Toca cualquier botón para empezar (el navegador pide un toque antes de sonar).');
  const [danger, setDanger] = useState(false);
  const [light, setLight] = useState(false);
  const [sub, setSub] = useState<string | null>(null);
  useEffect(() => { setLabOverride(open); return () => setLabOverride(false); }, [open]);
  useEffect(() => {
    const t = window.setInterval(() => { const m = musicEngine(); const c = m?.current; if (c) setStatus(`${TRACKS[c.id].name}${sub ? ` · ${getSubzone(sub).name}` : ''} · intensidad ${c.intensity.toFixed(2)} · ${c.status}${m!.ambientIds.length ? ` · ambiente: ${m!.ambientIds.join(', ')}` : ''}`); }, 500);
    return () => clearInterval(t);
  }, [sub]);
  const m = () => { const e = musicEngine(); if (e) e.light = light; return e; };
  const track = (id: TrackId) => { setSub(null); m()?.play(id, DEFAULT_VARIATION, { intensity: id === 'menu' ? 0.6 : 0.4 }); m()?.setAmbient(id === 'bastion' ? ['refugio'] : null); m()?.setCombatLevel(1); };
  const subzone = (id: string) => { setSub(id); const v = SUBZONE_MUSIC[id]; m()?.play(ZONE_OF[id], v); m()?.setAmbient(v.ambient); m()?.setCombatLevel(1); };
  const combat = (boss: boolean) => { const v = sub ? SUBZONE_MUSIC[sub] : DEFAULT_VARIATION; m()?.play('combat', { ...v, cutoff: 1, tempo: 1 }, { intensity: boss ? 1 : MUSIC_CFG.normalCombatIntensity, tempo: boss ? MUSIC_CFG.eliteBoost.tempo : 1, fade: MUSIC_CFG.combatFade }); };
  if (!open) return <button className="btn fixed bottom-2 left-2 z-[90]" style={B} onClick={() => setOpen(true)} data-testid="music-lab-open">♪ Pruebas de música</button>;
  return (
    <div className="fixed inset-2 z-[90] panel panel-gold p-3 overflow-y-auto scroll-thin font-body" data-testid="music-lab">
      <div className="flex items-center justify-between gap-2 mb-2">
        <h2 className="panel-title text-xl">Pruebas de música</h2>
        <button className="btn" style={B} onClick={() => { musicEngine()?.stopAll(); setOpen(false); }} data-testid="music-lab-close">Cerrar (vuelve el juego)</button>
      </div>
      <p className="text-sm text-stone-300 mb-3" data-testid="music-lab-status" aria-live="polite">{status}</p>
      <h3 className="text-gold mt-2">Pistas</h3>
      <div className="flex flex-wrap gap-2 mt-1">{(Object.keys(TRACKS) as TrackId[]).filter((t) => t !== 'combat').map((t) => <button key={t} className="btn" style={B} onClick={() => track(t)} data-testid={`lab-track-${t}`}>{TRACKS[t].name}</button>)}</div>
      <h3 className="text-gold mt-3">Subzonas (tema de su zona con su variación y su ambiente)</h3>
      <div className="flex flex-wrap gap-2 mt-1">{Object.keys(SUBZONE_MUSIC).map((id, i) => <button key={id} className={`btn ${sub === id ? 'btn-gold' : ''}`} style={B} onClick={() => subzone(id)} data-testid={`lab-sub-${id}`}>{i + 1}. {getSubzone(id).name}</button>)}</div>
      <h3 className="text-gold mt-3">Situaciones</h3>
      <div className="flex flex-wrap gap-2 mt-1">
        <button className="btn" style={B} onClick={() => combat(false)} data-testid="lab-combat">Combate</button>
        <button className="btn" style={B} onClick={() => combat(true)} data-testid="lab-boss">Combate de jefe o élite</button>
        <button className="btn" style={B} onClick={() => (sub ? subzone(sub) : track('mazmorra'))} data-testid="lab-explore">Volver a explorar</button>
        <button className={`btn ${danger ? 'btn-danger' : ''}`} style={B} onClick={() => { const d = !danger; setDanger(d); m()?.setDanger(d); }} data-testid="lab-danger">Peligro: {danger ? 'sí' : 'no'}</button>
        <button className={`btn ${light ? 'btn-gold' : ''}`} style={B} onClick={() => setLight(!light)} data-testid="lab-light">Modo ligero: {light ? 'sí' : 'no'}</button>
        <button className="btn" style={B} onClick={() => { musicEngine()?.stopAll(); setDanger(false); }} data-testid="lab-stop">Parar todo</button>
      </div>
      <h3 className="text-gold mt-3">Fanfarrias</h3>
      <div className="flex flex-wrap gap-2 mt-1">{FAN.map(([id, label]) => <button key={id} className="btn" style={B} onClick={() => m()?.fanfare(id)} data-testid={`lab-fan-${id}`}>{label}</button>)}</div>
      <p className="text-xs text-stone-400 mt-3">Las pausas de solo ambiente duran {MUSIC_CFG.pause[0]}–{MUSIC_CFG.pause[1]} s y llegan cada pocas frases. Todo se ajusta en src/config/music.ts.</p>
    </div>
  );
}
