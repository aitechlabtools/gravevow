import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './landing.css';
import { initConsent } from '../shared/consent';

initConsent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
