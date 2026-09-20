type PrismaClientLike = {
  [key: string]: any;
};

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientLike | undefined;
};

export const prisma: PrismaClientLike = globalForPrisma.prisma || {
  category: {
    findMany: async () => [],
    create: async ({ data }: { data: Record<string, unknown> }) => data,
  },
};

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}