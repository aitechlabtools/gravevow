# Bloque 1 · Entrega 1B: propuesta

12/11/2026. Propuesta para aprobar. No se ha tocado el juego. Las maquetas están en `mockups/heridas/index.html` y la simulación en `docs/equilibrio/simulador-propuesta.md` (escenario «propuesta» de `tools/simulador/escenarios.ts`).

## 1. Tipos de daño

Cada ataque, del jugador o del enemigo, tendrá un campo `damage` que sustituye al efecto visual para decidir las heridas. El efecto visual se queda solo para el dibujo.

| Tipo | Ejemplos | Sangrado | Fractura | Otros |
|---|---|---|---|---|
| Cortante | espadas, hachas, garras, sables | ×1 | nunca | — |
| Punzante | dagas, lanzas, **flechas**, colmillos finos, aguijones | ×0,8, y 1 de cada 4 sangrados es grave | nunca | — |
| Contundente | mazas, martillos, puños, colosos | nunca | ×1,5 | En la cabeza, aturdimiento (25 %) |
| Mordisco | ratas, lobos, perros, sanguijuelas | ×1 | solo las criaturas enormes | Infección (ver punto 5) |
| Mágico | fuego, hielo, sombra, veneno de hechizo | nunca | nunca | Su propio estado: quemadura, congelación, debilidad… |

Cambios respecto a hoy:
- las flechas pasan de cortantes a punzantes;
- los cortes ya no rompen huesos;
- un golpe contundente ya no hace sangrar.

## 2. Zonas del cuerpo por enemigo

Cada enemigo tendrá en sus datos un **perfil**: tamaño, si es fuerte y zonas que golpea. No hace falta escribirlo enemigo por enemigo: hay 5 perfiles base y cada enemigo puede cambiar alguno.

| Perfil | Ejemplos | Zonas que golpea (peso) |
|---|---|---|
| Rastrero | rata, gusano, sanguijuela, serpiente | piernas 100 % |
| Volador | cuervo, murciélago, espectro, diablillo | brazos 70, piernas 30. Si es fuerte, también cabeza 15 |
| Humanoide | bandido, esqueleto, arquero, monje | brazos 45, piernas 45, abdomen 10. Si es fuerte, también tórax 10 y cabeza 5 |
| Bestia | lobo, sabueso, necrófago | piernas 55, brazos 35, abdomen 10 |
| Grande | coloso, gárgola, elemental, armadura hueca | todas las zonas. Tórax y cabeza 35 entre las dos |

**Zonas vitales** (cabeza, tórax y abdomen; hoy solo cabeza y tórax son mortales, y eso no cambia):
- Los comunes de S1 y S2 **nunca** las golpean.
- Los comunes las alcanzan desde **S3**, con un 5 %, que sube 2 puntos por subzona hasta un 20 % en S10.
- Los élites las alcanzan siempre con un 20 % y los jefes con un 30 %.
- Golpe en la cabeza: +25 % de daño y posibilidad de aturdir si es contundente.
- Golpe en el tórax o el abdomen: +15 % de daño.

**En S1, por tanto, solo te golpearán brazos y piernas.** Ya no se puede morir de un golpe al tórax de un cuervo: hay que perder mucha vida por los miembros hasta que el daño sobrante llegue a las zonas vitales.

## 3. Armadura por zona

- La pieza que cubre cada zona es la de hoy: yelmo para la cabeza, coraza para el tórax y el abdomen, guantes para los brazos (el escudo, para el izquierdo) y botas para las piernas.
- **La protección baja poco a poco**, no por tramos: protege lo que le queda de durabilidad, con un mínimo del 0 %. Un 80 % de durabilidad son 0,8 × 80 % = 64 % de las heridas evitadas. Rota, nada.
  - Es más fácil de entender («tus botas están al 40 %: protegen la mitad») y se nota cada reparación.
- **La armadura también frena los estados físicos de las habilidades enemigas** (sangrado, aturdimiento por golpe). Hoy no lo hace.
- **Resistencias por material**, con una sola regla fácil:

| Material | Contra cortante y punzante | Contra contundente |
|---|---|---|
| Tela y cuero | ×0,8 | ×1 |
| Malla | ×1,2 | ×0,7 |
| Placas | ×1 | ×1 |

  La ficha del objeto lo diría así: «Malla: buena contra cortes, floja contra golpes».
- **Mensajes del registro:**
  - «El lobo muerde tu pierna izquierda. Tus botas resisten.»
  - «El bandido te corta el brazo derecho: sangras (no llevas guantes).»

## 4. Probabilidad de los estados

