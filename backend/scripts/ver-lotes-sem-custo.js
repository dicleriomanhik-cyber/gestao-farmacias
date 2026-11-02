const {PrismaClient}=require('@prisma/client');
const p=new PrismaClient();
(async()=>{
const l=await p.stockLot.findMany({where:{realUnitCost:null},select:{qrCode:true,unitCost:true,acquisitionCost:true,purchaseId:true,totalUnits:true,product:{select:{name:true}}}});
console.log(JSON.stringify(l,null,1));
await p.$disconnect();
})().catch(e=>{console.log('ERRO',e.message);process.exit(1)});