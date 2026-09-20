const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

(async () => {
  const [products, orders, delivered, sales] = await Promise.all([
    prisma.product.count(),
    prisma.order.count(),
    prisma.order.count({ where: { status: 'DELIVERED' } }),
    prisma.order.aggregate({ _sum: { total: true } }),
  ]);

  console.log(JSON.stringify({ products, orders, delivered, totalSales: sales._sum.total ?? 0 }, null, 2));
  await prisma.$disconnect();
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
