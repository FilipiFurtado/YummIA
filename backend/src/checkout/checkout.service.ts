import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
} from '@nestjs/common';

import { createHash } from 'node:crypto';
import { isUUID } from 'class-validator';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

import { CreateOrderDto } from './dto/create-order.dto.js';

const DELIVERY_FEE = new Prisma.Decimal('7.00');

const cartInclude = {
  items: {
    include: {
      variant: {
        include: {
          product: {
            include: {
              restaurant: true,
            },
          },
        },
      },
    },
  },
} as const;

type CartLine = {
  quantity: number;
  variant: {
    id: number;
    name: string;
    price: { toString(): string };
    available: boolean;
    product: {
      name: string;
      restaurant: {
        id: number;
        name: string;
        active: boolean;
      };
    };
  };
};

type QuotedItem = {
  variantId: number;
  productName: string;
  variantName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
};

type RestaurantQuote = {
  restaurantId: number;
  restaurantName: string;
  subtotal: string;
  deliveryFee: string;
  total: string;
  items: QuotedItem[];
};

@Injectable()
export class CheckoutService {
  constructor(private readonly prisma: PrismaService) {}

  private calculateQuote(items: CartLine[], addressId: number) {
    if (items.length === 0) {
      throw new BadRequestException('Carrinho vazio');
    }

    const groups = new Map<number, {
      restaurantId: number;
      restaurantName: string;
      subtotal: Prisma.Decimal;
      items: QuotedItem[];
    }>();

    for (const item of items) {
      const variant = item.variant;
      const product = variant.product;
      const restaurant = product.restaurant;

      if (
        !variant.available ||
        !restaurant.active ||
        item.quantity < 1 ||
        item.quantity > 20
      ) {
        throw new ConflictException(
          `Item indisponível ou quantidade inválida: ${product.name}`,
        );
      }

      const unitPrice = new Prisma.Decimal(
        variant.price.toString(),
      );

      const lineTotal = unitPrice.mul(item.quantity);

      let group = groups.get(restaurant.id);

      if (!group) {
        group = {
          restaurantId: restaurant.id,
          restaurantName: restaurant.name,
          subtotal: new Prisma.Decimal(0),
          items: [],
        };

        groups.set(restaurant.id, group);
      }

      group.subtotal = group.subtotal.plus(lineTotal);

      group.items.push({
        variantId: variant.id,
        productName: product.name,
        variantName: variant.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
      });
    }

    let subtotal = new Prisma.Decimal(0);

    const restaurants: RestaurantQuote[] = Array.from(
      groups.values(),
    )
      .sort((a, b) => a.restaurantId - b.restaurantId)
      .map((group) => {
        subtotal = subtotal.plus(group.subtotal);

        group.items.sort(
          (a, b) => a.variantId - b.variantId,
        );

        return {
          restaurantId: group.restaurantId,
          restaurantName: group.restaurantName,
          subtotal: group.subtotal.toFixed(2),
          deliveryFee: DELIVERY_FEE.toFixed(2),
          total: group.subtotal.plus(DELIVERY_FEE).toFixed(2),
          items: group.items,
        };
      });

    const deliveryTotal = DELIVERY_FEE.mul(
      restaurants.length,
    );

    const total = subtotal.plus(deliveryTotal);

    const summary = {
      addressId,
      restaurants,
      subtotal: subtotal.toFixed(2),
      deliveryTotal: deliveryTotal.toFixed(2),
      total: total.toFixed(2),
      currency: 'BRL',
    };

    const quoteHash = createHash('sha256')
      .update(JSON.stringify(summary))
      .digest('hex');

    return {
      ...summary,
      quoteHash,
    };
  }
  async getQuote(userId: number, addressId: number) {
    const address = await this.prisma.address.findFirst({
      where: {
        id: addressId,
        userId,
      },
    });

    if (!address) {
      throw new NotFoundException(
        'Endereço não encontrado para este usuário',
      );
    }

    const cart = await this.prisma.cart.findFirst({
      where: {
        userId,
        status: 'ACTIVE',
      },
      include: cartInclude,
    });

    if (!cart) {
      throw new BadRequestException(
        'Nenhum carrinho ativo encontrado',
      );
    }

    return this.calculateQuote(cart.items, addressId);
  }

