// HUD unificado · maquetas. maqueta.html?d=a|b|c&s=lobby|bastion|garth|personaje|intendencia|conversacion|combate|componentes
// Misma estructura en las 3 direcciones: solo cambia el tema (clase dir-x del body).
const Q = new URLSearchParams(location.search);
const D = Q.get('d') || 'actual', S = Q.get('s') || 'bastion';
document.body.className = 'dir-' + D;
const phone = () => innerHeight <= 520;
const A = (n) => `assets/${n}.png`;
const spr = (n, s, extra = '') => `<img class="px" src="${A(n)}" style="width:calc(20px * var(${s}))${extra}" alt="">`;
const ico = (id) => `<img class="px" src="${A('i_' + id)}" alt="">`;
const pin = () => `<img class="px pin" src="px/icono-pendiente.png" alt="pendiente">`;
const slot = (id, o = {}) => `<div class="slot ${o.big ? 'big' : ''} ${o.mid ? 'mid' : ''} ${o.r ? 'r-' + o.r : ''}" style="${o.st || ''}">${id ? ico(id) : ''}${o.q ? `<span class="q">${o.q}</span>` : ''}${o.nm ? `<span class="nm">${o.nm}</span>` : ''}</div>`;

const TABS = ['Jugar', 'Personaje', 'Intendencia', 'Bastión', 'Misiones', 'Bestiario', 'Tienda'];
const nav = (on, pins = {}) => `<nav class="nav">
  <div class="who">${spr('hero', '--s-ui')}<div><b>Aldric</b><span>Guerrero · Nv 12</span></div></div>
  <div class="tabs">${TABS.map((t) => `<div class="tab ${t === on ? 'on' : ''}">${t}${pins[t] ? pin() : ''}</div>`).join('')}</div>
  <div class="gold">● 4 860</div>${phone() ? '' : '<div class="ib">?</div>'}<div class="ib">⚙</div></nav>`;

// ── Datos de ejemplo ───────────────────────────────────────────────
const VENDORS = [
  { id: 'nira', sp: 'v_nira', name: 'Nira', place: 'El mercado', rank: 'Conocida', rep: 40, st: 'bench', status: 'Curtiduría · Nv 1/3', pend: 'Misión lista' },
  { id: 'vesper', sp: 'v_vesper', name: 'Hermana Vesper', place: 'La enfermería', rank: 'Conocida', rep: 25, st: 'infirmary', status: 'Rincón de cura · Nv 1/3', up: true },
  { id: 'garth', sp: 'v_garth', name: 'Garth', place: 'La cocina', rank: 'De confianza', rep: 70, st: 'kitchen', status: 'Cocina · Nv 1/3', pend: 'Misión lista' },
  { id: 'orik', sp: 'v_orik', name: 'Orik', place: 'El taller', rank: 'Desconocido', rep: 10, st: 'bench', ruined: true, status: 'Banco de trabajo · En ruinas', pend: 'Se puede reconstruir' },
  { id: 'grizk', sp: 'v_collector', name: 'Grizk', place: 'La lonja', rank: 'Conocido', rep: 30, st: 'cot', status: 'Catre · Nv 1/3' },
  { id: 'brand', sp: 'v_brand', name: 'Maese Brand', place: 'La forja', rank: 'Desconocido', rep: 0, st: 'forge', ruined: true, status: 'Forja de armas · En ruinas' },
  { id: 'valerius', sp: 'v_valerius', name: 'Valerius', place: 'La armería', rank: 'Desconocido', rep: 0, st: 'forge', ruined: true, status: 'Forja de armaduras · En ruinas' },
  { id: 'eldrin', sp: 'v_eldrin', name: 'Eldrin', place: 'El laboratorio', rank: 'Desconocido', rep: 0, st: 'alchemy', status: 'Laboratorio · Nv 1/3' },
];

