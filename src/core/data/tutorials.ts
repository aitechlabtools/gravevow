// ════════════════════════════════════════════════════════════════════
// Mini tutoriales contextuales: archivo de datos. Para enseñar una
// mecánica nueva basta con añadir aquí una entrada y lanzar su
// disparador desde la interfaz con `actions.tutorialEvent('<disparador>')`.
// Mapa completo y reglas: docs/plan-tutoriales.md (y docs/tutoriales.md
// cuando exista).
// ════════════════════════════════════════════════════════════════════
import type { VendorId } from './vendors';
import { STATIONS } from '../../config/stations';
import type { CraftStation } from './crafting';
import { SUBZONES } from './subzones';

/** Temas de la Guía (Ajustes › Partida). */
export type TutTopic = 'combate' | 'cuerpo' | 'objetos' | 'bastion' | 'mercaderes' | 'progresion' | 'cuenta';
export const TOPIC_NAME: Record<TutTopic, string> = {
  combate: 'Combate', cuerpo: 'Heridas y necesidades', objetos: 'Objetos y oro', bastion: 'Bastión y estaciones',
  mercaderes: 'Mercaderes', progresion: 'Progresión', cuenta: 'Cuenta y copia',
};

/** Quién lo cuenta: el intendente del Bastión o un mercader (con su retrato). */
export type Narrator = 'intendant' | VendorId;

export interface TutStep {
  /** Texto de escritorio. Admite **negrita**. Una o dos frases. */
  text: string;
  /** Texto para pantallas táctiles, si cambia («toca» en vez de «haz clic»). */
  touch?: string;
  /** `data-testid` del elemento que se resalta. Si no está en pantalla, el paso se muestra sin resaltar. */
  target?: string;
  /**
   * 'click': el paso termina cuando el jugador toca el elemento resaltado (acción real).
   * Sin valor: botón «Entendido».
   */
  action?: 'click';
}

export interface MiniTutorial {
  id: string;
  topic: TutTopic;
  /** Disparador, p. ej. 'tab:quests' (primera vez en la pestaña Misiones). */
  trigger: string;
  narrator?: Narrator;
  /** `data-testid` donde se pinta el «!» mientras esté pendiente (pestaña, mercader, estación…). */
  badge?: string;
  /** Es del propio combate: puede salir en mitad de uno. El resto espera a que termine. */
  inCombat?: boolean;
  /** De 2 a 4 pasos (la bienvenida, `long`, hasta 12). */
  steps: TutStep[];
  /** Recorrido largo por varias pestañas (solo la bienvenida al Bastión). */
  long?: boolean;
  /** Habla de la ventana abierta (el errante): puede salir encima de ella. El resto espera a que se cierre. */
  overModal?: boolean;
  /** Aviso que sale aunque se desactiven los mini tutoriales (subidas de nivel de las estaciones). */
  always?: boolean;
}

/**
 * Receta de la primera vez en cada estación: al construirla (nivel 1), su encargado regala los materiales justos para
 * hacerla una vez. Va por personaje, porque cada uno reconstruye su Bastión.
 */
export const STATION_FIRST_RECIPE: Record<CraftStation, string> = {
  kitchen: 'c_jerky', bench: 'c_grip', infirmary: 'c_bandage', forge: 'c_scrap_bar', alchemy: 'c_antidote', tannery: 'c_strap', armory: 'c_gauntlets',
};

/** Bienvenida al Bastión: la cuenta el intendente al volver de la primera bajada (o al crear un personaje sin tutorial). */
export const WELCOME_ID = 'bienvenida';

