import {
  BadRequestException,
  ConflictException,
  GoneException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { z } from 'zod';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

const changeSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    targetQuantity: z.number().int().min(0).max(20),
  }).strict()).min(1).max(8),
}).strict();

const proposalSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(8),
}).strict();

// Remocao relativa: quantity e numero de unidades a retirar, NAO quantidade final.
const removalSchema = z.object({
  items: z.array(z.object({
    variantId: z.number().int().positive(),
    quantity: z.number().int().min(1).max(20),
  }).strict()).min(1).max(8),
}).strict();

type ProposalForSerialization = {
  id: string;
  status: string;
  expiresAt: Date;
  items: {
    variantId: number;
    productName: string;
    variantName: string;
    restaurantName: string;
    quantity: number;
    unitPrice: Prisma.Decimal;
    action: 'ADD' | 'SET_QUANTITY';
    expectedQuantity: number | null;
    targetQuantity: number | null;
  }[];
};

@Injectable()
export class AssistantCartProposalsService {
  constructor(private readonly prisma: PrismaService) {}

  private serialize(proposal: ProposalForSerialization) {
    const subtotal = proposal.items.reduce(
      (total, item) => total.plus(item.unitPrice.mul(item.quantity)),
      new Prisma.Decimal(0),
    );

    return {
      id: proposal.id,
      status: proposal.status,
      expiresAt: proposal.expiresAt.toISOString(),
      items: proposal.items.map((item) => ({
        variantId: item.variantId,
        productName: item.productName,
        variantName: item.variantName,
        restaurantName: item.restaurantName,
        quantity: item.quantity,
        unitPrice: item.unitPrice.toFixed(2),
        lineTotal: item.unitPrice.mul(item.quantity).toFixed(2),
        action: item.action,
        currentQuantity: item.expectedQuantity,
        targetQuantity: item.targetQuantity,
      })),
      subtotal: subtotal.toFixed(2),
      currency: 'BRL',
    };
  }