| Valor | Hoy | Propuesta |
|---|---|---|
| Sangrado por golpe | 7 % | 4 % |
| Sangrado con crítico | 20 % (grave) | 12 % (grave) |
| Fractura (normal / crítico) | 3 % / 8 % | igual, pero solo con golpes contundentes |
| Sangrado de habilidades enemigas | se queda la mitad | se queda la mitad, y además lo frena la armadura |
| Estados de habilidades (veneno, quemadura, congelación, aturdimiento) | su probabilidad | −40 % |
| Vida que recobras al ganar un combate | 15 % | 25 % |
| Daño de los comunes de S1 / S2 / S3 | ×0,80 / ×0,90 / ×0,92 | ×0,72 / ×0,85 / ×0,87 |

**Duración y daño de los estados:**
- El veneno pasa del 7 % al 5 % de la vida por turno.
- La quemadura pasa del 6 % al 5 %, con un máximo de 3 turnos.
- Congelación y aturdimiento no se pueden encadenar: tras perder un turno, eres inmune al siguiente.
- **Así ningún estado solo decide un combate.**

## 5. Estados que faltan

Propongo **solo uno nuevo**: **Infección**, del mordisco de las criaturas carroñeras (rata del osario, necrófago, sanguijuela).
- Hasta que la cures, recuperas un 50 % menos de vida con las pociones y al ganar.
- Se cura con un **ungüento** (objeto nuevo) o en el Bastión.

El resto ya existe. Prefiero no añadir más hasta ver cómo se juega.

## 6. Resultados del simulador

300 partidas por fila. La propuesta es una aproximación: el simulador cambia los valores en memoria, pero todavía no tiene los perfiles de zona exactos.

**Seguir vivo tras 4 combates seguidos:**

| Caso | Hoy | Propuesta | Objetivo |
|---|---|---|---|
| Guerrero S1, nivel 1, equipo inicial | 76 % | **93 %** | lo normal |
| Mago S1, nivel 1, equipo inicial | 57 % | **83 %** | lo normal |
| Guerrero S1, **novato** | 54 % | **75 %** | con riesgo |
| Mago S1, **novato** | 37 % | **61 %** | con riesgo |
| Guerrero S3, su equipo | 42 % | 51 % | gana la mayoría de combates sueltos (94 %) |
| Mago S6, su equipo | 12 % | 16 % | sin tocar: se ve en la fase de élites y jefes |

**Heridas por golpe recibido en S1:**

| Clase | Hoy | Propuesta |
|---|---|---|
| Guerrero | 9 % | 5 % |
| Mago | 13 % | 7 % |

Con los perfiles de zona y la armadura frenando las habilidades bajará algo más. El objetivo es **menos de una herida por incursión** de media en S1.

**Lo que esta propuesta no arregla** (lo dejo apuntado para la fase final de simulación):
- **El Mago contra élites y jefes de S1 a S3** (1–12 % de victorias). Hace falta subirle el daño o la defensa al principio, no tocar los estados.
- **El final de S6 y S10** con 4 combates seguidos. Es un ajuste de daño de esas subzonas.

## 7. Comer y beber

**Alimentos** (en `src/config/food.ts`, un archivo nuevo de datos con los valores que usará la cocina del bloque 2):

| Objeto | Saciedad | Hidratación | Extra | Precio | Dónde |
|---|---|---|---|---|---|
| Pan duro | +20 | −3 | — | 3 | Intendente |
| Manzana arrugada | +10 | +10 | — | 3 | Intendente |
| Ración de viaje | +30 | — | — | 6 | Intendente |
| Cecina salada | +35 | −5 | Ocupa poco y pesa poco | 7 | Intendente |
| Queso curado | +25 | — | +3 de descanso | 6 | Intendente |
| Seta de caverna (cruda) | +8 | — | 20 % de náusea: −10 de hidratación | — | Se encuentra en la mazmorra |
| Carne de rata asada | +15 | — | Se cocina en el Refugio | — | Cocina |
| Guiso del Bastión | +40 | +10 | −10 % de gasto de Descanso en la siguiente incursión. Solo en el Bastión | 4 | Cocina |

**Bebidas:**

| Objeto | Saciedad | Hidratación | Extra | Precio | Dónde |
|---|---|---|---|---|---|
| Odre de agua | — | +30 | — | 5 | Intendente |
| Agua de cisterna | — | +15 | 15 % de náusea | — | Mazmorra |
| Vino aguado | — | +20 | +5 de descanso | 6 | Intendente |
| Caldo especiado | +5 | +30 | −10 % de gasto de Saciedad e Hidratación. Solo en el Bastión | 4 | Cocina |
| Té de raíz amarga | — | +20 | Recupera un 3 % de vida | 9 | Hermana Vesper |

