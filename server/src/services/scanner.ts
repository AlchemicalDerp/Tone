import fs from 'node:fs/promises';
import path from 'node:path';
import { parseBuffer } from 'music-metadata';
import sharp from 'sharp';
import { prisma } from '../lib/prisma.js';
import { hashFile } from '../utils/hash.js';
import { config } from '../utils/config.js';

const AUDIO_EXT = new Set(['.mp3', '.flac', '.m4a', '.aac', '.ogg', '.opus']);

export class ScannerService {
  private activeJobId: string | null = null;

  async startScan() {
    if (this.activeJobId) return this.activeJobId;
    const job = await prisma.scanJob.create({ data: { status: 'running' } });
    this.activeJobId = job.id;
    void this.run(job.id);
    return job.id;
  }

  async getStatus(jobId: string) {
    return prisma.scanJob.findUnique({ where: { id: jobId } });
  }

  private async run(jobId: string) {
    const libs = await prisma.libraryPath.findMany({ where: { enabled: true } });
    const files: string[] = [];
    for (const lib of libs) {
      await this.walk(lib.path, files);
    }

    await prisma.scanJob.update({ where: { id: jobId }, data: { totalFiles: files.length } });

    let imported = 0;
    let duplicates = 0;
    let errors = 0;

    for (let i = 0; i < files.length; i += 1) {
      const file = files[i]!;
      try {
        const hash = await hashFile(file);
        const fileData = await fs.readFile(file);
        const metadata = await parseBuffer(fileData, undefined, { duration: true });
        const durationMs = Math.round((metadata.format.duration || 0) * 1000);
        const existing = await prisma.track.findFirst({ where: { fileHash: hash, durationMs } });
        if (existing) {
          duplicates += 1;
        } else {
          const albumArtist = metadata.common.albumartist || metadata.common.artist || 'Unknown Artist';
          const albumTitle = metadata.common.album || 'Unknown Album';
          const title = metadata.common.title || path.parse(file).name;
          const artistNames = metadata.common.artists?.length ? metadata.common.artists : [metadata.common.artist || 'Unknown Artist'];
          const genres = metadata.common.genre || [];

          const albumArtistRecord = await prisma.artist.upsert({ where: { name: albumArtist }, update: {}, create: { name: albumArtist } });
          const album = await prisma.album.upsert({
            where: { title_year_albumArtistId: { title: albumTitle, year: metadata.common.year || null, albumArtistId: albumArtistRecord.id } },
            update: {},
            create: { title: albumTitle, year: metadata.common.year || null, albumArtistId: albumArtistRecord.id },
          });

          let coverArtId: string | undefined;
          const picture = metadata.common.picture?.[0];
          if (picture) {
            const out = path.join(config.MEDIA_ROOT, 'covers', `${hash}.jpg`);
            await fs.mkdir(path.dirname(out), { recursive: true });
            await sharp(picture.data).resize(1000, 1000, { fit: 'inside' }).jpeg().toFile(out);
            const art = await prisma.coverArt.create({ data: { path: out } });
            coverArtId = art.id;
          }

          const track = await prisma.track.create({
            data: {
              title,
              durationMs,
              year: metadata.common.year || null,
              trackNo: metadata.common.track.no || null,
              discNo: metadata.common.disk.no || null,
              bitrate: metadata.format.bitrate || null,
              codec: metadata.format.codec || metadata.format.container || null,
              path: file,
              fileHash: hash,
              albumId: album.id,
              coverArtId,
            },
          });

          for (const a of artistNames) {
            const ar = await prisma.artist.upsert({ where: { name: a }, update: {}, create: { name: a } });
            await prisma.trackArtist.create({ data: { trackId: track.id, artistId: ar.id, role: 'primary' } });
          }
          for (const g of genres) {
            const gr = await prisma.genre.upsert({ where: { name: g }, update: {}, create: { name: g } });
            await prisma.trackGenre.create({ data: { trackId: track.id, genreId: gr.id } });
          }
          imported += 1;
        }
      } catch {
        errors += 1;
      }

      await prisma.scanJob.update({ where: { id: jobId }, data: { scanned: i + 1, imported, duplicates, errors } });
    }

    await prisma.scanJob.update({ where: { id: jobId }, data: { status: 'done', finishedAt: new Date() } });
    this.activeJobId = null;
  }

  private async walk(root: string, acc: string[]) {
    const dir = await fs.readdir(root, { withFileTypes: true });
    for (const item of dir) {
      const full = path.join(root, item.name);
      if (item.isDirectory()) await this.walk(full, acc);
      else if (AUDIO_EXT.has(path.extname(item.name).toLowerCase())) acc.push(full);
    }
  }
}

export const scanner = new ScannerService();
