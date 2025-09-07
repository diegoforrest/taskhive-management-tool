import { Controller, Post, Body, Get, Patch, HttpCode, HttpStatus, UnauthorizedException } from '@nestjs/common';
import { AuthService } from './auth.service';
import { UsersService } from '../users/users.service';
import { TestLoginDto } from './dto/test-login.dto';
import { TestMemberPostDto } from './dto/test-member-post.dto';
import { TestMemberPatchDto } from './dto/test-member-patch.dto';
import { SingleResponseDto } from './dto/single-response.dto';

@Controller()
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly usersService: UsersService,
  ) {}

  // POST /testlogin
  @Post('testlogin')
  @HttpCode(HttpStatus.OK)
  async testLogin(@Body() loginDto: TestLoginDto) {
    try {
      const user = await this.authService.validateUser(loginDto.user_id, loginDto.password);
      
      if (!user) {
        return {
          success: false,
          message: 'Invalid credentials'
        };
      }

      const result = await this.authService.login(user);
      
      return {
        success: result.success,
        user: {
          user_id: result.user_id,
          email: result.email
        },
        token: result.access_token
      };
    } catch (error) {
      return {
        success: false,
        message: error.message || 'Login failed'
      };
    }
  }

  // POST /test01/create_member
  @Post('test01/create_member')
  async createMember(@Body() memberDto: TestMemberPostDto): Promise<SingleResponseDto> {
    try {
      const user = await this.usersService.createMember(memberDto);
      
      return {
        data: {
          success: true,
          message: 'Member created successfully',
          user_id: user.user_id,
          email: user.email
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.message
        }
      };
    }
  }

  // GET /test01/get_all_member
  @Get('test01/get_all_member')
  async getAllMembers(): Promise<SingleResponseDto> {
    const users = await this.usersService.findAll();
    
    return {
      data: users.map(user => ({
        user_id: user.user_id,
        email: user.email,
        createdAt: user.createdAt
      }))
    };
  }

  // GET /test01/get_member (you might want to add query params for this)
  @Get('test01/get_member')
  async getMember(): Promise<SingleResponseDto> {
    // You might want to add query parameters to specify which member
    // For now, returning all members
    const users = await this.usersService.findAll();
    
    return {
      data: users.map(user => ({
        user_id: user.user_id,
        email: user.email,
        createdAt: user.createdAt
      }))
    };
  }

  // PATCH /test01/update_member
  @Patch('test01/update_member')
  async updateMember(@Body() updateDto: TestMemberPatchDto): Promise<SingleResponseDto> {
    try {
      const user = await this.usersService.updateMember(updateDto);
      
      return {
        data: {
          success: true,
          message: 'Member updated successfully',
          user_id: user.user_id,
          email: user.email
        }
      };
    } catch (error) {
      return {
        data: {
          success: false,
          message: error.message
        }
      };
    }
  }
}