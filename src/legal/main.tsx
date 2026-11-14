// Entrada de las páginas legales: aviso-legal.html, privacidad.html y cookies.html.
// Cada HTML indica su página con <body data-page="…">.
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '../landing/landing.css';
import { LegalPage } from './LegalPage';
import { AVISO, COOKIES, PRIVACIDAD, UPDATED } from './texts';
import { initConsent } from '../shared/consent';

initConsent();

const PAGES = { aviso: AVISO, privacidad: PRIVACIDAD, cookies: COOKIES };
const page = PAGES[(document.body.dataset.page ?? 'aviso') as keyof typeof PAGES] ?? AVISO;

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <LegalPage title={page.title} intro={page.intro} updated={UPDATED} sections={page.sections} />
  </StrictMode>,
);
