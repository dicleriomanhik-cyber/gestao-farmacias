import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';
import { PrismaService } from '../src/database/prisma.service';

describe('Stock, Lotes e Movimentos (e2e)', () => {
  let app: INestApplication;
  let prisma: PrismaService;
  let adminToken: string;
  let pharmacyId: string;
  let supplierId: string;
  let productId: string;
  let purchaseId: string;
  let purchaseLineId: string;
  let lotId: string;

  beforeAll(async () => {
    const mod = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = mod.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
    await app.init();
    prisma = app.get(PrismaService);

    // Limpar (Ordem correcta!)
    await prisma.returnRefund.deleteMany({});
    await prisma.quarantineStock.deleteMany({});
    await prisma.saleReturnLine.deleteMany({});
    await prisma.saleReturn.deleteMany({});
    await prisma.salePayment.deleteMany({});
    await prisma.cashMovement.deleteMany({});
    await prisma.stockMovement.deleteMany({});
    await prisma.saleLineLot.deleteMany({});
    await prisma.saleLine.deleteMany({});
    await prisma.sale.deleteMany({});
    await prisma.cashSession.deleteMany({});
    await prisma.user.deleteMany({ where: { email: 'admin@stockb.com' } });
    await prisma.stockLot.deleteMany({});
    await prisma.purchaseLine.deleteMany({});
    await prisma.purchase.deleteMany({});
    await prisma.supplier.deleteMany({ where: { name: 'Fornecedor Stock' } });
    await prisma.product.deleteMany({ where: { sku: 'STOCK-TEST-01' } });

    // Login
    const loginRes = await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email: process.env.TEST_ADMIN_EMAIL, password: process.env.TEST_ADMIN_PASSWORD });
    adminToken = loginRes.body.data.accessToken;
    pharmacyId = loginRes.body.data.user.pharmacyId;

    // Criar Produto
    const prodRes = await request(app.getHttpServer())
      .post('/api/v1/products')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Produto Stock', sku: 'STOCK-TEST-01', salePrice: 100 });
    productId = prodRes.body.data.id;

    // Criar Fornecedor
    const supRes = await request(app.getHttpServer())
      .post('/api/v1/suppliers')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ name: 'Fornecedor Stock', taxId: '123' });
    supplierId = supRes.body.data.id;

    // Criar Compra (DRAFT) com 100 unidades
    const purchRes = await request(app.getHttpServer())
      .post('/api/v1/purchases')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        supplierId,
        documentNumber: 'FAT-STOCK-01',
        lines: [{ productId, quantity: 100, unitCost: 50 }]
      });
    purchaseId = purchRes.body.data.id;
    purchaseLineId = purchRes.body.data.lines[0].id;

    // Confirmar Compra
    await request(app.getHttpServer())
      .patch(`/api/v1/purchases/${purchaseId}/confirm`)
      .set('Authorization', `Bearer ${adminToken}`)
      .expect(200);
  });

  afterAll(async () => {
    await app.close();
  });

  describe('Recepção de Stock', () => {
    it('deve receber 60 unidades (parcial)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          purchaseLineId,
          lotNumber: 'LOTE-A',
          expiryDate: '2027-12-31T00:00:00.000Z',
          quantity: 60,
          unitCost: 50
        })
        .expect(201);
      expect(res.body.data.quantityAvailable).toBe(60);
      lotId = res.body.data.id;
    });

    it('deve rejeitar recepção que exceda o total comprado', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          purchaseLineId,
          lotNumber: 'LOTE-B',
          expiryDate: '2028-12-31T00:00:00.000Z',
          quantity: 50,
          unitCost: 50
        })
        .expect(400);
    });

    it('deve permitir receber as 40 restantes', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          purchaseLineId,
          lotNumber: 'LOTE-A',
          expiryDate: '2027-12-31T00:00:00.000Z',
          quantity: 40,
          unitCost: 50
        })
        .expect(201);
      expect(res.body.data.quantityAvailable).toBe(100);
    });

    it('deve rejeitar tentativa de receber novamente (duplicação)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/receive')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          purchaseLineId,
          lotNumber: 'LOTE-A',
          expiryDate: '2027-12-31T00:00:00.000Z',
          quantity: 1,
          unitCost: 50
        })
        .expect(400);
    });
  });

  describe('Ajustes de Stock', () => {
    it('deve permitir ajuste positivo', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lotId, quantity: 5, reason: 'Correcção' })
        .expect(201);
      expect(res.body.data.quantityAvailable).toBe(105);
    });

    it('deve permitir ajuste negativo', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lotId, quantity: -10, reason: 'Perda' })
        .expect(201);
      expect(res.body.data.quantityAvailable).toBe(95);
    });

    it('deve rejeitar ajuste que resulte em stock negativo', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lotId, quantity: -200, reason: 'Erro' })
        .expect(400);
    });

    it('deve rejeitar ajuste com quantidade zero', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({ lotId, quantity: 0, reason: 'Nada' })
        .expect(400);
    });
  });

  describe('Consistência', () => {
    it('cada alteração de stock deve ter um movimento correspondente', async () => {
      const movements = await prisma.stockMovement.findMany({ where: { lotId } });
      expect(movements.length).toBe(4);
    });

    it('quantityAvailable não pode ser maior que quantityReceived', async () => {
      const lot = await prisma.stockLot.findUnique({ where: { id: lotId } });
      expect(lot.quantityAvailable).toBeLessThanOrEqual(lot.quantityReceived);
    });
  });

  describe('Registo directo de lotes', () => {
    const directLotNumber = 'LOTE-DIRECTO-001';

    afterAll(async () => {
      await prisma.stockMovement.deleteMany({
        where: { lot: { lotNumber: directLotNumber } },
      });
      await prisma.stockLot.deleteMany({ where: { lotNumber: directLotNumber } });
    });

    it('deve criar um lote directamente com validade (201)', async () => {
      const res = await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          lotNumber: directLotNumber,
          expiryDate: '2027-12-31',
          quantity: 50,
          unitCost: 25.00,
        })
        .expect(201);

      expect(res.body.success).toBe(true);
      expect(res.body.data.id).toBeDefined();
      expect(res.body.data.lotNumber).toBe(directLotNumber);
      expect(res.body.data.quantityReceived).toBe(50);
      expect(res.body.data.quantityAvailable).toBe(50);
      expect(res.body.data.quantityReceivedFromLine).toBe(0);
      expect(res.body.data.purchaseLineId).toBeNull();
    });

    it('deve aparecer em GET /stock/lots com validade correcta', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .expect(200);

      const lot = res.body.data.find((l: any) => l.lotNumber === directLotNumber);
      expect(lot).toBeDefined();
      expect(lot.expiryDate).toBeDefined();
      expect(new Date(lot.expiryDate).toISOString().slice(0, 10)).toBe('2027-12-31');
      expect(lot.quantityAvailable).toBe(50);
    });

    it('deve registar um movimento DIRECT_ENTRY', async () => {
      const lot = await prisma.stockLot.findFirst({
        where: { lotNumber: directLotNumber, pharmacyId },
      });
      expect(lot).toBeDefined();

      const movements = await prisma.stockMovement.findMany({
        where: { lotId: lot!.id, type: 'DIRECT_ENTRY' },
      });
      expect(movements.length).toBe(1);
      expect(movements[0].quantity).toBe(50);
      expect(movements[0].referenceType).toBe('StockLot');
      expect(movements[0].referenceId).toBe(lot!.id);
    });

    it('não deve permitir criar lote sem token (401)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .send({
          productId,
          lotNumber: 'LOTE-SEM-TOKEN',
          expiryDate: '2027-12-31',
          quantity: 10,
          unitCost: 10,
        })
        .expect(401);
    });

    it('deve rejeitar produto inexistente (404)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId: '00000000-0000-0000-0000-000000000000',
          lotNumber: 'LOTE-INEXISTENTE',
          expiryDate: '2027-12-31',
          quantity: 10,
          unitCost: 10,
        })
        .expect(404);
    });

    it('deve rejeitar quantidade zero ou negativa (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          lotNumber: 'LOTE-QTD-ZERO',
          expiryDate: '2027-12-31',
          quantity: 0,
          unitCost: 10,
        })
        .expect(400);

      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          lotNumber: 'LOTE-QTD-NEG',
          expiryDate: '2027-12-31',
          quantity: -5,
          unitCost: 10,
        })
        .expect(400);
    });

    it('deve rejeitar data inválida (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          lotNumber: 'LOTE-DATA-MAU',
          expiryDate: 'nao-e-data',
          quantity: 10,
          unitCost: 10,
        })
        .expect(400);
    });

    it('deve rejeitar lote duplicado (400)', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${adminToken}`)
        .send({
          productId,
          lotNumber: directLotNumber,
          expiryDate: '2028-01-01',
          quantity: 5,
          unitCost: 10,
        })
        .expect(400);
    });
  });

  describe('Isolamento Multi-Tenant', () => {
    let tokenFarmaciaB: string;

    beforeAll(async () => {
      const phB = await prisma.pharmacy.create({ data: { name: 'Farmacia B', status: 'ACTIVE' } });
      const passwordHash = await require('bcrypt').hash('admin123', 12);
      const roleAdmin = await prisma.role.findUnique({ where: { name: 'ADMIN' } });
      
      await prisma.user.deleteMany({ where: { email: 'admin@stockb.com' } });

      const userB = await prisma.user.create({
        data: { email: 'admin@stockb.com', passwordHash, fullName: 'Admin B', pharmacyId: phB.id, status: 'ACTIVE' }
      });
      await prisma.userRole.create({ data: { userId: userB.id, roleId: roleAdmin.id } });
      
      const loginB = await request(app.getHttpServer())
        .post('/api/v1/auth/login')
        .send({ email: 'admin@stockb.com', password: 'admin123' });
      tokenFarmaciaB = loginB.body.data.accessToken;
    });

    it('Farmácia B não deve ver lotes da Farmácia A', async () => {
      const res = await request(app.getHttpServer())
        .get('/api/v1/stock/lots')
        .set('Authorization', `Bearer ${tokenFarmaciaB}`)
        .expect(200);
      expect(res.body.data.length).toBe(0);
    });

    it('Farmácia B não deve ajustar stock da Farmácia A', async () => {
      await request(app.getHttpServer())
        .post('/api/v1/stock/adjust')
        .set('Authorization', `Bearer ${tokenFarmaciaB}`)
        .send({ lotId, quantity: 10, reason: 'Hack' })
        .expect(404);
    });
  });
});
