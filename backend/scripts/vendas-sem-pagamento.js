const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRaw`SELECT s."saleNumber", s.total, s."createdAt" FROM sales s LEFT JOIN sale_payments p ON p."saleId" = s.id WHERE s.status = 'CONFIRMED' AND p.id IS NULL ORDER BY s."createdAt"`;
  console.log(rows);
  await prisma.$disconnect();
})();
