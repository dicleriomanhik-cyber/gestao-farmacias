import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const pharmacies = await prisma.pharmacy.findMany({ select: { id: true, name: true } });
  let totalGroups = 0;

  for (const ph of pharmacies) {
    const products = await prisma.product.findMany({
      where: { pharmacyId: ph.id },
      select: { id: true, name: true, sku: true },
    });

    const buckets = new Map<string, Array<{ id: string; name: string; sku: string | null }>>();
    for (const p of products) {
      const normalized = p.name.trim().toLowerCase().replace(/\s+/g, ' ');
      if (!buckets.has(normalized)) buckets.set(normalized, []);
      buckets.get(normalized)!.push(p);
    }

    for (const [normalized, group] of buckets.entries()) {
      if (group.length > 1) {
        totalGroups++;
        console.log(`\n[${ph.name}] duplicados normalizados por "${normalized}":`);
        for (const p of group) {
          console.log(`  - id=${p.id} name="${p.name}" sku=${p.sku ?? '-'}`);
        }
      }
    }
  }

  if (totalGroups === 0) console.log('Sem produtos duplicados por nome normalizado.');
  else console.log(`\nTotal de grupos duplicados: ${totalGroups}`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());