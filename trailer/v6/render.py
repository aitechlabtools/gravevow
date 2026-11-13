# Montaje del tráiler v6 (alpha, 30 s) a partir de las tomas de scripts/trailer5-capture.cjs y del guion (guion.json).
# Salidas en public/trailer: gravevow-trailer.mp4 (H.264) y .webm (VP9), poster.jpg, y clip.mp4/.webm/.jpg (portada, 8 s sin rótulos).
# Uso: python3 trailer/v6/render.py [carpeta de tomas]   (por defecto /tmp/claude-0/t6). La música va aparte: music.py y luego este script con --mux.
import json, subprocess, os, sys
TX = os.path.dirname(os.path.abspath(__file__))
T = next((a for a in sys.argv[1:] if not a.startswith('--')), '/tmp/claude-0/t6')
OUT = os.environ.get('TRAILER_OUT', f'{T}/out6'); PUB = os.path.join(TX, '..', '..', 'public', 'trailer')
W, H, FPS = 1280, 720, 30
# El golpe se ve (destello rojo y cifra de daño) 0,32 s después (medido en la grabación de noviembre) de que el combate lo resuelve: el sonido va con la imagen
HIT_LAG = 0.32
os.makedirs(OUT, exist_ok=True)
G = json.load(open(f'{TX}/guion.json'))
ENC = ["-c:v", "libx264", "-preset", "veryfast", "-crf", "17", "-pix_fmt", "yuv420p", "-r", str(FPS)]
COL = {'dun': "eq=brightness=0.06:gamma=1.45:saturation=1.2:contrast=1.05", 'ui': "eq=gamma=1.15:saturation=1.1"}
def crop(w, x, y): return f"crop={w}:{round(w*9/16)}:{x}:{y}"
CROP = {'cmb': crop(1000, 140, 20), 'uic': crop(1180, 50, 30), 'alijo': crop(820, 220, 70), 'cofre': crop(760, 260, 150), 'kael': crop(560, 360, 130)}

def run(cmd):
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode: print(r.stderr[-2000:]); sys.exit(1)

def shot(i, src, t0, dur, cr, col, tag):
    out = f'{OUT}/{tag}{i:02d}.mp4'
    if src == 'card':
        run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'lavfi', '-i', f'color=c=0x07060a:s={W}x{H}:r={FPS}:d={dur}', *ENC, out]); return out
    fr = json.load(open(f'{T}/{src}/frames.json')); start = fr[0]['t']
    sel = [f for f in fr if t0 <= f['t'] - start <= t0 + dur]; prev = [f for f in fr if f['t'] - start < t0]
    if prev: sel = [prev[-1]] + sel
    lst = f'{OUT}/{tag}{i:02d}.txt'
    with open(lst, 'w') as fh:
        for k, f in enumerate(sel):
            nt = sel[k + 1]['t'] if k + 1 < len(sel) else start + t0 + dur
            fh.write(f"file '{f['f']}'\nduration {max(0.001, min(nt, start + t0 + dur) - max(f['t'], start + t0)):.4f}\n")
        fh.write(f"file '{sel[-1]['f']}'\n")
    vf = f'fps={FPS}'
    if cr == 'movil':
        vf += f",scale=880:406:flags=neighbor,pad={W}:{H}:200:232:color=0x07060a"
    else:
        if cr: vf += ',' + CROP[cr]
        # Pixel art sin suavizado: escalado por vecino más próximo y empuje suave de cámara
        vf += f",scale={W*2}:{H*2}:flags=neighbor,zoompan=z='1+0.03*on/{FPS}':x='iw/2-iw/zoom/2':y='ih/2-ih/zoom/2':d=1:s={W}x{H}:fps={FPS}"
    if col: vf += ',' + COL[col]
    vf += f',trim=duration={dur},setpts=PTS-STARTPTS,format=yuv420p'
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', lst, '-vf', vf, '-t', str(dur), *ENC, out]); return out

def concat(parts, out):
    with open(out + '.txt', 'w') as fh:
        for p in parts: fh.write(f"file '{p}'\n")
    run(['ffmpeg', '-y', '-loglevel', 'error', '-f', 'concat', '-safe', '0', '-i', out + '.txt', '-c', 'copy', out])