// Pantalla de un mercader: retrato a la izquierda, pestañas arriba, la pestaña activa a la derecha.
const VSCREEN = {
  garth: { role: 'cocinero y cazador', quote: '«Abajo nadie te da de comer. Tráeme pieles y colmillos de lo que cazas.»', tabs: ['Tienda', 'Misiones*', 'Cocina'], on: 'Cocina', pend: ['Carne para el invierno', 'Misión lista para entregar', 'Entregar'],
    st: 'Cocina', lvl: 'Fogón · Nv 1/3', verb: 'Cocinar', recipes: [['Guiso del Bastión', 'hearty_stew', [['salted_meat', 3, 1], ['cave_mushroom', 2, 1], ['water', 1, 1]]], ['Caldo especiado', 'hearty_stew', [['cave_mushroom', 2, 2], ['water', 1, 1]], 'Necesita la Cocina a nivel 2']],
    extra: ['Para comer antes de bajar', 'hearty_stew', 'Guiso del Bastión', '+40 saciedad · −10 % de Descanso gastado en la siguiente incursión', 'Comer'], mats: [['salted_meat', 3], ['cave_mushroom', 2], ['water', 1], ['stale_bread', 2]], matsTitle: 'Tus ingredientes' },
  grizk: { role: 'prestamista y corredor de espadas', quote: '«Aquí duermen los que venden su espada. Tú también, si pagas.»', tabs: ['Tienda', 'Vender', 'Contratos', 'Catre'], on: 'Catre',
    st: 'Catre', lvl: 'Catre de paja · Nv 1/3', sleep: true },
  nira: { role: 'curtidora y tendera', quote: '«Cuero, capas y lo que dejan en consignación los que ya no bajan.»', tabs: ['Tienda', 'Vender', 'Misiones*', 'Reparar', 'Curtiduría'], on: 'Curtiduría', pend: ['Pieles para el invierno', 'Misión lista para entregar', 'Entregar'],
    st: 'Curtiduría', lvl: 'Nv 1/3', verb: 'Fabricar', recipes: [['Cuero curtido', 'tanned_leather', [['leather_scrap', 4, 2], ['water', 1, 1]]], ['Correa', 'strap', [['leather_scrap', 4, 2]]], ['Mochila sencilla', 'backpack_basic', [['leather_scrap', 4, 2]]], ['Tela tejida', 'woven_cloth', [['ragged_cloth', 1, 2]]], ['Cuero ignífugo', 'fireproof_leather', [['tanned_leather', 0, 1]], 'Necesita la Curtiduría a nivel 3']],
    mats: [['leather_scrap', 4], ['water', 1], ['ragged_cloth', 1]], matsTitle: 'Tus materiales' },
  eldrin: { role: 'alquimista', quote: '«Azufre, ceniza y tinta de hueso. Todo arde si sabes leerlo.»', tabs: ['Tienda', 'Laboratorio'], on: 'Laboratorio',
    st: 'Laboratorio', lvl: 'Nv 1/3', verb: 'Preparar', groups: ['Alquimia', 'Runas'], recipes: [['Poción de vida', 'health_potion', [['bitter_herb', 2, 1], ['cave_mushroom', 2, 1], ['water', 1, 1]], null, 'Alquimia'], ['Antídoto', 'antidote', [['cave_mushroom', 2, 2], ['arcane_shard', 0, 1]], null, 'Alquimia'], ['Cristal tallado', 'cut_crystal', [['arcane_shard', 0, 2]], null, 'Runas'], ['Tinta rúnica', 'rune_ink', [['bone_dust', 3, 1], ['arcane_shard', 0, 1]], null, 'Runas']],
    mats: [['bitter_herb', 2], ['cave_mushroom', 2], ['water', 1], ['bone_dust', 3]], matsTitle: 'Tus materiales' },
};


