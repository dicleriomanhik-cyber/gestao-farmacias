const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const u = await prisma.user.findFirst({ where: { email: "dicleriomanhik@gmail.com" }, include: { roles: { include: { role: true } } } });
  console.log(JSON.stringify(u.roles.map(r => r.role.name)));
  await prisma.$disconnect();
})();
