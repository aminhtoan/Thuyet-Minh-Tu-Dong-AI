export function validateLocalBackend(env) {
  let uri;
  try { uri = new URL(env.MONGODB_URI); } catch { throw new Error('Invalid Local Demo configuration.'); }
  if (uri.protocol !== 'mongodb:' || uri.hostname !== '127.0.0.1' || uri.port !== '27018' || uri.pathname !== '/multilingual_ai_narration_ui_demo' || uri.username !== 'demo-app' || !uri.password || uri.searchParams.get('authSource') !== 'multilingual_ai_narration_ui_demo' || [...uri.searchParams.keys()].some(key => key !== 'authSource') || env.PORT !== '8081' || env.NODE_ENV !== 'development' || env.CORS_ORIGINS !== 'http://localhost:5175' || env.UPLOAD_DIR !== 'uploads-local-demo' || env.OPENAI_API_KEY || !env.JWT_ACCESS_SECRET || !env.JWT_REFRESH_SECRET || env.JWT_ACCESS_SECRET === env.JWT_REFRESH_SECRET || env.MONGODB_URI.includes('<') || env.JWT_ACCESS_SECRET.includes('<') || env.JWT_REFRESH_SECRET.includes('<')) {
    throw new Error('Refusing non-local, incomplete or unsafe Demo configuration.');
  }
}
