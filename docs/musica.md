# Gravevow · Música: brief para la versión definitiva

**Estado actual (13/11, noche):**
- Suena **música de archivo** solo en el menú, la creación de personaje y el Bastión: dos pistas que se alternan sin repetirse, con 5–15 s de silencio entre una y otra (`PLAYLISTS` en `src/config/music.ts`, reproductor `src/game/music/playlist.ts`).
- Mazmorra, combate, jefes y resultados: **sin música**, solo efectos. Al bajar, la música se apaga en 2 s; al volver, entra con fundido.
- **Apagados** con interruptor en `src/config/music.ts`: las pistas generadas (`musicaActivada`), el ambiente (`ambienteActivado`) y, con ellas, la capa de peligro y las fanfarrias. La música de archivo tiene el suyo (`listasActivadas`).
- Añadir una pista: OGG + MP3 en `public/audio/` y una línea en `PLAYLISTS` (con `screens` se elige en qué pantallas suena).

### Pistas en uso
| Pista | Archivos | Duración | Origen | Licencia | Atribución (si hace falta en créditos) |
|---|---|---|---|---|---|
| Medieval Estampie | `public/audio/medieval-estampie.ogg/.mp3` (original en `assets/audio/originales/`) | 1:29 | Biblioteca de audio de Magnific | Uso gratuito (comprobar condiciones de uso comercial y de atribución) | _pendiente_ |
| Whisper of the Bow | `public/audio/whisper-of-the-bow.ogg/.mp3` (original en `assets/audio/originales/`) | 2:00 (original a 128 kbps) | Biblioteca de audio de Magnific | Uso gratuito (comprobar condiciones de uso comercial y de atribución) | _pendiente_ |

**Preparación:** sonoridad igualada a −16 LUFS (pico −1,5 dBTP, `loudnorm` en dos pasadas), fundidos de 1,5 s al principio y al final, 44,1 kHz estéreo; OGG Vorbis q4 y MP3 VBR q4. Los originales no se tocan. Para regenerarlas: el bloque de `ffmpeg` está en `docs/estado-trabajo.md` (13/11, noche).

Hoy las 6 pistas y las fanfarrias se generan por código (`src/game/music`), con los datos en `src/config/music.ts`.
Para cambiar una por un archivo definitivo:

1. Exporta la pista en **OGG (Vorbis)** y en **MP3** (Safari no lee OGG).
2. Cópialas en `public/audio/` (por ejemplo, `public/audio/mazmorra.ogg` y `public/audio/mazmorra.mp3`).
3. En `src/config/music.ts`, en la pista, añade `file: { ogg: './audio/mazmorra.ogg', mp3: './audio/mazmorra.mp3' }`.
4. Se carga solo cuando hace falta (al entrar en esa zona) y suena en bucle con los mismos fundidos. El ambiente, las pausas y la capa de peligro siguen funcionando igual.

Recomendación general: pistas **sin percusión ni melodía muy marcadas al principio y al final**, para que el bucle no se note; **−14 LUFS** aproximadamente; nada estridente por encima de 8 kHz; que suene bien en el altavoz de un móvil.

---

## 1. Tema de la Mazmorra
- **Dónde suena:** explorando las Afueras, el Bastión en ruinas y las mazmorras del Bastión (subzonas 1 a 3).
- **Ánimo:** fantasía oscura medieval, tensa pero contenida. Piedra fría, antorchas, pasos que resuenan.
- **Tempo:** unos 70 BPM. **Modo:** re dórico.
- **Instrumentos:** laúd o guitarra medieval pulsada, contrabajo con arco suave, pad de cuerdas graves, tambor de marco lejano.
- **Duración:** 2–3 minutos, bucle perfecto.
- **Texto para IA (inglés):**
  > Dark medieval fantasy dungeon exploration music, tense but restrained, 70 BPM, D dorian. Plucked lute arpeggios, low bowed double bass, soft low string pad, distant frame drum hits. Cold stone halls lit by torches, sparse and atmospheric, no vocals, seamless loop, gentle start and end.

## 2. Tema de la Cripta
- **Dónde suena:** el Osario de Umbravel, las Catacumbas Ahogadas y el Panteón de los Nobles (subzonas 4 a 6).
- **Ánimo:** lúgubre y espectral. Muerte, silencio, agua negra y velas frías.
- **Tempo:** unos 56 BPM. **Modo:** sol frigio.
- **Instrumentos:** coro fantasmal sin palabras (vocales «ah»/«oh»), campanas lejanas, dron grave, flauta lejana ocasional, mucha reverberación.
- **Duración:** 2–3 minutos, bucle perfecto.
- **Texto para IA (inglés):**
  > Haunting gothic crypt ambience, slow 56 BPM, G phrygian. Ghostly wordless choir pads, distant tolling bells, deep drone, occasional faint flute, long cathedral reverb. Feeling of death, silence and cold candlelight in flooded catacombs. No percussion, no lyrics, seamless loop.

