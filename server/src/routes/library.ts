import fs from 'node:fs/promises';
import path from 'node:path';
import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth, requireAdmin } from '../plugins/auth.js';
import { scanner } from '../services/scanner.js';
import { config } from '../utils/config.js';

export const libraryRoutes: FastifyPluginAsync = async (app) => {
  app.get('/tracks', async (req) => {
    await requireAuth(req);
    const query = z.object({ q: z.string().optional() }).parse(req.query);
    return prisma.track.findMany({
      where: query.q ? { title: { contains: query.q, mode: 'insensitive' } } : undefined,
      include: { artists: { include: { artist: true } }, album: true, genres: { include: { genre: true } } },
      orderBy: { addedAt: 'desc' },
    });
  });

  app.get('/artists', async (req) => {
    await requireAuth(req);
    return prisma.artist.findMany({
      include: {
        trackLinks: { include: { track: true } },
        albums: true,
      },
      orderBy: { name: 'asc' },
    });
  });

  app.get('/albums', async (req) => {
    await requireAuth(req);
    return prisma.album.findMany({ include: { tracks: true, albumArtist: true } });
  });

  app.post('/tracks/:id/metadata', async (req) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const body = z.object({ title: z.string().optional(), year: z.number().optional(), genres: z.array(z.string()).optional() }).parse(req.body);

    if (body.genres) {
      await prisma.$transaction(async (tx) => {
        await tx.trackGenre.deleteMany({ where: { trackId: params.id } });
        for (const g of body.genres!) {
          const genre = await tx.genre.upsert({ where: { name: g }, update: {}, create: { name: g } });
          await tx.trackGenre.create({ data: { trackId: params.id, genreId: genre.id } });
        }
      });
    }

    return prisma.track.update({ where: { id: params.id }, data: { title: body.title, year: body.year } });
  });

  app.post('/tracks/bulk-genres', async (req) => {
    await requireAuth(req);
    const body = z.object({ trackIds: z.array(z.string().cuid()).min(1), genres: z.array(z.string()).min(1), mode: z.enum(['set', 'append']) }).parse(req.body);

    await prisma.$transaction(async (tx) => {
      for (const trackId of body.trackIds) {
        if (body.mode === 'set') {
          await tx.trackGenre.deleteMany({ where: { trackId } });
        }
        for (const g of body.genres) {
          const genre = await tx.genre.upsert({ where: { name: g }, update: {}, create: { name: g } });
          await tx.trackGenre.upsert({ where: { trackId_genreId: { trackId, genreId: genre.id } }, update: {}, create: { trackId, genreId: genre.id } });
        }
      }
    });

    return { ok: true };
  });

  app.post('/library/paths', async (req) => {
    await requireAdmin(req);
    const body = z.object({ path: z.string().min(1) }).parse(req.body);
    return prisma.libraryPath.create({ data: { path: body.path } });
  });

  app.get('/library/paths', async (req) => {
    await requireAdmin(req);
    return prisma.libraryPath.findMany();
  });

  app.post('/library/scan', async (req) => {
    await requireAdmin(req);
    const id = await scanner.startScan();
    return { jobId: id };
  });

  app.get('/library/scan/:id', async (req) => {
    await requireAdmin(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    return scanner.getStatus(params.id);
  });

  app.post('/library/upload', async (req) => {
    await requireAuth(req);
    if (config.ALLOW_UPLOADS !== 'true') throw app.httpErrors.forbidden('Uploads disabled');

    const part = await req.file();
    if (!part) throw app.httpErrors.badRequest('No file uploaded');
    const ext = path.extname(part.filename).toLowerCase();
    if (!['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.opus'].includes(ext)) throw app.httpErrors.badRequest('Unsupported file type');

    const sanitized = part.filename.replace(/[^a-zA-Z0-9_.-]/g, '_');
    const dest = path.join(config.MEDIA_ROOT, 'uploads', sanitized);
    await fs.mkdir(path.dirname(dest), { recursive: true });
    await fs.writeFile(dest, await part.toBuffer());

    return { ok: true, path: dest };
  });
};
