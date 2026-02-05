import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../plugins/auth.js';

export const userRoutes: FastifyPluginAsync = async (app) => {
  app.get('/profile/:id', async (req) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const user = await prisma.user.findUnique({ where: { id: params.id } });
    if (!user) throw app.httpErrors.notFound('User not found');
    if (!user.isPublicProfile && req.user!.id !== params.id) throw app.httpErrors.forbidden('Private profile');

    const playCount = await prisma.playEvent.count({ where: { userId: params.id } });
    return { ...user, passwordHash: undefined, playCount };
  });

  app.get('/settings/me', async (req) => {
    await requireAuth(req);
    return prisma.userSetting.findUnique({ where: { userId: req.user!.id } });
  });

  app.patch('/settings/me', async (req) => {
    await requireAuth(req);
    const body = z.object({ eqBass: z.number().min(-12).max(12).optional(), eqTreble: z.number().min(-12).max(12).optional(), volume: z.number().min(0).max(1).optional(), theme: z.string().optional(), lastPlayedTrackId: z.string().cuid().nullable().optional(), lastPlayedPositionMs: z.number().int().nullable().optional() }).parse(req.body);
    return prisma.userSetting.upsert({ where: { userId: req.user!.id }, update: body, create: { userId: req.user!.id, ...body } });
  });
};
