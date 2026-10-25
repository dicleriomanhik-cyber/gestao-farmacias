const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const admin = await prisma.user.findFirst({ where: { email: { contains: 'dicleriomanhik' } } });
  if (!admin) {
    console.error('Admin não encontrado. Cria o utilizador primeiro.');
    return;
  }
  const pharmacyId = admin.pharmacyId;
  console.log('Farmácia:', pharmacyId);

  let category = await prisma.category.findFirst({ where: { pharmacyId } });
  if (!category) {
    category = await prisma.category.create({ data: { name: 'Geral', pharmacyId } });
    console.log('Categoria criada:', category.name);
  }

  const products = [
    { name: 'Paracetamol 500mg', salePrice: 150.00, qty: 100 },
    { name: 'Ibuprofeno 400mg', salePrice: 200.00, qty: 50 },
    { name: 'Amoxicilina 500mg', salePrice: 350.00, qty: 40 },
    { name: 'Omeprazol 20mg', salePrice: 250.00, qty: 60 },
    { name: 'Loratadina 10mg', salePrice: 120.00, qty: 80 },
  ];

  for (const p of products) {
    const product = await prisma.product.create({
      data: { name: p.name, salePrice: p.salePrice, categoryId: category.id, pharmacyId, unit: 'cx' }
    });
    await prisma.stockLot.create({
      data: {
        productId: product.id, pharmacyId,
        lotNumber: `LOTE-${p.name.substring(0, 3).toUpperCase()}-001`,
        quantityReceived: p.qty, quantityAvailable: p.qty,
        unitCost: p.salePrice * 0.7,
        expiryDate: new Date('2027-12-31'), status: 'ACTIVE',
      }
    });
    console.log(`Criado: ${p.name} (${p.salePrice} MT) - ${p.qty} unidades`);
  }

  console.log('✅ Seed concluído com sucesso!');
}

main().catch((e) => console.error(e)).finally(() => prisma.$disconnect());
