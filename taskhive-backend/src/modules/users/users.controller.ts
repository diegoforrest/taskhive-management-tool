import { Controller, Post, Get, Body, Param, HttpCode, HttpStatus, UseGuards, Request, UnauthorizedException } from '@nestjs/common';
import { UserManagementService } from '../../application/services/user/user-management.service';
import { UpdateUserDto } from '../auth/dto';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly userManagementService: UserManagementService) {}

  @Get('me')
  @HttpCode(HttpStatus.OK)
  me(@Request() req: any) {
    const userId = req.user?.user_id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    // Delegate to UserManagementService for proper separation of concerns
    return this.userManagementService.findById(userId);
  }

  @Post('update')
  @HttpCode(HttpStatus.OK)
  update(@Request() req: any, @Body() body: UpdateUserDto) {
    const userId = req.user?.user_id;
    if (!userId) throw new UnauthorizedException('User not authenticated');
    
    // Delegate to UserManagementService for proper separation of concerns
    return this.userManagementService.updateProfile(userId, body);
  }
}
