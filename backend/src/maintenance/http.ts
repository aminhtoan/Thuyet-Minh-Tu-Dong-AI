import type { RequestHandler } from 'express';
import { drainRuntime } from './runtime.js';
import { randomUUID } from 'node:crypto';

export const businessAdmission: RequestHandler = (req, res, next) => {
  if (req.method === 'GET' && /^\/api\/health\/?(?:\?|$)/.test(req.originalUrl)) { next(); return; }
  if (drainRuntime.admissionClosed) {
    res.setHeader('Retry-After', '30');
    res.status(503).json({ success: false, error: { code: 'MAINTENANCE_ACTIVE', message: 'Hệ thống đang bảo trì. Vui lòng thử lại sau.' } }); return;
  }
  const leave = drainRuntime.enterRequest();
  res.once('finish', leave); res.once('close', leave);
  next();
};

// Count returned async route promises until they settle, including after a
// client disconnect. Do not monkeypatch response methods or cancel operations.
type Layer = { handle: ((...args: unknown[]) => unknown) & { stack?: Layer[] }; route?: { stack: Layer[] } };
const seen = new WeakSet<object>();
export function instrumentRouter(router: unknown) {
  function visit(stack: Layer[]) { for (const layer of stack) {
    if (layer.route) { visit(layer.route.stack); continue; }
    if (layer.handle.stack) { visit(layer.handle.stack); continue; }
    const original = layer.handle;
    if (seen.has(layer) || original.length === 4) continue;
    seen.add(layer);
    layer.handle = function (this: unknown, ...args: unknown[]) {
      return drainRuntime.track('activeOperations', () => Reflect.apply(original, this, args));
    };
  } }
  visit((router as { stack: Layer[] }).stack);
  const initial: Layer[]=[];
  function collect(stack: Layer[]) { for(const layer of stack){initial.push(layer);if(layer.route)collect(layer.route.stack);else if(layer.handle.stack)collect(layer.handle.stack);} }
  collect((router as {stack:Layer[]}).stack);
  const handles=initial.map(layer=>layer.handle);
  drainRuntime.observe('router-'+randomUUID(),()=>{
    const current: Layer[]=[];
    function walk(stack:Layer[]){for(const layer of stack){current.push(layer);if(layer.route)walk(layer.route.stack);else if(layer.handle.stack)walk(layer.handle.stack);}}
    walk((router as {stack:Layer[]}).stack);
    if(current.length!==initial.length||current.some((layer,i)=>layer!==initial[i]||layer.handle!==handles[i]))throw Error('UNINSTRUMENTED_ROUTER_CHANGE');
    return {liveDrafts:0,pending:0};
  });
}
