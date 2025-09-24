import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Request } from '@nestjs/common';
import { AuthService } from '../auth/auth.service';
import { UpdateUserDto } from '../auth/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly authService: AuthService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    return (this.authService as any).getUserById?.(userId) ?? { id: userId };
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Request() req: any, @Body() body: UpdateUserDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new Error('Unauthorized');
    return this.authService.updateUser(userId, body);
  }
}
