import { PrismaClient, Role } from '@prisma/client';
import argon2 from 'argon2';

const prisma = new PrismaClient();

async function main() {
  const email = process.env.SEED_ADMIN_EMAIL || 'admin@local';
  const password = process.env.SEED_ADMIN_PASSWORD || 'admin123!';
  const displayName = process.env.SEED_ADMIN_NAME || 'Administrator';

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return;

  const hash = await argon2.hash(password);
  await prisma.user.create({
    data: {
      email,
      passwordHash: hash,
      role: Role.admin,
      displayName,
      settings: { create: {} },
    },
  });
}

main().finally(() => prisma.$disconnect());