export const MINI_TUTORIALS: MiniTutorial[] = [
  {
    id: WELCOME_ID, topic: 'bastion', trigger: 'lobby:welcome', narrator: 'intendant', long: true,
    steps: [
      { text: 'Bienvenido al **Bastión de Ceniza**. Soy el intendente: aquí arriba lo tienes todo, en estas pestañas.', target: 'lobby-nav' },
      { text: 'Empecemos por tu **Alijo**: tu equipo, tu mochila y el almacén. Haz clic en la pestaña.', touch: 'Empecemos por tu **Alijo**: tu equipo, tu mochila y el almacén. Toca la pestaña.', target: 'tab-stash', action: 'click' },
      { text: 'Lo que traes de abajo va en la **mochila**, y la mochila **se pierde si mueres**. El oro también **ocupa sitio**: las monedas sueltas llenan casillas. Elige un objeto para ver su ficha; arrástralo para moverlo y haz **doble clic** para la acción rápida.', touch: 'Lo que traes de abajo va en la **mochila**, y la mochila **se pierde si mueres**. El oro también **ocupa sitio**: las monedas sueltas llenan casillas. Toca un objeto para ver su ficha y luego una casilla libre para moverlo; **dos toques**, acción rápida.', target: 'alijo-backpack' },
      { text: 'Los **saquitos** y **sacos** que vende Nira guardan muchas monedas en una sola casilla. Pulsa **«Agrupar oro»**.', touch: 'Los **saquitos** y **sacos** que vende Nira guardan muchas monedas en una sola casilla. Toca **«Agrupar oro»**.', target: 'group-gold-backpack', action: 'click' },
      { text: 'Este es tu **bolsillo seguro**: lo que guardes ahí **no se pierde al morir**. Caben cosas pequeñas, como llaves o saquitos. Arrastra ahí lo más valioso antes de bajar.', touch: 'Este es tu **bolsillo seguro**: lo que guardes ahí **no se pierde al morir**. Caben llaves o saquitos: toca uno y luego una casilla del bolsillo.', target: 'alijo-pocket' },
      { text: 'Pulsa **«Vaciar mochila»**: todo lo que llevas pasa al almacén, donde está a salvo.', touch: 'Toca **«Vaciar mochila»**: todo lo que llevas pasa al almacén, donde está a salvo.', target: 'empty-backpack', action: 'click' },
      { text: 'Ahora, la pestaña **Bastión**. Haz clic en ella.', touch: 'Ahora, la pestaña **Bastión**. Tócala.', target: 'tab-merchants', action: 'click' },
      { text: 'Aquí están los **mercaderes**: compran, venden, dan encargos y cada uno cuida una **estación** del Bastión en ruinas que vas reconstruyendo. Ya los irás conociendo.', target: 'vendor-list' },
      { text: 'Tu partida vive en este navegador. Haz una **copia de seguridad** de vez en cuando: está en **Ajustes › Partida** y en el menú principal.', target: 'btn-lobby-settings' },
      { text: 'Cuando quieras bajar, vuelve a **Jugar**. Haz clic en la pestaña.', touch: 'Cuando quieras bajar, vuelve a **Jugar**. Toca la pestaña.', target: 'tab-play', action: 'click' },
      { text: 'Elige la subzona (de momento, las Afueras) y pulsa **Descender**. Tendrás un tiempo para encontrar el **portal**; si caes, pierdes lo que llevas. Pasa el ratón por encima para ver qué arriesgas.', touch: 'Elige la subzona (de momento, las Afueras) y toca **Descender**. Tendrás un tiempo para encontrar el **portal**; si caes, pierdes lo que llevas. Mantén pulsado para ver qué arriesgas.', target: 'btn-enter-dungeon' },
    ],
  },
  {
    id: 'tab.misiones', topic: 'mercaderes', trigger: 'tab:quests', badge: 'tab-quests',
    steps: [
      { text: 'Aquí tienes los **encargos** de todos los mercaderes, juntos. Lleva lo que piden en tu almacén y cobra la paga.', target: 'screen-quests' },
      { text: 'Cada encargo cumplido sube tu **reputación** con quien te lo dio.' },
    ],
  },
  {
    id: 'tab.bestiario', topic: 'progresion', trigger: 'tab:bestiary', badge: 'tab-bestiary',
    steps: [
      { text: 'Cada criatura que vences queda apuntada: **puntos débiles**, botín y dónde vive.', target: 'bestiary' },
      { text: 'Cuanto más vences a una, más sabes de ella.' },
    ],
  },
  {
    id: 'tab.tienda', topic: 'cuenta', trigger: 'tab:shop', badge: 'tab-shop',
    steps: [
      { text: 'Los **trajes** solo cambian tu aspecto. No dan ventaja.', target: 'shop' },
      { text: 'Lo que compras es de la **cuenta**: cualquiera de tus personajes lo puede llevar.' },
    ],
  },
  // ── Pestañas y pantallas ──
  {
    id: 'tab.intendencia', topic: 'cuerpo', trigger: 'stash:status',
    steps: [
      { text: 'Aquí ves tu **cuerpo** parte por parte y tus **necesidades**: saciedad, hidratación y descanso.', target: 'intendencia-status' },
      { text: 'Si algo está herido y llevas con qué curarlo, sale un botón. **Pruébalo**.', target: 'body-quick', action: 'click' },
    ],
  },
  {
    id: 'tab.personaje', topic: 'progresion', trigger: 'tab:character', badge: 'tab-character',
    steps: [
      { text: 'Tus **ataques** salen de tus armas: cada mano trae los suyos. Para cambiarlos, cambia de arma en el **Alijo**.', target: 'skill-arc' },
      { text: 'La **habilidad de clase** se gana por hitos de nivel, en el panel **Clase**. Solo llevas una equipada.', target: 'character-panels' },
    ],
  },
  {
    id: 'screen.bastion-entry', topic: 'mercaderes', trigger: 'bastion:merchants', badge: 'tab-merchants',
    steps: [
      { text: 'Estos son los **mercaderes** del Bastión. Cada uno tiene su sitio, su **reputación** contigo y una **estación** en ruinas que reconstruyes con él.', target: 'vendor-list' },
      { text: 'Un aviso sobre el retrato te dice si hay algo pendiente: una misión lista, una estación que ya puedes reconstruir o una mejora.', target: 'vendor-card-nira' },
      { text: 'Empieza por **Nira**. Haz clic en ella.', touch: 'Empieza por **Nira**. Tócala.', target: 'vendor-nira', action: 'click' },
    ],
  },
  {
    id: 'tab.refugio', topic: 'bastion', trigger: 'bastion:station', narrator: 'orik',
    steps: [
      { text: 'El Bastión de Ceniza está en ruinas, y es tuyo. Cada mercader cuida una **estación**: se reconstruye con tu oro y tus materiales, en su última pestaña.', target: 'vendor-view-station' },
      { text: 'Aquí ves qué pide, dónde conseguir lo que falta y, ya en pie, qué fabrica. Para **dormir**, el Catre de Grizk.', target: 'station-panel' },
    ],
  },
  {
    id: 'screen.backup', topic: 'cuenta', trigger: 'screen:backup',
    steps: [
      { text: 'Descarga tu partida en un archivo y guárdalo a buen recaudo.', target: 'screen-backup' },
      { text: 'Si cambias de aparato o borras el navegador, **Importar** la recupera. Sin copia, lo perdido no vuelve.' },
    ],
  },
  {
    id: 'screen.select', topic: 'cuenta', trigger: 'screen:select',
    steps: [
      { text: 'Hasta **4 personajes**. Cada uno tiene su equipo, su almacén, su Bastión y su bestiario.', target: 'screen-select' },
      { text: 'Los **trajes**, los ajustes y la página **Compartido** del almacén son de todos.' },
    ],
  },
  {
    id: 'station.runes', topic: 'bastion', trigger: 'station:runes', narrator: 'eldrin',
    steps: [
      { text: 'El atril ya graba **runas**. Elige un arma o una pieza con huecos.', target: 'runes' },
      { text: 'Elige el hueco y la runa. **Una por hueco**, y lo grabado no se borra. Elige bien.' },
    ],
  },
  // ── Bastión, por hechos ──
  {
    id: 'bastion.first-death', topic: 'cuerpo', trigger: 'bastion:fallen', narrator: 'vesper',
    steps: [
      { text: 'Te han traído a rastras. Lo que llevabas en la mochila se ha quedado abajo.' },
      { text: 'Te dejo entera la carne por **una moneda**, o gratis si no tienes ni eso.', target: 'cure-btn', action: 'click' },
      { text: 'Y si te has quedado sin nada que ponerte, en el **Alijo** el Bastión te da **equipo de recluta**.' },
    ],
  },
  {
    id: 'bastion.can-craft', topic: 'bastion', trigger: 'bastion:can-craft',
    steps: [
      { text: 'Con lo que traes puedes **fabricar** algo en tus estaciones del Bastión.' },
      { text: 'Entra en la pestaña **Bastión**: cada mercader tiene su estación en su última pestaña.', target: 'tab-merchants' },
    ],
  },
  {
    id: 'bastion.first-sale', topic: 'objetos', trigger: 'bastion:sale',
    steps: [
      { text: 'Bien vendido. El oro va a tu **Alijo**, en saquitos.' },
      { text: 'Si te equivocas, lo último que vendes se puede **recomprar** al mismo precio.' },
    ],
  },
  {
    id: 'bastion.first-rep', topic: 'mercaderes', trigger: 'bastion:rank-up',
    steps: [
      { text: 'Un mercader ya se fía más de ti: **descuento**, más género y mejores encargos.' },
      { text: 'La reputación sube cumpliendo sus encargos. Mira la barra en su tarjeta.' },
    ],
  },
  {
    id: 'bastion.first-skin', topic: 'cuenta', trigger: 'bastion:skin',
    steps: [
      { text: 'Traje nuevo. Es de la cuenta: cualquiera de tus personajes lo puede llevar.' },
      { text: 'Póntelo o quítatelo cuando quieras aquí mismo. Solo cambia el aspecto.' },
    ],
  },
  {
    id: 'unlock.stash-page', topic: 'objetos', trigger: 'unlock:stash-page',
    steps: [
      { text: 'Página nueva en el almacén. Las tienes todas aquí arriba.', target: 'stash-pages' },
      { text: '**Arrastra** un objeto a la pestaña de una página para mandarlo allí.', touch: '**Toca** un objeto y luego la pestaña de una página para mandarlo allí.', target: 'stash-pages' },
    ],
  },
  {
    id: 'unlock.shared-page', topic: 'cuenta', trigger: 'unlock:shared-page',
    steps: [
      { text: 'La página **Compartido** es de todos tus personajes.', target: 'stash-page-shared' },
      { text: 'Deja aquí lo que quieras pasarle a otro: lo encontrará al entrar con él. Es la única forma de pasar objetos.', target: 'stash-page-shared' },
    ],
  },
  {
    id: 'unlock.class-skill', topic: 'progresion', trigger: 'unlock:class-skill',
    steps: [
      { text: 'Habilidad de clase nueva. La tienes en **Habilidades**, en el panel Clase.', target: 'tab-character' },
      { text: '**Equípala** allí para llevarla abajo. Solo llevas una, y se cambia fuera de combate.' },
      { text: 'En combate aparece como un ataque más.' },
    ],
  },
  {
    id: 'screen.settings', topic: 'cuenta', trigger: 'screen:settings', overModal: true,
    steps: [
      { text: 'Sonido, pantalla, controles y tu partida. Cada sección, a la izquierda.', target: 'settings-nav' },
      { text: 'En **Partida** están la **copia de seguridad** y la **Guía**, con todo lo que ya te he contado.', target: 'settings-tab-game' },
    ],
  },
  ...EXPEDITION_MINIS(),
  ...SUBZONE_MINIS(),
  ...VENDOR_MINIS(),
  ...STATION_MINIS(),
  ...STATION_LEVEL_NOTICES(),
];

