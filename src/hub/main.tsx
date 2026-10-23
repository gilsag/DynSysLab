import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@shared/lab-theme.css';
import './hub.css';
import Hub from './Hub';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Hub />
  </StrictMode>,
);
