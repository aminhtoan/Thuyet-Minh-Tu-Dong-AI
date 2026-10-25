const { getDefaultConfig } = require('expo/metro-config');
const http = require('http');

const config = getDefaultConfig(__dirname);

const previousEnhanceMiddleware = config.server?.enhanceMiddleware;

config.server = {
  ...config.server,
  enhanceMiddleware: (metroMiddleware, server) => {
    const enhanced = previousEnhanceMiddleware
      ? previousEnhanceMiddleware(metroMiddleware, server)
      : metroMiddleware;

    return (req, res, next) => {
      // Proxy /api requests to backend (port 8080)
      if (req.url && (req.url.startsWith('/api/') || req.url === '/api')) {
        const options = {
          hostname: '127.0.0.1',
          port: 8080,
          path: req.url,
          method: req.method,
          headers: {
            ...req.headers,
            host: '127.0.0.1:8080',
          },
        };

        const proxyReq = http.request(options, (proxyRes) => {
          res.writeHead(proxyRes.statusCode, proxyRes.headers);
          proxyRes.pipe(res, { end: true });
        });

        proxyReq.on('error', (err) => {
          res.writeHead(502, { 'Content-Type': 'application/json' });
          res.end(
            JSON.stringify({
              success: false,
              error: { code: 'BACKEND_UNAVAILABLE', message: 'Không thể kết nối máy chủ backend (8080).' },
            })
          );
        });

        req.pipe(proxyReq, { end: true });
        return;
      }

      return enhanced(req, res, next);
    };
  },
};

module.exports = config;