## 3. Tema del Infierno
- **Dónde suena:** la Cripta Carmesí, las Puertas del Abismo, los Ríos de Fuego y el Trono de las Cadenas (subzonas 7 a 10).
- **Ánimo:** grave, opresivo y amenazante. Calor, peligro y cadenas.
- **Tempo:** unos 84 BPM. **Modo:** do locrio, con drones de quinta.
- **Instrumentos:** dron muy grave, timbales y tambores de guerra pesados, metales con distorsión suave, respiración de ruido grave, cadenas.
- **Duración:** 2–3 minutos, bucle perfecto.
- **Texto para IA (inglés):**
  > Oppressive infernal dark fantasy music, 84 BPM, C locrian. Massive low drones, heavy war drums and timpani, gritty distorted brass stabs, rumbling low noise, rattling chains. Heat, lava and looming threat, menacing but not chaotic. No vocals, seamless loop.

## 4. Combate
- **Dónde suena:** en todos los combates. Con élites y jefes, la misma pista con más capas y más tempo (en el archivo definitivo: una versión «intensa» aparte o capas separadas).
- **Ánimo:** intenso y rítmico, por turnos (no frenético).
- **Tempo:** unos 120 BPM (jefe: unos 132). **Modo:** menor natural.
- **Instrumentos:** percusión marcada (tambores de guerra, shaker), bajo en ostinato, laúd rápido; en la versión intensa, timbales, coro y bajo octavado.
- **Duración:** 1–2 minutos, bucle perfecto.
- **Texto para IA (inglés):**
  > Rhythmic dark fantasy turn-based battle music, 120 BPM, natural minor. Driving war drums and shakers, pulsing ostinato bass, fast plucked lute riff, tense and focused rather than chaotic. Intense version: add timpani, low choir and octave bass, 132 BPM. No vocals, seamless loop.

## 5. El Bastión
- **Dónde suena:** en el Bastión (Jugar, Intendencia, Bastión, Misiones…).
- **Ánimo:** tranquilo y algo melancólico. Un refugio entre ruinas; respirar antes de volver a bajar.
- **Tempo:** unos 64 BPM. **Modo:** fa mixolidio menor (mezcla de mayor y menor).
- **Instrumentos:** laúd suave, flauta de madera, pad cálido, bajo tranquilo, un fuego de fondo.
- **Duración:** 2–3 minutos, bucle perfecto.
- **Texto para IA (inglés):**
  > Calm melancholic medieval sanctuary music, 64 BPM, F major-minor mix. Gentle lute, soft wooden flute, warm string pad, quiet bass, faint crackling fire. A refuge among ruins, bittersweet and restful. No vocals, seamless loop.

## 6. Menú principal y creación de personaje
- **Dónde suena:** portada del juego, elegir y crear personaje.
- **Ánimo:** presentación con identidad: épico pero contenido, oscuro y con nostalgia. Motivo de cuatro notas reconocible (la «firma» de Gravevow: 1-5-4-1 descendente y resuelto).
- **Tempo:** unos 60 BPM. **Modo:** re eólico.
- **Instrumentos:** campanas, pad de cuerdas, bajo grave, flauta lejana.
- **Duración:** 1:30–2:30, bucle perfecto.
- **Texto para IA (inglés):**
  > Main theme for a dark fantasy extraction RPG, 60 BPM, D aeolian. A memorable four-note bell motif, wide string pad, deep bass, distant flute answering the motif. Dark, solemn, nostalgic and inviting, like standing at the gate of a cursed castle. No vocals, seamless loop.

## Fanfarrias (cortas, sin bucle)
| Fanfarria | Dónde | Duración | Texto para IA (inglés) |
|---|---|---|---|
| Extracción con éxito | Al salir por el portal | 3–4 s | Short triumphant dark fantasy sting, bells and warm strings, rising fifth, relief after danger, 3 seconds. |
| Muerte | Al caer | 3–4 s | Short somber death sting, low ghostly choir falling a semitone, tolling bell, deep drone, 4 seconds. |
| Subida de nivel | En el resumen al subir de nivel | 2 s | Short bright level-up sting, quick plucked arpeggio up to a ringing bell, 2 seconds, medieval fantasy. |
| Botín legendario | En el resumen con un legendario | 3 s | Short shimmering legendary loot sting, ascending bells and a soft choir swell, magical and rare, 3 seconds. |

---

## Origen y licencia de cada pista definitiva
**Antes de usar cualquier pista generada con IA o encargada, comprueba que la herramienta o el contrato permiten uso comercial** (el juego se publicará en Steam y puede tener micropagos estéticos). Guarda el justificante.

| Pista | Archivo | Herramienta o autor | Fecha | Licencia / plan | Uso comercial comprobado |
|---|---|---|---|---|---|
| Mazmorra | | | | | ☐ |
| Cripta | | | | | ☐ |
| Infierno | | | | | ☐ |
| Combate | | | | | ☐ |
| Bastión | | | | | ☐ |
| Menú | | | | | ☐ |
| Fanfarria: extracción | | | | | ☐ |
| Fanfarria: muerte | | | | | ☐ |
| Fanfarria: nivel | | | | | ☐ |
| Fanfarria: legendario | | | | | ☐ |
