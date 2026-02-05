import crypto from 'node:crypto';
import Fastify from 'fastify';
import cors from '@fastify/cors';
import cookie from '@fastify/cookie';
import helmet from '@fastify/helmet';
import sensible from '@fastify/sensible';
import multipart from '@fastify/multipart';
import rateLimit from '@fastify/rate-limit';
import authPlugin from './plugins/auth.js';
import { config } from './utils/config.js';
import { authRoutes } from './routes/auth.js';
import { libraryRoutes } from './routes/library.js';
import { playlistRoutes } from './routes/playlists.js';
import { searchRoutes } from './routes/search.js';
import { streamRoutes } from './routes/stream.js';
import { adminRoutes } from './routes/admin.js';
import { discoverRoutes } from './routes/discover.js';
import { userRoutes } from './routes/users.js';

export async function buildApp() {
  const app = Fastify({
    logger: { level: 'info' },
    trustProxy: Number(config.TRUST_PROXY),
    genReqId: () => crypto.randomUUID(),
  });

  await app.register(sensible);
  await app.register(cors, { origin: config.CORS_ORIGIN, credentials: true });
  await app.register(cookie);
  await app.register(helmet);
  await app.register(multipart, { limits: { fileSize: 200 * 1024 * 1024 } });
  await app.register(rateLimit, { global: true, max: 200, timeWindow: '1 minute' });
  await app.register(authPlugin);

  app.get('/api/health', async () => ({ status: 'ok' }));

  await app.register(authRoutes, { prefix: '/api' });
  await app.register(libraryRoutes, { prefix: '/api' });
  await app.register(playlistRoutes, { prefix: '/api' });
  await app.register(searchRoutes, { prefix: '/api' });
  await app.register(streamRoutes, { prefix: '/api' });
  await app.register(adminRoutes, { prefix: '/api' });
  await app.register(discoverRoutes, { prefix: '/api' });
  await app.register(userRoutes, { prefix: '/api' });

  app.setErrorHandler((error, req, reply) => {
    req.log.error({ err: error, reqId: req.id }, 'request failed');
    reply.status((error as any).statusCode || 500).send({ error: error.message });
  });

  return app;
}

if (process.env.NODE_ENV !== 'test') {
  const app = await buildApp();
  app.listen({ port: config.PORT, host: config.HOST });
}
