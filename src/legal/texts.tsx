/*
 * TEXTOS LEGALES ORIENTATIVOS.
 * Estos textos son una base redactada para Gravevow según la LSSI-CE, el RGPD, la LOPDGDD y la guía de cookies
 * de la AEPD, a partir de lo que la web hace realmente (auditoría del 3/11/2026). No son asesoramiento jurídico:
 * conviene que los revise un profesional antes de darlos por definitivos, y actualizarlos cuando cambie la web
 * (analítica, cuentas, guardado en la nube, multijugador, compras…).
 * Los datos del titular (nombre, NIF, ciudad y correo) se muestran como imágenes (public/legal/d1–d5.png) para que los
 * programas que copian páginas no los lean como texto, y solo se cargan al pulsar «Ver datos del titular». Además,
 * public/robots.txt y la etiqueta robots de aviso-legal.html y privacidad.html piden a los buscadores no indexarlos.
 * Para cambiarlos hay que generar de nuevo esas imágenes.
 */
import type { ReactNode } from 'react';
import { DONATE_URL } from '../landing/site';
import { Dato, EmailInline, MailButton, StorageTable, revealData, useRevealed, type LegalSection } from './LegalPage';
import { openConsentSettings } from '../shared/consent';

export const UPDATED = '14 de noviembre de 2026';

function Titular() {
  const shown = useRevealed();
  if (!shown) return (
    <div className="legal-reveal" data-testid="titular-oculto">
      <p className="m-0">Los datos del titular (nombre, NIF, domicilio y correo) se muestran al pulsar el botón. Así se protegen de los programas que copian páginas de forma automática.</p>
      <button type="button" className="btn-play px-6 py-3" onClick={revealData} data-testid="reveal-titular">Ver datos del titular</button>
    </div>
  );
  return (
    <>
      <dl className="legal-dl" data-testid="titular-datos">
        <dt>Titular</dt><dd><Dato id="d1" alt="Nombre y apellidos del titular (en imagen)" /></dd>
        <dt>NIF</dt><dd><Dato id="d2" alt="NIF del titular (en imagen)" /></dd>
        <dt>Domicilio</dt><dd><Dato id="d3" alt="Ciudad del domicilio del titular (en imagen)" /></dd>
        <dt>Correo electrónico</dt><dd><Dato id="d4" alt="Correo electrónico de contacto (en imagen)" /></dd>
        <dt>Sitio web</dt><dd>gravevow.com</dd>
      </dl>
      <div className="flex flex-wrap items-center gap-4">
        <MailButton />
        <p className="text-base text-stone-400 m-0">Los datos se muestran como imagen para protegerlos de programas automáticos. Si no puedes verlos, usa el botón para escribirnos.</p>
      </div>
    </>
  );
}
const Email = EmailInline;

export interface PageDef { title: string; intro: ReactNode; sections: LegalSection[] }