// ── Uno por mercader: lo cuenta él, con su voz. Se pone en cola la primera vez que se entra a hablar con él. ──
function VENDOR_MINIS(): MiniTutorial[] {
  const v = (id: VendorId, steps: TutStep[]): MiniTutorial => ({ id: `vendor.${id}`, topic: 'mercaderes', trigger: `vendor:${id}`, narrator: id, badge: `vendor-card-${id}`, steps });
  return [
    v('nira', [
      { text: 'Cuero, comida, saquitos para tu oro. Lo que necesites para no morir de tont{o|a}.', target: 'vendor-view-shop' },
      { text: 'Y si traes chatarra, la compro: **márcala y pulsa Vender**.', touch: 'Y si traes chatarra, la compro: **márcala y toca Vender**.', target: 'vendor-view-sell' },
      { text: 'Te iré pidiendo cosas. Cúmplelas y subirá tu **reputación** conmigo.', target: 'vendor-view-quests' },
      { text: 'Y en mi **Curtiduría** te enseño a trabajar el cuero y la tela.', target: 'vendor-view-station' },
    ]),
    v('vesper', [
      { text: 'Vendas, pociones y remedios. Lo justo para volver de una pieza.', target: 'vendor-view-shop' },
      { text: 'Si vuelves rot{o|a}, en la **Enfermería** te recompongo. Cobro, claro. La fe no da de comer.', target: 'vendor-view-infirmary' },
    ]),
    v('garth', [
      { text: 'Comida y agua. Ahí abajo el hambre mata tan bien como un esqueleto.', target: 'vendor-view-shop' },
      { text: 'En mi **Cocina** te enseño a guisar. Un buen plato te deja **preparad{o|a}** para bajar.', target: 'vendor-view-station' },
    ]),
    v('orik', [
      { text: 'Herramientas y cachivaches. Y te arreglo lo que traigas abollado.', target: 'vendor-view-repair' },
      { text: 'Lo que no uses, al **Desguace**: lo despiezo y te llevas el material. Con el **Banco de trabajo** en pie, rinde más.', target: 'vendor-view-scrap' },
    ]),
    v('grizk', [
      { text: 'Presto oro y compro lo que otros no quieren. Con intereses, claro.', target: 'vendor-view-shop' },
      { text: 'Y en **Contratos** te alquilo espadas. Algunas son leales. Otras, no tanto.', target: 'vendor-view-contracts' },
      { text: 'Los que venden su espada duermen en mi **Catre**. Tú también, si pagas la noche.', target: 'vendor-view-station' },
    ]),
    v('brand', [
      { text: 'Armas. Buenas, si las pagas. En la **Forja** te hago las tuyas con tu metal.', target: 'vendor-view-station' },
      { text: 'Y lo que traigas mellado, lo **reparo**. Un filo roto no corta nada.', target: 'vendor-view-repair' },
    ]),
    v('valerius', [
      { text: 'Placas y cotas. Lo que se interpone entre tus tripas y una hoja.', target: 'vendor-view-shop' },
      { text: 'En mi **Forja de armaduras** te hago las tuyas: yelmos, corazas y escudos. Los lingotes, pídeselos a Brand.', target: 'vendor-view-station' },
    ]),
    v('eldrin', [
      { text: 'Pociones, polvos y frascos. No los agites cerca de una antorcha.', target: 'vendor-view-shop' },
      { text: 'En mi **Laboratorio** te enseño a destilarlos tú, y a tallar cristales y tinta para el equipo mágico. Con cuidado.', target: 'vendor-view-station' },
    ]),
  ];
}

