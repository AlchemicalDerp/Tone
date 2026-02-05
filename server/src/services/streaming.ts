import fs from 'node:fs';
import path from 'node:path';
import ffmpeg from 'fluent-ffmpeg';
import { config } from '../utils/config.js';

const BROWSER_SAFE = new Set(['mp3', 'aac', 'm4a']);

ffmpeg.setFfmpegPath(config.FFMPEG_PATH);

export function isDirectPlayable(codec?: string | null) {
  if (!codec) return false;
  return [...BROWSER_SAFE].some((c) => codec.toLowerCase().includes(c));
}

export function streamWithRange(filePath: string, range: string | undefined, reply: any) {
  const stat = fs.statSync(filePath);
  const total = stat.size;

  if (!range) {
    reply.header('Content-Length', total).header('Accept-Ranges', 'bytes');
    return fs.createReadStream(filePath);
  }

  const [startStr, endStr] = range.replace(/bytes=/, '').split('-');
  const start = Number.parseInt(startStr, 10);
  const end = endStr ? Number.parseInt(endStr, 10) : total - 1;
  const chunkSize = end - start + 1;

  reply
    .code(206)
    .header('Content-Range', `bytes ${start}-${end}/${total}`)
    .header('Accept-Ranges', 'bytes')
    .header('Content-Length', chunkSize);

  return fs.createReadStream(filePath, { start, end });
}

export function transcodeToMp3(filePath: string, reply: any) {
  reply.header('Content-Type', 'audio/mpeg').header('Transfer-Encoding', 'chunked');
  return ffmpeg(filePath).audioCodec('libmp3lame').format('mp3').audioBitrate('192k').pipe();
}

export function contentTypeForPath(filePath: string) {
  const ext = path.extname(filePath).toLowerCase();
  if (ext === '.mp3') return 'audio/mpeg';
  if (ext === '.flac') return 'audio/flac';
  if (ext === '.m4a' || ext === '.aac') return 'audio/aac';
  if (ext === '.ogg' || ext === '.opus') return 'audio/ogg';
  return 'application/octet-stream';
}
