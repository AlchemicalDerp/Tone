import { z } from 'zod';

const configSchema = z.object({
  PORT: z.coerce.number().default(4000),
  HOST: z.string().default('0.0.0.0'),
  DATABASE_URL: z.string().url(),
  JWT_SECRET: z.string().min(16).default('change-me-please-1234'),
  SESSION_TTL_DAYS: z.coerce.number().default(30),
  MEDIA_ROOT: z.string().default('./media'),
  LIBRARY_PATHS: z.string().default('./media/library'),
  ALLOW_SELF_REGISTRATION: z.string().default('false'),
  ALLOW_UPLOADS: z.string().default('true'),
  FFMPEG_PATH: z.string().default('ffmpeg'),
  TRUST_PROXY: z.string().default('1'),
  CORS_ORIGIN: z.string().default('http://localhost:5173'),
});

export const config = configSchema.parse(process.env);
