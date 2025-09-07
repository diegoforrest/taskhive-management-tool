import { Injectable, ConflictException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from './entities/user.entity';
import { TestMemberPostDto } from '../auth/dto/test-member-post.dto';
import { TestMemberPatchDto } from '../auth/dto/test-member-patch.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async createMember(memberDto: TestMemberPostDto): Promise<User> {
    const existingUserById = await this.findByUserId(memberDto.user_id);
    if (existingUserById) {
      throw new ConflictException('User ID already exists');
    }

    const existingUserByEmail = await this.findByEmail(memberDto.email);
    if (existingUserByEmail) {
      throw new ConflictException('Email already exists');
    }

    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(memberDto.password, saltRounds);

    const user = this.userRepository.create({
      user_id: memberDto.user_id,
      email: memberDto.email,
      password: hashedPassword,
    });

    return this.userRepository.save(user);
  }

  async validateUserLogin(identifier: string, password: string): Promise<User | null> {
    // Try to find user by user_id first
    let user = await this.findByUserId(identifier);
    
    // If not found by user_id, try to find by email
    if (!user) {
      user = await this.findByEmail(identifier);
    }
    
    if (!user) {
      return null;
    }

    const isValidPassword = await this.validatePassword(password, user.password);
    if (!isValidPassword) {
      return null;
    }

    return user;
  }

  async updateMember(updateDto: TestMemberPatchDto): Promise<User> {
    const user = await this.findByUserId(updateDto.user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const isValidOldPassword = await this.validatePassword(updateDto.old_password, user.password);
    if (!isValidOldPassword) {
      throw new ConflictException('Old password is incorrect');
    }

    user.email = updateDto.email;
    const saltRounds = 12;
    user.password = await bcrypt.hash(updateDto.new_password, saltRounds);

    return this.userRepository.save(user);
  }

  async findByUserId(user_id: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { user_id } });
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({ where: { email } });
  }

  async findById(id: number): Promise<User | null> {
    return this.userRepository.findOne({ where: { id } });
  }

  async validatePassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
    return bcrypt.compare(plainPassword, hashedPassword);
  }

  async findAll(): Promise<User[]> {
    return this.userRepository.find();
  }

  async remove(user_id: string): Promise<void> {
    const user = await this.findByUserId(user_id);
    if (!user) {
      throw new NotFoundException('User not found');
    }
    await this.userRepository.delete({ user_id });
  }
}