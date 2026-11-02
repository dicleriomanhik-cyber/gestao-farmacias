const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.pharmacy.findMany({ select: { id: true, name: true } });
  console.log(rows);
  await prisma.$disconnect();
})();
