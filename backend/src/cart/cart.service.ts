import {
  Injectable,
  UnauthorizedException,
  NotFoundException,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';

import { randomBytes, createHash } from 'node:crypto';
import { Decimal } from 'decimal.js';

import { PrismaService } from '../prisma/prisma.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

type CartItemView = {
  cartItemId: number;
  productId: number;
  productName: string;
  variantId: number;
  variantName: string;
  quantity: number;
  unitPrice: string;
  lineTotal: string;
  available: boolean;
};

type RestaurantGroup = {
  restaurantId: number;
  restaurantName: string;
  subtotal: Decimal;
  items: CartItemView[];
};

@Injectable()
export class CartService {
  constructor(private readonly prisma: PrismaService) {}

  async create() {
  const token = randomBytes(32).toString('hex');

  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex');

  const cart = await this.prisma.cart.create({
    data: { tokenHash },
  });

  return {
    cartId: cart.id,
    cartToken: token,
    status: cart.status,
  };
}

  private async requireCart(token?: string) {
  if (!token || !/^[0-9a-f]{64}$/i.test(token)) {
    throw new UnauthorizedException(
      'Token do carrinho ausente ou inválido',
    );
  }

  const tokenHash = createHash('sha256')
    .update(token)
    .digest('hex');

  const cart = await this.prisma.cart.findUnique({
    where: { tokenHash },
  });

  if (!cart || cart.userId !== null) {
  throw new UnauthorizedException(
    'Token de visitante inválido ou revogado',
  );
}

if (cart.status !== 'ACTIVE') {
  throw new ConflictException(
    'Este carrinho não está mais ativo',
  );
}

return cart;
}

async getCart(token: string) {
  const cart = await this.requireCart(token);
  return this.getCartById(cart.id);
}

  async getCartById(cartId: string) {
  const cart = await this.prisma.cart.findUniqueOrThrow({
    where: { id: cartId }
  });

  const cartItems = await this.prisma.cartItem.findMany({
    where: {
      cartId: cart.id,
    },

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
  });

  const groups = new Map<number, RestaurantGroup>();

  let total = new Decimal(0);
  let totalQuantity = 0;

  for (const item of cartItems) {
    const variant = item.variant;
    const product = variant.product;
    const restaurant = product.restaurant;

    const unitPrice = new Decimal(variant.price.toString());

    const lineTotal = unitPrice.mul(item.quantity);

    total = total.plus(lineTotal);
    totalQuantity += item.quantity;

    let group = groups.get(restaurant.id);

    if (!group) {
      group = {
        restaurantId: restaurant.id,
        restaurantName: restaurant.name,
        subtotal: new Decimal(0),
        items: [],
      };

      groups.set(restaurant.id, group);
    }

    group.subtotal = group.subtotal.plus(lineTotal);

    group.items.push({
      cartItemId: item.id,
      productId: product.id,
      productName: product.name,
      variantId: variant.id,
      variantName: variant.name,
      quantity: item.quantity,
      unitPrice: unitPrice.toFixed(2),
      lineTotal: lineTotal.toFixed(2),
      available: variant.available && restaurant.active,
    });
  }

  return {
    cartId: cart.id,
    status: cart.status,
    totalQuantity,
    restaurants: Array.from(groups.values()).map((group) => ({
      restaurantId: group.restaurantId,
      restaurantName: group.restaurantName,
      subtotal: group.subtotal.toFixed(2),
      items: group.items,
    })),
    subtotal: total.toFixed(2),
    currency: 'BRL',
  };
}

  async addItem(token: string, dto: AddCartItemDto) {
  const cart = await this.requireCart(token);

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
    throw new BadRequestException(
      'Produto indisponível para compra',
    );
  }

  await this.prisma.cartItem.upsert({
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
      quantity: {
        increment: dto.quantity,
      },
    },
  });

  return this.getCart(token);
}

  async updateItem(
  token: string,
  itemId: number,
  dto: UpdateCartItemDto,
) {
  const cart = await this.requireCart(token);

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
      'Item não encontrado neste carrinho',
    );
  }

  return this.getCart(token);
}

  async removeItem(token: string, itemId: number) {
  const cart = await this.requireCart(token);

  const result = await this.prisma.cartItem.deleteMany({
    where: {
      id: itemId,
      cartId: cart.id,
    },
  });

  if (result.count === 0) {
    throw new NotFoundException(
      'Item não encontrado neste carrinho',
    );
  }

  return this.getCart(token);
}

  async clear(token: string) {
  const cart = await this.requireCart(token);

  await this.prisma.cartItem.deleteMany({
    where: {
      cartId: cart.id,
    },
  });

  return this.getCart(token);
}
}