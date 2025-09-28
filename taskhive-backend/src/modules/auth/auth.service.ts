import { Injectable, ConflictException, UnauthorizedException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { User } from '../users/entities/user.entity';
import { PasswordResetToken } from './password-reset-token.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { RegisterDto, LoginDto } from './dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { UserManagementService, PasswordManagementService } from '../../application/services/user';
import logger, { log } from '../../logger';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(PasswordResetToken)
    private tokenRepository: Repository<PasswordResetToken>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private configService: ConfigService,
    private userManagementService: UserManagementService,
    private passwordManagementService: PasswordManagementService,
  ) {}

  async register(registerDto: RegisterDto): Promise<{
    success: boolean;
    message: string;
    user_id: number;
    email: string;
  }> {
    log.log(`🔄 Registration attempt: email=${registerDto.email}`);
    const { email, password, firstName, lastName } = registerDto;

    // Check if user already exists
    const existingUser = await this.userManagementService.findByEmail(email);
    if (existingUser) {
      log.warn(`❌ User already exists: email=${existingUser.email}`);
      throw new ConflictException('Email already exists');
    }

    // Hash password
    const hashedPassword = await this.passwordManagementService.hashPassword(password);

    // Create user (user_id will be auto-generated)
    const user = this.userRepository.create({
      email,
      password: hashedPassword,
      firstName,
      lastName,
    });

    const savedUser = await this.userRepository.save(user);
    log.log(`✅ User saved successfully: user_id=${savedUser.user_id} email=${savedUser.email}`);

    return {
      success: true,
      message: 'Member created successfully',
      user_id: savedUser.user_id,
      email: savedUser.email,
    };
  }

  async login(loginDto: LoginDto): Promise<{
    success: boolean;
    user: {
      user_id: number;
      email: string;
      firstName?: string;
      lastName?: string;
    };
    access_token: string;
    refresh_token: string;
  }> {
    const { user_id, password } = loginDto;

    // Find user by user_id (number) or email (string)
    let user: User;
    if (!isNaN(Number(user_id))) {
      // If user_id is numeric, search by user_id as number
      user = await this.userManagementService.findById(Number(user_id));
    } else {
      // If user_id is not numeric, search by email
      const foundUser = await this.userManagementService.findByEmail(user_id);
      if (!foundUser) {
        throw new UnauthorizedException('Invalid credentials');
      }
      user = foundUser;
    }

    // Check password
    const isPasswordValid = await this.passwordManagementService.comparePasswords(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    // Generate JWT token
    const roles = await this.userManagementService.getUserRoles(user.user_id);
    const payload: JwtPayload = {
      sub: user.user_id,
      user_id: user.user_id,
      email: user.email,
      roles,
    };

    const access_token = this.jwtService.sign(payload);

    // Create refresh token (random) and store its hash
    const crypto = await import('crypto');
    const rawRefresh = crypto.randomBytes(64).toString('hex');
    const refreshHash = await this.passwordManagementService.hashPassword(rawRefresh);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days

    const rtEntity = this.refreshTokenRepository.create({
      user_id: user.user_id,
      user,
      token_hash: refreshHash,
      expires_at: expiresAt,
      revoked: false,
    });
    await this.refreshTokenRepository.save(rtEntity);

    return {
      success: true,
      user: {
        user_id: user.user_id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
      access_token,
      refresh_token: rawRefresh,
    };
  }

  // Exchange a raw refresh token for a new access token
  async refreshToken(rawRefresh: string): Promise<{
    success: boolean;
    access_token: string;
  }> {
    try {
      // Find candidate tokens (not revoked, not expired)
      const tokens = await this.refreshTokenRepository.find({ where: { revoked: false } });
      let matched: RefreshToken | null = null;

      for (const t of tokens) {
        if (t.expires_at && t.expires_at.getTime() < Date.now()) continue;
        const ok = await this.passwordManagementService.comparePasswords(rawRefresh, t.token_hash);
        if (ok) {
          matched = t;
          break;
        }
      }

      if (!matched) throw new Error('Invalid refresh token');

      const user = await this.userManagementService.findById(matched.user_id);
      const roles = await this.userManagementService.getUserRoles(user.user_id);
      
      const payload: JwtPayload = {
        sub: user.user_id,
        user_id: user.user_id,
        email: user.email,
        roles,
      };

      const access_token = this.jwtService.sign(payload);
      return { success: true, access_token };
    } catch (e) {
      throw new Error('Invalid refresh token');
    }
  }

  async revokeRefreshToken(rawRefresh: string): Promise<{ success: boolean }> {
    const tokens = await this.refreshTokenRepository.find({ where: { revoked: false } });
    for (const t of tokens) {
      const ok = await this.passwordManagementService.comparePasswords(rawRefresh, t.token_hash);
      if (ok) {
        t.revoked = true;
        await this.refreshTokenRepository.save(t);
        return { success: true };
      }
    }
    return { success: false };
  }

  async findById(user_id: number): Promise<User | null> {
    return this.userManagementService.findById(user_id);
  }

  async findByUserId(user_id: number): Promise<User | null> {
    return this.userManagementService.findById(user_id);
  }

  // Password Reset Functionality
  async requestPasswordReset(email: string): Promise<{
    success: boolean;
    message: string;
    tid?: number;
    resetLink?: string;
  }> {
    try {
      const user = await this.userManagementService.findByEmail(email);
      
      // If user does not exist, return a clear message
      if (!user) {
        return { success: false, message: 'Email is not registered' };
      }

      // Rate-limit: do not allow creating a new token if one was created in the last 10 minutes
      const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
      const recentTokens = await this.tokenRepository
        .createQueryBuilder('t')
        .where('t.user_id = :uid', { uid: user.user_id })
        .andWhere('t.used = false')
        .andWhere('t.createdAt > :since', { since: tenMinutesAgo.toISOString() })
        .getCount();

      if (recentTokens > 0) {
        return { success: false, message: 'A reset link was recently sent. Please check your email.' };
      }

      // Generate a random token and store its hash
      const crypto = await import('crypto');
      const rawToken = crypto.randomBytes(32).toString('hex');
      const tokenHash = await this.passwordManagementService.hashPassword(rawToken);
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

      const tokenEntity = this.tokenRepository.create({
        user_id: user.user_id,
        user,
        token_hash: tokenHash,
        expires_at: expiresAt,
        used: false,
      });
      const saved = await this.tokenRepository.save(tokenEntity);

      const resetUrlBase = this.configService.get<string>('FRONTEND_URL', 'http://localhost:3000');
      const resetLink = `${resetUrlBase}/auth/reset-password?tid=${saved.id}&token=${encodeURIComponent(rawToken)}`;

      // TODO: Send email here (implement email service)
      log.warn('Password reset link (no provider configured): ' + resetLink);

      const response: any = { success: true, message: 'Reset link sent', tid: saved.id };
      
      // In development, expose the link
      const expose = this.configService.get<string>('DEV_EXPOSE_RESET_LINK', 'true');
      if (expose === 'true' || process.env.NODE_ENV !== 'production') {
        response.resetLink = resetLink;
      }
      
      return response;
    } catch (error) {
      log.error('Failed to request password reset: ' + (error?.message || String(error)));
      throw new Error(`Failed to request password reset: ${error.message}`);
    }
  }

  async validateResetToken(tid: number, token: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const rec = await this.tokenRepository.findOne({ where: { id: tid } });
      if (!rec) return { success: false, message: 'Invalid token' };
      if (rec.used) return { success: false, message: 'Token already used' };
      if (rec.expires_at && rec.expires_at.getTime() < Date.now()) {
        return { success: false, message: 'Token expired' };
      }
      
      const matches = await this.passwordManagementService.comparePasswords(token, rec.token_hash);
      if (!matches) return { success: false, message: 'Token invalid' };
      
      return { success: true, message: 'Token valid' };
    } catch (e) {
      log.error('validateResetToken error: ' + (e?.message || String(e)));
      return { success: false, message: 'Validation failed' };
    }
  }

  async resetPasswordWithId(tid: number, token: string, newPassword: string): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      if (!token) throw new BadRequestException('Missing token');

      const rec = await this.tokenRepository.findOne({ where: { id: tid } });
      if (!rec) throw new BadRequestException('Invalid or expired token');
      if (rec.used) throw new BadRequestException('Token already used');
      if (rec.expires_at && rec.expires_at.getTime() < Date.now()) {
        throw new BadRequestException('Token expired');
      }

      const matches = await this.passwordManagementService.comparePasswords(token, rec.token_hash);
      if (!matches) throw new BadRequestException('Invalid token');

      // Set new password using domain service
      await this.passwordManagementService.setPassword(rec.user_id, newPassword);

      // Mark token as used
      rec.used = true;
      await this.tokenRepository.save(rec);

      return { success: true, message: 'Password has been reset' };
    } catch (error) {
      throw new Error(`Failed to reset password: ${error.message}`);
    }
  }
}