import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { createSession, hashPassword, verifyPassword } from '../plugins/auth.js';
import { config } from '../utils/config.js';

const loginSchema = z.object({ email: z.string().email(), password: z.string().min(8) });

export const authRoutes: FastifyPluginAsync = async (app) => {
  app.post('/auth/login', {
    config: { rateLimit: { max: 10, timeWindow: '10 minutes' } },
  }, async (req, reply) => {
    const body = loginSchema.parse(req.body);
    const ip = req.ip;

    const failCount = await prisma.loginAttempt.count({
      where: { email: body.email, ipAddress: ip, success: false, createdAt: { gte: new Date(Date.now() - 15 * 60 * 1000) } },
    });
    if (failCount >= 5) throw app.httpErrors.tooManyRequests('Login temporarily locked');

    const user = await prisma.user.findUnique({ where: { email: body.email } });
    if (!user || user.isDisabled || !(await verifyPassword(body.password, user.passwordHash))) {
      await prisma.loginAttempt.create({ data: { email: body.email, ipAddress: ip, success: false } });
      throw app.httpErrors.unauthorized('Invalid credentials');
    }

    await prisma.loginAttempt.create({ data: { email: body.email, ipAddress: ip, success: true } });
    await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
    await prisma.auditLog.create({ data: { userId: user.id, action: 'auth.login' } });

    const sessionToken = await createSession(user.id, req.headers['user-agent'], ip);
    (app as any).setAuthCookies(reply, sessionToken);

    return { user: { id: user.id, email: user.email, role: user.role, displayName: user.displayName, isPublicProfile: user.isPublicProfile } };
  });

  app.post('/auth/register', async (req) => {
    if (config.ALLOW_SELF_REGISTRATION !== 'true') throw app.httpErrors.forbidden('Registration disabled');

    const body = z.object({ email: z.string().email(), password: z.string().min(8), displayName: z.string().min(2) }).parse(req.body);
    const passwordHash = await hashPassword(body.password);

    const user = await prisma.user.create({
      data: {
        email: body.email,
        passwordHash,
        displayName: body.displayName,
        settings: { create: {} },
      },
    });

    return { id: user.id };
  });

  app.post('/auth/logout', async (req, reply) => {
    const token = req.cookies.tone_session;
    if (token) await prisma.session.deleteMany({ where: { refreshToken: token } });
    (app as any).clearAuthCookies(reply);
    return { ok: true };
  });

  app.get('/auth/me', async (req) => ({ user: req.user ?? null }));
};
