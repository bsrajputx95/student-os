import { resolve } from 'node:path';
import { aiConfigured } from './ai-provider.mjs';
export function loadConfig(root, env = process.env) {
  const production = env.NODE_ENV === 'production';
  const serverless = env.STUDENTOS_SERVERLESS === '1';
  const presentation = production && env.STUDENTOS_PRESENTATION === '1';
  let origin = env.APP_ORIGIN || (serverless && env.VERCEL_PROJECT_PRODUCTION_URL ? 'https://' + env.VERCEL_PROJECT_PRODUCTION_URL : 'http://127.0.0.1:5080');
  const url = new URL(origin);
  if (!['http:', 'https:'].includes(url.protocol) || url.pathname !== '/' || url.search || url.hash || url.username || url.password) throw new Error('APP_ORIGIN must be a full website origin without a path.');
  origin = url.origin;
  if (production && (!env.APP_ORIGIN || url.protocol !== 'https:')) throw new Error('Production requires an HTTPS APP_ORIGIN.');
  if (production && env.STUDENTOS_SEED_HKBK === '1') throw new Error('Sample campus seeding is disabled in production. Use a separate development database.');
  return {
    production,
    serverless,
    presentation,
    collegeId: env.COLLEGE_ID || 'hkbk-college-of-engineering',
    collegeName: env.COLLEGE_NAME || 'HKBK College of Engineering',
    origin,
    host: env.HOST || '127.0.0.1',
    port: Number(env.PORT) || 5080,
    dataDir: resolve(root, env.STUDENTOS_DATA_DIR || 'data'),
    allowedOrigins: new Set(production ? [origin, ...(serverless ? [env.VERCEL_URL, env.VERCEL_BRANCH_URL].filter(host => host && /^[a-z0-9.-]+\.vercel\.app$/i.test(host)).map(host => 'https://' + host) : [])] : [origin, 'http://localhost:5180', 'http://127.0.0.1:5180', 'http://localhost:5080', 'http://127.0.0.1:5080']),
    trustProxy: env.TRUST_PROXY === '1',
    aiConfigured: aiConfigured(env),
    mailConfigured: Boolean(env.MAIL_WEBHOOK_URL && env.MAIL_WEBHOOK_TOKEN && env.MAIL_FROM)
  };
}
export function requestAddress(req, config) {
  const remote = req.socket.remoteAddress || 'unknown';
  if (config.trustProxy && ['127.0.0.1', '::1', '::ffff:127.0.0.1'].includes(remote)) return String(req.headers['x-forwarded-for'] || remote).split(',')[0].trim().slice(0, 100);
  return remote;
}
export function securityHeaders(config) {
  return {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy': `default-src 'self'; script-src 'self'${config.production ? '' : " 'unsafe-inline'"}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; font-src 'self' data:; connect-src 'self'${config.production ? '' : ' ws: wss:'}; worker-src 'self' blob:; frame-src 'self' https://www.youtube-nocookie.com; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'`,
    ...(config.production ? {
      'Strict-Transport-Security': 'max-age=31536000; includeSubDomains'
    } : {})
  };
}
