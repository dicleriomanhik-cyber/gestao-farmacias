# Sistema Profissional de Gestão de Farmácias - Backend

Backend construído com NestJS, Prisma e PostgreSQL.

## Instalação
1. `npm install`
2. Copiar o `.env.example` para `.env` e preencher as variáveis.
3. `npx prisma generate`
4. `npx prisma migrate deploy`
5. `npm run prisma:seed`
6. `npm run start:dev`

## Testes
- Unitários: `npm test`
- E2E: `npm run test:e2e`
