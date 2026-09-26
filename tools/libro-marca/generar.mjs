import puppeteer from 'puppeteer-core';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
const AQUI = path.dirname(fileURLToPath(import.meta.url));
const RAIZ = path.resolve(AQUI, '../..');
import { COBERTURA } from './cobertura.mjs';

// ---------- COBERTURA: cada pregunta del cuestionario tiene su sitio ----------
const SRC = fs.readFileSync(path.join(RAIZ, 'admin-panel/plan360.html'), 'utf8');
const Q_AREAS = new Function(SRC.match(/function archivo\(texto\)\{[\s\S]*?\nconst PLAN360_NEGOCIO_AREAS = \[[\s\S]*?\n\];/)[0] + '\nreturn PLAN360_NEGOCIO_AREAS;')();
let totalQ = 0, enDiseno = 0, enFicha = 0; const errores = [];
Q_AREAS.forEach(a => a.subsections.forEach(sub => {
  totalQ += sub.questions.length;
  const m = (COBERTURA[a.title] || {})[sub.title];
  if(!m){ errores.push(`Sin mapa: ${a.title} > ${sub.title}`); return; }
  if(m.length !== sub.questions.length) errores.push(`${a.title} > ${sub.title}: ${m.length} entradas para ${sub.questions.length} preguntas`);
  m.forEach(x => x === 'd' ? enDiseno++ : enFicha++);
}));
if(errores.length){ console.error('COBERTURA INCOMPLETA:\n' + errores.join('\n')); process.exit(1); }
console.log(`Cobertura: ${enDiseno + enFicha} / ${totalQ} preguntas (${enDiseno} en páginas principales, ${enFicha} en fichas detalladas)`);


const OUT = path.join(AQUI, 'salida');
fs.mkdirSync(OUT, { recursive: true });
const F = 'file://' + path.join(RAIZ, 'fonts') + '/';

// ---------- helpers ----------
const ph = t => `<mark class="ph">[ ${t} ]</mark>`;
const box = (label, h = 60, extra = '') => `<div class="phb" style="min-height:${h}px;${extra}"><span class="phb-l">${label}</span></div>`;
const lab = t => `<div class="lab">${t}</div>`;
const h2 = (t, n) => `<div class="h2">${n ? `<span class="h2n">${n}</span>` : ''}${t}</div>`;

let pageNo = 0;
const pages = [];
function page(inner, { dark = false, sec = '', cls = '', noChrome = false, coach = false } = {}) {
  pageNo++;
  const chrome = noChrome ? '' : `
    <div class="run-top"><span>${sec}</span><span>${ph('Nombre del negocio')} &nbsp;·&nbsp; Libro de marca</span></div>
    <div class="run-bot"><span>GastroGoan · Plan 360°</span><span class="pn">${String(pageNo).padStart(2, '0')}</span></div>`;
  const co = coach ? `<div class="coach"><div class="coach-l">Lectura de tu coach</div><div class="coach-t">${ph(typeof coach === 'string' ? coach : 'Qué significa esto para el negocio y qué vamos a hacer con ello, en dos o tres frases')}</div></div>` : '';
  pages.push(`<section class="pg ${dark ? 'dark' : ''} ${cls}">${chrome}<div class="in"><div class="flowc">${inner}</div>${co}</div></section>`);
}

const AREAS = [
  ['01', 'Concepto', 'Quién eres y por qué te eligen.', ['Misión, visión y valores', 'Propuesta única de valor', 'Posicionamiento y competencia', 'DAFO', 'Cliente actual y cliente objetivo', 'Customer journey']],
  ['02', 'Marca', 'Cómo se ve y se vive tu negocio.', ['Historia y personalidad', 'Eslogan y tono de voz', 'Identidad visual', 'Moodboard y fotografía']],
  ['03', 'Cocina', 'Qué cocina eres y cómo la haces rentable.', ['Promesa gastronómica', 'Plato estrella', 'Estructura de la oferta', 'Menú engineering', 'Proveedores', 'Ficha detallada']],
  ['04', 'Sala', 'Cómo sirves y por qué vuelven.', ['Oferta de bebidas', 'Ambiente y rituales', 'Storytelling', 'Cierre y fidelización', 'Ficha detallada']],
  ['05', 'Equipo', 'Quién hace que todo funcione.', ['Estructura', 'Diagnóstico de liderazgo y cultura', 'eNPS', 'Acciones inmediatas', 'Ficha detallada']],
  ['06', 'Gestión', 'Tu negocio en números, no en sensaciones.', ['Números clave', 'Estructura de costes', 'Operativa de cocina y sala', 'Cumplimiento y sistemas', 'Ficha detallada']],
  ['07', 'Captación', 'Cómo llenas y cómo haces que vuelvan.', ['Marketing y canales', 'Fidelización', 'Prueba social', 'Ficha detallada']],
  ['08', 'Tú al frente', 'El motor de todo esto eres tú.', ['Cómo quieres liderar', 'Tu mantra', 'Cómo sabrás que lo estás consiguiendo']],
];

function opener([n, title, sub, list]) {
  START[n] = pageNo + 1;
  page(`
    <div class="op-num">${n}</div>
    <div class="op-top"><div class="eyebrow-l">Capítulo ${n} / 08</div></div>
    <div class="op-body">
      <div class="op-title">${title}</div>
      <div class="op-sub">${sub}</div>
      <div class="op-rule"></div>
      <div class="op-key-l">La conclusión clave</div>
      <div class="op-key">${ph('La idea más importante de este capítulo, en una frase que el hostelero recuerde')}</div>
    </div>
    <div class="op-list">
      <div class="eyebrow-l" style="margin-bottom:12px">En este capítulo</div>
      ${list.map((x, i) => `<div class="op-li"><span>${String(i + 1).padStart(2, '0')}</span>${x}</div>`).join('')}
    </div>`, { dark: true, noChrome: true, cls: 'opener' });
}

// ---------- FICHA DETALLADA ----------
function fField(f){
  const [t, l, x] = f;
  if(t === 'T') return `<div class="ff"><div class="ff-l">${l}</div><div class="ff-v"></div><div class="ff-v"></div></div>`;
  if(t === 'N') return `<div class="ff"><div class="ff-l">${l}</div><div class="ff-n"><span class="ff-nb"></span><em>${x}</em></div></div>`;
  if(t === 'L') return `<div class="ff"><div class="ff-l">${l}</div>${[1, 2, 3].map(i => `<div class="ff-li"><span>0${i}</span><div class="ff-v"></div></div>`).join('')}</div>`;
  if(t === 'M') return `<div class="ff"><div class="ff-l">${l}</div><div class="mm"><div><b>Vacas</b></div><div class="mm-s"><b>Estrellas</b></div><div class="mm-d"><b>Perros</b></div><div><b>Incógnitas</b></div></div></div>`;
  return '';
}
function fSub(title, fields){
  const g = fields.filter(f => ['T', 'N', 'L', 'M'].includes(f[0]));
  const sn = fields.filter(f => f[0] === 'S');
  const ck = fields.filter(f => f[0] === 'C');
  return `<div class="fs"><div class="fs-h"><i></i>${title}<span>${fields.length}</span></div>
    ${g.length ? `<div class="fg">${g.map(fField).join('')}</div>` : ''}
    ${sn.length ? `<div class="sg">${sn.map(f => `<div class="sn"><span class="sn-l">${f[1]}</span><span class="sn-c"><i>Sí</i><i>Parcial</i><i>No</i></span></div>`).join('')}</div>` : ''}
    ${ck.map(f => `<div class="ck"><div class="ff-l">${f[1]} · marcar lo que se aplica hoy</div><div class="ck-g" style="grid-template-columns:repeat(${f[2].length > 6 ? 4 : f[2].length},1fr)">${f[2].map(i => `<div><span class="cb"></span>${i}</div>`).join('')}</div></div>`).join('')}
  </div>`;
}
function fHeight(fields){
  const g = fields.filter(f => ['T', 'N', 'L', 'M'].includes(f[0])).map(f => ({T: 70, N: 62, L: 104, M: 148}[f[0]]));
  let hg = 0; for(let i = 0; i < g.length; i += 2) hg += Math.max(g[i], g[i + 1] || 0) + 12;
  const nsn = fields.filter(f => f[0] === 'S').length;
  const hs = Math.ceil(nsn / 2) * 34 + (nsn ? 8 : 0);
  const hc = fields.filter(f => f[0] === 'C').reduce((h, f) => h + 40 + Math.ceil(f[2].length / (f[2].length > 6 ? 4 : f[2].length)) * 26, 0);
  return 44 + hg + hs + hc + 18;
}
function ficha(areaTitle, n){
  const subs = Object.entries(COBERTURA[areaTitle]).map(([t, m]) => [t, m.filter(x => x !== 'd')]).filter(([, f]) => f.length);
  if(!subs.length) return;
  const total = subs.reduce((a, [, f]) => a + f.length, 0);
  const lotes = []; let cur = [], h = 0, cap = 1000;
  subs.forEach(([t, f]) => { const hh = fHeight(f); if(cur.length && h + hh > cap){ lotes.push(cur); cur = []; h = 0; cap = 1080; } cur.push([t, f]); h += hh; });
  if(cur.length) lotes.push(cur);
  lotes.forEach((lote, i) => page(`
    ${i === 0 ? `<div class="fh"><div class="lab">Ficha detallada · ${n} ${areaTitle}</div><div class="fh-t">Todo, punto por punto.</div><div class="fh-s">Lo esencial está en las páginas anteriores. Aquí queda constancia del resto de lo revisado — ${total} puntos.</div></div>`
      : `<div class="fh fh-c"><div class="lab">Ficha detallada · ${n} ${areaTitle} · continuación</div></div>`}
    ${lote.map(([t, f]) => fSub(t, f)).join('')}`, { sec: `${n} · ${areaTitle} · Ficha` }));
}

const START = {};
// ---------- PORTADA ----------
page(`
  <div class="cv-rail"></div>
  <div class="eyebrow-l">GastroGoan · Plan 360°</div>
  <div class="cv-title">Libro<br>de marca</div>
  <div class="cv-rule"></div>
  <div class="cv-biz">${ph('Nombre del negocio')}</div>
  <div class="cv-meta">${ph('Ciudad')} &nbsp;·&nbsp; ${ph('Mes y año')}</div>
  <div class="cv-360">360°</div>
  <div class="cv-foot">
    <div>Documento privado del negocio.<br>Elaborado junto a tu coach GastroGoan.</div>
    <div class="cv-ed">Edición 01</div>
  </div>`, { dark: true, noChrome: true, cls: 'cover' });

// ---------- PRESENTACIÓN + ÍNDICE ----------
page(`
  <div class="two" style="grid-template-columns:1.05fr .95fr;gap:48px;height:100%">
    <div>
      ${lab('Antes de empezar')}
      <div class="display" style="margin:10px 0 22px">Este es<br>tu negocio.</div>
      <p class="lead">Este libro recoge todo lo que hemos descubierto juntos sobre tu restaurante: quién eres, qué ofreces, cómo trabajas, qué dicen los números y hacia dónde vas.</p>
      <p class="body">No es un informe para guardar en un cajón. Es la referencia a la que volver cada vez que haya que tomar una decisión: contratar, cambiar la carta, invertir o decir que no a algo que no encaja con lo que eres.</p>
      <div style="margin-top:28px">${lab('Carta de tu coach')}</div>
      ${box('Unas líneas personales al propietario: qué nos ha llamado la atención, qué nos ilusiona de su negocio y qué le pedimos para los próximos meses', 190, 'margin-top:10px')}
      <div class="sign" style="margin-top:18px"><div class="sign-l"></div><div>${ph('Nombre del coach')}<br><span class="muted-s">Coach GastroGoan</span></div></div>
    </div>
    <div class="idx">
      ${lab('Índice')}
      <div class="idx-row idx-extra"><span>—</span><span>Tu negocio en una página</span><span>03</span></div>
      ${AREAS.map(([n, t, s], i) => `<div class="idx-row"><span>${n}</span><span><b>${t}</b><em>${s}</em></span><span>%%P${n}%%</span></div>`).join('')}
      <div class="idx-row idx-extra"><span>—</span><span>Hoja de ruta 30 · 60 · 90</span><span>%%PHR%%</span></div>
    </div>
  </div>`, { sec: 'Presentación' });

// ---------- RESUMEN EJECUTIVO ----------
page(`
  ${lab('Resumen ejecutivo')}
  <div class="display" style="font-size:40px;margin:8px 0 20px">Tu negocio en una página.</div>
  <div class="band">
    <div class="band-l">En una frase</div>
    <div class="band-t">${ph('La propuesta única de valor: qué haces, para quién, cómo y qué ganan')}</div>
  </div>
  <div class="kpis" style="margin-top:20px">
    ${[['Ticket medio', 'actual → objetivo', '€'], ['Food cost', 'actual → objetivo', '%'], ['Nota en Google', 'media de reseñas', '/5'], ['eNPS del equipo', 'recomendarían trabajar aquí', '/10']].map(([a, b, u]) => `
      <div class="kpi"><div class="kpi-l">${a}</div><div class="kpi-v">${ph('00')}<small>${u}</small></div><div class="kpi-s">${b}</div></div>`).join('')}
  </div>
  <div class="three" style="margin-top:22px">
    <div>${h2('Lo que ya funciona')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Fortaleza clave')}</div>`).join('')}</div>
    <div>${h2('Lo que hay que corregir')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Problema prioritario')}</div>`).join('')}</div>
    <div>${h2('Hacia dónde vamos')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Objetivo a 12 meses')}</div>`).join('')}</div>
  </div>
  <div style="margin-top:24px">${h2('Diagnóstico por áreas')}</div>
  <div class="scores">
    ${AREAS.map(([n, t]) => `<div class="score"><span class="score-n">${n}</span><span class="score-t">${t}</span><span class="dots"><i></i><i></i><i></i><i></i><i></i></span><span class="score-c">${ph('comentario breve')}</span></div>`).join('')}
  </div>
  <div class="legend">Marcar de 1 a 5 puntos el estado actual de cada área.</div>
`, { sec: 'Resumen', coach: true });

// ---------- 01 CONCEPTO ----------
opener(AREAS[0]);
page(`
  ${lab('Misión')}
  <div class="statement">${ph('Hacemos [qué] para [a quién] mediante [cómo]')}</div>
  <div class="two" style="margin-top:26px">
    <div>${lab('Visión')}<div class="big-p">${ph('A quién transformamos, qué cambio generamos y en qué plazo')}</div></div>
    <div>${lab('Qué queremos cambiar en el sector')}<div class="big-p">${ph('El principio que guía cada decisión diaria')}</div></div>
  </div>
  <div style="margin-top:30px">${h2('Nuestros valores')}</div>
  <div class="vtable">
    <div class="vt-h"><span></span><span>Valor</span><span>Cómo se vive cada día</span></div>
    ${[1, 2, 3, 4, 5].map(i => `<div class="vt-r"><span>0${i}</span><span>${ph('Valor')}</span><span>${ph('Acción concreta que lo demuestra en el servicio')}</span></div>`).join('')}
  </div>
  <div class="puv">
    <div class="puv-l">Propuesta única de valor</div>
    <div class="puv-t">Hacemos ${ph('qué')} para ${ph('quién')} ofreciendo ${ph('cómo')}, que ${ph('beneficio principal')}.</div>
  </div>
`, { sec: '01 · Concepto', coach: true });

page(`
  ${h2('Diez atributos que nos definen')}
  <div class="attrs">${[...Array(10)].map((_, i) => `<div class="attr"><span>${String(i + 1).padStart(2, '0')}</span>${ph('Atributo')}</div>`).join('')}</div>
  <div style="margin-top:28px">${h2('Estrategia de precios')}</div>
  <div class="scale">
    <div class="scale-bar"><div class="scale-mark" style="left:42%"></div></div>
    <div class="scale-lbl"><span>Económico</span><span>Medio</span><span>Medio-alto</span><span>Premium</span></div>
  </div>
  <div class="body" style="margin-top:10px">${ph('Dónde nos situamos frente a la zona y cómo lo justificamos: raciones, producto, experiencia')}</div>
  <div style="margin-top:28px">${h2('Nuestra competencia')}</div>
  <table class="tbl">
    <thead><tr><th style="width:26%">Competidor</th><th style="width:14%">Tipo</th><th>Qué hace mejor que nosotros</th><th>Nuestra diferencia</th></tr></thead>
    <tbody>${['Directo', 'Directo', 'Directo', 'Indirecto', 'Indirecto'].map(t => `<tr><td>${ph('Nombre')}</td><td><span class="tag">${t}</span></td><td>${ph('Su punto fuerte')}</td><td>${ph('Por qué nos eligen')}</td></tr>`).join('')}</tbody>
  </table>
`, { sec: '01 · Concepto', coach: true });

page(`
  ${h2('DAFO')}
  <div class="dafo">
    ${[['Fortalezas', 'Internas · a favor', 'ol'], ['Debilidades', 'Internas · en contra', 'rd'], ['Oportunidades', 'Externas · a favor', 'ol'], ['Amenazas', 'Externas · en contra', 'rd']].map(([t, s, c]) => `
      <div class="dq"><div class="dq-h ${c}"><b>${t}</b><span>${s}</span></div>
      ${[1, 2, 3, 4, 5].map(i => `<div class="dq-i"><span>${i}</span>${ph({Fortalezas:'Fortaleza',Debilidades:'Debilidad',Oportunidades:'Oportunidad',Amenazas:'Amenaza'}[t])}</div>`).join('')}</div>`).join('')}
  </div>
  <div style="margin-top:26px">${h2('Qué sacamos del DAFO')}</div>
  <div class="three">
    <div>${lab('3 aprendizajes')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Aprendizaje aplicable')}</div>`).join('')}</div>
    <div>${lab('3 riesgos a evitar')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Riesgo')}</div>`).join('')}</div>
    <div class="protect"><div class="lab" style="color:#C9D3C6">La ventaja que hay que proteger</div><div class="protect-t">${ph('Ventaja competitiva propia')}</div></div>
  </div>
`, { sec: '01 · Concepto', coach: true });

page(`
  ${h2('Cliente actual frente a cliente objetivo')}
  <div class="vs">
    <div class="vs-c"><div class="lab">Hoy nos visita</div>${box('Edad, zona, frecuencia, ticket medio, cuándo viene y qué pide — datos reales', 92, 'margin-top:8px')}</div>
    <div class="vs-arrow">→</div>
    <div class="vs-c"><div class="lab">Queremos que nos visite</div>${box('El cliente al que apuntamos y qué tiene que cambiar para atraerlo', 92, 'margin-top:8px')}</div>
  </div>
  <div class="diffs">${[1, 2, 3].map(i => `<div><span>Diferencia 0${i}</span>${ph('Qué cambia entre uno y otro')}</div>`).join('')}</div>
  <div style="margin-top:22px">${h2('Cuatro perfiles de cliente objetivo')}</div>
  <div class="personas">${['A', 'B', 'C', 'D'].map(l => `
    <div class="persona"><div class="p-av">${l}</div><div class="p-n">${ph('Perfil')}</div>
      <div class="p-row"><span>Quién es</span>${ph('edad · situación')}</div>
      <div class="p-row"><span>Cuándo viene</span>${ph('día · franja')}</div>
      <div class="p-row"><span>Qué busca</span>${ph('motivo de visita')}</div>
      <div class="p-row"><span>Ticket</span>${ph('€ / persona')}</div></div>`).join('')}</div>
  <div style="margin-top:22px">${h2('Customer journey')}</div>
  <div class="journey">
    ${['Descubrimiento', 'Reserva', 'Llegada', 'Experiencia', 'Despedida'].map((s, i) => `
      <div class="j-st"><div class="j-dot">${i + 1}</div><div class="j-t">${s}</div>
        <div class="j-r"><span>Canal</span>${ph('—')}</div>
        <div class="j-r"><span>Emoción</span>${ph('—')}</div>
        <div class="j-r rd"><span>Fricción</span>${ph('—')}</div>
        <div class="j-r ol"><span>Mejora</span>${ph('—')}</div></div>`).join('')}
  </div>
  <div class="survey"><div class="survey-l">Encuesta post-visita</div>${[1, 2, 3].map(i => `<div><span>P${i}</span>${ph('Pregunta que haremos al cliente')}</div>`).join('')}</div>
`, { sec: '01 · Concepto' });

// ---------- 02 MARCA ----------
opener(AREAS[1]);
page(`
  <div class="two" style="grid-template-columns:.9fr 1.1fr;gap:40px">
    <div>
      ${lab('Nuestra historia')}
      <div class="year">${ph('Año')}</div>
      ${box('La historia que hay detrás del negocio, contada en un párrafo: quién lo abrió, por qué y qué valor de la oferta nace de ahí', 200, 'margin-top:10px')}
    </div>
    <div>
      ${lab('Estilo general')}
      <div class="big-p" style="margin-bottom:22px">${ph('Rústico, casual, elegante, vanguardista… y los materiales que lo expresan')}</div>
      ${lab('Personalidad')}
      <div class="adj3">${[1, 2, 3].map(() => `<div>${ph('Adjetivo')}</div>`).join('')}</div>
    </div>
  </div>
  <div class="slogan">
    <div class="lab" style="text-align:center">Eslogan</div>
    <div class="slogan-t">“${ph('El eslogan del negocio')}”</div>
  </div>
  ${h2('Tono de voz')}
  <div class="tone">${[1, 2, 3, 4, 5].map(() => `<span>${ph('Adjetivo')}</span>`).join('<i>·</i>')}</div>
  <div class="two" style="margin-top:18px">
    <div class="do"><div class="do-h ol">Así hablamos</div>${[1, 2, 3].map(() => `<div class="do-i">“${ph('Frase de ejemplo')}”</div>`).join('')}</div>
    <div class="do"><div class="do-h rd">Así no hablamos</div>${[1, 2, 3].map(() => `<div class="do-i">“${ph('Frase que evitamos')}”</div>`).join('')}</div>
  </div>
  <div class="facts" style="margin-top:18px"><div><span>Presentación al equipo</span>${ph('Cuándo y cómo se presenta la marca al equipo')}</div></div>
`, { sec: '02 · Marca', coach: true });

page(`
  ${h2('Logotipo')}
  <div class="logos">
    <div class="logo-main">${box('Logotipo principal', 150)}</div>
    <div class="logo-var">${['Mantelería', 'Uniformes', 'Web y redes'].map(v => box(v, 44)).join('')}</div>
  </div>
  <div style="margin-top:24px">${h2('Paleta de color')}</div>
  <div class="swatches">${[1, 2, 3, 4, 5].map(i => `<div class="sw"><div class="sw-c"></div><div class="sw-n">${ph('Nombre')}</div><div class="sw-h">#${ph('HEX')}</div><div class="sw-u">${i === 1 ? 'Principal' : i === 2 ? 'Acento' : 'Apoyo'}</div></div>`).join('')}</div>
  <div style="margin-top:24px">${h2('Tipografías')}</div>
  <div class="two">
    <div class="typo"><div class="typo-a">Aa</div><div><div class="lab">Titulares</div>${ph('Nombre de la fuente')}</div></div>
    <div class="typo"><div class="typo-a" style="font-weight:400">Aa</div><div><div class="lab">Texto y carta</div>${ph('Nombre de la fuente')}</div></div>
  </div>
  <div style="margin-top:24px">${h2('Moodboard')}</div>
  <div class="mood">${['Fachada', 'Sala', 'Plato estrella', 'Detalle de mesa', 'Equipo'].map((t, i) => `<div class="mood-c ${i === 0 ? 'mood-big' : ''}"><span>${t}</span></div>`).join('')}</div>
  <div class="two" style="margin-top:14px">
    <div>${lab('Dirección fotográfica · sí')}<div class="body">${ph('Luz, encuadre, estilo de las fotos del negocio')}</div></div>
    <div>${lab('Dirección fotográfica · no')}<div class="body">${ph('Lo que nunca debe aparecer')}</div></div>
  </div>
`, { sec: '02 · Marca', coach: true });

// ---------- 03 COCINA ----------
opener(AREAS[2]);
page(`
  ${lab('Promesa gastronómica')}
  <div class="statement" style="font-size:28px">${ph('Lo que prometemos en cada plato, en una frase')}</div>
  <div class="tone" style="margin-top:14px">${[1, 2, 3, 4].map(() => `<span>${ph('Carácter')}</span>`).join('<i>·</i>')}</div>
  <div class="star">
    <div class="star-img"><span>Foto del plato estrella</span></div>
    <div class="star-b">
      <div class="lab" style="color:#C9D3C6">Plato estrella</div>
      <div class="star-t">${ph('Nombre del plato')}</div>
      <div class="star-d">${ph('Por qué es nuestro plato: producto, técnica, emoción que busca')}</div>
      <div class="star-r"><span>Emplatado</span>${ph('estilo · vajilla · cristalería')}</div>
    </div>
  </div>
  <div class="three" style="margin-top:22px">
    <div>${h2('Influencias')}${[1, 2, 3].map(i => `<div class="infl"><div>${ph('Influencia')}</div><div class="risk"><i class="${i === 1 ? 'on' : ''}"></i><i class="${i === 2 ? 'on' : ''}"></i><i class="${i === 3 ? 'on' : ''}"></i></div></div>`).join('')}<div class="legend">Riesgo: clásico · reinterpretación · atrevido</div></div>
    <div>${h2('Ingredientes emblemáticos')}${[1, 2, 3, 4].map(() => `<div class="nl"><span>—</span>${ph('Producto · origen')}</div>`).join('')}</div>
    <div>${h2('Hilo conductor')}<div class="big-p">${ph('La técnica o el sabor que une toda la oferta')}</div><div class="lab" style="margin-top:14px">Técnicas clave</div><div class="body">${ph('masa madre, brasa, encurtidos…')}</div></div>
  </div>
  <div class="two" style="margin-top:22px">
    <div>${h2('Nivel de sofisticación')}
      <div class="scale"><div class="scale-bar"><div class="scale-mark" style="left:30%"></div></div><div class="scale-lbl"><span>Rústico</span><span>Casual</span><span>Elegante</span><span>Vanguardista</span></div></div></div>
    <div>${h2('Temporada')}
      <div class="split"><div class="split-a" style="width:62%">Carta fija&nbsp;${ph('%')}</div><div class="split-b">Temporada&nbsp;${ph('%')}</div></div>
      <div class="legend">Qué parte de la carta es fija todo el año y cuál rota.</div></div>
  </div>
  <div class="three" style="margin-top:22px">
    <div>${lab('Lo que queremos que sienta')}<div class="body">${ph('Emociones, sensaciones, recuerdos')}</div></div>
    <div>${lab('Cómo se lo contamos')}<div class="body">${ph('Cómo trasladamos al cliente el valor de nuestros procesos')}</div></div>
    <div>${lab('Cómo entra la temporada')}<div class="body">${ph('Producto de temporada y urgencia')}</div></div>
  </div>
`, { sec: '03 · Cocina', coach: true });

page(`
  ${h2('Franjas de servicio')}
  <div class="timeline">
    <div class="tl-axis">${[8, 10, 12, 14, 16, 18, 20, 22, 24].map(h => `<span>${h}h</span>`).join('')}</div>
    <div class="tl-row"><span class="tl-l">${ph('Franja')}</span><div class="tl-track"><div class="tl-bar" style="left:12.5%;width:12.5%"></div></div></div>
    <div class="tl-row"><span class="tl-l">${ph('Franja')}</span><div class="tl-track"><div class="tl-bar main" style="left:31%;width:25%"></div></div></div>
    <div class="tl-row"><span class="tl-l">${ph('Franja')}</span><div class="tl-track"><div class="tl-bar" style="left:75%;width:18%"></div></div></div>
  </div>
  <div class="legend">En verde oscuro, la franja que queremos potenciar.</div>
  <div class="two" style="margin-top:20px;grid-template-columns:1.2fr .8fr">
    <div>${h2('Estructura de la carta')}
      <table class="tbl"><thead><tr><th>Sección</th><th style="width:22%">Referencias</th><th style="width:30%">Rango de precio</th></tr></thead>
      <tbody>${[1, 2, 3, 4, 5].map(() => `<tr><td>${ph('Sección')}</td><td>${ph('nº')}</td><td>${ph('€ – €')}</td></tr>`).join('')}</tbody></table>
      <div class="facts">
        <div><span>Rotación</span>${ph('mensual · trimestral')}</div>
        <div><span>Fidelización</span>${ph('menú del día, ejecutivo…')}</div>
        <div><span>Cortesía</span>${ph('sí / no · cuál')}</div>
      </div>
    </div>
    <div>${h2('Formatos especiales')}
      ${['Vegano / vegetariano', 'Sin gluten', 'Para llevar / kits', 'Eventos mensuales', 'Showcooking / en mesa', 'Platos personalizables', 'Venta cruzada'].map(t => `<div class="chk"><span class="cb"></span>${t}</div>`).join('')}
    </div>
  </div>
  <div class="two" style="margin-top:20px;grid-template-columns:.9fr 1.1fr">
    <div>${h2('Menú engineering')}
      <div class="me">
        <div class="me-y">Popularidad ↑</div><div class="me-x">Rentabilidad →</div>
        <div class="me-q"><b>Vacas</b>${ph('platos')}</div>
        <div class="me-q star-q"><b>Estrellas</b>${ph('platos')}</div>
        <div class="me-q dog"><b>Perros</b>${ph('platos')}</div>
        <div class="me-q"><b>Incógnitas</b>${ph('platos')}</div>
      </div></div>
    <div>${h2('Proveedores')}
      <table class="tbl sm"><thead><tr><th>Sección</th><th>Proveedor</th><th>Día</th><th>Pedido</th></tr></thead>
      <tbody>${['Carne', 'Pescado', 'Verdura', 'Seco', 'Bebida'].map(s => `<tr><td>${s}</td><td>${ph('nombre')}</td><td>${ph('—')}</td><td>${ph('—')}</td></tr>`).join('')}</tbody></table>
      <div class="facts"><div><span>Compras</span>${ph('responsable')}</div><div><span>Recepción</span>${ph('responsable')}</div></div>
    </div>
  </div>
`, { sec: '03 · Cocina', coach: true });

ficha('Cocina', '03');
// ---------- 04 SALA ----------
opener(AREAS[3]);
page(`
  <div class="two" style="grid-template-columns:1.1fr .9fr;gap:36px">
    <div>${h2('Carta de bebidas')}
      ${['Vinos', 'Cervezas', 'Coctelería / autor', 'Sin alcohol', 'Licores'].map((c, i) => `<div class="bar-r"><span>${c}</span><div class="bar"><div style="width:${[80, 45, 30, 50, 25][i]}%"></div></div><span class="bar-v">${ph('nº')}</span></div>`).join('')}
      <div class="facts" style="margin-top:12px">
        <div><span>Vino copa / botella</span>${ph('% / %')}</div>
        <div><span>Maridaje</span>${ph('sí / no')}</div>
      </div>
    </div>
    <div>${h2('Filosofía de maridaje')}<div class="big-p">${ph('Las reglas sencillas que usa la sala para recomendar')}</div>
      <div class="lab" style="margin-top:16px">Sellos de identidad</div><div class="body">${ph('vermut propio, vinos de la zona…')}</div></div>
  </div>
  <div style="margin-top:22px">${h2('Ambiente')}</div>
  <div class="amb">${[['Temperatura', '°'], ['Música', '♪'], ['Luz', '◐']].map(([t, g]) => `<div class="amb-c"><div class="amb-g">${g}</div><div class="lab">${t}</div><div class="body">${ph('cómo la queremos')}</div></div>`).join('')}</div>
  <div class="two" style="margin-top:22px">
    <div>${h2('Rituales de la casa')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Gesto que refuerza la experiencia')}</div>`).join('')}</div>
    <div>${h2('Lo que contamos en sala')}<div class="big-p">${ph('La historia de origen que queremos transmitir')}</div><div class="body" style="margin-top:8px">${ph('Cómo se forma al equipo para contarla')}</div></div>
  </div>
  <div style="margin-top:22px">${h2('Cierre del servicio')}</div>
  <div class="flow">${['Detalle final', 'Despedida', 'Llamada a volver', 'Opinión del cliente'].map((s, i) => `<div class="flow-s"><span>${i + 1}</span><b>${s}</b>${ph('cómo lo hacemos')}</div>`).join('<div class="flow-a">→</div>')}</div>
  <div class="facts" style="margin-top:16px"><div><span>Equipo de sala</span>${ph('responsable · roles · personas por turno')}</div></div>
`, { sec: '04 · Sala', coach: true });

ficha('Sala', '04');
// ---------- 05 EQUIPO ----------
opener(AREAS[4]);
page(`
  ${h2('Cómo nos organizamos')}
  <div class="org">
    <div class="org-top">${ph('Propietario / dirección')}</div>
    <div class="org-line"></div>
    <div class="org-row"><div class="org-b"><b>Cocina</b>${ph('Jefe de cocina')}<span>${ph('nº personas')}</span></div><div class="org-b"><b>Sala</b>${ph('Responsable de sala')}<span>${ph('nº personas')}</span></div><div class="org-b"><b>Gestión</b>${ph('Responsable')}<span>${ph('nº personas')}</span></div></div>
  </div>
  <div class="two" style="margin-top:24px;grid-template-columns:.8fr 1.2fr;gap:36px">
    <div class="enps"><div class="lab">eNPS</div><div class="enps-v">${ph('0')}<small>/10</small></div><div class="body">¿Recomendarías este negocio como lugar para trabajar?</div><div class="body" style="margin-top:8px">${ph('Por qué esta nota')}</div></div>
    <div>${h2('Diagnóstico')}
      ${['Visión y liderazgo', 'Selección y ajuste cultural', 'Formación y carrera', 'Rendimiento y retención', 'Cultura y bienestar', 'Comunicación y procesos'].map(t => `<div class="diag"><span>${t}</span><span class="sem"><i class="g"></i><i class="a"></i><i class="r"></i></span><span class="diag-c">${ph('estado')}</span></div>`).join('')}
      <div class="legend">Marcar verde, ámbar o rojo.</div>
    </div>
  </div>
  <div class="three" style="margin-top:22px">
    <div>${h2('3 acciones en 30 días')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Acción')}</div>`).join('')}</div>
    <div>${h2('Lo que protegemos')}${[1, 2].map(i => `<div class="nl"><span>0${i}</span>${ph('Práctica cultural')}</div>`).join('')}</div>
    <div>${h2('Barreras a resolver')}${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Barrera')}</div>`).join('')}</div>
  </div>
`, { sec: '05 · Equipo', coach: true });

ficha('Equipo', '05');
// ---------- 06 GESTIÓN ----------
opener(AREAS[5]);
page(`
  ${h2('Los números que mandan')}
  <div class="kpis k3">
    ${[['Ticket medio', '€', 'actual → objetivo'], ['Food cost', '%', 'actual → objetivo'], ['Ocupación media', '%', 'covers máx. / día'], ['Punto de equilibrio', '€', 'ventas mínimas / mes'], ['Saldo de seguridad', '€', 'mínimo en banco'], ['Beneficio trimestral', '€', 'objetivo']].map(([a, u, s]) => `<div class="kpi"><div class="kpi-l">${a}</div><div class="kpi-v">${ph('00')}<small>${u}</small></div><div class="kpi-s">${s}</div></div>`).join('')}
  </div>
  <div style="margin-top:24px">${h2('En qué se va cada euro que entra')}</div>
  <div class="stack"><div style="width:30%" class="s1">Personal · ${ph('%')}</div><div style="width:30%" class="s2">Materia prima · ${ph('%')}</div><div style="width:22%" class="s3">Fijos · ${ph('%')}</div><div style="width:18%" class="s4">Beneficio · ${ph('%')}</div></div>
  <div class="two" style="margin-top:24px">
    <div>${h2('Escenarios de ventas')}
      ${['Conservador', 'Esperado', 'Optimista'].map((e, i) => `<div class="bar-r"><span>${e}</span><div class="bar"><div style="width:${[55, 72, 90][i]}%"></div></div><span class="bar-v">${ph('€')}</span></div>`).join('')}</div>
    <div>${h2('Inversiones previstas')}
      <table class="tbl sm"><thead><tr><th>Inversión</th><th>Importe</th><th>Cuándo</th></tr></thead><tbody>${[1, 2, 3, 4].map(() => `<tr><td>${ph('concepto')}</td><td>${ph('€')}</td><td>${ph('mes')}</td></tr>`).join('')}</tbody></table></div>
  </div>
  <div class="three" style="margin-top:22px">
    <div>${lab('Medidas de ahorro aceptadas')}<div class="body">${ph('Qué se puede recortar sin tocar la experiencia')}</div></div>
    <div>${lab('Tesorería en picos y valles')}<div class="body">${ph('Cómo se gestiona')}</div></div>
    <div>${lab('Nómina del propietario')}<div class="body">${ph('Sí / no · importe')}</div></div>
  </div>
`, { sec: '06 · Gestión', coach: true });

page(`
  <div class="two" style="gap:32px">
    <div>${h2('Proceso de cocina')}${['Diseño de la oferta', 'Ficha técnica y escandallo', 'Gestión de proveedores', 'Recepción de materia prima', 'Planificación de producción', 'Producción', 'Refrigeración y conservación', 'Montaje y pase', 'Salida y comunicación', 'Reorganización postservicio'].map((s, i) => `<div class="chk"><span class="cb"></span><em>${String(i + 1).padStart(2, '0')}</em>${s}</div>`).join('')}</div>
    <div>${h2('Proceso de sala')}${['Preparación del comedor', 'Reserva y llegada', 'Presentación de carta', 'Toma de comanda', 'Servicio escalonado', 'Gestión de tiempos', 'Satisfacción en mesa', 'Cierre de mesa', 'Encuesta y feedback', 'Despedida y fidelización'].map((s, i) => `<div class="chk"><span class="cb"></span><em>${String(i + 1).padStart(2, '0')}</em>${s}</div>`).join('')}</div>
  </div>
  <div class="legend">Marcar los pasos que ya se aplican hoy.</div>
  <div style="margin-top:18px">${h2('Tiempos objetivo del servicio')}</div>
  <div class="times">${['Se sienta', 'Comanda', '1er plato', 'Postre'].map(s => `<div class="t-p"><i></i><span>${s}</span></div>`).join('')}<div class="t-seg" style="left:12%">${ph('min')}</div><div class="t-seg" style="left:44%">${ph('min')}</div><div class="t-seg" style="left:76%">${ph('min')}</div></div>
  <div class="two" style="margin-top:20px;gap:32px">
    <div>${h2('Cumplimiento y seguridad')}
      ${['Licencia y registro sanitario', 'Plan APPCC', 'Alérgenos en carta y sala', 'Extintores y evacuación', 'Control de plagas', 'Trazabilidad'].map(t => `<div class="diag"><span>${t}</span><span class="sem"><i class="g"></i><i class="a"></i><i class="r"></i></span></div>`).join('')}</div>
    <div>${h2('Sistemas')}
      ${['TPV', 'Reservas', 'CRM / clientes', 'Inventario', 'Informes y KPIs'].map(t => `<div class="sys"><span>${t}</span>${ph('herramienta · estado')}</div>`).join('')}
      <div class="alert"><div class="lab" style="color:#8A4A3B">Mayor dolor hoy</div>${ph('Lo que más ventas o tiempo hace perder')}</div></div>
  </div>
`, { sec: '06 · Gestión', coach: true });

ficha('Gestión', '06');
// ---------- 07 CAPTACIÓN ----------
opener(AREAS[6]);
page(`
  <div class="band"><div class="band-l">Objetivo comercial · 12 meses</div><div class="band-t">${ph('Lo que el marketing tiene que conseguir este año')}</div></div>
  <div class="two" style="margin-top:22px">
    <div>${lab('A quién hablamos')}<div class="big-p">${ph('Público objetivo de las campañas')}</div></div>
    <div>${lab('Presupuesto y dedicación')}<div class="big-p">${ph('€ / mes')} · ${ph('horas / semana')}</div></div>
  </div>
  <div style="margin-top:22px">${h2('Canales')}</div>
  <table class="tbl"><thead><tr><th>Canal</th><th style="width:18%">Estado</th><th>Frecuencia</th><th>Responsable</th></tr></thead>
  <tbody>${['Instagram', 'Google Business', 'Web / carta digital', 'Newsletter / WhatsApp', 'Campañas de pago'].map(c => `<tr><td>${c}</td><td><span class="sem"><i class="g"></i><i class="a"></i><i class="r"></i></span></td><td>${ph('—')}</td><td>${ph('—')}</td></tr>`).join('')}</tbody></table>
  <div style="margin-top:22px">${h2('Objetivos a 90 días')}</div>
  <div class="goals">${[1, 2, 3].map(i => `<div class="goal"><strong>0${i}</strong><b>${ph('Objetivo')}</b><em>Se mide con</em>${ph('indicador')}</div>`).join('')}</div>
  <div class="two" style="margin-top:22px;gap:32px">
    <div>${h2('Fidelización')}
      <div class="facts"><div><span>Programa</span>${ph('sí / no · cuál')}</div><div><span>Tasa de repetición</span>${ph('%')}</div><div><span>Incentivo que funciona</span>${ph('—')}</div></div>
      <div class="lab" style="margin-top:12px">Por qué se pierden clientes</div>${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Fallo')}</div>`).join('')}</div>
    <div>${h2('Prueba social')}
      <div class="rev">${['Google', 'TripAdvisor', 'TheFork'].map(p => `<div><div class="rev-v">${ph('0,0')}</div><div class="lab">${p}</div></div>`).join('')}</div>
      <div class="lab" style="margin-top:12px">Lo que más repiten las reseñas</div><div class="body">${ph('temas frecuentes')}</div>
      <div class="lab" style="margin-top:12px">3 acciones en 30 días</div>${[1, 2, 3].map(i => `<div class="nl"><span>0${i}</span>${ph('Acción')}</div>`).join('')}</div>
  </div>
`, { sec: '07 · Captación' });

ficha('Captación', '07');
// ---------- 08 TÚ AL FRENTE ----------
opener(AREAS[7]);
page(`
  <div class="mantra">
    <div class="lab" style="color:#9DB0A2">Tu mantra</div>
    <div class="mantra-t">“${ph('La frase que te vas a repetir cuando las cosas se pongan difíciles')}”</div>
  </div>
  <div class="letter">
    ${[['Cómo quiero sentirme cada mañana', 'al llegar al restaurante'], ['La versión de mí que recordará mi equipo', 'dentro de tres meses'], ['El miedo que dejo atrás', 'para liderar esta etapa'], ['Mi ritual diario', 'para mantener energía y foco'], ['Mi compromiso con el equipo', 'para que confíen y me sigan'], ['El triunfo que celebraré', 'el primer mes, más allá de los números'], ['El apoyo que voy a pedir', 'y a quién'], ['Dentro de un año', 'estaré orgulloso de haber conseguido'], ['Lo que quiero que se vea de mí', 'mi identidad profesional en el restaurante'], ['Cómo sabré que disfruto', 'y que no solo sobrevivo'], ['El hábito que marca el nuevo comienzo', 'y que voy a mantener'], ['Cómo imagino la evolución', 'de mi marca y mi negocio']].map(([a, b]) => `
      <div class="lt"><div class="lt-h"><b>${a}</b><span>${b}</span></div><div class="lt-a">${ph('En primera persona')}</div></div>`).join('')}
  </div>
  <div class="band" style="margin-top:20px"><div class="band-l">Así sabré que lo estoy consiguiendo</div><div class="band-t" style="font-size:15px">${ph('Los indicadores personales y del negocio que voy a mirar')}</div></div>
`, { sec: '08 · Tú al frente' });

// ---------- HOJA DE RUTA ----------
START.HR = pageNo + 1;
page(`
  ${lab('Hoja de ruta')}
  <div class="display" style="font-size:40px;margin:8px 0 22px">Lo que hacemos a partir de hoy.</div>
  <div class="road">
    ${[['30', 'días', 'Arreglar lo urgente'], ['60', 'días', 'Ordenar y medir'], ['90', 'días', 'Crecer']].map(([n, d, t]) => `
      <div class="road-c"><div class="road-n">${n}<small>${d}</small></div><div class="road-t">${t}</div>
      ${[1, 2, 3, 4].map(() => `<div class="road-i"><span class="cb"></span>${ph('Acción · responsable')}</div>`).join('')}</div>`).join('')}
  </div>
  <div style="margin-top:26px">${h2('Las cinco prioridades, por orden')}</div>
  ${[1, 2, 3, 4, 5].map(i => `<div class="prio"><b>${i}</b><div>${ph('Prioridad')}</div><em>${ph('área')}</em></div>`).join('')}
  <div class="sigs">
    <div><div class="sig-line"></div>${ph('Nombre del propietario')}<br><span class="muted-s">Propietario</span></div>
    <div><div class="sig-line"></div>${ph('Nombre del coach')}<br><span class="muted-s">Coach GastroGoan</span></div>
    <div><div class="sig-line"></div>${ph('Fecha')}<br><span class="muted-s">Revisión en 90 días</span></div>
  </div>
`, { sec: 'Hoja de ruta' });

// ---------- CONTRAPORTADA ----------
page(`
  <div class="bk">
    <div class="bk-t">Este libro es tuyo.<br>Vuelve a él.</div>
    <div class="bk-s">Cada vez que dudes, la respuesta está en lo que ya decidiste que eres.</div>
  </div>
  <div class="bk-foot"><div class="bk-mark">GastroGoan</div><div class="eyebrow-l">Plan 360° · gastrogoan.com</div></div>
`, { dark: true, noChrome: true, cls: 'back' });

// ---------- CSS ----------
const css = `
@font-face{font-family:SG;src:url(${F}schibsted-grotesk-400-normal.woff2);font-weight:400}
@font-face{font-family:SG;src:url(${F}schibsted-grotesk-500-normal.woff2);font-weight:500}
@font-face{font-family:SG;src:url(${F}schibsted-grotesk-600-normal.woff2);font-weight:600}
@font-face{font-family:SG;src:url(${F}schibsted-grotesk-700-normal.woff2);font-weight:700 900}
@font-face{font-family:PM;src:url(${F}ibm-plex-mono-400-normal.woff2);font-weight:400}
@font-face{font-family:PM;src:url(${F}ibm-plex-mono-500-normal.woff2);font-weight:500 700}
@page{size:A4;margin:0}
*{box-sizing:border-box;margin:0;padding:0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
:root{--ink:#1C1A17;--ol:#4A5D4E;--ol2:#7E9B84;--cr:#F1EFE9;--pa:#FAF8F4;--bd:#E7E2D9;--mu:#716C65;--bo:#3D3A34;--rd:#8A4A3B}
body{font-family:SG,sans-serif;color:var(--ink);background:#888}
.pg{width:794px;height:1123px;position:relative;overflow:hidden;background:var(--pa);page-break-after:always}
.pg .in{position:absolute;inset:64px 56px 64px 56px}.coach{position:absolute;left:0;right:0;bottom:0;background:var(--cr);border-left:4px solid var(--ol);padding:16px 20px}.coach-l{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--ol);margin-bottom:8px;font-weight:500}.coach-t .ph{font-family:SG;font-size:13.5px;font-weight:500}
.dark{background:var(--ink);color:var(--pa)}
.run-top,.run-bot{position:absolute;left:56px;right:56px;display:flex;justify-content:space-between;font-family:PM;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:#9A948A}
.run-top{top:26px;padding-bottom:8px;border-bottom:1px solid var(--bd)}
.run-bot{bottom:24px}
.run-top .ph{font-size:8.5px;padding:0 3px}
.pn{color:var(--ink);font-weight:500}
.ph{display:inline;margin:0;color:var(--ol);font-family:PM;font-size:10.5px;color:var(--ol);background:rgba(74,93,78,.09);border-bottom:1px dashed var(--ol);padding:1px 5px;letter-spacing:0;text-transform:none;font-weight:400;font-style:normal;line-height:1.9;-webkit-box-decoration-break:clone;box-decoration-break:clone}
.dark .ph{color:#B9C8BC;background:rgba(185,200,188,.1);border-bottom-color:#7E9B84}
.phb{position:relative;border:1px dashed #A9B5AA;background:repeating-linear-gradient(to bottom,transparent 0,transparent 21px,rgba(74,93,78,.12) 21px,rgba(74,93,78,.12) 22px),rgba(74,93,78,.035);padding:10px 12px}
.phb-l{font-family:PM;font-size:9.5px;color:var(--ol);line-height:1.5;background:var(--pa);padding:0 4px;display:inline;box-decoration-break:clone}
.lab,.eyebrow-l{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--mu);font-weight:500;margin-bottom:6px}
.dark .eyebrow-l{color:#9DB0A2}
.h2{font-size:15px;font-weight:700;letter-spacing:-.01em;padding-bottom:7px;margin-bottom:11px;border-bottom:2px solid var(--ink);display:flex;gap:8px;align-items:baseline}
.h2n{font-family:PM;font-size:10px;color:var(--ol)}
.display{font-size:52px;font-weight:700;line-height:.98;letter-spacing:-.03em}
.lead{font-size:15px;line-height:1.55;color:var(--ink);margin-bottom:12px}
.body{font-size:12px;line-height:1.6;color:var(--bo)}
.big-p{font-size:14px;line-height:1.5;font-weight:500}
.muted-s{font-size:10px;color:var(--mu)}
.statement{font-size:30px;font-weight:700;line-height:1.2;letter-spacing:-.02em;margin-top:6px}
.statement .ph{font-family:SG;font-size:26px;font-weight:600;line-height:1.35}
.two{display:grid;grid-template-columns:1fr 1fr;gap:28px}
.three{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
.nl{display:flex;gap:10px;align-items:baseline;font-size:12px;padding:5px 0;border-bottom:1px solid var(--bd)}
.nl>span:first-child{font-family:PM;font-size:9.5px;color:var(--ol);font-weight:500;width:16px;flex:none}
.legend{font-family:PM;font-size:8.5px;color:var(--mu);margin-top:6px;letter-spacing:.02em}
/* ficha detallada */
.fh{margin-bottom:18px;padding-bottom:14px;border-bottom:2px solid var(--ink)}
.fh-t{font-size:30px;font-weight:700;letter-spacing:-.02em;line-height:1.05;margin-top:4px}
.fh-s{font-size:12px;color:var(--mu);margin-top:6px}
.fh-c{padding-bottom:8px;margin-bottom:14px}
.fs{margin-bottom:18px}
.fs-h{display:flex;align-items:center;gap:8px;font-size:13.5px;font-weight:700;padding:7px 10px;background:var(--cr);margin-bottom:10px}
.fs-h i{width:8px;height:8px;background:var(--ol);display:block}
.fs-h span{margin-left:auto;font-family:PM;font-size:9px;color:var(--mu);font-weight:400}
.fg{display:grid;grid-template-columns:1fr 1fr;gap:12px 24px}
.ff-l{font-family:PM;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;color:var(--bo);margin-bottom:6px;line-height:1.4}
.ff-v{height:20px;border-bottom:1px dashed #9FAE9F;background:linear-gradient(90deg,rgba(74,93,78,.05),transparent)}
.ff-n{display:flex;align-items:flex-end;gap:8px}.ff-nb{width:110px;height:32px;border:1px dashed #9FAE9F;background:rgba(74,93,78,.05);display:block}
.ff-n em{font-style:normal;font-family:PM;font-size:9px;color:var(--mu)}
.ff-li{display:flex;gap:8px;align-items:flex-end}.ff-li span{font-family:PM;font-size:9px;color:var(--ol)}.ff-li .ff-v{flex:1}
.sg{display:grid;grid-template-columns:1fr 1fr;gap:0 24px;margin-top:10px;border-top:1px solid var(--bd)}
.sn{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:7px 0;border-bottom:1px solid var(--bd);min-height:34px}
.sn-l{font-size:11px;line-height:1.3}
.sn-c{display:flex;gap:3px;flex:none}.sn-c i{font-style:normal;font-family:PM;font-size:8px;letter-spacing:.04em;border:1px solid #9FAE9F;color:var(--mu);padding:3px 5px}
.ck{margin-top:12px}
.ck-g{display:grid;gap:4px 14px;border:1px solid var(--bd);padding:10px 12px;background:#fff}
.ck-g div{display:flex;align-items:center;gap:7px;font-size:10.5px;line-height:1.25;min-height:22px}
.ck-g .cb{width:11px;height:11px}
.mm{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:52px 52px;border:1.5px solid var(--ink)}
.mm div{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:6px 8px;font-size:10px;background:#fff}
.mm div:nth-child(2n){border-right:none}.mm div:nth-child(n+3){border-bottom:none}
.mm .mm-s{background:var(--ol);color:#fff}.mm .mm-d{background:#F3ECE8;color:var(--rd)}
.survey{margin-top:18px;border:1px solid var(--ink);background:#fff;display:grid;grid-template-columns:150px 1fr 1fr 1fr}
.survey-l{background:var(--ink);color:#fff;font-family:PM;font-size:9px;letter-spacing:.14em;text-transform:uppercase;padding:12px;display:flex;align-items:center}
.survey>div:not(.survey-l){padding:10px 12px;border-left:1px solid var(--bd);font-size:11px}
.survey span{display:block;font-family:PM;font-size:9px;color:var(--ol);margin-bottom:4px}
/* cover */
.cover .in,.back .in,.opener .in{inset:0;padding:64px 64px}
.cv-rail{position:absolute;left:0;top:0;bottom:0;width:10px;background:var(--ol)}
.cv-title{font-size:104px;font-weight:700;line-height:.9;letter-spacing:-.045em;margin-top:150px}
.cv-rule{width:80px;height:4px;background:var(--ol);margin:40px 0 28px}
.cv-biz .ph{font-family:SG;font-size:26px;font-weight:600}
.cv-meta{margin-top:12px}
.cv-360{position:absolute;right:-30px;bottom:120px;font-size:250px;font-weight:700;letter-spacing:-.06em;color:transparent;-webkit-text-stroke:1.5px #3A382F;line-height:1}
.cv-foot{position:absolute;left:64px;right:64px;bottom:56px;display:flex;justify-content:space-between;align-items:flex-end;font-size:11px;color:#8B8579;line-height:1.5;border-top:1px solid #34312A;padding-top:16px}
.cv-ed{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase}
/* index */
.idx{border-left:1px solid var(--bd);padding-left:28px}
.idx-row{display:grid;grid-template-columns:30px 1fr 24px;gap:8px;padding:11px 0;border-bottom:1px solid var(--bd);align-items:baseline}
.idx-row>span:first-child{font-family:PM;font-size:11px;color:var(--ol);font-weight:500}
.idx-row>span:last-child{font-family:PM;font-size:10px;color:var(--mu);text-align:right}
.idx-row b{font-size:15px;font-weight:700;display:block}
.idx-row em{font-style:normal;font-size:11px;color:var(--mu)}
.idx-extra b,.idx-extra>span:nth-child(2){font-size:13px;font-weight:600}
.sign{display:flex;gap:14px;align-items:center;font-size:12px}
.sign-l{width:90px;border-bottom:1px solid var(--ink);height:30px}
/* summary */
.band{background:var(--ink);color:var(--pa);padding:20px 24px}
.band-l{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#9DB0A2;margin-bottom:8px}
.band-t .ph{font-family:SG;font-size:17px;font-weight:600;color:#DCE4DD;background:rgba(185,200,188,.12);border-bottom-color:#7E9B84}
.kpis{display:grid;grid-template-columns:repeat(4,1fr);border:1px solid var(--ink)}
.kpis.k3{grid-template-columns:repeat(3,1fr)}
.kpi{padding:14px 16px;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);background:#fff}
.kpis .kpi:nth-child(4n){border-right:none}
.k3 .kpi:nth-child(4n){border-right:1px solid var(--ink)}
.k3 .kpi:nth-child(3n){border-right:none}
.kpi-l{font-family:PM;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;color:var(--mu)}
.kpi-v{margin:10px 0 6px;font-size:30px;font-weight:700}
.kpi-v .ph{font-family:SG;font-size:26px;font-weight:700;padding:0 6px}
.kpi-v small{font-size:13px;color:var(--mu);margin-left:4px;font-weight:500}
.kpi-s{font-size:10px;color:var(--mu)}
.scores{border-top:1px solid var(--bd)}
.score{display:grid;grid-template-columns:26px 110px 90px 1fr;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd);font-size:12.5px}
.score-n{font-family:PM;font-size:10px;color:var(--ol)}
.score-t{font-weight:600}
.dots{display:flex;gap:5px}.dots i{width:10px;height:10px;border:1.5px solid var(--ol);border-radius:50%;display:block}
/* concepto */
.vtable{border:1px solid var(--ink)}
.vt-h,.vt-r{display:grid;grid-template-columns:36px 170px 1fr;align-items:center}
.vt-h{background:var(--ink);color:#fff;font-family:PM;font-size:8.5px;letter-spacing:.14em;text-transform:uppercase;padding:7px 0}
.vt-r{border-top:1px solid var(--bd);padding:9px 0;font-size:12px;background:#fff}
.vt-h span,.vt-r span{padding:0 10px}
.vt-r span:first-child{font-family:PM;font-size:10px;color:var(--ol)}
.puv{margin-top:26px;border-top:2px solid var(--ink);border-bottom:2px solid var(--ink);padding:18px 0}
.puv-l{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:var(--ol);margin-bottom:8px}
.puv-t{font-size:18px;font-weight:600;line-height:1.7}
.attrs{display:grid;grid-template-columns:repeat(5,1fr);border-top:1px solid var(--ink);border-left:1px solid var(--ink)}
.attr{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:12px 10px 16px;min-height:74px;background:#fff}
.attr span{display:block;font-family:PM;font-size:9px;color:var(--ol);margin-bottom:10px}
.scale{margin-top:4px}
.scale-bar{height:10px;background:linear-gradient(90deg,#DCE3DB,var(--ol));position:relative;margin-top:14px}
.scale-mark{position:absolute;top:-8px;width:4px;height:26px;background:var(--ink)}

.scale-lbl{display:flex;justify-content:space-between;font-family:PM;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);margin-top:6px}
.tbl{width:100%;border-collapse:collapse;font-size:11.5px;background:#fff}
.tbl th{background:var(--ink);color:#fff;font-family:PM;font-weight:500;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;text-align:left;padding:7px 9px}
.tbl td{border-bottom:1px solid var(--bd);padding:7px 9px;vertical-align:top}
.tbl.sm td{padding:5px 8px}
.tag{font-family:PM;font-size:8.5px;letter-spacing:.08em;text-transform:uppercase;border:1px solid var(--ink);padding:2px 6px}
.dafo{display:grid;grid-template-columns:1fr 1fr;border:2px solid var(--ink)}
.dq{padding:0;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);background:#fff}
.dq:nth-child(2n){border-right:none}.dq:nth-child(n+3){border-bottom:none}
.dq-h{display:flex;justify-content:space-between;align-items:baseline;padding:10px 14px;color:#fff}
.dq-h.ol{background:var(--ol)}.dq-h.rd{background:var(--rd)}
.dq-h b{font-size:14px}.dq-h span{font-family:PM;font-size:8px;letter-spacing:.12em;text-transform:uppercase;opacity:.8}
.dq-i{display:flex;gap:10px;align-items:baseline;padding:6px 14px;border-bottom:1px solid var(--bd);font-size:12px}.dq-i .ph{white-space:nowrap}
.dq-i span{font-family:PM;font-size:9.5px;color:var(--mu);width:10px}
.protect{background:var(--ol);color:#fff;padding:18px}
.protect-t .ph{color:#fff;background:rgba(255,255,255,.12);border-bottom-color:#fff;font-family:SG;font-size:14px;font-weight:600}
.vs{display:grid;grid-template-columns:1fr 40px 1fr;align-items:center}
.vs-arrow{text-align:center;font-size:26px;color:var(--ol)}
.diffs{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:12px}
.diffs div{border-top:2px solid var(--ol);padding-top:8px;font-size:11.5px}
.diffs span{display:block;font-family:PM;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mu);margin-bottom:4px}
.personas{display:grid;grid-template-columns:repeat(4,1fr);gap:10px}
.persona{border:1px solid var(--ink);padding:12px;background:#fff}
.p-av{width:34px;height:34px;background:var(--ink);color:#fff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:16px;margin-bottom:8px}
.p-n{margin-bottom:8px}
.p-row{font-size:11px;padding:4px 0;border-top:1px solid var(--bd)}
.p-row span{display:block;font-family:PM;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}
.journey{display:grid;grid-template-columns:repeat(5,1fr);position:relative}
.journey::before{content:'';position:absolute;top:13px;left:10%;right:10%;height:2px;background:var(--ink)}
.j-st{position:relative;padding:0 6px;text-align:center}
.j-dot{width:28px;height:28px;background:var(--ink);color:#fff;font-family:PM;font-size:11px;display:flex;align-items:center;justify-content:center;margin:0 auto 8px;position:relative}
.j-t{font-size:12.5px;font-weight:700;margin-bottom:8px}
.j-r{font-size:10.5px;text-align:left;padding:4px 0;border-top:1px solid var(--bd)}
.j-r span{display:block;font-family:PM;font-size:7.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--mu)}
.j-r.rd span{color:var(--rd)}.j-r.ol span{color:var(--ol)}
/* marca */
.year .ph{font-family:SG;font-size:48px;font-weight:700;padding:0 8px;line-height:1.3}
.adj3{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}
.adj3 div{border:1px solid var(--ink);padding:14px 8px;text-align:center;background:#fff}
.slogan{margin:26px 0;padding:28px 20px;background:var(--cr);border-top:2px solid var(--ink);border-bottom:2px solid var(--ink)}
.slogan-t{text-align:center;font-size:30px;font-weight:700;letter-spacing:-.02em}
.slogan-t .ph{font-family:SG;font-size:24px;font-weight:600}
.tone{display:flex;flex-wrap:wrap;gap:6px 10px;align-items:center;font-size:14px}
.tone i{color:var(--ol);font-style:normal}
.do{border:1px solid var(--ink);background:#fff}
.do-h{padding:8px 12px;color:#fff;font-family:PM;font-size:9px;letter-spacing:.14em;text-transform:uppercase}
.do-h.ol{background:var(--ol)}.do-h.rd{background:var(--rd)}
.do-i{padding:8px 12px;border-top:1px solid var(--bd);font-size:12px}
.logos{display:grid;grid-template-columns:1.4fr 1fr;gap:12px}
.logo-var{display:flex;flex-direction:column;gap:9px}
.swatches{display:grid;grid-template-columns:repeat(5,1fr);gap:10px}
.sw-c{height:88px;border:1px dashed #A9B5AA;background:repeating-linear-gradient(45deg,rgba(74,93,78,.07) 0 6px,transparent 6px 12px)}
.sw:first-child .sw-c{height:88px}
.sw-n{margin-top:8px}.sw-h{font-family:PM;font-size:10px;color:var(--mu);margin-top:2px}
.sw-u{font-family:PM;font-size:8px;letter-spacing:.14em;text-transform:uppercase;color:var(--ol);margin-top:4px}
.typo{display:flex;gap:16px;align-items:center;border:1px solid var(--ink);padding:14px 16px;background:#fff}
.typo-a{font-size:52px;font-weight:700;line-height:1;letter-spacing:-.03em}
.mood{display:grid;grid-template-columns:repeat(4,1fr);grid-template-rows:88px 88px;gap:8px}
.mood-c{border:1px dashed #A9B5AA;background:rgba(74,93,78,.05);display:flex;align-items:flex-end;padding:8px}
.mood-c span{font-family:PM;font-size:8.5px;letter-spacing:.12em;text-transform:uppercase;color:var(--ol)}
.mood-big{grid-row:span 2;grid-column:span 2}
/* cocina */
.star{display:grid;grid-template-columns:1fr 1fr;margin-top:22px;border:2px solid var(--ink)}
.star-img{background:repeating-linear-gradient(45deg,rgba(74,93,78,.08) 0 8px,transparent 8px 16px),var(--cr);display:flex;align-items:center;justify-content:center;min-height:200px}
.star-img span{font-family:PM;font-size:9px;letter-spacing:.14em;text-transform:uppercase;color:var(--ol)}
.star-b{background:var(--ink);color:#fff;padding:22px}
.star-t .ph{font-family:SG;font-size:22px;font-weight:700;color:#fff;background:rgba(255,255,255,.1);border-bottom-color:#9DB0A2}
.star-d{margin:12px 0}.star-d .ph,.star-r .ph{color:#C9D3C6;background:rgba(255,255,255,.08)}
.star-r{font-size:11px;border-top:1px solid #3A382F;padding-top:10px}
.star-r span{display:block;font-family:PM;font-size:8px;letter-spacing:.12em;text-transform:uppercase;color:#9DB0A2;margin-bottom:3px}
.infl{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--bd);font-size:12px}
.risk{display:flex;gap:3px}.risk i{width:14px;height:6px;border:1px solid var(--ol);display:block}
.split{display:flex;height:34px;margin-top:8px;font-size:11px;font-weight:600}
.split-a{background:var(--ink);color:#fff;display:flex;align-items:center;padding:0 10px}
.split-b{flex:1;background:var(--ol2);color:#fff;display:flex;align-items:center;padding:0 10px}
.split .ph{color:#fff;background:rgba(255,255,255,.14);border-bottom-color:#fff}
.timeline{position:relative;padding-top:4px}
.tl-axis{display:flex;justify-content:space-between;font-family:PM;font-size:8.5px;color:var(--mu);margin-left:110px;border-bottom:1px solid var(--ink);padding-bottom:4px}
.tl-row{position:relative;height:32px;border-bottom:1px solid var(--bd);display:flex;align-items:center}
.tl-l{width:110px;font-size:11px}
.tl-track{position:absolute;left:110px;right:0;top:9px;height:14px}.tl-bar{position:absolute;top:0;height:14px;background:var(--ol2)}
.tl-bar.main{background:var(--ol)}

.facts{margin-top:10px;border-top:1px solid var(--ink)}
.facts div{display:grid;grid-template-columns:130px 1fr;padding:6px 0;border-bottom:1px solid var(--bd);font-size:11.5px;align-items:baseline}
.facts span{font-family:PM;font-size:8.5px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}
.chk{display:flex;align-items:center;gap:9px;font-size:12px;padding:6px 0;border-bottom:1px solid var(--bd)}
.chk em{font-style:normal;font-family:PM;font-size:9px;color:var(--ol)}
.cb{width:13px;height:13px;border:1.5px solid var(--ink);flex:none;display:inline-block;background:#fff}
.me{display:grid;grid-template-columns:1fr 1fr;grid-template-rows:94px 94px;border:2px solid var(--ink);position:relative;margin-left:16px;margin-bottom:14px}
.me-q{border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);padding:10px;font-size:11px;background:#fff}
.me-q:nth-child(4),.me-q:nth-child(6){border-right:none}.me-q:nth-child(5),.me-q:nth-child(6){border-bottom:none}
.me-q b{display:block;font-size:13px;margin-bottom:6px}
.me-q.star-q{background:var(--ol);color:#fff}.me-q.star-q .ph{color:#fff;background:rgba(255,255,255,.14);border-bottom-color:#fff}
.me-q.dog{background:#F3ECE8}.me-q.dog b{color:var(--rd)}
.me-y{position:absolute;left:-18px;top:50%;transform:rotate(-90deg) translateX(-50%);transform-origin:left top;font-family:PM;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu);white-space:nowrap}
.me-x{position:absolute;bottom:-15px;right:0;font-family:PM;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}
/* sala */
.bar-r{display:grid;grid-template-columns:110px 1fr 56px;gap:10px;align-items:center;padding:6px 0;font-size:12px;border-bottom:1px solid var(--bd)}
.bar{height:10px;background:var(--cr)}.bar div{height:100%;background:var(--ol2)}
.bar-v{text-align:right}
.amb{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--ink)}
.amb-c{padding:16px;border-right:1px solid var(--ink);background:#fff}.amb-c:last-child{border-right:none}
.amb-g{font-size:28px;color:var(--ol);margin-bottom:6px;line-height:1}
.flow{display:flex;align-items:stretch;gap:6px}
.flow-s{flex:1;border:1px solid var(--ink);padding:12px;font-size:11px;background:#fff}
.flow-s span{display:block;font-family:PM;font-size:9px;color:var(--ol);margin-bottom:6px}
.flow-s b{display:block;font-size:12.5px;margin-bottom:6px}
.flow-a{display:flex;align-items:center;color:var(--ol)}
/* equipo */
.org{text-align:center}
.org-top{display:inline-block;background:var(--ink);padding:14px 28px}
.org-top .ph{color:#fff;background:rgba(255,255,255,.12);border-bottom-color:#9DB0A2}
.org-line{width:2px;height:22px;background:var(--ink);margin:0 auto}
.org-row{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;border-top:2px solid var(--ink);padding-top:14px}
.org-b{border:1px solid var(--ink);padding:14px;background:#fff;display:flex;flex-direction:column;gap:6px;align-items:center;font-size:12px}
.org-b b{font-size:14px}
.enps{background:var(--cr);padding:20px;border-top:3px solid var(--ol)}
.enps-v .ph{font-family:SG;font-size:56px;font-weight:700;padding:0 10px;line-height:1.2}
.enps-v small{font-size:18px;color:var(--mu)}
.diag{display:grid;grid-template-columns:1fr 64px 110px;gap:10px;align-items:center;padding:7px 0;border-bottom:1px solid var(--bd);font-size:12px}
.sem{display:inline-flex;gap:4px}.sem i{width:11px;height:11px;border-radius:50%;display:block;border:1.5px solid}
.sem .g{border-color:var(--ol)}.sem .a{border-color:#B08D3C}.sem .r{border-color:var(--rd)}
/* gestión */
.stack{display:flex;height:44px;font-size:11px;font-weight:600;color:#fff}
.stack div{display:flex;align-items:center;padding:0 10px;white-space:nowrap;overflow:hidden}
.stack .ph{color:#fff;background:rgba(255,255,255,.14);border-bottom-color:#fff}
.s1{background:var(--ink)}.s2{background:var(--ol)}.s3{background:var(--ol2)}.s4{background:#B08D3C}
.times{position:relative;display:flex;justify-content:space-between;border-top:2px solid var(--ink);margin:46px 20px 24px;height:40px}
.t-p{position:relative;text-align:center;width:0}
.t-p i{position:absolute;top:-8px;left:-7px;width:14px;height:14px;background:var(--ink);border-radius:50%}
.t-p span{position:absolute;top:12px;left:-40px;width:80px;font-size:11px;font-weight:600}
.t-seg{position:absolute;top:-30px}
.sys{display:grid;grid-template-columns:110px 1fr;padding:7px 0;border-bottom:1px solid var(--bd);font-size:12px;font-weight:600;align-items:baseline}
.alert{margin-top:12px;border-left:3px solid var(--rd);padding:8px 12px;background:#F7F0EC}
/* captación */
.goals{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}
.goal{border:1px solid var(--ink);padding:14px;background:#fff;font-size:11.5px}
.goal strong{display:block;font-family:PM;font-size:18px;color:var(--ol);margin-bottom:6px;font-weight:500}
.goal b{display:block;margin-bottom:8px}
.goal em{display:block;font-style:normal;font-family:PM;font-size:8px;letter-spacing:.1em;text-transform:uppercase;color:var(--mu)}
.rev{display:grid;grid-template-columns:repeat(3,1fr);border:1px solid var(--ink)}
.rev>div{padding:12px;text-align:center;border-right:1px solid var(--ink);background:#fff}.rev>div:last-child{border-right:none}
.rev-v .ph{font-family:SG;font-size:22px;font-weight:700}
/* tú */
.mantra{background:var(--ink);color:#fff;padding:36px 32px;margin:-4px 0 22px;position:relative}
.mantra::before{content:'“';position:absolute;right:24px;top:-10px;font-size:160px;color:#2E2C25;font-weight:700;line-height:1}
.mantra-t{position:relative;font-size:26px;font-weight:700;line-height:1.35}
.mantra-t .ph{font-family:SG;font-size:22px;font-weight:600;color:#DCE4DD;background:rgba(185,200,188,.1)}
.letter{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}.letter .lt{padding:9px 0}
.lt{padding:12px 0;border-bottom:1px solid var(--bd)}
.lt-h b{display:block;font-size:13px}.lt-h span{font-size:10.5px;color:var(--mu)}
.lt-a{margin-top:6px}
/* hoja de ruta */
.road{display:grid;grid-template-columns:repeat(3,1fr);gap:0;border:2px solid var(--ink)}
.road-c{padding:18px;border-right:1px solid var(--ink);background:#fff}.road-c:last-child{border-right:none}
.road-c:nth-child(1){background:var(--ink);color:#fff}.road-c:nth-child(1) .ph{color:#C9D3C6;background:rgba(255,255,255,.08)}
.road-c:nth-child(1) .cb{background:transparent;border-color:#C9D3C6}
.road-n{font-size:52px;font-weight:700;line-height:1;letter-spacing:-.03em}
.road-n small{font-size:12px;font-family:PM;letter-spacing:.14em;text-transform:uppercase;margin-left:6px;font-weight:400}
.road-t{font-size:13px;font-weight:600;margin:8px 0 12px;color:var(--ol)}
.road-c:nth-child(1) .road-t{color:#9DB0A2}
.road-i{display:flex;gap:8px;align-items:flex-start;font-size:11px;padding:6px 0;border-top:1px solid rgba(128,128,128,.25)}
.road-i .cb{margin-top:3px}
.prio{display:grid;grid-template-columns:36px 1fr 120px;align-items:center;padding:9px 0;border-bottom:1px solid var(--bd);font-size:13px}
.prio>b{font-size:22px;font-weight:700;color:var(--ol)}
.prio em{font-style:normal;text-align:right}
.sigs{position:absolute;left:0;right:0;bottom:0;display:grid;grid-template-columns:repeat(3,1fr);gap:28px;font-size:11.5px}
.sig-line{border-bottom:1px solid var(--ink);height:44px;margin-bottom:8px}
/* opener */
.op-num{position:absolute;right:-40px;top:40px;font-size:430px;font-weight:700;letter-spacing:-.07em;line-height:.85;color:transparent;-webkit-text-stroke:1.5px #3A382F}
.op-top{position:absolute;top:64px;left:64px}
.op-body{position:absolute;left:64px;right:64px;top:380px}
.op-title{font-size:84px;font-weight:700;letter-spacing:-.04em;line-height:.95}
.op-sub{font-size:18px;color:#B8B2A6;margin-top:14px}
.op-rule{width:64px;height:4px;background:var(--ol);margin:34px 0 26px}
.op-key-l{font-family:PM;font-size:9px;letter-spacing:.16em;text-transform:uppercase;color:#9DB0A2;margin-bottom:10px}
.op-key{max-width:560px}.op-key .ph{font-family:SG;font-size:19px;font-weight:600;line-height:1.55}
.op-list{position:absolute;left:64px;right:64px;bottom:64px;border-top:1px solid #34312A;padding-top:18px;display:grid;grid-template-columns:1fr 1fr;column-gap:32px}
.op-list .eyebrow-l{grid-column:1/-1}
.op-li{display:flex;gap:12px;font-size:13px;padding:6px 0;color:#DCD7CC}
.op-li span{font-family:PM;font-size:10px;color:var(--ol2)}
/* back */
.bk{position:absolute;left:64px;right:64px;top:420px}
.bk-t{font-size:56px;font-weight:700;line-height:1;letter-spacing:-.035em}
.bk-s{font-size:16px;color:#B8B2A6;margin-top:22px;max-width:440px;line-height:1.5}
.bk-foot{position:absolute;left:64px;right:64px;bottom:64px;display:flex;justify-content:space-between;align-items:baseline;border-top:1px solid #34312A;padding-top:18px}
.bk-mark{font-size:22px;font-weight:700;letter-spacing:-.02em}
`;

const pagesF = pages.map(x => x.replace(/%%P(\w+)%%/g, (_, k) => String(START[k]).padStart(2, '0')));
const html = `<!doctype html><html lang="es"><head><meta charset="utf-8"><title>Libro de marca — plantilla</title><style>${css}</style></head><body>${pagesF.join('')}</body></html>`;
fs.writeFileSync(`${OUT}/libro-marca-plantilla.html`, html);

const browser = await puppeteer.launch({ executablePath: '/opt/pw-browsers/chromium-1194/chrome-linux/chrome', args: ['--no-sandbox', '--allow-file-access-from-files'] });
const p = await browser.newPage();
await p.goto(`file://${OUT}/libro-marca-plantilla.html`, { waitUntil: 'networkidle0' });
await p.evaluateHandle('document.fonts.ready');
const over = await p.evaluate(() => [...document.querySelectorAll('.pg .in')].map((el, i) => {
  const f = el.querySelector('.flowc'); if(!f) return 0;
  const box = el.getBoundingClientRect();
  const kids = [...f.querySelectorAll('*')];
  const bottom = Math.max(...kids.map(k => k.getBoundingClientRect().bottom), 0);
  const c = el.querySelector('.coach');
  const limit = c ? c.getBoundingClientRect().top - 12 : box.bottom;
  return bottom > limit ? `${i + 1} (+${Math.round(bottom - limit)}px)` : 0;
}).filter(Boolean));
console.log('desbordadas:', over);
await p.pdf({ path: `${OUT}/Libro-de-marca-PLANTILLA.pdf`, preferCSSPageSize: true, printBackground: true });
console.log('total páginas:', pages.length);
await browser.close();
