import path from 'node:path';

export function safeJoin(root: string, target: string) {
  const normalized = path.normalize(target).replace(/^([.][.][/\\])+/, '');
  const full = path.join(root, normalized);
  if (!full.startsWith(path.resolve(root))) {
    throw new Error('Path traversal prevented');
  }
  return full;
}
