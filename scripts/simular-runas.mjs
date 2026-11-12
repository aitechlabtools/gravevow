// Runas (bloque 2, parte 2.1): compara la supervivencia con y sin runas. Uso: node scripts/simular-runas.mjs [partidas=200]
// Escribe docs/equilibrio/simulador-runas.md.
import { createServer } from 'vite';
import fs from 'node:fs';
const runs = Number(process.argv[2] ?? 200);
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await server.ssrLoadModule('/tools/simulador/runas.ts');
  const md = m.runeReport(runs);
  fs.writeFileSync('docs/equilibrio/simulador-runas.md', md);
  console.log(md);
} finally { await server.close(); }
