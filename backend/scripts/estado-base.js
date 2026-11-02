const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const cols = await prisma.$queryRaw`SELECT column_name FROM information_schema.columns WHERE table_name='products' ORDER BY column_name`;
  console.log(cols);
  const mig = await prisma.$queryRaw`SELECT migration_name, finished_at FROM _prisma_migrations ORDER BY started_at DESC LIMIT 8`;
  console.log(mig);
  await prisma.$disconnect();
})();
