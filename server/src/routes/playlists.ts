import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../plugins/auth.js';

export const playlistRoutes: FastifyPluginAsync = async (app) => {
  app.get('/playlists', async (req) => {
    await requireAuth(req);
    return prisma.playlist.findMany({ where: { OR: [{ ownerId: req.user!.id }, { isPublic: true }] }, include: { tracks: true } });
  });

  app.post('/playlists', async (req) => {
    await requireAuth(req);
    const body = z.object({ name: z.string().min(1), isPublic: z.boolean().default(false), description: z.string().optional() }).parse(req.body);
    return prisma.playlist.create({ data: { ownerId: req.user!.id, ...body } });
  });

  app.post('/playlists/:id/tracks', async (req) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const body = z.object({ trackId: z.string().cuid() }).parse(req.body);
    const count = await prisma.playlistTrack.count({ where: { playlistId: params.id } });
    return prisma.playlistTrack.create({ data: { playlistId: params.id, trackId: body.trackId, position: count + 1 } });
  });

  app.put('/playlists/:id/reorder', async (req) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const body = z.object({ trackIds: z.array(z.string().cuid()) }).parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (let i = 0; i < body.trackIds.length; i += 1) {
        await tx.playlistTrack.update({
          where: { playlistId_trackId: { playlistId: params.id, trackId: body.trackIds[i]! } },
          data: { position: i + 1 },
        });
      }
    });

    return { ok: true };
  });
};
