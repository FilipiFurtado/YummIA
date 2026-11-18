import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';

import { CreateRestaurantDto } from './dto/create-restaurant.dto.js';
import { UpdateRestaurantDto } from './dto/update-restaurant.dto.js';

@Injectable()
export class RestaurantsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastrar um restaurante
  create(data: CreateRestaurantDto) {
    return this.prisma.restaurant.create({ data });
  }

  // Listar restaurantes ativos
  findAll(search?: string) {
    return this.prisma.restaurant.findMany({
      where: {
        active: true,
        ...(search
          ? {
              name: {
                contains: search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },
      orderBy: {
        name: 'asc',
      },
    });
  }

  // Consultar restaurante e produtos
  async findOne(id: number) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id },
      include: {
        products: {
          include: {
            variants: true,
          },
        },
      },
    });

    if (!restaurant) {
      throw new NotFoundException(
        `Restaurante ${id} não encontrado`,
      );
    }

    return restaurant;
  }

  // Atualizar restaurante
  async update(id: number, data: UpdateRestaurantDto) {
    await this.findOne(id);

    return this.prisma.restaurant.update({
      where: { id },
      data,
    });
  }

  // Exclusão lógica
  async remove(id: number) {
    await this.findOne(id);

    return this.prisma.restaurant.update({
      where: { id },
      data: { active: false },
    });
  }
}