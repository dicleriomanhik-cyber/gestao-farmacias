import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcrypt';
import { UsersService } from '../src/modules/users/users.service';

describe('UsersService (unit)', () => {
  const repo = {
    findByEmailWithAuth: jest.fn(),
    findByIdWithAuth: jest.fn(),
  } as unknown as import('../src/modules/users/users.repository').UsersRepository;

  const config = {
    get: (k: string) => (k === 'bcryptSaltRounds' ? 4 : undefined),
  } as unknown as ConfigService;

  const service = new UsersService(repo, config);

  it('hashPassword devolve hash verificável', async () => {
    const hash = await service.hashPassword('S3nh4Forte!');
    expect(hash).not.toBe('S3nh4Forte!');
    await expect(bcrypt.compare('S3nh4Forte!', hash)).resolves.toBe(true);
  });

  it('validateCredentials lança Unauthorized quando não existe', async () => {
    (repo.findByEmailWithAuth as jest.Mock).mockResolvedValueOnce(null);
    await expect(service.validateCredentials('x@y.z', 'abc')).rejects.toThrow(
      'Credenciais inválidas.',
    );
  });
});
