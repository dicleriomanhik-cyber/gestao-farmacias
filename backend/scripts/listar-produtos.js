const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.product.findMany({ select: { name: true, type: true, strength: true, activeIngredient: true, dosageForm: true }, orderBy: { name: "asc" } });
  console.log(rows);
  await prisma.$disconnect();
})();
