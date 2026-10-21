// @ts-nocheck
import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';
import * as readline from 'readline';

const prisma = new PrismaClient();

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function promptHidden(query: string): Promise<string> {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    (rl as any)._writeToOutput = (s: string) => { if (s.includes(query)) rl.output.write(query); };
    rl.question(query, (answer) => { rl.close(); resolve(answer); });
  });
}

async function main(): Promise<void> {
  const email = arg('email');
  const name = arg('name') ?? 'Administrador';
  const pharmacyName = arg('pharmacy-name');
  const pharmacyNif = arg('pharmacy-nif');
  if (!email || !pharmacyName) {
    throw new Error('Obrigatórios: --email, --pharmacy-name. Opcionais: --name, --pharmacy-nif.');
  }

  let password = process.env.ADMIN_PASSWORD;
  if (!password) password = await promptHidden('Password do administrador: ');
  if (!password || password.length < 8) {
    throw new Error('Password deve ter pelo menos 8 caracteres.');
  }

  const rounds = parseInt(process.env.BCRYPT_SALT_ROUNDS ?? '12', 10);
  const passwordHash = await bcrypt.hash(password, rounds);

  await prisma.$transaction(async (tx) => {
    const pharmacy = await tx.pharmacy.upsert({
      where: { nif: pharmacyNif ?? '__no_nif__' },
      update: { name: pharmacyName },
      create: { name: pharmacyName, nif: pharmacyNif ?? null },
    });
    const role = await tx.role.findUnique({ where: { name: 'ADMIN' } });
    if (!role) throw new Error('Role ADMIN não existe. Execute `npm run prisma:seed` primeiro.');
    const user = await tx.user.upsert({
      where: { email },
      update: { pharmacyId: pharmacy.id, passwordHash, fullName: name },
      create: { email, passwordHash, fullName: name, pharmacyId: pharmacy.id },
    });
    await tx.userRole.upsert({
      where: { userId_roleId: { userId: user.id, roleId: role.id } },
      update: {},
      create: { userId: user.id, roleId: role.id },
    });
  });

  console.log('Administrador criado/atualizado. Password nunca foi impressa.');
}

main()
  .catch((e) => {
    console.error('Falha:', e.message);
    process.exit(1);
  })
  .finally(async () => prisma.$disconnect());