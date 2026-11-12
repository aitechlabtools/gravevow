// Bombas (bloque 2, fase 6): compara la supervivencia sin bombas y con dos. Uso: node scripts/simular-bombas.mjs [partidas=200]
// Escribe docs/equilibrio/simulador-bombas.md.
import { createServer } from 'vite';
import fs from 'node:fs';
const runs = Number(process.argv[2] ?? 200);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await server.ssrLoadModule('/tools/simulador/bombas.ts');
  const md = m.bombReport(runs);
  fs.writeFileSync('docs/equilibrio/simulador-bombas.md', md);
  console.log(md);
} finally { await server.close(); }
