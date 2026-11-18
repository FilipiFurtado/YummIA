import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@Injectable()
export class AuthenticatedCartService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly cartService: CartService,
  ) {}

  private async getOrCreateCart(userId: number) {
    const existing = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
    });

    if (existing) return existing;

    try {
      return await this.prisma.cart.create({
        data: {
          userId,
          status: 'ACTIVE',
        },
      });
    } catch (error: unknown) {
      // Outra requisição pode ter criado o carrinho
      // simultaneamente. O índice único impede duplicação.
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'P2002'
      ) {
        const cart = await this.prisma.cart.findFirst({
          where: { userId, status: 'ACTIVE' },
        });

        if (cart) return cart;
      }

      throw error;
    }
  }

  async getMine(userId: number) {
    const cart = await this.getOrCreateCart(userId);
    return this.cartService.getCartById(cart.id);
  }

  async addItem(userId: number, dto: AddCartItemDto) {
  const cart = await this.getOrCreateCart(userId);

  const variant = await this.prisma.productVariant.findUnique({
    where: { id: dto.variantId },
    include: {
      product: {
        include: {
          restaurant: true,
        },
      },
    },
  });

  if (!variant) {
    throw new NotFoundException('Variante não encontrada');
  }

  if (!variant.available || !variant.product.restaurant.active) {
    throw new BadRequestException('Produto indisponível');
  }

  await this.prisma.$transaction(async (tx) => {
    const existing = await tx.cartItem.findUnique({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: dto.variantId,
        },
      },
    });

    const quantity = (existing?.quantity ?? 0) + dto.quantity;

    if (quantity > 20) {
      throw new BadRequestException(
        'Quantidade máxima de 20 unidades por variante',
      );
    }

    await tx.cartItem.upsert({
      where: {
        cartId_variantId: {
          cartId: cart.id,
          variantId: dto.variantId,
        },
      },
      create: {
        cartId: cart.id,
        variantId: dto.variantId,
        quantity: dto.quantity,
      },
      update: {
        quantity: { increment: dto.quantity },
      },
    });
  }, {
    isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
  });

  return this.getMine(userId);
}

async updateItem(
  userId: number,
  itemId: number,
  dto: UpdateCartItemDto,
) {
  const cart = await this.getOrCreateCart(userId);

  const result = await this.prisma.cartItem.updateMany({
    where: {
      id: itemId,
      cartId: cart.id,
    },
    data: {
      quantity: dto.quantity,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException(
      'Item não encontrado no carrinho do usuário',
    );
  }

  return this.getMine(userId);
}

async removeItem(userId: number, itemId: number) {
  const cart = await this.getOrCreateCart(userId);

  const result = await this.prisma.cartItem.deleteMany({
    where: {
      id: itemId,
      cartId: cart.id,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException('Item não encontrado');
  }

  return this.getMine(userId);
}

async clear(userId: number) {
  const cart = await this.getOrCreateCart(userId);

  await this.prisma.cartItem.deleteMany({
    where: { cartId: cart.id },
  });

  return this.getMine(userId);
}

private getGuestTokenHash(token: string): string {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    throw new UnauthorizedException(
      'Token de visitante inválido',
    );
  }

  return createHash('sha256')
    .update(token)
    .digest('hex');
}

async claimGuestCart(userId: number, guestToken: string) {
  const tokenHash = this.getGuestTokenHash(guestToken);

  let completed = false;

  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await this.prisma.$transaction(async (tx) => {

        // Localiza exclusivamente um carrinho de visitante.
        const guest = await tx.cart.findFirst({
          where: {
            tokenHash,
            userId: null,
            status: 'ACTIVE',
          },
        });

        if (!guest) {
          throw new UnauthorizedException(
            'Carrinho de visitante não encontrado ou já transferido',
          );
        }

        // Verifica se o cliente já possui carrinho ativo.
        const accountCart = await tx.cart.findFirst({
          where: {
            userId,
            status: 'ACTIVE',
          },
        });

        if (!accountCart) {
          // Não existe outro carrinho:
          // transfere a propriedade do próprio carrinho.
          await tx.cart.update({
            where: { id: guest.id },
            data: {
              userId,
              tokenHash: null,
            },
          });

          return;
        }

        // O usuário já tem carrinho:
        // precisamos transferir os itens do visitante.
        const guestItems = await tx.cartItem.findMany({
          where: { cartId: guest.id },
        });

        for (const item of guestItems) {
          const existingItem = await tx.cartItem.findUnique({
            where: {
              cartId_variantId: {
                cartId: accountCart.id,
                variantId: item.variantId,
              },
            },
          });

          const mergedQuantity =
            (existingItem?.quantity ?? 0) + item.quantity;

          if (mergedQuantity > 20) {
            throw new ConflictException(
              `Quantidade combinada excede 20 unidades para a variante ${item.variantId}`,
            );
          }

          await tx.cartItem.upsert({
            where: {
              cartId_variantId: {
                cartId: accountCart.id,
                variantId: item.variantId,
              },
            },
            create: {
              cartId: accountCart.id,
              variantId: item.variantId,
              quantity: item.quantity,
            },
            update: {
              quantity: {
                increment: item.quantity,
              },
            },
          });
        }

        // Somente após transferir todos os itens,
        // remove o carrinho de visitante.
        await tx.cart.delete({
          where: { id: guest.id },
        });

      }, {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 10000,
      });

      completed = true;
      break;

    } catch (error: unknown) {
      const code =
        typeof error === 'object' &&
        error !== null &&
        'code' in error
          ? String(error.code)
          : null;

      // P2034: conflito de escrita / serialização.
      // P2002: possível criação concorrente de carrinho ativo.
      if (
        (code === 'P2034' || code === 'P2002') &&
        attempt < 2
      ) {
        continue;
      }

      if (code === 'P2034' || code === 'P2002') {
        throw new ConflictException(
          'Conflito ao transferir o carrinho. Tente novamente.',
        );
      }

      throw error;
    }
  }

  if (!completed) {
    throw new ConflictException(
      'Não foi possível transferir o carrinho',
    );
  }

  return this.getMine(userId);
}
}