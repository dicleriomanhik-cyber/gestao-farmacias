const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const rows = await prisma.$queryRaw`SELECT r.name, p.code FROM roles r JOIN role_permissions rp ON rp."roleId"=r.id JOIN permissions p ON p.id=rp."permissionId" WHERE r.name='CASHIER' AND p.code LIKE 'sync:%'`;
  console.log(rows);
  await prisma.$disconnect();
})();