if '--mux' not in sys.argv:
    parts, cuts, t = [], [], 0.0
    hits, marks = [], []
    for i, (src, t0, dur, cr, col) in enumerate(G['shots']):
        # Duración en fotogramas enteros: si no, cada toma suma un pico y la imagen se va retrasando respecto al sonido
        dur = round(dur * FPS) / FPS
        cuts.append(round(t, 3))
        # Golpes grabados (para el sonido): se pasan al tiempo del vídeo
        hp = f'{T}/{src}/hits.json'
        if src != 'card' and os.path.exists(hp):
            start = json.load(open(f'{T}/{src}/frames.json'))[0]['t']
            for h in json.load(open(hp)):
                rel = h['t'] - start - t0 + HIT_LAG
                if 0 <= rel < dur: hits.append({'t': round(t + rel, 3), 'who': h['who'], 'crit': h.get('crit', False)})
        mp = f'{T}/{src}/marks.json'
        if src != 'card' and os.path.exists(mp):
            fl = json.load(open(mp)).get('flashFrame')
            if fl is not None and 0 <= fl / 30 - t0 < dur: marks.append({'t': round(t + fl / 30 - t0, 3), 'what': 'portal'})
        t += dur; parts.append(shot(i, src, t0, dur, cr, col, 's')); print('toma', i, src, dur)
    concat(parts, f'{OUT}/base.mp4')
    inputs = ['-i', f'{OUT}/base.mp4']; fc = ''; last = '[0:v]'
    for k, (png, a, b) in enumerate(G['texts']):
        inputs += ['-loop', '1', '-framerate', str(FPS), '-t', str(t), '-i', f'{TX}/{png}.png']
        fi = 0.5 if png == 'final' else (0.05 if png == 'movil' else 0.18)
        fc += (f"[{k+1}:v]format=rgba,fade=in:st={a}:d={fi}:alpha=1,fade=out:st={b-0.2:.2f}:d=0.2:alpha=1[t{k}];{last}[t{k}]overlay=0:0:shortest=1[v{k}];")
        last = f'[v{k}]'
    fc += f"{last}fade=in:st=0:d=0.25,fade=out:st={t-0.6:.2f}:d=0.6,format=yuv420p[v]"
    run(['ffmpeg', '-y', '-loglevel', 'error', *inputs, '-filter_complex', fc, '-map', '[v]', '-t', str(t), *ENC, f'{OUT}/video.mp4'])
    json.dump({'cuts': cuts, 'total': round(t, 3), 'texts': G['texts'], 'hits': hits, 'marks': marks}, open(f'{OUT}/cuts.json', 'w'))
    # Clip de portada (sin rótulos, en bucle)
    cp = [shot(i, *c, 'c') for i, c in enumerate(G['clip'])]
    concat(cp, f'{OUT}/clip.mp4')
    print('vídeo', round(t, 2), 's · ahora: python3 trailer/v6/music.py && python3 trailer/v6/render.py --mux')
else:
    os.makedirs(PUB, exist_ok=True)
    total = json.load(open(f'{OUT}/cuts.json'))['total']
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/video.mp4', '-i', f'{OUT}/music.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20',
         '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', '-t', str(total), f'{PUB}/gravevow-trailer.mp4'])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/video.mp4', '-i', f'{OUT}/music.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libvpx-vp9', '-crf', '34', '-b:v', '0', '-row-mt', '1', '-deadline', 'good', '-cpu-used', '4',
         '-c:a', 'libopus', '-b:a', '128k', '-t', str(total), f'{PUB}/gravevow-trailer.webm'])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-ss', str(total - 3.5), '-i', f'{OUT}/video.mp4', '-frames:v', '1', '-q:v', '3', f'{PUB}/poster.jpg'])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/clip.mp4', '-an', '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', f'{PUB}/clip.mp4'])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/clip.mp4', '-an', '-c:v', 'libvpx-vp9', '-crf', '38', '-b:v', '0', '-row-mt', '1', '-cpu-used', '4', f'{PUB}/clip.webm'])
    run(['ffmpeg', '-y', '-loglevel', 'error', '-i', f'{OUT}/clip.mp4', '-frames:v', '1', '-q:v', '3', f'{PUB}/clip.jpg'])
    print('publicado en public/trailer')
