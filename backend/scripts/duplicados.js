const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRaw`SELECT p.name, p.id, p.sku, p.barcode, (SELECT COUNT(*) FROM stock_lots l WHERE l."productId"=p.id) AS caixas, (SELECT COUNT(*) FROM sale_lines s WHERE s."productId"=p.id) AS linhas_venda FROM products p ORDER BY p.name, p."createdAt"`;
  console.log(rows);
  await prisma.$disconnect();
})();
