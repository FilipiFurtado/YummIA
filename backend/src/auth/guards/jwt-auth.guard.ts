import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';

import { JwtService } from '@nestjs/jwt';
import type { Request } from 'express';

import { PrismaService } from '../../prisma/prisma.service.js';

export type AuthenticatedUser = {
  id: number;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'RESTAURANT_OWNER' | 'ADMIN';
};

export type AuthenticatedRequest = Request & {
  user: AuthenticatedUser;
};

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp()
      .getRequest<AuthenticatedRequest>();

    const authorization = request.headers.authorization;

    const [type, token] = authorization?.split(' ') ?? [];

    if (type !== 'Bearer' || !token) {
      throw new UnauthorizedException(
        'Token de autenticação não informado',
      );
    }

    let payload: { sub: number };

    try {
      payload = await this.jwt.verifyAsync<{ sub: number }>(token);
    } catch {
      throw new UnauthorizedException(
        'Token inválido ou expirado',
      );
    }

    if (!Number.isInteger(payload.sub)) {
      throw new UnauthorizedException('Token inválido');
    }

    const user = await this.prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        active: true,
      },
    });

    if (!user || !user.active) {
      throw new UnauthorizedException(
        'Usuário não encontrado ou inativo',
      );
    }

    request.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
    };

    return true;
  }
}