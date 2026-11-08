export function assertStagingFrontend(mode, environment, admin = false) {
  if (mode !== 'staging') return;
  function check(value, api) {
    let url;
    try { url = new URL(value); } catch { throw new Error('STAGING_HTTPS_URL_REQUIRED'); }
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.hostname.includes('*') ||
      /^(localhost|.*\.localhost|.*\.local|[\d.]+|\[.*\])$/i.test(url.hostname) ||
      (api ? url.pathname.replace(/\/$/, '') !== '/api' : url.pathname !== '/')) {
      throw new Error('STAGING_HTTPS_URL_REQUIRED');
    }
  }
  check(environment.VITE_API_BASE_URL, true);
  check(environment.VITE_APP_ORIGIN, false);
  if (admin) check(environment.VITE_PUBLIC_MUSEUM_URL, false);
  if (Object.keys(environment).some(key => /^(VITE_|EXPO_PUBLIC_)/.test(key) && /SECRET|TOKEN|PASSWORD|PRIVATE|MONGO|API_KEY/i.test(key))) {
    throw new Error('STAGING_PUBLIC_SECRET_VARIABLE_DENIED');
  }
}

// React Router embeds a bare localhost URL as an inert URL-parsing base.
// Replace only that exact bare literal in staging output, never local endpoint
// prefixes (which must fail the artifact scan), and do not edit node_modules.
export function stagingRoutingBase(mode, environment) {
  return {
    name: 'staging-public-routing-base',
    renderChunk(code) {
      if (mode !== 'staging') return null;
      const origin = new URL(environment.VITE_APP_ORIGIN).origin;
      return { code: code.replace(/http:\/\/localhost(?=["'\x60])/g, origin), map: null };
    },
  };
}
