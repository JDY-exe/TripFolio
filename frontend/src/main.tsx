import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import '@fontsource-variable/google-sans-flex/full.css';
import '@fontsource/figtree/400.css';
import '@fontsource/figtree/500.css';
import './index.css';
import App from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
