import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service.js';
import { CreateProductDto } from './dto/create-product.dto.js';
import { ListProductsDto } from './dto/list-products.dto.js';

@Injectable()
export class ProductsService {
  constructor(private readonly prisma: PrismaService) {}

  // Cadastrar produto e variantes
  async create(dto: CreateProductDto) {
    const restaurant = await this.prisma.restaurant.findUnique({
      where: { id: dto.restaurantId },
    });

    if (!restaurant || !restaurant.active) {
      throw new NotFoundException(
        'Restaurante não encontrado ou inativo',
      );
    }

    return this.prisma.product.create({
      data: {
        name: dto.name,
        description: dto.description,

        restaurant: {
          connect: { id: dto.restaurantId },
        },

        variants: {
          create: dto.variants.map((variant) => ({
            name: variant.name,
            price: variant.price,
            available: variant.available ?? true,
          })),
        },
      },

      include: {
        variants: true,
      },
    });
  }

  // Listar e pesquisar produtos
  findAll(query: ListProductsDto) {
    return this.prisma.product.findMany({
      where: {
        restaurant: {
          is: {
            active: true,
          },
        },

        ...(query.restaurantId
          ? { restaurantId: query.restaurantId }
          : {}),

        ...(query.search
          ? {
              name: {
                contains: query.search,
                mode: 'insensitive' as const,
              },
            }
          : {}),
      },

      include: {
        restaurant: {
          select: {
            id: true,
            name: true,
          },
        },
        variants: true,
      },
    });
  }

  // Consultar um produto específico
  async findOne(id: number) {
    const product = await this.prisma.product.findUnique({
      where: { id },
      include: {
        restaurant: true,
        variants: true,
      },
    });

    if (!product) {
      throw new NotFoundException(
        `Produto ${id} não encontrado`,
      );
    }

    return product;
  }
}