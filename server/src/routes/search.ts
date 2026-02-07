import { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { prisma } from '../lib/prisma.js';
import { requireAuth } from '../plugins/auth.js';

export const searchRoutes: FastifyPluginAsync = async (app) => {
  app.get('/search', async (req) => {
    await requireAuth(req);
    const query = z.object({ q: z.string().min(1) }).parse(req.query);
    const q = query.q;

    const tracks = await prisma.$queryRawUnsafe(
      `SELECT id, title FROM "Track" WHERE similarity(title, $1) > 0.2 OR title ILIKE $2 ORDER BY similarity(title, $1) DESC LIMIT 10`,
      q,
      `%${q}%`,
    );
    const artists = await prisma.$queryRawUnsafe(
      `SELECT id, name FROM "Artist" WHERE similarity(name, $1) > 0.2 OR name ILIKE $2 ORDER BY similarity(name, $1) DESC LIMIT 10`,
      q,
      `%${q}%`,
    );
    const albums = await prisma.$queryRawUnsafe(
      `SELECT id, title FROM "Album" WHERE similarity(title, $1) > 0.2 OR title ILIKE $2 ORDER BY similarity(title, $1) DESC LIMIT 10`,
      q,
      `%${q}%`,
    );
    const playlists = await prisma.$queryRawUnsafe(
      `SELECT id, name FROM "Playlist" WHERE (similarity(name, $1) > 0.2 OR name ILIKE $2) AND "isPublic"=true ORDER BY similarity(name, $1) DESC LIMIT 10`,
      q,
      `%${q}%`,
    );
    const users = await prisma.$queryRawUnsafe(
      `SELECT id, "displayName" FROM "User" WHERE "isPublicProfile"=true AND (similarity("displayName", $1) > 0.2 OR "displayName" ILIKE $2) ORDER BY similarity("displayName", $1) DESC LIMIT 10`,
      q,
      `%${q}%`,
    );

    return { tracks, artists, albums, playlists, users };
  });
};