// ── Uno por estación de crafteo: lo cuenta su encargado la primera vez que se usa. Al reconstruirla regala los materiales
// de la receta de STATION_FIRST_RECIPE, así que el paso de craftear se hace de verdad. ──
function STATION_MINIS(): MiniTutorial[] {
  const what: Record<CraftStation, string> = {
    kitchen: 'Aquí se cocina lo que da **más saciedad** que el pan duro de ahí abajo.',
    bench: 'Empuñaduras, astiles y antorchas. Y con el banco en pie, **desguazar rinde más**.',
    infirmary: '**Vendas**, torniquetes y férulas, sin pagarme a mí.',
    forge: 'Lingotes y armas de hierro. Las armaduras, con Valerius.',
    alchemy: '**Antídotos**, pociones y frascos que arden. Y en el atril, **cristales** y tinta para el equipo mágico; más adelante, runas.',
    tannery: '**Cuero curtido**, correas, telas, ropa, botas y bolsas. Todo lo que no es de hierro.',
    armory: 'Yelmos, corazas, **guanteletes** y escudos de metal. Los lingotes te los da Brand.',
  };
  const after: Record<CraftStation, string> = {
    kitchen: 'Va a tu almacén. Llévalo en la mochila y, abajo, elígelo y pulsa **Comer** cuando apriete el hambre.',
    bench: 'Va a tu almacén. Las empuñaduras las piden otras recetas.',
    infirmary: 'Van a tu almacén. Abajo, **arrástralas** sobre la parte herida.',
    forge: 'Va a tu almacén. Con lingotes se forjan armas y placas.',
    alchemy: 'Va a tu almacén. Bébelo abajo si algo te envenena.',
    tannery: 'Va a tu almacén. La correa sirve para torniquetes, férulas y armaduras.',
    armory: 'Van a tu almacén. Póntelos en el Alijo.',
  };
  return (Object.keys(STATION_FIRST_RECIPE) as CraftStation[]).map((st) => ({
    id: `station.${st}`, topic: 'bastion' as const, trigger: `station:${st}`, narrator: STATIONS[st].by,
    steps: [
      { text: what[st], target: `craft-${st}` },
      { text: 'Te he dejado los materiales justos para la primera. **Elige la receta** señalada: en verde lo que tienes.', touch: 'Te he dejado los materiales justos para la primera. **Toca la receta** señalada: en verde lo que tienes.', target: `recipe-${STATION_FIRST_RECIPE[st]}`, action: 'click' },
      { text: 'Ahora haz clic en **Craftear al almacén**.', touch: 'Ahora toca **Craftear al almacén**.', target: 'craft-go', action: 'click' },
      { text: `${after[st]} Para seguir reconstruyéndola, pulsa **▲ Mejorar** arriba.`, target: `upgrade-open-${st}` },
    ],
  }));
}

