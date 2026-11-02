const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.syncClient.findMany({
    select: { clientId: true, pharmacyId: true, status: true, createdAt: true },
  });
  console.log(rows);
  await prisma.$disconnect();
})();