// ── Pantallas ──────────────────────────────────────────────────────
const SCREENS = {
  lobby() {
    const p = phone();
    return nav('Jugar') + `<main class="main" style="grid-template-columns:${p ? '1fr 1.1fr' : '380px 1fr 300px'}">
      <div style="display:flex;flex-direction:column;gap:var(--gap);min-height:0;justify-content:flex-end">
        <div class="sheet" style="${p ? '' : ''}">
          <div class="lbl">La Mazmorra · 1/10</div>
          <div style="height:${p ? 54 : 120}px;margin:var(--sp-2) 0;background:url(${A('zone_galerias')}) center/cover;image-rendering:pixelated;border:2px solid #07060a"></div>
          <div style="display:flex;align-items:center;gap:var(--sp-2)"><h2 style="font-size:var(--fs-panel);flex:1">Afueras del Bastión</h2><span class="btn sm">Mapa</span></div>
        </div>
        <div class="panel"><div class="ph" style="margin-bottom:var(--sp-2)"><h2>Expedición</h2><span class="r sub">Nv 1–10</span></div>
          ${p ? '' : '<p class="sub" style="margin-bottom:var(--sp-3)"><span class="bad">Demasiado fácil:</span> 10 % de experiencia y 50 % de oro.</p>'}
          <span class="btn cta">Descender</span></div>
      </div>
      <div style="display:grid;place-items:center;position:relative">
        <div style="position:absolute;bottom:6%;width:70%;height:12%;border-radius:50%;border:2px solid #c9a24a55;background:radial-gradient(#c9a24a22,#0000 70%)"></div>
        <div style="text-align:center;position:relative"><div class="disp" style="color:var(--gold);font-size:var(--fs-panel);margin-bottom:var(--sp-3)">Nv 12 · Aldric</div>${spr('hero', '--s-hero')}</div>
      </div>
      ${p ? '' : `<div style="display:flex;flex-direction:column;justify-content:flex-end;gap:var(--gap)">
        <div class="panel"><div class="ph"><h2>Pendiente</h2></div>
          ${[['v_garth', 'Garth', 'Misión lista para entregar'], ['v_orik', 'Orik', 'Banco de trabajo: ya puedes reconstruirlo'], ['v_vesper', 'Vesper', 'Rincón de cura: mejora disponible']].map(([s, n, t]) => `<div style="display:flex;gap:var(--sp-3);align-items:center;padding:var(--sp-2) 0;border-top:1px solid #ffffff18">${spr(s, '--s-ui')}<div style="flex:1"><b class="disp" style="font-size:var(--fs-small)">${n}</b><div class="sub">${t}</div></div><span class="btn sm">Ir</span></div>`).join('')}
        </div>
        <div style="display:flex;gap:var(--sp-2);justify-content:flex-end"><span class="btn sm">♥ Apoyar</span><span class="btn sm">Discord</span></div></div>`}
    </main>`;
  },

  bastion() {
    const p = phone();
    const card = (v) => {
      if (v.locked) return `<div class="panel vcard locked"><div class="vimg">${spr(v.sp, '--s-card', ';filter:brightness(0) opacity(.6)')}</div><h3 class="disp">${v.name}</h3><div class="sub">${v.place}</div><div class="sub" style="margin-top:auto;font-style:italic">🔒 ${v.locked}</div></div>`;
      const stImg = v.st ? `<img class="px stimg" src="${A('st_' + v.st + (v.ruined ? '_r' : ''))}" style="width:calc(20px * var(--s-ui) * ${p ? 1 : 2})" alt="">` : '';
      // Primer plano de medio pecho: el mismo sprite, recortado (cabeza y pecho) y a escala entera grande
      return `<div class="panel vcard bust">
        <h3 class="disp vname">${v.name}</h3>
        <div class="vport">
          <img class="px" src="${A(v.sp)}" style="width:calc(20px * var(--s-bust))" alt="">
          ${v.pend || v.up ? `<div class="vpend">${v.up ? `<span class="tag gld">▲${p ? '' : ' Mejora'}</span>` : `<span class="tag good"><img class="px" src="px/icono-pendiente.png">${p ? '' : v.pend}</span>`}</div>` : ''}
        </div>
        <div class="vinfo"><img class="px" src="${A('st_' + v.st + (v.ruined ? '_r' : ''))}" style="width:calc(20px * ${p ? 1 : 2})" alt=""><div style="flex:1;min-width:0"><div class="lbl" style="color:var(--accent)">${v.place}</div>${p ? '' : `<div class="sub vst">${v.status}</div>`}</div></div>
        <div class="vrep"><span class="sub">${v.rank}</span><div class="bar" style="flex:1"><i style="width:${v.rep}%;--c:#c9a24a"></i></div></div>
      </div>`;
    };
    return nav('Bastión', { 'Bastión': 1 }) + `<main class="main" style="grid-template-rows:auto 1fr">
      ${p ? '' : `<div style="display:flex;align-items:baseline;gap:var(--sp-4)"><h1 style="font-size:var(--fs-screen);color:#e9e1cc">El Bastión de Ceniza</h1><span class="sub" style="color:#b8ad98">Toca a un mercader para hablar, comerciar y usar su estación.</span></div>`}
      <div class="vgrid">${VENDORS.map(card).join('')}</div></main>`;
  },

  garth() { return vendorScreen(Q.get('v') || 'garth'); },

  personaje() {
    const p = phone();
    const AT = [['Vida', 204, '+5'], ['Ímpetu', 27], ['Ataque', 34, '+4'], ['Defensa', 42, '+6'], ['Poder mágico', 4], ['Resist. mágica', 17], ['Velocidad', 8], ['Crítico', '9 %'], ['Evasión', '3 %']];
    const sheet = `<div class="sheet" style="display:flex;flex-direction:column;min-height:0">
      <div style="display:flex;align-items:center;gap:var(--sp-3)"><div><div class="lbl">Hoja de personaje</div><h2 class="disp" style="font-size:var(--fs-screen)">Aldric</h2><div class="sub">Guerrero · Nivel 12 · 1 240 / 2 100 XP</div></div>
      ${p ? '' : '<img class="px" src="px/icono-sello.png" style="width:64px;margin-left:auto" alt="">'}</div>
      <div class="bar" style="margin:var(--sp-2) 0 var(--sp-3)"><i style="width:59%;--c:#8a1c24"></i></div>
      <div class="atgrid">${AT.map(([n, v, b]) => `<div class="atbox"><div class="lbl">${n}</div><div class="num">${v}</div>${b ? `<div class="sub good" style="color:#2f6b22">${b} equipo</div>` : '<div class="sub">&nbsp;</div>'}</div>`).join('')}</div>
      ${p ? '' : `<div class="sep"></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:var(--sp-1) var(--sp-6)" class="sub">${[['Expediciones', 14], ['Extracciones', 9], ['Muertes', 5], ['Jefes', 'Señor del Osario']].map(([a, b]) => `<div style="display:flex;justify-content:space-between"><span>${a}</span><b>${b}</b></div>`).join('')}</div>`}</div>`;
    const hero = `<div style="display:grid;place-items:center;position:relative;min-height:0">
      <div style="position:relative">${spr('hero', p ? '--s-card' : '--s-hero', p ? ';width:calc(20px*3)' : '')}
      ${p ? '' : [['−40%', '10%', 'Grito de guerra', '#e8b33a'], ['105%', '20%', 'Tajo', '#d9d3c1'], ['110%', '60%', 'Tajo desgarrador', '#a56bff'], ['−45%', '60%', 'Bloqueo', '#8fa8c8']].map(([l, t, n, c]) => `<div style="position:absolute;left:${l};top:${t};text-align:center;width:120px"><div style="width:44px;height:44px;margin:auto;transform:rotate(45deg);border:3px solid ${c};background:#0b0a0e"></div><div class="lbl" style="margin-top:10px;color:${c}">${n}</div></div>`).join('')}</div></div>`;
    const right = `<div style="display:flex;flex-direction:column;min-height:0"><div class="itabs"><div class="itab on">Ataques</div><div class="itab">Habilidad de clase</div></div>
      <div class="panel" style="flex:1">${[['knight_sword', 'Mano derecha · Espada de caballero', [['Tajo', 'Básico · sin coste'], ['Tajo desgarrador', '6 ímpetu · recarga 2'], ['Estocada', '4 ímpetu · recarga 1']]], ['bastion_shield', 'Mano izquierda · Escudo del Bastión', [['Bloqueo', '3 ímpetu · recarga 2']]]].map(([i, h, l]) => `<div style="display:flex;gap:var(--sp-2);align-items:center;margin:var(--sp-2) 0">${slot(i)}<b class="disp" style="font-size:var(--fs-small)">${h}</b></div>${l.map(([n, c]) => `<div style="display:flex;justify-content:space-between;padding:var(--sp-2) 0 var(--sp-2) var(--sp-4);border-top:1px solid #ffffff14"><span>${n}</span><span class="sub">${c}</span></div>`).join('')}`).join('')}</div></div>`;
    return nav('Personaje') + `<main class="main" style="grid-template-columns:${p ? '200px 1fr' : innerWidth < 1280 ? '400px 1fr 380px' : '560px 1fr 440px'}">${p ? hero + sheet : sheet + hero + right}</main>`;
  },

  intendencia() {
    const p = phone();
    const bag = ['health_potion', 'stale_bread', 'water', 'iron_ore', 'scrap_metal', 'leather_scrap', 'iron_sword', 'old_coin', 'bone_dust'];
    const Q = { health_potion: 2, stale_bread: 2, scrap_metal: 6, leather_scrap: 4, old_coin: 12, bone_dust: 3 };
    const R = { iron_sword: 'u', old_coin: 'r' };
    const cells = (list, n) => Array.from({ length: n }, (_, i) => slot(list[i], { q: Q[list[i]], r: R[list[i]], st: i === 6 ? 'outline:3px solid #f2c75a;outline-offset:1px' : '' })).join('');
    const doll = `<div class="doll">
      <div class="dcol">${slot('knight_sword', { big: 1, nm: 'Arma' })}${slot('gauntlets', { nm: 'Manos', mid: 1 })}${slot(null, { nm: 'Atuendo', mid: 1 })}</div>
      <div class="dcol">${slot('knight_helm', { nm: 'Cabeza', mid: 1 })}<div style="padding:var(--sp-2) 0">${spr('hero', '--s-card')}</div>${slot('chainmail', { nm: 'Torso', mid: 1 })}${slot('swift_boots', { nm: 'Pies', mid: 1 })}</div>
      <div class="dcol">${slot('bastion_shield', { big: 1, nm: 'Secundaria' })}${slot('bone_amulet', { nm: 'Amuleto', mid: 1 })}${slot('copper_ring', { nm: 'Anillo', mid: 1 })}</div></div>`;
    const tools = `<div style="display:flex;gap:var(--sp-2);align-items:center"><span class="lbl" style="color:#b8ad98">Mochila y almacén</span><span class="btn sm">Ordenar</span><span class="btn sm">Agrupar oro</span></div>`;
    const equip = `<div class="panel" style="flex:1.35"><div class="ph"><h2>Equipo</h2><div class="r"><span class="tag gld">● 4 860 · en riesgo 12</span></div></div>
      <div class="eqgrid">${doll}<div style="display:flex;flex-direction:column;gap:var(--sp-3);min-width:0">
        <div style="display:flex;align-items:baseline;gap:var(--sp-2)"><h3 class="disp" style="font-size:var(--fs-body)">Mochila</h3><span class="sub">9/24</span><span class="sub" style="margin-left:auto">Carga 16,2 / 40</span></div>
        <div class="grid fill" style="grid-template-columns:repeat(${p ? 8 : 6},1fr)">${cells(bag, p ? 16 : 24)}</div>
        <div class="bar"><i style="width:40%;--c:#4f9a3a"></i></div>
        <div style="display:flex;gap:var(--sp-2)"><span class="btn sm" style="flex:1">Vaciar mochila</span><span class="btn sm" style="flex:1">Guardar materiales</span></div>
        <div style="display:flex;align-items:baseline;gap:var(--sp-2)"><h3 class="disp" style="font-size:var(--fs-body)">Bolsillo seguro</h3><span class="sub">1/3 · no se pierde al morir</span></div>
        <div class="grid fill" style="grid-template-columns:repeat(${p ? 8 : 6},1fr)">${slot('golden_chalice', { r: 'e' })}${slot()}${slot()}</div></div></div></div>`;
    const store = `<div class="panel" style="flex:1"><div class="ph"><h2>Almacén</h2><span class="sub">pág. 1 · 31/120</span></div>
      <div class="itabs" style="margin-bottom:var(--sp-2)"><div class="itab on">1</div><div class="itab">2</div><div class="itab">🔒</div><div class="itab">Compartido</div></div>
      <div class="grid fill" style="grid-template-columns:repeat(6,1fr)">${cells(['iron_ore', 'iron_ore', 'scrap_metal', 'leather_scrap', 'executioner_axe', 'padded_tunic', 'worn_boots', 'leather_hood', 'mana_potion', 'antidote', 'cave_mushroom', 'salted_meat', 'old_coin', 'iron_shield'], 36)}</div></div>`;
    const ficha = `<div class="sheet ficha"><div style="display:flex;gap:var(--sp-3);align-items:center">${slot('iron_sword', { r: 'u' })}<div><h3 class="disp" style="font-size:var(--fs-panel)">Espada de hierro</h3><div class="lbl" style="color:#2f6b22">Poco común · Arma · Nv 7</div></div></div>
      <div class="sep"></div><div>+7 ataque · +2 crítico</div><div class="sub">Frente a Espada de caballero: <b class="bad">peor en 2</b></div>
      <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-3)"><span class="btn sm">Equipar</span><span class="btn sm">Al almacén</span><span class="btn sm">Dividir</span></div></div>`;
    if (p) return nav('Intendencia') + `<main class="main" style="grid-template-rows:auto 1fr"><div style="display:flex;gap:var(--sp-2);align-items:center"><div class="itabs"><div class="itab on">Equipo</div><div class="itab">Almacén</div><div class="itab">Estado</div></div><span style="flex:1"></span><span class="btn sm">Ordenar</span><span class="btn sm">Oro</span></div>${equip}</main>`;
    return nav('Intendencia') + `<main class="main" style="grid-template-rows:auto 1fr"><div style="display:flex;align-items:flex-end;gap:var(--sp-4)"><div class="itabs"><div class="itab on">Equipo</div><div class="itab">Estado</div></div><span style="flex:1"></span>${tools}</div>
      <div style="display:flex;gap:var(--gap);min-height:0;position:relative">${equip}${store}${ficha}</div></main>`;
  },

  conversacion() {
    const p = phone();
    return `<div class="scene" style="background-image:url(${A('zone_galerias')})"></div>${hud()}
      <div class="dlg sheet">
        <div class="dport">${spr('m_rival', '--s-port')}</div>
        <div style="flex:1;min-width:0;display:flex;flex-direction:column;gap:var(--sp-2)">
          <div style="display:flex;align-items:center;gap:var(--sp-3);flex-wrap:wrap"><h2 class="disp" style="font-size:var(--fs-panel)">Kael el Errante</h2><span class="tag" style="color:#2f6b22">✓ Riesgo muy bajo de traición</span>${p ? '' : '<span class="lbl">Mercenario veterano</span>'}</div>
          <p style="font-size:var(--fs-body)">«Vendí mi espada a la orden del Bastión antes de que cayera. Desde entonces bajo solo. Si quieres compañía, tendrás que pagarla.»</p>
          <div class="opts">
            <div class="btn opt"><b>Aliarse</b><span>Te sigue a cambio del 20 % del oro</span></div>
            <div class="btn opt"><b>Hablar</b><span>Saber más de él</span></div>
            <div class="btn opt"><b>Seguir tu camino</b><span>Os separáis sin más</span></div>
            <div class="btn opt red"><b>Atacar</b><span>Combate a muerte</span></div>
          </div></div></div>`;
  },

  combate() {
    const p = phone();
    return `<div class="scene" style="background-image:url(${A('zone_galerias')})"></div>
      <div class="cfoe">${spr('m_skeleton', '--s-combat')}</div><div class="chero">${spr('hero_back', '--s-combat')}</div>
      <div class="panel cplate" style="left:var(--pad);top:var(--pad)"><div style="display:flex;gap:var(--sp-2);align-items:center"><span class="tag gld">12</span><b class="disp">Esqueleto guerrero</b></div><div class="bar" style="margin-top:var(--sp-2)"><i style="width:80%"></i></div><div class="sub" style="margin-top:4px">⚠ Prepara un golpe pesado</div></div>
      <div class="panel cplate" style="right:var(--pad);bottom:calc(var(--cmd-h) + var(--pad) + var(--gap))"><div style="display:flex;gap:var(--sp-2);align-items:center"><span class="tag gld">12</span><b class="disp">Aldric</b></div>
        <div class="sub" style="margin-top:4px">PV 204/204</div><div class="bar"><i style="width:100%"></i></div><div class="sub" style="margin-top:4px">Ímpetu 27/27</div><div class="bar"><i style="width:100%;--c:#e8752b"></i></div></div>
      <div class="cbar">
        ${p ? '' : `<div class="panel clog"><div class="sub">Ronda 1</div><p><b>¡El esqueleto guerrero te cierra el paso!</b></p><p class="sub">¿Qué hará Aldric?</p></div>`}
        <div class="cmds">
          <div class="btn cmd" style="--b:#d9d3c1"><b>⚔ Atacar</b><span>Tajo · sin coste</span><i>1</i></div>
          <div class="btn cmd" style="--b:#a56bff"><b>✦ Ataque especial</b><span>2 listos</span><i>2</i></div>
          <div class="btn cmd" style="--b:#e8b33a"><b>☀ Grito de guerra</b><span>2 ímpetu</span><i>3</i></div>
          <div class="cmdsplit"><div class="btn cmd"><b>Mochila</b><span>4 usables</span><i>4</i></div><div class="btn cmd"><b>Huir</b><span>43 %</span><i>5</i></div><div class="btn cmd"><b>Guardia</b><span>½ daño</span><i>6</i></div></div>
        </div></div>`;
  },

  componentes() {
    const T = [['Título de pantalla', '--fs-screen', '32 / 28 / 20'], ['Título de panel', '--fs-panel', '22 / 20 / 16'], ['Texto principal', '--fs-body', '18 / 17 / 15'], ['Texto secundario', '--fs-small', '16 / 15 / 14'], ['ETIQUETA', '--fs-label', '14 / 14 / 13'], ['48', '--fs-num', '40 / 34 / 26']];
    return `<main class="main" style="height:100vh;grid-template-columns:1fr 1fr 1fr;align-content:start;overflow:auto">
      <div class="panel"><div class="ph"><h2>Escala de textos</h2></div>${T.map(([t, v, n]) => `<div style="display:flex;align-items:baseline;gap:var(--sp-3);border-top:1px solid #ffffff14;padding:var(--sp-1) 0"><span style="font-size:var(--${v.slice(2)});${v === '--fs-label' ? 'font-family:Cinzel;letter-spacing:.12em' : ''}${v === '--fs-num' || v === '--fs-screen' || v === '--fs-panel' ? 'font-family:Cinzel' : ''};flex:1">${t}</span><code class="sub">${v} · ${n}</code></div>`).join('')}
        <p class="sub" style="margin-top:var(--sp-2)">Escritorio / tableta / móvil, en px CSS.</p></div>
      <div class="panel"><div class="ph"><h2>Botones</h2></div><div style="display:flex;flex-wrap:wrap;gap:var(--sp-2)"><span class="btn">Normal</span><span class="btn sm">Pequeño</span><span class="btn off">Apagado</span><span class="btn red">Peligro</span></div><div style="margin-top:var(--sp-3)"><span class="btn cta">Principal</span></div>
        <div class="sep"></div><div class="ph"><h2>Pestañas</h2></div><div class="itabs"><div class="itab on">Activa</div><div class="itab">Normal</div><div class="itab">Con aviso ${pin()}</div></div></div>
      <div class="panel"><div class="ph"><h2>Casillas</h2></div><div style="display:flex;gap:var(--sp-2);flex-wrap:wrap;align-items:flex-end">${slot('knight_sword', { big: 1 })}${slot('health_potion', { q: 3 })}${slot('iron_sword', { r: 'u' })}${slot('old_coin', { r: 'r' })}${slot('golden_chalice', { r: 'e' })}${slot()}</div>
        <div class="sep"></div><div class="ph"><h2>Barras y etiquetas</h2></div><div class="bar"><i style="width:70%"></i></div><div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-2);flex-wrap:wrap"><span class="tag gld">▲ Mejora</span><span class="tag good"><img class="px" src="px/icono-pendiente.png">Misión lista</span><span class="tag bad">En ruinas</span></div></div>
      <div class="panel"><div class="ph"><h2>Panel</h2><div class="r"><span class="btn sm">Acción</span></div></div><p>Cuerpo del panel con texto principal.</p><p class="sub">Texto secundario: lo que matiza.</p><div class="sep"></div><div class="lbl">Separador ornamentado ↑</div></div>
      <div class="sheet"><h2 class="disp" style="font-size:var(--fs-panel)">Hoja o ficha</h2><p>Pergamino para fichas de objeto, hoja de personaje y diálogos.</p><p class="sub">Texto oscuro sobre fondo claro: contraste ≥ 7:1.</p><div style="display:flex;gap:var(--sp-3);margin-top:var(--sp-2)"><img class="px" src="px/icono-dado.png" style="width:48px"><img class="px" src="px/icono-sello.png" style="width:48px"><img class="px" src="px/icono-vela.png" style="width:48px"><img class="px" src="px/icono-calavera.png" style="width:48px"></div></div>
      <div class="vgrid" style="grid-template-columns:1fr;grid-template-rows:auto">${(() => { const v = VENDORS[2]; return `<div class="panel vcard"><div class="vpend"><span class="tag good"><img class="px" src="px/icono-pendiente.png">Misión lista</span></div><div class="vimg">${spr(v.sp, '--s-card')}<img class="px stimg" src="${A('st_kitchen')}" style="width:calc(20px * var(--s-ui) * 2)"></div><h3 class="disp">${v.name}</h3><div class="lbl" style="color:var(--accent)">${v.place}</div><div class="sub vst">${v.status}</div><div class="vrep"><span class="sub">${v.rank}</span><div class="bar" style="flex:1"><i style="width:70%;--c:#c9a24a"></i></div></div></div>`; })()}</div>
    </main>`;
  },
};