**Cómo se come:**
- Al tocar «Comer…» se abre una lista con lo que aporta cada alimento y cuánto se desperdicia.
- Tocar un alimento en la mochila resalta su barra y muestra «Comer».
- Arrastrar, en ordenador.
- Si no llevas nada: «No llevas comida. El Intendente vende raciones; la cocina del Refugio prepara guisos».

## 8. Decisiones de interfaz

- **Tocar es la forma principal** en todos los dispositivos:
  - tocas una parte del cuerpo y la mochila resalta lo que la cura;
  - tocas una cura y el cuerpo resalta dónde sirve.
- **Arrastrar es un atajo en ordenador.** En táctil también funcionará, pero ninguna acción depende de ello.
- **Durante la expedición:**
  - en la exploración, el botón de la silueta del HUD abre el panel y el juego se pausa (como el resto de menús);
  - en combate, un icono 🩸 parpadea suave junto a tu vida cuando tienes heridas y abre el mismo panel.
- **Curar, comer o beber en combate gasta el turno.** Es igual que beber una poción hoy, y evita que curarse sea gratis.
- **Heridas que solo se curan en el Bastión** (operada, inutilizada sin equipo de cirugía): un candado y «Solo en el Bastión: Hermana Vesper».

## 9. Curación tras morir y al extraer

- **Tras morir:** 1 moneda, y gratis si no te queda ninguna. Ya funciona así; falta mostrarlo con un aviso al llegar al Bastión y un botón en el panel.
- **Al extraer herido:** 1 moneda por cada 10 % de vida que falta, más 2 por fractura, con un máximo de 12. Es lo que hay hoy y es barato frente al botín de una incursión de S1 (unas 30–60 monedas), así que propongo dejarlo.

## 10. Equipo de recluta

- **Cuándo:** al volver al Bastión, si la mano derecha o el torso están vacíos, se rellenan solo las ranuras vacías. Da igual lo que haya en el almacén.
- **También a mano:** el Intendente ofrece «Equipo de recluta» gratis mientras te falte arma o armadura, **una vez por cada vuelta al Bastión**. Así no se puede pedir en bucle.
- **Contenido** (en `src/config/recruit.ts`):

| Clase | Contenido |
|---|---|
| Guerrero | Espada de recluta, escudo de tablas, jubón de recluta, 2 vendas, pan duro y odre de agua |
| Mago | Bastón de recluta, grimorio gastado, túnica de recluta, 2 vendas, pan duro y odre de agua |

- **Valor:** un 15 % peor que las armas y armaduras iniciales.
- **Marcado como «Equipo de recluta»:** se vende por 0, no se desguaza y **no se pierde al morir**. Así no hace falta volver a pedirlo y no da ningún beneficio.
- **Aviso:** «Has vuelto sin nada. El Bastión te presta lo justo para volver a bajar.»

## 11. Ficha, registro y bestiario

- **Ficha de combate:** «Lobo famélico · Muerde las piernas y los brazos · Puede causar sangrado». Si golpea zonas vitales, un ◆ con «Alcanza zonas vitales».
- **Bestiario:** lo mismo, en los enemigos descubiertos.

## 12. Preguntas

1. **¿El equipo de recluta no se pierde al morir?** Lo propongo así para que no haya bucles ni pérdidas tontas.
2. **¿Infección como estado nuevo, o lo dejamos fuera de momento?**
3. **¿Resistencias por material (tela, malla, placas)?** Sí o no. Si no, solo cuenta la durabilidad.
4. **Curar, comer o beber en combate gasta el turno.** ¿De acuerdo?
5. **¿Alimentos con náusea (seta cruda, agua de cisterna)?** Dan decisiones interesantes, pero son un efecto negativo más.

## 13. Fases (cuando apruebes)

| Fase | Contenido | Cómo se prueba |
|---|---|---|
| 1 | Tipos de daño y perfiles de zona en los datos de enemigos y armas | Tests y simulador |
| 2 | Armadura gradual, resistencias y freno de los estados de habilidad | Tests y simulador |
| 3 | Probabilidades y duración de los estados | Simulador |
| 4 | Ficha, registro y bestiario con zonas y tipo | `anatomia-check` |
| 5 | Panel nuevo: cuerpo, detalle y necesidades | `necesidades-check` y `anatomia-check` en los 3 tamaños |
| 6 | Tocar para curar (y arrastrar en ordenador) | Prueba nueva `curas-check` |
| 7 | Comida en datos, lista para elegir y alimentos nuevos | `necesidades-check` |
| 8 | Abrir el panel desde el HUD y el combate (gasta el turno) | `curas-check` en combate |
| 9 | Curación tras morir visible y equipo de recluta | `ciclo-check` |
| 10 | Tutorial: comprobar que no se puede perder, simulación final y migración de partidas guardadas | `e2e-tutorial`, simulador y `personajes-check` |