    async createOrder(
    userId: number,
    dto: CreateOrderDto,
    idempotencyKey: string,
  ) {
    if (!isUUID(idempotencyKey, '4')) {
      throw new BadRequestException(
        'Idempotency-Key deve ser um UUID v4',
      );
    }

    // Identifica o conteúdo da requisição original.
    const requestFingerprint = createHash('sha256')
      .update(JSON.stringify({
        addressId: dto.addressId,
        expectedTotal: dto.expectedTotal,
        quoteHash: dto.quoteHash,
      }))
      .digest('hex');

    const orderInclude = {
      restaurantOrders: {
        include: {
          items: true,
        },
      },
    } as const;

    // Uma chave repetida só pode reutilizar a mesma requisição.
    const checkPrevious = async () => {
      const previous = await this.prisma.order.findUnique({
        where: {
          userId_idempotencyKey: {
            userId,
            idempotencyKey,
          },
        },
        include: orderInclude,
      });

      if (
        previous &&
        previous.requestFingerprint !== requestFingerprint
      ) {
        throw new ConflictException(
          'Idempotency-Key reutilizada com dados diferentes',
        );
      }

      return previous;
    };

    const previous = await checkPrevious();

    if (previous) {
      return previous;
    }

    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        return await this.prisma.$transaction(
          async (tx) => {
            const address = await tx.address.findFirst({
              where: {
                id: dto.addressId,
                userId,
              },
            });

            if (!address) {
              throw new NotFoundException(
                'Endereço de entrega não encontrado',
              );
            }

            const cart = await tx.cart.findFirst({
              where: {
                userId,
                status: 'ACTIVE',
              },
              include: cartInclude,
            });

            if (!cart) {
              throw new ConflictException(
                'Nenhum carrinho ativo para finalizar',
              );
            }

            // Recalcula todos os valores dentro da transação.
            const quote = this.calculateQuote(
              cart.items,
              dto.addressId,
            );

            const expectedTotal = new Prisma.Decimal(
              dto.expectedTotal,
            );

            if (
              !expectedTotal.equals(quote.total) ||
              quote.quoteHash !== dto.quoteHash
            ) {
              throw new ConflictException(
                'A cotação foi alterada. Consulte os valores novamente.',
              );
            }

            // Impede reutilizar o carrinho depois da compra.
            const updated = await tx.cart.updateMany({
              where: {
                id: cart.id,
                userId,
                status: 'ACTIVE',
              },
              data: {
                status: 'CHECKED_OUT',
              },
            });

            if (updated.count !== 1) {
              throw new ConflictException(
                'Carrinho já finalizado',
              );
            }

            // Cria o pedido geral e os pedidos por restaurante.
            return tx.order.create({
              data: {
                user: {
                  connect: { id: userId },
                },

                status: 'CREATED',

                subtotal: quote.subtotal,
                deliveryTotal: quote.deliveryTotal,
                total: quote.total,

                addressSnapshot: {
                  label: address.label,
                  street: address.street,
                  number: address.number,
                  neighborhood: address.neighborhood,
                  complement: address.complement,
                  city: address.city,
                  state: address.state,
                  postalCode: address.postalCode,
                },

                idempotencyKey,
                requestFingerprint,

                restaurantOrders: {
                  create: quote.restaurants.map((restaurant) => ({
                    restaurant: {
                      connect: {
                        id: restaurant.restaurantId,
                      },
                    },

                    restaurantName: restaurant.restaurantName,

                    subtotal: restaurant.subtotal,
                    deliveryFee: restaurant.deliveryFee,
                    total: restaurant.total,

                    items: {
                      create: restaurant.items.map((item) => ({
                        variantId: item.variantId,
                        productName: item.productName,
                        variantName: item.variantName,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        lineTotal: item.lineTotal,
                      })),
                    },
                  })),
                },
              },

              include: orderInclude,
            });
          },
          {
            isolationLevel:
              Prisma.TransactionIsolationLevel.Serializable,
            maxWait: 5000,
            timeout: 10000,
          },
        );
      } catch (error: unknown) {
        const code =
          typeof error === 'object' &&
          error !== null &&
          'code' in error
            ? String(error.code)
            : null;

        // Repetição da requisição ou conflito concorrente.
        if (code === 'P2034' || code === 'P2002') {
          const existing = await checkPrevious();

          if (existing) {
            return existing;
          }

          if (attempt < 2) {
            continue;
          }

          throw new ConflictException(
            'Conflito ao registrar pedido. Tente novamente.',
          );
        }

        throw error;
      }
    }

    throw new ConflictException(
      'Não foi possível registrar o pedido',
    );
  }

    async findAllOrders(userId: number) {
    return this.prisma.order.findMany({
      where: {
        userId,
      },

      include: {
        restaurantOrders: {
          include: {
            items: true,
          },
        },
      },

      orderBy: {
        createdAt: 'desc',
      },
    });
  }

  async findOneOrder(userId: number, orderId: number) {
    const order = await this.prisma.order.findFirst({
      where: {
        id: orderId,
        userId,
      },

      include: {
        restaurantOrders: {
          include: {
            items: true,
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(
        'Pedido não encontrado',
      );
    }

    return order;
  }
}