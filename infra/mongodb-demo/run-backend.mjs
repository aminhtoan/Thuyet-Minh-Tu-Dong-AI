import { validateLocalBackend } from './backend-guard.mjs';
validateLocalBackend(process.env);
await import('../../backend/dist/server.js');