// HUD de exploración (detrás de la conversación)
function hud() {
  return `<div class="panel" style="position:absolute;left:var(--pad);top:var(--pad);width:${phone() ? 200 : 300}px;opacity:.85"><div style="display:flex;gap:var(--sp-2);align-items:center">${spr('hero', '--s-ui')}<b class="disp">Aldric</b><span class="sub" style="margin-left:auto">11:57</span></div><div class="bar" style="margin-top:var(--sp-2)"><i style="width:100%"></i></div><div class="bar" style="margin-top:4px"><i style="width:100%;--c:#e8752b"></i></div></div>`;
}

document.getElementById('root').innerHTML = `<div class="app ${['conversacion', 'combate', 'componentes'].includes(S) ? 'bare' : ''}">${SCREENS[S]()}</div>`;
document.title = `HUD ${D.toUpperCase()} · ${S}`;

function vendorScreen(id) {
  const p = phone(); const v = VENDORS.find((x) => x.id === id); const c = VSCREEN[id];
  const tabs = `<div class="itabs">${c.tabs.map((t) => { const n = t.replace('*', ''); return `<div class="itab ${n === c.on ? 'on' : ''}">${n}${t.endsWith('*') ? ' ' + pin() : ''}</div>`; }).join('')}<div class="itab">◂ Bastión</div></div>`;
  const recipe = ([n, out, ing, lock]) => `<div class="rec ${lock ? 'off' : ''}">${slot(out, { r: 'u' })}<div style="flex:1;min-width:0"><b class="disp" style="font-size:var(--fs-body)">${n}</b>
    <div style="display:flex;gap:var(--sp-2);margin-top:var(--sp-1);flex-wrap:wrap">${ing.map(([i, h, need]) => `<span class="ing ${h < need ? 'bad' : ''}">${ico(i)}${h}/${need}</span>`).join('')}</div>
    ${lock ? `<div class="sub" style="margin-top:4px">${lock}</div>` : ''}</div>${lock ? '' : `<span class="btn ${ing.some(([, h, n]) => h < n) ? 'off' : ''}">${c.verb}</span>`}</div>`;
  const head = p ? `<div style="display:flex;align-items:flex-end;gap:var(--sp-3)">${spr(v.sp, '--s-ui', ';width:40px')}<b class="disp" style="align-self:center">${v.name}</b>${tabs}</div>`
    : `<div class="panel" style="align-items:center;text-align:center">
      <div style="padding:var(--sp-3) 0">${spr(v.sp, '--s-port')}</div>
      <h2 class="disp" style="font-size:var(--fs-panel)">${v.name}</h2><div class="lbl" style="color:var(--accent)">${v.place} · ${c.role}</div>
      <div class="sep" style="width:100%"></div>
      <p style="font-style:italic;font-size:var(--fs-small);color:var(--panel-ink-2)">${c.quote}</p>
      ${c.pend ? `<div class="sheet" style="width:100%;margin-top:var(--sp-4);text-align:left"><div class="lbl">Pendiente</div><div style="display:flex;align-items:center;gap:var(--sp-2);margin-top:var(--sp-1)"><img class="px" src="px/icono-pendiente.png" style="width:24px"><b style="flex:1">${c.pend[0]}</b></div><div class="sub">${c.pend[1]}</div><span class="btn sm" style="width:100%;margin-top:var(--sp-2)">${c.pend[2]}</span></div>` : ''}
      <div style="width:100%;margin-top:auto"><div style="display:flex;justify-content:space-between" class="sub"><span>${v.rank}</span><span>${v.rep}/100</span></div><div class="bar"><i style="width:${v.rep}%;--c:#c9a24a"></i></div></div></div>`;
  let body;
  if (c.sleep) {
    const L = [['Catre de paja', 'Nv 1', '5 oro', 'Recupera todo el Descanso.', true], ['Catre con jergón', 'Nv 2', '10 oro', 'Todo el Descanso y −10 % de Descanso gastado en la siguiente incursión.'], ['Cama de lana', 'Nv 3', '15 oro', 'Todo el Descanso y −15 % de Descanso gastado en la siguiente incursión.']];
    body = `<div style="display:grid;grid-template-columns:${p ? '1fr' : '1fr 1fr'};gap:var(--gap);flex:1;min-height:0">
      <div style="display:flex;flex-direction:column;gap:var(--sp-3)">
        <div class="rec" style="flex-direction:column;align-items:stretch;gap:var(--sp-3)"><div style="display:flex;align-items:center;gap:var(--sp-3)"><img class="px" src="${A('st_cot')}" style="width:calc(20px * ${p ? 2 : 4})"><div style="flex:1"><div class="lbl">Descanso</div><div class="disp" style="font-size:var(--fs-num);color:#9fb4ff">62<span class="sub"> / 100</span></div><div class="bar"><i style="width:62%;--c:#7aa2ff"></i></div></div></div>
          <span class="btn cta">Dormir · 5 oro</span>${p ? '' : '<div class="sub">Grizk cobra la cama. Dormir recupera todo el Descanso.</div>'}</div></div>
      ${p ? '' : `<div style="display:flex;flex-direction:column;gap:var(--sp-2)"><h3 class="disp" style="font-size:var(--fs-body)">Niveles del Catre</h3>${L.map(([n, l, o, e, on]) => `<div class="rec" style="${on ? 'box-shadow:inset 3px 0 0 #e8b33a' : 'opacity:.75'}"><div style="flex:1"><b class="disp">${l} · ${n}</b><div class="sub">${e}</div></div><span class="tag gld">${o}</span></div>`).join('')}
        <div class="sub">Mejorar a nivel 2: 80 oro, 6 chatarra y 6 retales de cuero.</div></div>`}</div>`;
  } else {
    const groups = c.groups || [null];
    body = `<div class="kgrid"><div style="display:flex;flex-direction:column;gap:var(--sp-3);min-height:0;overflow:hidden">
      ${groups.map((g) => `${g ? `<h3 class="disp" style="font-size:var(--fs-body);color:var(--accent)">${g}</h3>` : ''}${c.recipes.filter((r) => !g || r[4] === g).slice(0, p ? 2 : 6).map(recipe).join('')}`).join('')}
      ${c.extra && !p ? `<div class="sep"></div><div style="display:flex;align-items:center;gap:var(--sp-3)"><h3 class="disp" style="font-size:var(--fs-body)">${c.extra[0]}</h3><span class="sub">Lotes de hasta 5</span></div>
      <div class="rec">${slot(c.extra[1], { q: 2, r: 'u' })}<div style="flex:1"><b>${c.extra[2]}</b><div class="sub">${c.extra[3]}</div></div><span class="btn">${c.extra[4]}</span></div>` : ''}
    </div>${p ? '' : `<div class="sheet"><h3 class="disp" style="font-size:var(--fs-small);margin-bottom:var(--sp-2)">${c.matsTitle}</h3><div class="grid" style="grid-template-columns:repeat(4,var(--slot))">${c.mats.map(([i, q]) => slot(i, { q })).join('')}${Array.from({ length: 8 - c.mats.length }, () => slot()).join('')}</div></div>`}</div>`;
  }
  const panel = `<div class="panel" style="flex:1"><div class="ph"><h2>${c.st}</h2><span class="tag gld">${c.lvl}</span><div class="r"><span class="btn sm">▲ Mejorar</span></div></div>${body}</div>`;
  return nav('Bastión') + `<main class="main" style="grid-template-columns:${p ? 'minmax(0,1fr)' : '320px 1fr'};${p ? 'grid-template-rows:auto 1fr' : ''}">
    ${head}<div style="display:flex;flex-direction:column;min-height:0">${p ? '' : tabs}${panel}</div></main>`;
}
