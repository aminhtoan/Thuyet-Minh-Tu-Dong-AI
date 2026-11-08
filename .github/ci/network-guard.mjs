// Test-only preload. This is defense in depth, not an OS/container firewall.
// No application entry point imports this file. Never attach it to npm ci/build.
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import { syncBuiltinESMExports } from 'node:module';
import { tmpdir, userInfo } from 'node:os';
import { join } from 'node:path';

if (process.env.CI_NETWORK_GUARD !== '1') throw new Error('CI_NETWORK_GUARD_REQUIRED');

const ports = new Set();
let denials = 0;
const reasons = new Map();
const loopback = host => ['127.0.0.1', '::1', 'localhost', '[::1]'].includes(host);
function deny(reason = 'NETWORK') {
  denials++;
  reasons.set(reason, (reasons.get(reason) ?? 0) + 1);
  // Do not include URLs, hosts, headers, request bodies or environment values.
  throw new Error('CI_NETWORK_DENIED');
}
function allowed(options) {
  return options && !options.path && loopback(options.host ?? options.hostname ?? 'localhost') && ports.has(Number(options.port));
}

const listen = net.Server.prototype.listen;
net.Server.prototype.listen = function (...args) {
  const options = typeof args[0] === 'object' ? args[0] : { port: args[0], host: args[1] };
  if (!options || options.path || !Number.isInteger(options.port) || options.port < 0 || options.port > 65535 || (options.host != null && !loopback(options.host))) return deny(typeof args[0] === 'string' || options?.path ? 'IPC_LISTEN' : 'LISTEN');
  // Vite's middleware-mode tests also open a local WebSocket fixture. Keep
  // implicit hosts on loopback, and permit connections only after THIS process
  // owns the listening port. Existing local services remain inaccessible.
  if (typeof args[0] === 'object') args[0] = { ...options, host: options.host ?? '127.0.0.1' };
  else args[1] = options.host ?? '127.0.0.1';
  let port;
  this.once('listening', () => {
    const address = this.address();
    if (!address || typeof address === 'string' || !loopback(address.address)) return deny();
    port = address.port; ports.add(port);
  });
  this.once('close', () => ports.delete(port));
  return listen.apply(this, args);
};

const connect = net.Socket.prototype.connect;
const tsxDirectory = join(tmpdir(), `tsx-${process.geteuid ? process.geteuid() : userInfo().username}`).replaceAll('\\', '/');
function refuseTsxCache(path) {
  if (typeof path !== 'string') return false;
  const normalized = path.replaceAll('\\', '/').replace(/^\/\/[?.]\/pipe\//, '');
  if (!normalized.startsWith(`${tsxDirectory}/`) || !/^\d+\.pipe$/.test(normalized.slice(tsxDirectory.length + 1))) return false;
  // tsx optionally probes its local cache-coordination pipe. Keep it offline:
  // report an absent pipe without opening it, rather than counting it as TCP.
  const error = new Error('CI_TSX_CACHE_IPC_DISABLED'); error.code = 'ENOENT'; throw error;
}
net.Socket.prototype.connect = function (...args) {
  const first = Array.isArray(args[0]) ? args[0][0] : args[0];
  const options = first && typeof first === 'object' ? first : typeof first === 'string' ? { path: first } : { port: first, host: typeof args[1] === 'string' ? args[1] : 'localhost' };
  if (options.path) refuseTsxCache(options.path);
  if (!allowed(options)) return deny(options.path ? 'IPC_CONNECT' : 'TCP');
  return connect.apply(this, args);
};
tls.connect = deny;
tls.TLSSocket.prototype.connect = deny;
dgram.createSocket = deny;
dgram.Socket.prototype.send = deny;

// Prevent MongoDB SRV discovery and direct DNS requests before any socket opens.
const resolverMethods = ['resolve', 'resolve4', 'resolve6', 'resolveAny', 'resolveCaa', 'resolveCname', 'resolveMx', 'resolveNaptr', 'resolveNs', 'resolvePtr', 'resolveSoa', 'resolveSrv', 'resolveTxt', 'reverse', 'lookupService'];
for (const name of resolverMethods) {
  if (typeof dns[name] === 'function') dns[name] = deny;
  if (typeof dns.promises[name] === 'function') dns.promises[name] = async () => deny();
  if (typeof dns.Resolver.prototype[name] === 'function') dns.Resolver.prototype[name] = deny;
  if (typeof dns.promises.Resolver.prototype[name] === 'function') dns.promises.Resolver.prototype[name] = async () => deny();
}
function localAddress(host, options) {
  if (!loopback(host)) return deny();
  const family = options === 6 || options?.family === 6 || host === '::1' ? 6 : 4;
  const result = { address: family === 6 ? '::1' : '127.0.0.1', family };
  return options?.all ? [result] : result;
}
dns.lookup = (host, options, callback) => {
  if (typeof options === 'function') { callback = options; options = {}; }
  const result = localAddress(host, options);
  queueMicrotask(() => Array.isArray(result) ? callback(null, result) : callback(null, result.address, result.family));
};
dns.promises.lookup = async (host, options) => localAddress(host, options);

const fetch = globalThis.fetch;
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === 'string' || input instanceof URL ? input : input.url);
  if (url.protocol !== 'http:' || !allowed({ host: url.hostname, port: url.port || 80 })) return deny();
  return fetch(input, init);
};
syncBuiltinESMExports();

// A caught accidental network attempt must not produce a green CI run.
process.on('beforeExit', () => {
  if (denials && process.env.CI_GUARD_SELF_TEST !== '1') {
    console.error('CI_NETWORK_GUARD_RECORDED_DENIAL', Object.fromEntries(reasons));
    process.exitCode = 1;
  }
});
