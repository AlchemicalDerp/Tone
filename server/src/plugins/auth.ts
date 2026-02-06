import fp from 'fastify-plugin';
import crypto from 'node:crypto';
import argon2 from 'argon2';
import { FastifyRequest } from 'fastify';
import { prisma } from '../lib/prisma.js';
import { config } from '../utils/config.js';

const SESSION_COOKIE = 'tone_session';
const CSRF_COOKIE = 'tone_csrf';

export async function requireAuth(req: FastifyRequest) {
  if (!req.user) throw req.server.httpErrors.unauthorized('Unauthorized');
}

export async function requireAdmin(req: FastifyRequest) {
  if (!req.user || req.user.role !== 'admin') {
    throw req.server.httpErrors.forbidden('Admin only');
  }
}

export async function createSession(userId: string, userAgent?: string, ipAddress?: string) {
  const refreshToken = crypto.randomBytes(48).toString('hex');
  const expiresAt = new Date(Date.now() + config.SESSION_TTL_DAYS * 86400000);
  await prisma.session.create({ data: { userId, refreshToken, userAgent, ipAddress, expiresAt } });
  return refreshToken;
}

export async function hashPassword(raw: string) {
  return argon2.hash(raw);
}

export async function verifyPassword(raw: string, hash: string) {
  return argon2.verify(hash, raw);
}

export function generateCsrfToken() {
  return crypto.randomBytes(24).toString('hex');
}

export default fp(async (app) => {
  (app as any).decorateRequest('user', null);

  app.addHook('preHandler', async (req) => {
    const sessionToken = req.cookies[SESSION_COOKIE];
    if (!sessionToken) return;

    const session = await prisma.session.findUnique({
      where: { refreshToken: sessionToken },
      include: { user: true },
    });

    if (!session || session.expiresAt < new Date() || session.user.isDisabled) return;

    req.user = {
      id: session.user.id,
      email: session.user.email,
      role: session.user.role,
      displayName: session.user.displayName,
    };
  });

  app.decorate('setAuthCookies', (reply: any, sessionToken: string) => {
    const csrf = generateCsrfToken();
    reply.setCookie(SESSION_COOKIE, sessionToken, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.SESSION_TTL_DAYS * 86400,
    });
    reply.setCookie(CSRF_COOKIE, csrf, {
      path: '/',
      httpOnly: false,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: config.SESSION_TTL_DAYS * 86400,
    });
  });

  app.decorate('clearAuthCookies', (reply: any) => {
    reply.clearCookie(SESSION_COOKIE, { path: '/' });
    reply.clearCookie(CSRF_COOKIE, { path: '/' });
  });

  app.addHook('preValidation', async (req) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return;
    if (req.url.startsWith('/api/auth/login')) return;

    const csrfHeader = req.headers['x-csrf-token'];
    const csrfCookie = req.cookies[CSRF_COOKIE];
    if (csrfCookie && csrfHeader !== csrfCookie) {
      throw app.httpErrors.forbidden('CSRF token invalid');
    }
  });
});
