import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';

const cwd = process.cwd();
const envPath = path.join(cwd, '.env');
const envExamplePath = path.join(cwd, '.env.example');

function parseEnvFile(filePath) {
  const out = {};
  const content = fs.readFileSync(filePath, 'utf8');
  for (const raw of content.split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || line.startsWith('#')) continue;
    const idx = line.indexOf('=');
    if (idx === -1) continue;
    const key = line.slice(0, idx).trim();
    const value = line.slice(idx + 1).trim();
    out[key] = value;
  }
  return out;
}

const fileToLoad = fs.existsSync(envPath) ? envPath : (fs.existsSync(envExamplePath) ? envExamplePath : null);
if (fileToLoad) {
  const parsed = parseEnvFile(fileToLoad);
  for (const [k, v] of Object.entries(parsed)) {
    if (process.env[k] === undefined) process.env[k] = v;
  }
}

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL is missing. Create server/.env (or define env var) before running Prisma commands.');
  process.exit(1);
}

const args = process.argv.slice(2);
if (args.length === 0) {
  console.error('Usage: node scripts/run-prisma.mjs <prisma-args...>');
  process.exit(1);
}

const prismaCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
const result = spawnSync(prismaCmd, ['prisma', ...args], {
  stdio: 'inherit',
  env: process.env,
  cwd,
});

process.exit(result.status ?? 1);
