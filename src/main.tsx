import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import { App } from './App';
import { SiteConfigProvider } from './hooks/useSiteConfig';
import './styles/tokens.css';
import './styles/base.css';
import './styles/chat.css';
import './styles/admin.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* basename: the same build also runs under a sub-path, e.g. when built with --base /something/ */}
    <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '')}>
      <SiteConfigProvider>
        <App />
      </SiteConfigProvider>
    </BrowserRouter>
  </StrictMode>,
);
