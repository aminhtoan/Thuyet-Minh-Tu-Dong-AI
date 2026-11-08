import assert from 'node:assert/strict';
import http from 'node:http';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import dgram from 'node:dgram';
import { spawnSync } from 'node:child_process';

process.env.CI_NETWORK_GUARD = '1';
process.env.CI_GUARD_SELF_TEST = '1';
await import('./network-guard.mjs');
assert.throws(() => net.connect({ host: 'atlas.example.invalid', port: 27017 }), /CI_NETWORK_DENIED/);
assert.throws(() => net.connect({ host: '127.0.0.1', port: 8080 }), /CI_NETWORK_DENIED/);
assert.throws(() => net.connect({ path: 'unapproved-local-ipc' }), /CI_NETWORK_DENIED/);
assert.throws(() => tls.connect({ host: 'generativelanguage.googleapis.com', port: 443 }), /CI_NETWORK_DENIED/);
assert.throws(() => dns.resolveSrv('_mongodb._tcp.example.invalid', () => {}), /CI_NETWORK_DENIED/);
await assert.rejects(dns.promises.resolveSrv('_mongodb._tcp.example.invalid'), /CI_NETWORK_DENIED/);
assert.throws(() => dgram.createSocket('udp4'), /CI_NETWORK_DENIED/);
await assert.rejects(fetch('https://generativelanguage.googleapis.com/'), /CI_NETWORK_DENIED/);
assert.throws(() => http.createServer().listen(0, '0.0.0.0'), /CI_NETWORK_DENIED/);
const server = http.createServer((_req, res) => res.end('fixture-only'));
server.listen(0, '127.0.0.1');
await new Promise(resolve => server.once('listening', resolve));
const url = `http://127.0.0.1:${server.address().port}`;
try { assert.equal(await (await fetch(url)).text(), 'fixture-only'); }
finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
await assert.rejects(fetch(url), /CI_NETWORK_DENIED/);
const env = { ...process.env }; delete env.CI_GUARD_SELF_TEST;
const guard = new URL('./network-guard.mjs', import.meta.url).href;
const child = spawnSync(process.execPath, ['--import', guard, '--input-type=module', '-e',
  "import net from 'node:net'; try { net.connect({host:'127.0.0.1',port:8080}); } catch {}"], { env, encoding: 'utf8', timeout: 10000, windowsHide: true });
assert.equal(child.status, 1, 'caught denials still fail the test process');
assert.match(child.stderr, /CI_NETWORK_GUARD_RECORDED_DENIAL/);
console.log('PASS: external TCP/TLS/DNS/UDP, existing local services, non-loopback listeners and closed fixtures denied; owned HTTP fixture allowed; caught denial fails CI.');
