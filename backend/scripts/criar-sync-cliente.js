const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();
(async () => {
  const row = await prisma.syncClient.upsert({
    where: { clientId: "9c0092b1-d9e0-4eec-9ed0-af10f32a1d04" },
    update: { status: "ACTIVE" },
    create: {
      clientId: "9c0092b1-d9e0-4eec-9ed0-af10f32a1d04",
      pharmacyId: "8a6363d9-d943-40bc-b527-5c66f845f3c2",
      status: "ACTIVE",
      appVersion: "1.0.0",
    },
  });
  console.log(row);
  await prisma.$disconnect();
})();
