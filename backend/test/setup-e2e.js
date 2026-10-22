// Carrega backend/.env.test exclusivamente para os testes E2E.
// CommonJS + dotenv (ja instalado como dependencia do projecto).
// Falha antes de importar AppModule ou instanciar Prisma se a configuracao
// nao for explicitamente de teste e apontar para farmacia_db_e2e.

const path = require('path');
const fs = require('fs');
const dotenv = require('dotenv');

const envPath = path.resolve(__dirname, '..', '.env.test');

if (!fs.existsSync(envPath)) {
  throw new Error(
    '[setup-e2e] Ficheiro .env.test nao encontrado em backend/. ' +
    'Crie backend/.env.test com a configuracao de teste antes de correr os E2E.'
  );
}

const result = dotenv.config({ path: envPath, override: true });
if (result.error) {
  throw new Error(
    '[setup-e2e] Falha ao carregar .env.test: ' + result.error.message
  );
}

const env = process.env;

function fail(variable, reason) {
  throw new Error(`[setup-e2e] Variavel invalida: ${variable} (${reason})`);
}

if (env.NODE_ENV !== 'test') {
  fail('NODE_ENV', 'deve ser exactamente "test"');
}

if (!env.DATABASE_URL) {
  fail('DATABASE_URL', 'ausente');
}

let parsedDb;
try {
  const u = new URL(env.DATABASE_URL);
  if (u.protocol !== 'postgresql:' && u.protocol !== 'postgres:') {
    fail('DATABASE_URL', 'protocolo nao e postgresql/postgres');
  }
  const dbName = (u.pathname || '').replace(/^\//, '').split('?')[0];
  if (!dbName) fail('DATABASE_URL', 'sem nome de base de dados');
  parsedDb = { protocol: u.protocol, dbName, host: u.host };
} catch (e) {
  fail('DATABASE_URL', 'URL invalida');
}

if (parsedDb.dbName !== 'farmacia_db_e2e') {
  fail(
    'DATABASE_URL',
    'nome da base de dados deve ser exactamente "farmacia_db_e2e"'
  );
}

for (const k of ['JWT_ACCESS_SECRET', 'JWT_REFRESH_SECRET']) {
  if (!env[k]) fail(k, 'ausente');
  if (env[k].length < 32) fail(k, 'menos de 32 caracteres');
}

for (const k of ['ADMIN_PASSWORD', 'TEST_ADMIN_PASSWORD']) {
  if (!env[k]) fail(k, 'ausente');
  if (env[k].length < 12) fail(k, 'menos de 12 caracteres');
}
if (env.ADMIN_PASSWORD !== env.TEST_ADMIN_PASSWORD) {
  fail('TEST_ADMIN_PASSWORD', 'deve ser igual a ADMIN_PASSWORD');
}
if (!env.TEST_ADMIN_EMAIL) {
  fail('TEST_ADMIN_EMAIL', 'ausente');
}

// Tudo validado. Nao imprimir valores.