// Frase del día en la pantalla de acceso: una distinta cada día del año.
// Las que llevan autor (a) están comprobadas en Wikiquote con su fuente (f); las que no, son
// frases de oficio escritas para GastroGoan, sin firma a propósito: nunca un nombre sin comprobar.
const FRASES_DIA = [];
function fraseDelDia(fecha){
  if(!FRASES_DIA.length) return null;
  const d = fecha || new Date();
  const inicio = new Date(d.getFullYear(), 0, 0);
  const dia = Math.floor((d - inicio) / 86400000);   // 1..366
  return FRASES_DIA[(dia - 1) % FRASES_DIA.length];
}
