// Simulador de combate (Fase 10). Carga tools/simulador con Vite (TypeScript y los datos reales del juego) y escribe tablas.
// Uso: node scripts/simular.mjs [partidas=300] [escenario=actual]
// Escribe docs/equilibrio/simulador-<escenario>.md. Los ajustes de un escenario van en tools/simulador/escenarios.ts.
import { createServer } from 'vite';
import fs from 'node:fs';
const runs = Number(process.argv[2] ?? 300);
const name = process.argv[3] ?? 'actual';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await server.ssrLoadModule('/tools/simulador/report.ts');
  const md = await m.report(runs, name);
  fs.mkdirSync('docs/equilibrio', { recursive: true });
  fs.writeFileSync(`docs/equilibrio/simulador-${name}.md`, md);
  console.log(md);
} finally { await server.close(); }
