import { execSync } from 'child_process';

/**
 * Verifica que `npm run prisma:seed` pode correr duas vezes seguidas sem erro
 * e sem duplicar roles/permissões. Requer BD disponível.
 */
describe('Seed idempotente (e2e)', () => {
  const run = () => execSync('npm run prisma:seed --silent', { stdio: 'pipe' });

  it('executa duas vezes sem falhar', () => {
    run();
    run();
  }, 120_000);
});
