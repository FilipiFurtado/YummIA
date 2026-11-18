import {
  Injectable,
  ConflictException,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';

import { PrismaService } from '../prisma/prisma.service.js';
import { RegisterDto } from './dto/register.dto.js';
import { LoginDto } from './dto/login.dto.js';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
  ) {}

  private async createSession(user: {
    id: number;
    name: string;
    email: string;
    role: string;
  }) {
    const accessToken = await this.jwt.signAsync({
      sub: user.id,
    });

    return {
      accessToken,
      tokenType: 'Bearer',
      user,
    };
  }

  async register(dto: RegisterDto) {
    const email = dto.email.trim().toLowerCase();

    const existing = await this.prisma.user.findUnique({
      where: { email },
    });

    if (existing) {
      throw new ConflictException('Email já cadastrado');
    }

    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 19456,
      timeCost: 2,
      parallelism: 1,
    });

    let user;

    try {
      user = await this.prisma.user.create({
        data: {
          name: dto.name.trim(),
          email,
          passwordHash,
          role: 'CUSTOMER',
        },
        select: {
          id: true,
          name: true,
          email: true,
          role: true,
        },
      });
    } catch (error: unknown) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        throw new ConflictException('Email já cadastrado');
      }

      throw error;
    }

    return this.createSession(user);
  }

  async login(dto: LoginDto) {
    const email = dto.email.trim().toLowerCase();

    const user = await this.prisma.user.findUnique({
      where: { email },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    const validPassword = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!validPassword) {
      throw new UnauthorizedException('Credenciais inválidas');
    }

    return this.createSession({
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    });
  }
}