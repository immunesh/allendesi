import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma;

export const ensureDefaultAdmin = async (): Promise<void> => {
  const existingAdmin = await prisma.user.findUnique({
    where: { email: 'admin@Allendesi.com' },
  });

  if (!existingAdmin) {
    const hashedPassword = await bcrypt.hash('Admin@123', 12);
    await prisma.user.create({
      data: {
        email: 'admin@Allendesi.com',
        password: hashedPassword,
        firstName: 'Admin',
        lastName: 'Allendesi',
        role: 'ADMIN',
      },
    });
  }
};
