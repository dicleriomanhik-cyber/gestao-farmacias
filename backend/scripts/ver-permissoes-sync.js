const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.permission.findMany({
    where: { code: { startsWith: "sync:" } },
    select: { id: true, code: true },
  });
  console.log(rows);
  await prisma.$disconnect();
})();
