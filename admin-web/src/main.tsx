import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { AdminRouter } from './routes/AdminRouter';
import './styles/global.css';
createRoot(document.getElementById('root')!).render(<StrictMode><AdminRouter /></StrictMode>);
