const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const role = await prisma.role.findFirst({ where: { name: "ADMIN" } });
  if (!role) throw new Error("Papel ADMIN não encontrado");
  const codes = [
    { code: "sync:push", description: "Sincronizar envios" },
    { code: "sync:pull", description: "Sincronizar leitura" },
  ];
  for (const p of codes) {
    const perm = await prisma.permission.upsert({
      where: { code: p.code },
      update: {},
      create: { code: p.code, description: p.description },
    });
    await prisma.rolePermission.upsert({
      where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
      update: {},
      create: { roleId: role.id, permissionId: perm.id },
    });
    console.log("OK", p.code);
  }
  await prisma.$disconnect();
})();