// ── Avisos de subida de nivel: salen aunque se desactiven los mini tutoriales. ──
function STATION_LEVEL_NOTICES(): MiniTutorial[] {
  return (Object.keys(STATIONS) as (keyof typeof STATIONS)[]).flatMap((st) => ([2, 3] as const).map((lv) => ({
    id: `station.${st}.lv${lv}`, topic: 'bastion' as const, trigger: `station-up:${st}:${lv}`, narrator: STATIONS[st].by, always: true,
    steps: [
      { text: `${STATIONS[st].lines[lv - 1]} Tu ${STATIONS[st].name.toLowerCase()} ya es **${STATIONS[st].levels[lv].name.toLowerCase()}**.` },
      { text: STATIONS[st].levels[lv].effect },
    ],
  })));
}

// ── Expedición (fase 5): salen la primera vez que pasa algo en la mazmorra. Los dispara `useExpeditionMinis`. ──
function EXPEDITION_MINIS(): MiniTutorial[] {
  return [
    { id: 'exp.clock', topic: 'combate', trigger: 'exp:clock', steps: [
      { text: 'El **reloj** corre. Si llega a cero, la mazmorra se queda con todo lo que lleves encima.', target: 'hud-timer' },
      { text: 'Busca el **portal** antes. Lo que saques por él es tuyo; lo del bolsillo seguro vuelve pase lo que pase.' },
    ] },
    { id: 'exp.vital-wound', topic: 'cuerpo', trigger: 'exp:vital-wound', steps: [
      { text: '**Zona vital** herida: la cabeza o el tórax. Si una llega a cero, mueres, aunque el resto del cuerpo aguante.', target: 'hud-body' },
      { text: 'Cúrala primero. Abre el cuerpo y trata esa zona antes que las demás.', touch: 'Cúrala primero. Toca la figura y trata esa zona antes que las demás.', target: 'hud-body' },
    ] },
    { id: 'exp.fracture', topic: 'cuerpo', trigger: 'exp:fracture', steps: [
      { text: 'Hueso roto. Esa parte rinde menos: un brazo pega peor y una pierna te frena.', target: 'hud-body' },
      { text: 'Ponle una **férula** desde el cuerpo. Sigue rota al volver: en el Bastión, Vesper te la cura.' },
    ] },
    { id: 'exp.bleeding', topic: 'cuerpo', trigger: 'exp:bleeding', steps: [
      { text: 'Sangras. Pierdes vida cada poco, también mientras caminas.', target: 'hud-body' },
      { text: 'Una **venda** lo corta si es leve. Si es grave, **torniquete** o hemostático.' },
    ] },
    { id: 'exp.armor-broken', topic: 'objetos', trigger: 'exp:armor-broken', steps: [
      { text: 'Se te ha roto una pieza. No desaparece, pero ya no protege ni suma nada.', target: 'btn-inventory' },
      { text: 'Un kit de campo la apaña aquí abajo. En el Bastión, Brand la deja como nueva en su yunque.' },
    ] },
    { id: 'exp.backpack-full', topic: 'objetos', trigger: 'exp:backpack-full', steps: [
      { text: 'Vas **sobrecargado** o ya no te cabe nada.', target: 'hud-player' },
      { text: 'Suelta lo que valga poco o agrúpalo. Con sobrecarga caminas más lento y te cansas antes.', target: 'btn-inventory' },
    ] },
    { id: 'exp.need-low', topic: 'cuerpo', trigger: 'exp:need-low', steps: [
      { text: 'Tienes **hambre**, **sed** o **sueño**. Cada barra baja te recorta el Ímpetu o el Maná.', target: 'hud-needs' },
      { text: 'Abre la mochila, elige la comida o la bebida y pulsa **Comer** o **Beber** (o doble clic). A cero, el hambre y la sed te hieren el tórax.', touch: 'Abre la mochila, toca la comida o la bebida y luego **Comer** o **Beber** (o tócala dos veces). A cero, el hambre y la sed te hieren el tórax.', target: 'btn-inventory' },
    ] },
    { id: 'exp.merc-triangle', topic: 'combate', trigger: 'exp:merc-triangle', overModal: true, steps: [
      { text: 'Fíjate en el **triángulo**. Naranja: dudoso. Rojo: te la jugará en cuanto pueda.', target: 'risk-badge' },
      { text: 'Puedes aliarte, dejarlo estar o atacarlo. Si os aliáis, repartir bien le quita ganas de traicionarte.' },
    ] },
    { id: 'exp.kael', topic: 'combate', trigger: 'exp:kael', overModal: true, steps: [
      { text: '**Kael**. No es un errante cualquiera: lleva años bajando solo y casi nunca traiciona.', target: 'risk-badge' },
      { text: 'Si te alías con él, reparte a partes iguales. Lo que no quieras, se lo queda.' },
    ] },
    { id: 'exp.ally-conflict', topic: 'combate', trigger: 'ally:conflict', overModal: true, steps: [
      { text: 'Solo cabe **un aliado**. Ya te acompaña alguien: aquí decides.', target: 'ally-current' },
      { text: '**Quedarte** con el tuyo, **separar caminos** (se despide y te unes al nuevo) o **traicionarle**: combate a muerte, y el nuevo no lo olvidará.', target: 'ally-choice' },
    ] },
    { id: 'exp.ally-body', topic: 'combate', trigger: 'ally:body', steps: [
      { text: '**Su cuerpo aún guarda lo que compartisteis.** Lo que le diste, su parte del oro y sus pociones.' },
      { text: 'Acércate y recógelo antes de salir de esta zona: después se pierde.' },
    ] },
    { id: 'exp.kael-trust', topic: 'combate', trigger: 'kael:trust-down', steps: [
      { text: '**Kael no olvida.** Cada traición le hace fiarse menos: su triángulo pasa a naranja y es más fácil que te la juegue.' },
      { text: 'Extraed juntos y págale su parte para que recupere la confianza. Tres traiciones y será **hostil** para siempre.' },
    ] },
    { id: 'exp.elite', topic: 'combate', trigger: 'exp:elite', inCombat: true, steps: [
      { text: '**Élite**. Más vida, golpes más duros y mejor botín. No te dejes nada en la recámara.' },
      { text: 'Cuando anuncie un golpe fuerte, ponte en **Guardia**: lo encajas mucho mejor y queda expuesto después.' },
    ] },
    { id: 'exp.boss', topic: 'combate', trigger: 'exp:boss', inCombat: true, steps: [
      { text: '**Jefe** de la subzona. Vencerlo abre la siguiente. Si huyes, conserva la vida que le hayas quitado.' },
      { text: 'Al bajar de la mitad de la vida cambia de fase y de golpes. Guarda algo para entonces.' },
    ] },
    { id: 'combat.class-skill', topic: 'combate', trigger: 'combat:class-skill', inCombat: true, steps: [
      { text: 'Tu **habilidad de clase** está lista. Es tu mejor golpe; luego tarda unos turnos en volver.', target: 'act-class' },
      { text: 'Lleva una equipada. Las demás las desbloqueas y eliges en **Habilidades**, en el panel Clase.' },
    ] },
  ];
}

