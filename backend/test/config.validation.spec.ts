import { envValidationSchema } from '../src/config/env.validation';

describe('Config validation', () => {
  const base = {
    DATABASE_URL: 'postgresql://u:p@localhost:5432/db',
    JWT_ACCESS_SECRET: 'a'.repeat(32),
    JWT_REFRESH_SECRET: 'b'.repeat(32),
  };

  it('aceita configuração válida', () => {
    const { error } = envValidationSchema.validate(base);
    expect(error).toBeUndefined();
  });

  it('rejeita segredo JWT curto', () => {
    const { error } = envValidationSchema.validate({ ...base, JWT_ACCESS_SECRET: 'curto' });
    expect(error).toBeDefined();
  });

  it('rejeita expiração mal formatada', () => {
    const { error } = envValidationSchema.validate({ ...base, JWT_ACCESS_EXPIRES_IN: 'quinze' });
    expect(error).toBeDefined();
  });

  it('rejeita DATABASE_URL não-postgres', () => {
    const { error } = envValidationSchema.validate({ ...base, DATABASE_URL: 'mysql://x' });
    expect(error).toBeDefined();
  });
});
