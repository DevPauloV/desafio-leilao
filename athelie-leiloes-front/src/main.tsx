import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import './index.css';
import App from './App.tsx';
import { loadSession } from './lib/auth';
import { socket } from './lib/socket';

void loadSession();
socket.connect();
// Aba oculta não segura conexão (cota de memória da Vercel, ADR 0005); ao voltar, sala e carteira se ressincronizam no `connect`.
document.addEventListener('visibilitychange', () => {
  if (document.hidden) socket.disconnect();
  else socket.connect();
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