// ─────────────────────────────────────────────────────────────────────────────
// AVISO LEGAL
// ─────────────────────────────────────────────────────────────────────────────
export const AVISO: PageDef = {
  title: 'Aviso legal',
  intro: <p>Aquí tienes quién está detrás de Gravevow y las condiciones para usar esta web y la alpha del juego.</p>,
  sections: [
    { id: 'titular', title: 'Datos del titular', body: <>
      <p>En cumplimiento del artículo 10 de la Ley 34/2002, de servicios de la sociedad de la información y de comercio electrónico (LSSI-CE), estos son los datos del titular de esta web:</p>
      <Titular />
    </> },
    { id: 'objeto', title: 'Objeto de la web', body: <>
      <p>Esta web presenta <strong>Gravevow</strong>, un videojuego independiente en desarrollo, y da acceso gratuito a una versión alpha jugable en el navegador, en ordenador y en el móvil.</p>
      <p>La web no vende nada. Dentro de la alpha, la Tienda de atuendos solo usa el oro que se consigue jugando: no hay pagos con dinero real, y los atuendos son solo estéticos, no dan ventajas.</p>
      {DONATE_URL && <p>Si quieres, puedes apoyar el desarrollo con una aportación voluntaria desde el botón «Apoyar», que lleva a la página de Gravevow en Ko-fi. Es una aportación libre: no compra nada ni da ninguna ventaja en el juego. Las condiciones del pago son las que indica Ko-fi en su web.</p>}
    </> },
    { id: 'uso', title: 'Condiciones de uso', body: <>
      <p>Usar la web y la alpha es gratis y no exige registro. Al usarlas aceptas este aviso legal. Te comprometes a usarlas de forma lícita y a no hacer nada que pueda dañarlas, sobrecargarlas o impedir que otras personas las usen, como intentar acceder a sistemas o datos ajenos o introducir programas dañinos.</p>
      <p>El titular puede cambiar, ampliar o retirar en cualquier momento los contenidos de la web y de la alpha, y también estas condiciones. La versión vigente es siempre la publicada en esta página.</p>
    </> },
    { id: 'alpha', title: 'La alpha y tu progreso', body: <>
      <p>Gravevow es una <strong>alpha en desarrollo</strong>: puede tener errores, y su contenido, su equilibrio y sus reglas pueden cambiar entre versiones.</p>
      <p>Tu progreso (tus personajes, su equipo, su oro y tus ajustes) se guarda <strong>solo en tu navegador</strong>, en tu dispositivo. No se guarda en ningún servidor y el titular no tiene copia. Por eso puede perderse si:</p>
      <ul>
        <li>borras los datos de navegación o los datos de este sitio;</li>
        <li>juegas en una ventana privada o de incógnito;</li>
        <li>cambias de navegador o de dispositivo, o instalas el juego como app (la app instalada tiene su propio guardado);</li>
        <li>una actualización del juego obliga a cambiar el formato de las partidas.</li>
      </ul>
      <p>Para protegerte de estas pérdidas, el juego te deja hacer una <strong>copia de seguridad</strong> (en Ajustes) como archivo o como código de texto, y cargarla después en este u otro navegador. La copia la guardas tú: el titular no la recibe. Te recomendamos hacerla a menudo; el juego te lo recuerda de vez en cuando.</p>
      <p>El titular procura conservar las partidas entre versiones, pero no puede garantizarlo mientras el juego esté en desarrollo.</p>
    </> },
    { id: 'propiedad', title: 'Propiedad intelectual e industrial', body: <>
      <p>El juego Gravevow, su nombre, el mundo de VarkHollow, los logotipos, los gráficos en pixel art, los textos, la música, los sonidos, el tráiler y el código de esta web pertenecen al titular, salvo que se indique lo contrario. Está prohibido reproducirlos, distribuirlos, transformarlos o comunicarlos públicamente sin su autorización, salvo para uso personal y para compartir enlaces o capturas citando la fuente.</p>
      <p>Algunos elementos son de terceros y se usan con su licencia: las tipografías Cinzel, Crimson Pro y Grenze (SIL Open Font License) y las bibliotecas de software libre con las que está hecha la web (por ejemplo React y Phaser, con licencia MIT).</p>
    </> },
    { id: 'responsabilidad', title: 'Exclusión de responsabilidad', body: <>
      <p>El titular intenta que la web y la alpha funcionen bien y estén siempre disponibles, pero no lo garantiza: puede haber interrupciones, errores o pérdidas de progreso. En la medida en que lo permita la ley, el titular no responde de los daños que se deriven de ello, ni del mal uso que otras personas hagan de la web.</p>
      <p>La hoja de ruta de la web indica intenciones, no compromisos: puede cambiar y no tiene fechas cerradas.</p>
    </> },
    { id: 'enlaces', title: 'Enlaces a otras webs', body: <>
      <p>Si esta web enlaza a sitios de terceros, el titular no controla sus contenidos ni sus políticas de privacidad, y no responde de ellos. Si detectas un enlace a un contenido ilícito, escribe a <Email /> y se retirará.</p>
    </> },
    { id: 'ley', title: 'Legislación aplicable y jurisdicción', body: <>
      <p>Este aviso legal se rige por la legislación española. Si eres consumidor, para cualquier controversia serán competentes los juzgados y tribunales de tu domicilio. En los demás casos, las partes se someten a los juzgados y tribunales del domicilio del titular.</p>
    </> },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// POLÍTICA DE PRIVACIDAD
// ─────────────────────────────────────────────────────────────────────────────
export const PRIVACIDAD: PageDef = {
  title: 'Política de privacidad',
  intro: <>
    <p><strong>En resumen:</strong> esta web no tiene formularios ni cuentas. Tu partida se guarda solo en tu navegador y no se envía al titular. Si aceptas las cookies de análisis, Google Tag Manager mide de forma agregada cómo se usan la web y el juego. Además están el servicio que aloja la web (GitHub) y, si nos escribes, tu correo.</p>
  </>,
  sections: [
    { id: 'responsable', title: 'Responsable del tratamiento', body: <>
      <Titular />
      <p>Puedes escribir al correo del titular para cualquier cuestión sobre tus datos.</p>
    </> },
    { id: 'datos', title: 'Qué datos tratamos', body: <>
      <p><strong>El titular no recoge datos personales a través de formularios.</strong> No hay registro, formularios, comentarios ni botones de redes sociales. La única analítica es la descrita en «Analítica con Google Tag Manager», y solo si la aceptas.</p>
      <p><strong>Tu partida se queda en tu dispositivo.</strong> El juego guarda en tu navegador los nombres que pones a tus personajes, su progreso, su equipo y tus ajustes de sonido. Esos datos no salen de tu dispositivo: el titular no los recibe ni puede verlos. Puedes borrarlos cuando quieras desde Ajustes en el juego («Borrar personaje») o borrando los datos del sitio en tu navegador. Los detalles están en la <a href="./cookies.html">Política de cookies</a>.</p>
      <p><strong>Las copias de seguridad también son tuyas.</strong> Si haces una copia de tu partida, el juego crea un archivo o un código de texto en tu dispositivo. No se envía a ningún sitio: tú decides dónde guardarlo y con quién compartirlo. Al cargar una copia, el juego solo la lee en tu navegador.</p>
      <p><strong>Todo se sirve desde esta web.</strong> Las tipografías, las imágenes y el tráiler están alojados en la propia web: tu navegador no se conecta a servicios de terceros (como Google Fonts o YouTube) para mostrarlos.</p>
    </> },
    { id: 'analitica', title: 'Analítica con Google Tag Manager', body: <>
      <p>Si pulsas «Aceptar» en el aviso de cookies, la web y el juego cargan <strong>Google Tag Manager</strong> (Google Ireland Limited, Gordon House, Barrow Street, Dublín 4, Irlanda) y las etiquetas de análisis que contiene. Sirven para saber, de forma agregada, cuántas personas visitan la web, de dónde llegan y cómo se juega, y así mejorar Gravevow.</p>
      <ul>
        <li><strong>Datos:</strong> identificadores de cookies, dirección IP, tipo de dispositivo y navegador, páginas vistas y acciones en la web y el juego.</li>
        <li><strong>Base jurídica:</strong> tu consentimiento (artículo 6.1.a del RGPD). Puedes retirarlo cuando quieras con «Configurar cookies», en el pie de la web o en Ajustes del juego.</li>
        <li><strong>Transferencia internacional:</strong> Google puede tratar los datos en Estados Unidos; se acoge al Marco de Privacidad de Datos UE-EE. UU. y a las cláusulas contractuales tipo.</li>
        <li><strong>Más información:</strong> la política de privacidad de Google (policies.google.com/privacy).</li>
      </ul>
      <p>Si rechazas o no respondes, no se carga nada de Google.</p>
    </> },
    { id: 'alojamiento', title: 'Alojamiento web: GitHub Pages', body: <>
      <p>La web está alojada en GitHub Pages, un servicio de GitHub, Inc. (88 Colin P. Kelly Jr. St., San Francisco, CA 94107, Estados Unidos). Como cualquier servidor, para enviarte las páginas GitHub trata datos técnicos de cada visita, como tu <strong>dirección IP</strong>, el navegador, la página pedida y la fecha y la hora. Según GitHub, la IP de quien visita un sitio de GitHub Pages se registra y se guarda por motivos de seguridad, haya iniciado sesión en GitHub o no.</p>
      <ul>
        <li><strong>Finalidad:</strong> mostrar la web y protegerla frente a abusos y ataques.</li>
        <li><strong>Base jurídica:</strong> el interés legítimo en ofrecer la web de forma segura (artículo 6.1.f del RGPD).</li>
        <li><strong>Transferencia internacional:</strong> GitHub está en Estados Unidos, fuera del Espacio Económico Europeo. Según su declaración de privacidad, se acoge al Marco de Privacidad de Datos UE-EE. UU. (EU-U.S. Data Privacy Framework) y utiliza las cláusulas contractuales tipo de la Comisión Europea.</li>
        <li><strong>Más información:</strong> la declaración de privacidad de GitHub (docs.github.com, «GitHub General Privacy Statement»).</li>
      </ul>
      <p>El dominio gravevow.com está registrado en Hostinger. El dominio anterior, cryptraiders.es, solo redirige a esta web. Hostinger no recibe los datos de tu visita a la web; como mucho, recibe las consultas técnicas para encontrar la dirección del sitio (DNS), que normalmente hace tu proveedor de Internet y no tu dispositivo.</p>
    </> },
    { id: 'contacto', title: 'Si nos escribes', body: <>
      <p>Si escribes a <Email />, el titular tratará tu dirección de correo y lo que cuentes en el mensaje solo para responderte. La base jurídica es tu consentimiento al escribir (artículo 6.1.a del RGPD). Los mensajes se guardan mientras haga falta para atender tu consulta y, después, durante los plazos legales que correspondan. No se ceden a nadie salvo obligación legal. El correo se gestiona con un proveedor de correo electrónico que actúa como encargado del tratamiento.</p>
      <p>Gravevow tiene una comunidad en <strong>Discord</strong>. El botón «Discord» es un simple enlace que se abre en otra pestaña: esta web no carga nada de Discord. Si entras en el servidor, tus datos los trata Discord Inc. (Estados Unidos) según su propia política de privacidad. El titular solo ve lo que tú publicas en el servidor y tu nombre de usuario, y lo usa para moderar y atender a la comunidad. Puedes salir del servidor cuando quieras.</p>
    </> },
    ...(DONATE_URL ? [{ id: 'apoyar', title: 'Si apoyas el proyecto', body: <>
      <p>El botón «Apoyar» te lleva a la página de Gravevow en <strong>Ko-fi</strong>, fuera de esta web, y se abre en otra pestaña. Esta web no carga nada de Ko-fi ni ve los datos de tu pago: la aportación la gestiona Ko-fi (Ko-fi Labs Limited, Reino Unido) junto con su proveedor de pagos, cada uno con su propia política de privacidad.</p>
      <ul>
        <li><strong>Qué datos recibe el titular:</strong> los que Ko-fi le muestra sobre cada aportación, como el nombre que elijas, tu correo electrónico, el importe, la fecha y el mensaje que dejes. Nunca los datos de tu tarjeta.</li>
        <li><strong>Finalidad:</strong> gestionar tu aportación, agradecértela o responderte si hace falta y cumplir las obligaciones contables y fiscales.</li>
        <li><strong>Base jurídica:</strong> la gestión de la aportación que tú decides hacer (artículo 6.1.b del RGPD) y el cumplimiento de obligaciones legales (artículo 6.1.c).</li>
        <li><strong>Conservación:</strong> el tiempo que exija la normativa contable y fiscal.</li>
        <li><strong>Transferencias:</strong> Ko-fi y su proveedor de pagos pueden tratar datos fuera del Espacio Económico Europeo con las garantías que describen en sus políticas de privacidad.</li>
      </ul>
      <p>Las aportaciones son voluntarias y no dan ninguna ventaja en el juego.</p>
    </> }] : []),
    { id: 'menores', title: 'Menores de edad', body: <>
      <p>La web no recoge datos de nadie, tampoco de menores. Si tienes menos de 14 años, pide permiso a tu madre, padre o tutor antes de escribirnos (artículo 7 de la LOPDGDD).</p>
    </> },
    { id: 'derechos', title: 'Tus derechos', body: <>
      <p>Puedes ejercer tus derechos de <strong>acceso, rectificación, supresión, oposición, limitación del tratamiento y portabilidad</strong> escribiendo a <Email />. Indica qué derecho quieres ejercer; si hace falta para comprobar que eres tú, se te pedirá algún dato más.</p>
      <p>Recuerda que el titular no tiene tu partida: la tienes tú en tu navegador y la puedes borrar directamente.</p>
      <p>Si crees que no se han respetado tus derechos, puedes reclamar ante la <strong>Agencia Española de Protección de Datos</strong> (www.aepd.es, C/ Jorge Juan 6, 28001 Madrid).</p>
    </> },
    { id: 'cambios', title: 'Cambios en esta política', body: <>
      <p>Esta política describe la web tal como es hoy. Se actualizará <strong>antes</strong> de añadir funciones que traten datos, como el guardado en la nube, las cuentas de jugador, el multijugador, la analítica o las compras. La fecha de arriba indica la última actualización.</p>
    </> },
  ],
};

// ─────────────────────────────────────────────────────────────────────────────
// POLÍTICA DE COOKIES
// ─────────────────────────────────────────────────────────────────────────────
const STORAGE_ROWS = [
  { name: 'gravevow', where: 'IndexedDB (base de datos del navegador)', owner: 'Propia', purpose: 'Guardar tu partida: tus personajes (hasta cuatro), su progreso, equipo y oro, tu almacén y tus ajustes de sonido. Al cargar una copia de seguridad, guarda también la partida anterior para poder deshacerlo.', duration: 'Hasta que borres el personaje o los datos del sitio.', type: 'Técnica, necesaria' },
  { name: 'gv-consent', where: 'Almacenamiento local (localStorage)', owner: 'Propia', purpose: 'Recordar si aceptaste o rechazaste las cookies de análisis, para no volver a preguntarte.', duration: 'Hasta que borres los datos del sitio.', type: 'Técnica, necesaria' },
  { name: '_ga, _ga_*', where: 'Cookie', owner: 'Google (tercero)', purpose: 'Analítica: distinguir visitantes y sesiones de forma agregada. Solo si aceptas.', duration: 'Hasta 2 años.', type: 'Análisis, opcional' },
  { name: 'gravevow.profile', where: 'Almacenamiento local (localStorage)', owner: 'Propia', purpose: 'Lo mismo que la anterior. Solo se usa si tu navegador no admite IndexedDB.', duration: 'Hasta que borres el personaje o los datos del sitio.', type: 'Técnica, necesaria' },
];

export const COOKIES: PageDef = {
  title: 'Política de cookies',
  intro: <>
    <p><strong>En resumen:</strong> el juego guarda tu partida en tu navegador, que es necesario para jugar. Además, <strong>solo si aceptas</strong>, se cargan cookies de análisis de Google a través de Google Tag Manager. Puedes cambiar tu elección cuando quieras con el botón de abajo, «Configurar cookies» en el pie de la web o en Ajustes del juego.</p>
    <p><button type="button" className="btn-ghost" data-testid="legal-cookie-settings" onClick={openConsentSettings}>Configurar cookies</button></p>
  </>,
  sections: [
    { id: 'que-son', title: 'Qué son las cookies', body: <>
      <p>Las cookies son pequeños archivos que una web guarda en tu navegador para recordar algo, como una preferencia o tu sesión. Hay otras tecnologías que funcionan parecido, como el almacenamiento local (localStorage) o IndexedDB, una pequeña base de datos dentro del navegador. La ley trata igual todas estas tecnologías.</p>
    </> },
    { id: 'que-usamos', title: 'Qué guarda esta web', body: <>
      <p>Toda la web guarda tu elección sobre las cookies. La alpha del juego guarda además tu partida cuando creas un personaje. Y si aceptas la analítica, Google instala sus cookies:</p>
      <StorageTable rows={STORAGE_ROWS} />
      <p>Lo <strong>propio</strong> se queda en tu dispositivo y nadie más lo lee, tampoco el titular. Las cookies de Google las lee Google, como se explica en la <a href="./privacidad.html">Política de privacidad</a>.</p>
    </> },
    { id: 'aviso', title: 'El aviso de cookies', body: <>
      <p>La ley exige pedirte permiso antes de guardar información en tu navegador, excepto cuando es <strong>estrictamente necesario para prestar un servicio que tú pides</strong> (artículo 22.2 de la LSSI-CE). Guardar tu partida es justo eso: sin ese guardado no podrías jugar ni continuar donde lo dejaste. Así lo considera también la guía sobre cookies de la Agencia Española de Protección de Datos.</p>
      <p>Las cookies de análisis no son necesarias, así que te pedimos permiso antes: en tu primera visita aparece un aviso con «Rechazar», «Configurar» y «Aceptar», igual de visibles. «Configurar» te deja elegir por finalidades: las técnicas siempre están activas y las de análisis puedes activarlas o no. Mientras no aceptes el análisis, no se carga Google Tag Manager. Hoy no usamos cookies de publicidad ni de redes sociales; si algún día se usan, se añadirán al panel como finalidad aparte y te lo volveremos a preguntar.</p>
    </> },
    { id: 'terceros', title: 'Cookies de terceros', body: <>
      <p>Solo las de Google, y solo si aceptas (ver la tabla). Las tipografías, las imágenes y el tráiler se sirven desde la propia web. El alojamiento (GitHub Pages) no instala cookies en tu navegador; lo que trata se explica en la <a href="./privacidad.html">Política de privacidad</a>.</p>
      <p>Los botones «Apoyar» y «Discord» son simples enlaces a Ko-fi y a Discord, que se abren en otra pestaña. Esta web no carga nada de esos servicios; si los pulsas y entras en sus páginas, Ko-fi y Discord pueden usar allí sus propias cookies, según sus políticas.</p>
    </> },
    { id: 'borrar', title: 'Cómo borrar o bloquear estos datos', body: <>
      <p className="legal-warn"><strong>Atención:</strong> si borras los datos de este sitio, <strong>perderás tu partida</strong> (personaje, equipo y progreso), y no se puede recuperar.</p>
      <p>La forma más sencilla es usar «Borrar personaje y empezar de cero» en Ajustes, dentro del juego. También puedes hacerlo desde el navegador:</p>
      <ul>
        <li><strong>Chrome (ordenador):</strong> Configuración › Privacidad y seguridad › Configuración de sitios › Ver permisos y datos almacenados en los sitios › busca «gravevow.com» › Eliminar datos.</li>
        <li><strong>Chrome (Android):</strong> toca el icono que hay a la izquierda de la dirección › Configuración del sitio › Eliminar datos y restablecer permisos.</li>
        <li><strong>Firefox:</strong> haz clic en el candado de la barra de direcciones › Limpiar cookies y datos del sitio.</li>
        <li><strong>Safari (Mac):</strong> Ajustes › Privacidad › Gestionar datos de sitios web › busca «gravevow.com» › Eliminar.</li>
        <li><strong>Safari (iPhone y iPad):</strong> Ajustes › Apps › Safari › Avanzado › Datos de sitios web › busca «gravevow.com» y desliza para borrar.</li>
        <li><strong>Edge:</strong> Configuración › Cookies y permisos del sitio › Administrar y eliminar cookies y datos del sitio › Ver todas las cookies y datos del sitio › busca «gravevow.com» › Eliminar.</li>
      </ul>
      <p>Si bloqueas el almacenamiento de este sitio, el juego se abrirá, pero no podrá guardar tu partida. Si instalaste el juego como app en tu dispositivo, la app tiene su propio guardado: se borra al desinstalarla.</p>
    </> },
    { id: 'cambios', title: 'Cambios en esta política', body: <>
      <p>Esta página se actualizará cuando cambie lo que la web guarda en tu navegador. La fecha de arriba indica la última actualización.</p>
    </> },
  ],
};
