// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import { PERMISSIONS, ROLE_NAMES, ROLE_PERMISSIONS } from '../src/common/constants/permissions';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  for (const code of Object.values(PERMISSIONS)) {
    await prisma.permission.upsert({
      where: { code },
      update: {},
      create: { code, description: code },
    });
  }

  const roleDescriptions: Record<string, string> = {
    ADMIN: 'Administração da farmácia, utilizadores e configurações',
    PHARMACIST: 'Operações profissionais permitidas',
    CASHIER: 'Operações de venda e caixa',
    STOCK_MANAGER: 'Stock, lotes e recepção de mercadoria',
  };

  for (const name of Object.values(ROLE_NAMES)) {
    const role = await prisma.role.upsert({
      where: { name },
      update: { description: roleDescriptions[name] ?? null, isSystem: true },
      create: { name, description: roleDescriptions[name] ?? null, isSystem: true },
    });

    for (const permCode of ROLE_PERMISSIONS[name] ?? []) {
      const perm = await prisma.permission.findUnique({ where: { code: permCode } });
      if (!perm) throw new Error(`Permissão ${permCode} não existe (seed desalinhado).`);
      await prisma.rolePermission.upsert({
        where: { roleId_permissionId: { roleId: role.id, permissionId: perm.id } },
        update: {},
        create: { roleId: role.id, permissionId: perm.id },
      });
    }
  }

  console.log('Seed concluído: roles e permissões sincronizados.');
}

main()
  .catch((e) => {
    console.error('Falha no seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });