import { FastifyPluginAsync } from 'fastify';
import fs from 'node:fs';
import sharp from 'sharp';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../plugins/auth.js';
import { contentTypeForPath, isDirectPlayable, streamWithRange, transcodeToMp3 } from '../services/streaming.js';

export const streamRoutes: FastifyPluginAsync = async (app) => {
  app.get('/stream/:id', async (req, reply) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const q = z.object({ transcode: z.enum(['auto', 'always', 'never']).default('auto') }).parse(req.query);

    const track = await prisma.track.findUnique({ where: { id: params.id } });
    if (!track) throw app.httpErrors.notFound('Track not found');

    if (!fs.existsSync(track.path)) throw app.httpErrors.notFound('File missing');
    const direct = q.transcode === 'never' || (q.transcode === 'auto' && isDirectPlayable(track.codec));

    if (direct) {
      reply.header('Content-Type', contentTypeForPath(track.path));
      return reply.send(streamWithRange(track.path, req.headers.range, reply));
    }

    return reply.send(transcodeToMp3(track.path, reply));
  });

  app.get('/cover/:id', async (req, reply) => {
    await requireAuth(req);
    const params = z.object({ id: z.string().cuid() }).parse(req.params);
    const query = z.object({ w: z.coerce.number().default(300), h: z.coerce.number().default(300) }).parse(req.query);

    const cover = await prisma.coverArt.findUnique({ where: { id: params.id } });
    if (!cover) throw app.httpErrors.notFound('Cover not found');

    reply.type('image/jpeg');
    return reply.send(await sharp(cover.path).resize(query.w, query.h, { fit: 'cover' }).jpeg().toBuffer());
  });
};
