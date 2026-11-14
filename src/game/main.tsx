import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './ui/App';
import './game.css';
import { watchPointerType } from '../shared/device';
import { initConsent } from '../shared/consent';

watchPointerType();
initConsent();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
