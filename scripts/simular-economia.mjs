// Economía del crafteo (bloque 2, fase 7). Uso: node scripts/simular-economia.mjs. Escribe docs/equilibrio/simulador-economia.md.
import { createServer } from 'vite';
import fs from 'node:fs';
const server = await createServer({ server: { middlewareMode: true }, appType: 'custom', logLevel: 'error' });
try {
  const m = await server.ssrLoadModule('/tools/simulador/economia.ts');
  const md = m.economyReport();
  fs.writeFileSync('docs/equilibrio/simulador-economia.md', md);
  console.log(md);
} finally { await server.close(); }
