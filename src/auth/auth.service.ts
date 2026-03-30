import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User } from '../entities/user.entity';
import { JwtPayload } from '../common/types';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepo: Repository<User>,
    private jwtService: JwtService,
  ) {}

  private sanitizeUser(user: User) {
    const { password, deletedAt, ...rest } = user;
    return rest;
  }

  private generateToken(user: User): string {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      orgId: user.orgId,
    };
    return this.jwtService.sign(payload);
  }

  async login(email: string, password: string) {
    const user = await this.userRepo.findOne({
      where: { email, deletedAt: IsNull() },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    if (!user.isActive) {
      throw new UnauthorizedException('Account is deactivated');
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid credentials');
    }

    const token = this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
      needsPasswordChange: user.mustChangePassword,
    };
  }

  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ) {
    const user = await this.userRepo.findOneOrFail({
      where: { id: userId },
    });

    const isPasswordValid = await bcrypt.compare(currentPassword, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.mustChangePassword = false;
    await this.userRepo.save(user);

    const token = this.generateToken(user);

    return {
      token,
      user: this.sanitizeUser(user),
      needsPasswordChange: false,
    };
  }

  async getProfile(userId: string) {
    const user = await this.userRepo.findOne({
      where: { id: userId, deletedAt: IsNull() },
      relations: ['organization'],
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    return this.sanitizeUser(user);
  }

  async updateProfile(userId: string, data: { name?: string; phone?: string }) {
    const user = await this.userRepo.findOneOrFail({
      where: { id: userId },
    });

    if (data.name !== undefined) user.name = data.name;
    if (data.phone !== undefined) user.phone = data.phone;

    await this.userRepo.save(user);

    return this.sanitizeUser(user);
  }
}
