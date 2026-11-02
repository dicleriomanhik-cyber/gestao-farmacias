const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
const r={};
r.lotes=await p.stockLot.count();
r.lotesSemCustoReal=await p.stockLot.count({where:{realUnitCost:null}});
r.lotesSemAquisicao=await p.stockLot.count({where:{acquisitionCost:null}});
r.lotesSemCompra=await p.stockLot.count({where:{purchaseId:null}});
r.linhasLoteVenda=await p.saleLineLot.count();
r.linhasLoteVendaSemCusto=await p.saleLineLot.count({where:{unitCost:null}});
console.log(JSON.stringify(r,null,1));
await p.$disconnect();
})().catch(e=>{console.log('ERRO',e.message);process.exit(1)});