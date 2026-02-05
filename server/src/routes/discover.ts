import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../plugins/auth.js';

export const discoverRoutes: FastifyPluginAsync = async (app) => {
  app.post('/play-events', async (req) => {
    await requireAuth(req);
    const body = z.object({ trackId: z.string().cuid(), startedAt: z.string(), endedAt: z.string().optional(), msPlayed: z.number(), context: z.string(), contextId: z.string().optional() }).parse(req.body);
    return prisma.playEvent.create({ data: { ...body, userId: req.user!.id, startedAt: new Date(body.startedAt), endedAt: body.endedAt ? new Date(body.endedAt) : null } });
  });

  app.get('/history', async (req) => {
    await requireAuth(req);
    return prisma.playEvent.findMany({ where: { userId: req.user!.id }, include: { track: true }, orderBy: { startedAt: 'desc' }, take: 100 });
  });

  app.get('/discover', async (req) => {
    await requireAuth(req);
    const recent = await prisma.track.findMany({ orderBy: { addedAt: 'desc' }, take: 20 });
    const trending = await prisma.track.findMany({
      where: { playEvents: { some: { startedAt: { gte: new Date(Date.now() - 7 * 86400000) } } } },
      include: { playEvents: true },
      take: 20,
    });

    const forYou = await prisma.$queryRawUnsafe(
      `WITH user_genres AS (
        SELECT tg."genreId", count(*) c
        FROM "PlayEvent" pe
        JOIN "TrackGenre" tg ON tg."trackId"=pe."trackId"
        WHERE pe."userId"=$1
        GROUP BY tg."genreId"
      )
      SELECT t.id, t.title, g.name as reason
      FROM "Track" t
      JOIN "TrackGenre" tg ON tg."trackId"=t.id
      JOIN "Genre" g ON g.id=tg."genreId"
      JOIN user_genres ug ON ug."genreId"=tg."genreId"
      ORDER BY ug.c DESC
      LIMIT 20`,
      req.user!.id,
    );

    return { recent, trending, forYou };
  });
};
