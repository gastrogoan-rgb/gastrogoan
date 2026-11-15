// El Worker de pagos (worker/pagos-worker.js) corriendo en Node, sin tocarlo.
// Un Worker es un `fetch(Request, env)` estandar; Node 18+ ya trae Request,
// Response, fetch y crypto.subtle, asi que basta este adaptador. Las claves
// vienen del entorno (pagos.env), igual que las «Variables and Secrets» de
// Cloudflare: FIREBASE_DB_URL, FIREBASE_DB_SECRET, STRIPE_SECRET_KEY y
// STRIPE_WEBHOOK_SECRET.
import http from 'node:http';

const FICHERO = process.env.WORKER_FILE || './pagos-worker.js';
const PUERTO = Number(process.env.PORT || 8787);
const TOPE_CUERPO = 1_000_000; // 1 MB: ningun aviso de Stripe ni de la app se acerca

const { default: worker } = await import(FICHERO);
const env = { ...process.env };

export const servidor = http.createServer(async (rq, rs) => {
  try {
    const trozos = []; let total = 0;
    for await (const t of rq){
      total += t.length;
      if(total > TOPE_CUERPO){ rs.writeHead(413).end(); return; }
      trozos.push(t);
    }
    const cuerpo = Buffer.concat(trozos);
    const url = new URL(rq.url, 'http://localhost');
    const cabeceras = new Headers();
    for(const [k, v] of Object.entries(rq.headers)) if(typeof v === 'string') cabeceras.set(k, v);
    const peticion = new Request(url, {
      method: rq.method,
      headers: cabeceras,
      body: (rq.method === 'GET' || rq.method === 'HEAD') ? undefined : cuerpo,
    });
    const r = await worker.fetch(peticion, env);
    const salida = {};
    r.headers.forEach((v, k) => { salida[k] = v; });
    rs.writeHead(r.status, salida);
    rs.end(Buffer.from(await r.arrayBuffer()));
  } catch(e){
    rs.writeHead(500, { 'content-type': 'application/json' });
    rs.end(JSON.stringify({ error: 'Error interno' }));
  }
});

if(process.argv[1] && import.meta.url === new URL('file://' + process.argv[1]).href){
  servidor.listen(PUERTO, () => console.log('Pagos escuchando en ' + PUERTO));
}