// ── Una por subzona a partir de la segunda: nombre y niveles, la primera vez que bajas. ──
function SUBZONE_MINIS(): MiniTutorial[] {
  return Object.values(SUBZONES).filter((z) => z.index > 1).map((z) => ({
    id: `exp.subzone.${z.id}`, topic: 'progresion' as const, trigger: `subzone:${z.id}`,
    steps: [
      { text: `**${z.name}**, niveles ${z.levels[0]} a ${z.levels[1]}. ${z.tagline}`, target: 'hud-room' },
      { text: 'Criaturas nuevas. Lo que mates queda en el **Bestiario** del Bastión.' },
    ],
  }));
}

/** Nombre corto para la Guía: la primera frase del primer paso, sin negritas. */
export function miniTitle(m: MiniTutorial): string {
  const t = m.steps[0].text.replace(/\*\*/g, '');
  const first = t.split(/(?<=[.!?:])\s/)[0];
  return first.length > 70 ? first.slice(0, 68).trimEnd() + '…' : first;
}

/** Lo que sale en la Guía: todo menos los avisos de subida de nivel. Por tema, en el orden del archivo. */
export function guideEntries(): { topic: TutTopic; minis: MiniTutorial[] }[] {
  return (Object.keys(TOPIC_NAME) as TutTopic[]).map((topic) => ({ topic, minis: MINI_TUTORIALS.filter((m) => m.topic === topic && !m.always) })).filter((g) => g.minis.length);
}

export function getMini(id: string): MiniTutorial | undefined {
  return MINI_TUTORIALS.find((m) => m.id === id);
}
