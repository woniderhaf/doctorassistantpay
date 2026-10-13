import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { appStore } from './store/appStoreSingleton';
import './styles/app.css';

/** '/' локально и на хосте в корне; '/<repo>' на GitHub Pages (base из vite). */
function routerBasename(): string {
  const base = import.meta.env.BASE_URL;
  return base.length > 1 ? base.replace(/\/+$/, '') : '/';
}

async function bootstrap(): Promise<void> {
  // запрашиваем персистентность хранилища (Safari ITP, не-standalone вкладки)
  void navigator.storage?.persist?.();
  await appStore.getState().init();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter basename={routerBasename()}>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

void bootstrap();
