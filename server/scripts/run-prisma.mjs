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

const localPrisma = path.join(cwd, 'node_modules', '.bin', process.platform === 'win32' ? 'prisma.cmd' : 'prisma');
const attempts = fs.existsSync(localPrisma)
  ? [
      { cmd: localPrisma, cmdArgs: args, shell: false, label: 'local prisma binary' },
      { cmd: 'npx prisma', cmdArgs: args, shell: true, label: 'npx prisma fallback' },
    ]
  : [{ cmd: 'npx prisma', cmdArgs: args, shell: true, label: 'npx prisma' }];

let finalStatus = 1;
for (const attempt of attempts) {
  const escapedArgs = attempt.cmdArgs.map((a) => (a.includes(' ') ? `\"${a}\"` : a));
  const result = attempt.shell
    ? spawnSync(`${attempt.cmd} ${escapedArgs.join(' ')}`, {
        stdio: 'inherit',
        env: process.env,
        cwd,
        shell: true,
      })
    : spawnSync(attempt.cmd, attempt.cmdArgs, {
        stdio: 'inherit',
        env: process.env,
        cwd,
        shell: false,
      });

  if (result.error) {
    console.error(`[prisma-wrapper] Failed to run via ${attempt.label}: ${result.error.message}`);
    finalStatus = 1;
    continue;
  }

  finalStatus = result.status ?? 1;
  if (finalStatus === 0) break;
}

process.exit(finalStatus);
