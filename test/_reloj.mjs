// Precarga para correr la batería con OTRA fecha/hora, sin tocar ninguna prueba:
//   GG_FECHA=2026-11-15T23:30 NODE_OPTIONS="--import /ruta/al/repo/test/_reloj.mjs" bash test/todo.sh
// Las pruebas de navegador lanzan Chromium con puppeteer.launch(); aquí se envuelve ese lanzamiento para que CADA página nueva
// arranque con `Date` desplazado (new Date(), Date.now()). Sirve para cazar pruebas que solo pasan a ciertas horas o días de la semana
// (pasó con «Mi puesto» y el Panel un lunes, y con el calendario de reservas por la noche).
import puppeteer from 'puppeteer-core';
const objetivo = process.env.GG_FECHA ? new Date(process.env.GG_FECHA).getTime() : null;
if(objetivo && !Number.isNaN(objetivo)){
  const desfase = objetivo - Date.now();
  const script = `(() => { const off = ${desfase}; const R = Date; function F(...a){ if(!(new.target)) return new R(R.now() + off).toString(); if(a.length === 0) return new R(R.now() + off); return new R(...a); } F.prototype = R.prototype; F.now = () => R.now() + off; F.UTC = R.UTC; F.parse = R.parse; window.Date = F; })();`;
  const lanzar = puppeteer.launch.bind(puppeteer);
  puppeteer.launch = async (...args) => {
    const b = await lanzar(...args);
    const nueva = b.newPage.bind(b);
    b.newPage = async (...a) => { const p = await nueva(...a); await p.evaluateOnNewDocument(script); return p; };
    return b;
  };
}
