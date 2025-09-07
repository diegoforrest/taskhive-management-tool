import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { UsersService } from '../users/users.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly usersService: UsersService,
    private readonly jwtService: JwtService,
  ) {}

  async validateUser(userId: string, password: string): Promise<any> {
    const user = await this.usersService.validateUserLogin(userId, password);
    if (user) {
      return user;
    }
    return null;
  }

  async login(user: any) {
    const payload = { 
      user_id: user.user_id, 
      email: user.email,
      sub: user.id 
    };
    
    return {
      success: true,
      user_id: user.user_id,
      email: user.email,
      access_token: this.jwtService.sign(payload),
    };
  }

  async validateUserForJwt(payload: any) {
    const user = await this.usersService.findByUserId(payload.user_id);
    if (!user) {
      throw new UnauthorizedException();
    }
    return user;
  }
}