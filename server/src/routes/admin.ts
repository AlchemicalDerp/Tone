import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { hashPassword, requireAdmin } from '../plugins/auth.js';

export const adminRoutes: FastifyPluginAsync = async (app) => {
  app.get('/admin/dashboard', async (req) => {
    await requireAdmin(req);
    const [users, tracks, playlists, events, logs] = await Promise.all([
      prisma.user.count(),
      prisma.track.count(),
      prisma.playlist.count(),
      prisma.playEvent.count({ where: { startedAt: { gte: new Date(Date.now() - 7 * 86400000) } } }),
      prisma.auditLog.findMany({ orderBy: { createdAt: 'desc' }, take: 50, include: { user: true } }),
    ]);
    return { users, tracks, playlists, weeklyPlays: events, logs };
  });

  app.get('/admin/users', async (req) => {
    await requireAdmin(req);
    return prisma.user.findMany({ orderBy: { createdAt: 'desc' } });
  });

  app.post('/admin/users', async (req) => {
    await requireAdmin(req);
    const body = z.object({ email: z.string().email(), password: z.string().min(8), role: z.enum(['admin', 'user']), displayName: z.string().min(2) }).parse(req.body);
    const passwordHash = await hashPassword(body.password);
    const user = await prisma.user.create({ data: { ...body, passwordHash, settings: { create: {} } } });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'admin.create_user', targetType: 'user', targetId: user.id } });
    return user;
  });

  app.patch('/admin/users/:id', async (req) => {
    await requireAdmin(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const body = z.object({ isDisabled: z.boolean().optional(), role: z.enum(['admin', 'user']).optional(), resetPassword: z.string().min(8).optional() }).parse(req.body);

    const data: Record<string, unknown> = {};
    if (body.isDisabled !== undefined) data.isDisabled = body.isDisabled;
    if (body.role) data.role = body.role;
    if (body.resetPassword) data.passwordHash = await hashPassword(body.resetPassword);

    const updated = await prisma.user.update({ where: { id: params.id }, data });
    await prisma.auditLog.create({ data: { userId: req.user!.id, action: 'admin.update_user', targetType: 'user', targetId: params.id, meta: body } });
    return updated;
  });
};
