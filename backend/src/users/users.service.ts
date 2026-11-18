import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: number) {
    return this.prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        createdAt: true,
      },
    });
  }

  async getAddresses(userId: number) {
    return this.prisma.address.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async createAddress(
    userId: number,
    dto: CreateAddressDto,
  ) {
    return this.prisma.address.create({
      data: {
        ...dto,
        userId,
      },
    });
  }

  async removeAddress(userId: number, addressId: number) {
    const result = await this.prisma.address.deleteMany({
      where: {
        id: addressId,
        userId,
      },
    });

    if (result.count === 0) {
      throw new NotFoundException(
        'Endereço não encontrado',
      );
    }

    return { message: 'Endereço removido' };
  }
}