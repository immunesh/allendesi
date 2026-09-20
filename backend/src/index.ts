import dotenv from 'dotenv';

dotenv.config();

const app = require('./app').default;
const { prisma, ensureDefaultAdmin } = require('./db/prisma');

const PORT = parseInt(process.env.PORT || '5000', 10);
const HOST = process.env.HOST || '0.0.0.0';

async function main() {
  await prisma.$connect();
  console.log('Database connected');

  await ensureDefaultAdmin();
  console.log('Admin bootstrap complete');

  app.listen(PORT, HOST, () => {
    console.log(`Allendesi API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
