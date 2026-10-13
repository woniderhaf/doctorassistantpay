import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './App';
import { appStore } from './store/appStoreSingleton';
import './styles/app.css';

async function bootstrap(): Promise<void> {
  // запрашиваем персистентность хранилища (Safari ITP, не-standalone вкладки)
  void navigator.storage?.persist?.();
  await appStore.getState().init();

  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </StrictMode>
  );
}

void bootstrap();