  async propose(
    userId: number,
    conversationId: string,
    rawArguments: unknown,
    searchedVariantIds: Set<number>,
  ) {
    const { items } = proposalSchema.parse(rawArguments);
    const quantities = new Map<number, number>();

    for (const item of items) {
      if (!searchedVariantIds.has(item.variantId)) {
        throw new BadRequestException(
          `A variante ${item.variantId} não foi encontrada na busca desta mensagem.`,
        );
      }
      const quantity = (quantities.get(item.variantId) ?? 0) + item.quantity;
      if (quantity > 20) {
        throw new BadRequestException('Quantidade máxima de 20 por variante.');
      }
      quantities.set(item.variantId, quantity);
    }

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.assistantConversation.findFirst({
        where: { id: conversationId, userId },
        select: { id: true },
      });
      if (!conversation) {
        throw new NotFoundException('Conversa não encontrada.');
      }

      const variants = await tx.productVariant.findMany({
        where: {
          id: { in: [...quantities.keys()] },
          available: true,
          product: { is: { restaurant: { is: { active: true } } } },
        },
        include: { product: { include: { restaurant: true } } },
      });

      if (variants.length !== quantities.size) {
        throw new ConflictException('Um ou mais produtos não estão disponíveis.');
      }

      // Mantemos apenas a última proposta pendente da conversa.
      await tx.cartProposal.updateMany({
        where: { userId, conversationId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      const created = await tx.cartProposal.create({
        data: {
          userId,
          conversationId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: {
            create: variants.map((variant) => ({
              variantId: variant.id,
              productName: variant.product.name,
              variantName: variant.name,
              restaurantName: variant.product.restaurant.name,
              quantity: quantities.get(variant.id)!,
              unitPrice: variant.price,
            })),
          },
        },
        include: { items: true },
      });

      return this.serialize(created);
    }, { isolationLevel: Prisma.TransactionIsolationLevel.Serializable });
  }

  // Define a quantidade final de cada variante. Também permite reduzir e remover.
  // Exige que cada variantId tenha sido visto em search_products, compare_products
  // ou get_cart NESTA chamada do modelo.
  async proposeChanges(
    userId: number,
    conversationId: string,
    rawArguments: unknown,
    seenVariantIds: Set<number>,
  ) {
    const { items } = changeSchema.parse(rawArguments);
    const ids = items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Não repita uma variante na mesma proposta.');
    }
    for (const id of ids) {
      if (!seenVariantIds.has(id)) {
        throw new BadRequestException(
          `A variante ${id} deve ser consultada antes da proposta.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.assistantConversation.findFirst({
        where: { id: conversationId, userId }, select: { id: true },
      });
      if (!conversation) throw new NotFoundException('Conversa não encontrada.');

      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: { items: { where: { variantId: { in: ids } } } },
      });

      const existingQuantity = new Map<number, number>(
        (cart?.items ?? []).map((item) => [item.variantId, item.quantity]),
      );

      const variants = await tx.productVariant.findMany({
        where: { id: { in: ids } },
        include: { product: { include: { restaurant: true } } },
      });
      if (variants.length !== ids.length) {
        throw new NotFoundException('Uma variante não foi encontrada.');
      }

      const byId = new Map(variants.map((variant) => [variant.id, variant]));
      const changes = [] as {
        variantId: number;
        productName: string;
        variantName: string;
        restaurantName: string;
        quantity: number;
        unitPrice: Prisma.Decimal;
        action: 'SET_QUANTITY';
        expectedQuantity: number;
        targetQuantity: number;
      }[];

      for (const item of items) {
        const variant = byId.get(item.variantId)!;
        const current = existingQuantity.get(item.variantId) ?? 0;
        if (item.targetQuantity === current) continue;

        // Só é possível aumentar uma variante disponível em restaurante ativo.
        if (
          item.targetQuantity > current &&
          (!variant.available || !variant.product.restaurant.active)
        ) {
          throw new ConflictException(
            `A variante ${item.variantId} não está disponível para inclusão.`,
          );
        }

        changes.push({
          variantId: item.variantId,
          productName: variant.product.name,
          variantName: variant.name,
          restaurantName: variant.product.restaurant.name,
          quantity: item.targetQuantity,
          unitPrice: variant.price,
          action: 'SET_QUANTITY',
          expectedQuantity: current,
          targetQuantity: item.targetQuantity,
        });
      }

      if (changes.length === 0) {
        throw new BadRequestException(
          'O carrinho já possui exatamente as quantidades solicitadas.',
        );
      }

      await tx.cartProposal.updateMany({
        where: { userId, conversationId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      const created = await tx.cartProposal.create({
        data: {
          userId,
          conversationId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: { create: changes },
        },
        include: { items: true },
      });

      return this.serialize(created);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  // Remove uma quantidade RELATIVA, calculando a quantidade restante no backend.
  async proposeRemovals(
    userId: number,
    conversationId: string,
    rawArguments: unknown,
    cartVariantIds: Set<number>,
  ) {
    const { items } = removalSchema.parse(rawArguments);
    const ids = items.map((item) => item.variantId);
    if (new Set(ids).size !== ids.length) {
      throw new BadRequestException('Nao repita uma variante na mesma proposta.');
    }
    for (const id of ids) {
      if (!cartVariantIds.has(id)) {
        throw new BadRequestException(
          `A variante ${id} precisa ter sido obtida por get_cart nesta mensagem.`,
        );
      }
    }

    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.assistantConversation.findFirst({
        where: { id: conversationId, userId }, select: { id: true },
      });
      if (!conversation) throw new NotFoundException('Conversa nao encontrada.');

      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          items: {
            where: { variantId: { in: ids } },
            include: {
              variant: { include: { product: { include: { restaurant: true } } } },
            },
          },
        },
      });
      if (!cart) throw new BadRequestException('O carrinho esta vazio.');

      const byId = new Map(cart.items.map((item) => [item.variantId, item]));
      const changes = items.map((requested) => {
        const existing = byId.get(requested.variantId);
        if (!existing) {
          throw new BadRequestException(
            `A variante ${requested.variantId} nao esta no carrinho.`,
          );
        }
        if (requested.quantity > existing.quantity) {
          throw new BadRequestException(
            `Nao e possivel remover ${requested.quantity} unidade(s): ` +
            `ha apenas ${existing.quantity} no carrinho.`,
          );
        }
        const variant = existing.variant;
        return {
          variantId: requested.variantId,
          productName: variant.product.name,
          variantName: variant.name,
          restaurantName: variant.product.restaurant.name,
          quantity: existing.quantity - requested.quantity,
          unitPrice: variant.price,
          action: 'SET_QUANTITY' as const,
          expectedQuantity: existing.quantity,
          targetQuantity: existing.quantity - requested.quantity,
        };
      });

      await tx.cartProposal.updateMany({
        where: { userId, conversationId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });

      const created = await tx.cartProposal.create({
        data: {
          userId,
          conversationId,
          status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: { create: changes },
        },
        include: { items: true },
      });
      return this.serialize(created);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  async cancelPending(userId: number, conversationId: string) {
    await this.prisma.cartProposal.updateMany({
      where: { userId, conversationId, status: 'PENDING' },
      data: { status: 'CANCELLED' },
    });
  }

  // Prepara a remoção integral do carrinho como UMA proposta transacional.
  // Não elimina nenhum item até POST /assistant/proposals/:id/confirm.
  async proposeClearCart(userId: number, conversationId: string) {
    return this.prisma.$transaction(async (tx) => {
      const conversation = await tx.assistantConversation.findFirst({
        where: { id: conversationId, userId }, select: { id: true },
      });
      if (!conversation) throw new NotFoundException('Conversa não encontrada.');

      // Esvaziar é um pedido explícito que substitui propostas pendentes.
      // A substituição é registrada na mesma transação, antes da nova proposta.

      const cart = await tx.cart.findFirst({
        where: { userId, status: 'ACTIVE' },
        include: {
          items: {
            include: {
              variant: {
                include: { product: { include: { restaurant: true } } },
              },
            },
          },
        },
      });
      if (!cart || cart.items.length === 0) {
        throw new BadRequestException('O carrinho já está vazio.');
      }
      if (cart.items.length > 100) {
        throw new BadRequestException(
          'O carrinho contém mais de 100 variantes. Utilize o gerenciamento manual.',
        );
      }

      const changes = cart.items.map((item) => ({
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        restaurantName: item.variant.product.restaurant.name,
        quantity: 0,
        unitPrice: item.variant.price,
        action: 'SET_QUANTITY' as const,
        expectedQuantity: item.quantity,
        targetQuantity: 0,
      }));

      await tx.cartProposal.updateMany({
        where: { userId, conversationId, status: 'PENDING' },
        data: { status: 'CANCELLED' },
      });
      const proposal = await tx.cartProposal.create({
        data: {
          userId, conversationId, status: 'PENDING',
          expiresAt: new Date(Date.now() + 15 * 60 * 1000),
          items: { create: changes },
        },
        include: { items: true },
      });
      return this.serialize(proposal);
    }, {
      isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
      maxWait: 5000,
      timeout: 10000,
    });
  }

  async getLatestPending(userId: number, conversationId: string) {
    const proposal = await this.prisma.cartProposal.findFirst({
      where: {
        userId,
        conversationId,
        status: 'PENDING',
        expiresAt: { gt: new Date() },
      },
      include: { items: true },
      orderBy: { createdAt: 'desc' },
    });

    return proposal ? this.serialize(proposal) : null;
  }

  async confirm(userId: number, proposalId: string) {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        const outcome = await this.prisma.$transaction(async (tx) => {
          const proposal = await tx.cartProposal.findFirst({
            where: { id: proposalId, userId },
            include: { items: true },
          });

          if (!proposal) {
            throw new NotFoundException('Proposta não encontrada.');
          }
          if (proposal.status === 'CONFIRMED') {
            return { alreadyConfirmed: true };
          }
          if (proposal.status !== 'PENDING') {
            throw new ConflictException('Proposta indisponível para confirmação.');
          }
          if (proposal.expiresAt <= new Date()) {
            throw new GoneException('Proposta expirada. Solicite uma nova.');
          }

          const variants = await tx.productVariant.findMany({
            where: { id: { in: proposal.items.map((item) => item.variantId) } },
            include: { product: { include: { restaurant: true } } },
          });

          if (variants.length !== proposal.items.length) {
            throw new ConflictException('Uma variante deixou de existir.');
          }
          const variantById = new Map(variants.map((variant) => [variant.id, variant]));

          // Preço e disponibilidade são revalidados em todos os itens.
          for (const item of proposal.items) {
            const variant = variantById.get(item.variantId);
            if (!variant) {
              throw new ConflictException('Uma variante deixou de existir.');
            }
            // Remoções/reduções não devem ser impedidas por mudança de preço.
            // Aumento e adição exigem a mesma cotação que foi apresentada.
            const increases = item.action === 'ADD' ||
              (item.targetQuantity !== null && item.expectedQuantity !== null &&
                item.targetQuantity > item.expectedQuantity);
            if (increases && !variant.price.eq(item.unitPrice)) {
              throw new ConflictException(
                'O preço do produto mudou. Solicite uma nova proposta.',
              );
            }
          }

          let cart = await tx.cart.findFirst({
            where: { userId, status: 'ACTIVE' },
          });
          if (!cart) {
            cart = await tx.cart.create({
              data: { userId, status: 'ACTIVE', tokenHash: null },
            });
          }

          for (const item of proposal.items) {
            const variant = variantById.get(item.variantId)!;
            const key = { cartId: cart.id, variantId: item.variantId };
            const existing = await tx.cartItem.findUnique({
              where: { cartId_variantId: key },
            });
            const current = existing?.quantity ?? 0;

            if (item.action === 'SET_QUANTITY') {
              if (
                item.expectedQuantity === null ||
                item.targetQuantity === null ||
                current !== item.expectedQuantity
              ) {
                throw new ConflictException(
                  'O carrinho mudou desde a proposta. Solicite uma nova.',
                );
              }

              if (
                item.targetQuantity > current &&
                (!variant.available || !variant.product.restaurant.active)
              ) {
                throw new ConflictException(
                  'Uma variante ficou indisponível. Solicite nova proposta.',
                );
              }

              if (item.targetQuantity === 0) {
                await tx.cartItem.deleteMany({
                  where: { cartId: cart.id, variantId: item.variantId },
                });
              } else {
                await tx.cartItem.upsert({
                  where: { cartId_variantId: key },
                  create: { ...key, quantity: item.targetQuantity },
                  update: { quantity: item.targetQuantity },
                });
              }
            } else {
              if (!variant.available || !variant.product.restaurant.active) {
                throw new ConflictException(
                  'Uma variante ficou indisponível. Solicite nova proposta.',
                );
              }
              const finalQuantity = current + item.quantity;
              if (finalQuantity > 20) {
                throw new ConflictException(
                  `A variante ${item.variantId} excederia 20 unidades.`,
                );
              }
              await tx.cartItem.upsert({
                where: { cartId_variantId: key },
                create: { ...key, quantity: item.quantity },
                update: { quantity: { increment: item.quantity } },
              });
            }
          }

          const update = await tx.cartProposal.updateMany({
            where: { id: proposal.id, status: 'PENDING' },
            data: { status: 'CONFIRMED', confirmedAt: new Date() },
          });
          if (update.count !== 1) {
            throw new ConflictException('A proposta já foi processada.');
          }

          return { alreadyConfirmed: false };
        }, {
          isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
          maxWait: 5000,
          timeout: 10000,
        });

        return {
          message: 'Proposta confirmada.',
          proposalId,
          status: 'CONFIRMED',
          ...outcome,
        };
      } catch (error: unknown) {
        const code = error !== null && typeof error === 'object' && 'code' in error
          ? String(error.code)
          : null;

        if ((code === 'P2034' || code === 'P2002') && attempt < 2) {
          continue;
        }
        if (code === 'P2034' || code === 'P2002') {
          throw new ConflictException('Conflito ao confirmar proposta. Tente novamente.');
        }
        throw error;
      }
    }
    throw new ConflictException('Não foi possível confirmar a proposta.');
  }
}
