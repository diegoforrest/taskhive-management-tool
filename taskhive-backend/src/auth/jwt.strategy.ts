import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { AuthService } from './auth.service';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private authService: AuthService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: 'your-secret-key',
    });
  }

  async validate(payload: any) {
    try {
      // Validate user exists and return user object
      const user = await this.authService.validateUserForJwt(payload);
      return { 
        id: user.id,
        user_id: user.user_id, 
        email: user.email 
      };
    } catch (error) {
      throw new UnauthorizedException();
    }
  }
}