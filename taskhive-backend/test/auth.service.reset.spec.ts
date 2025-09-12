import { Test } from '@nestjs/testing';
import { AuthService } from '../src/auth/auth.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../src/entities/user.entity';
import { PasswordResetToken } from '../src/auth/password-reset-token.entity';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';

describe('AuthService - password reset', () => {
  let service: AuthService;
  let userRepo: Partial<Record<keyof Repository<User>, jest.Mock>>;
  let tokenRepo: Partial<Record<keyof Repository<PasswordResetToken>, jest.Mock>>;

  beforeEach(async () => {
    userRepo = {
      findOne: jest.fn(),
      update: jest.fn(),
    } as any;
    tokenRepo = {
      create: jest.fn(),
      save: jest.fn(),
      find: jest.fn(),
    } as any;

    const moduleRef = await Test.createTestingModule({
      providers: [
        AuthService,
        { provide: getRepositoryToken(User), useValue: userRepo },
        { provide: getRepositoryToken(PasswordResetToken), useValue: tokenRepo },
        { provide: JwtService, useValue: { sign: jest.fn().mockReturnValue('signed') } },
        { provide: ConfigService, useValue: { get: (k: string) => (k === 'FRONTEND_URL' ? 'http://localhost:3000' : undefined) } },
      ],
    }).compile();

    service = moduleRef.get(AuthService);
  });

  it('returns not registered for unknown email', async () => {
    (userRepo.findOne as jest.Mock).mockResolvedValue(null);
    const res = await service.requestPasswordReset('missing@example.com');
    expect(res).toEqual({ success: false, message: 'Email is not registered' });
  });

  it('creates token for registered user', async () => {
    const fakeUser = { user_id: 1, email: 'u@example.com', firstName: 'U' } as any;
    (userRepo.findOne as jest.Mock).mockResolvedValue(fakeUser);
    (tokenRepo.create as jest.Mock).mockImplementation((x) => x);
    (tokenRepo.save as jest.Mock).mockImplementation(async (t) => ({ id: 1, ...t }));

    const res = await service.requestPasswordReset('u@example.com');
    expect(res).toHaveProperty('success', true);
    expect(tokenRepo.save).toHaveBeenCalled();
  });

  it('resetPassword fails with invalid token', async () => {
    (tokenRepo.find as jest.Mock).mockResolvedValue([]);
    await expect(service.resetPassword('badtoken', 'newpassword123')).rejects.toThrow();
  });
});
