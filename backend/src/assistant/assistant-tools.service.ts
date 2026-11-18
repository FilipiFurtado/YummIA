import { Injectable } from '@nestjs/common';
import { z } from 'zod';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';
import { AssistantSemanticService } from './assistant-semantic.service.js';

const restaurantSearchSchema = z.object({
  query: z.string().trim().max(80).default(''),
}).strict();

// Os novos filtros são opcionais: chamadas da Etapa 3.2 continuam válidas.
const productSearchSchema = z.object({
  query: z.string().trim().max(80).default(''),
  product: z.string().trim().max(80).optional(),
  variant: z.string().trim().max(80).optional(),
  restaurant: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().positive().max(10000).optional(),
}).strict();

const semanticSearchSchema = z.object({
  query: z.string().trim().min(3).max(180),
  variant: z.string().trim().max(60).optional(),
  restaurant: z.string().trim().max(80).optional(),
  maxPrice: z.coerce.number().positive().max(10000).optional(),
  limit: z.coerce.number().int().min(1).max(20).default(12),
}).strict();

const emptySchema = z.object({}).strict();

type ProductFilters = z.infer<typeof productSearchSchema>;

const STOP_WORDS = new Set([
  'a', 'as', 'o', 'os', 'um', 'uma', 'uns', 'umas', 'de', 'da', 'do',
  'das', 'dos', 'com', 'sem', 'para', 'por', 'que', 'quero', 'duas', 'dois',
]);

// Busca textual: divide termos em palavras e ignora conectores comuns.
// Não é busca semântica e não remove acentos no banco.
function terms(value: string | undefined): string[] {
  return (value ?? '').trim().split(/\s+/)
    .filter((term) => term && !STOP_WORDS.has(term.toLocaleLowerCase('pt-BR')))
    .slice(0, 8);
}

// Normaliza a grafia para comparar nomes como "Muçarela" e "mucarela",
// "Média" e "media" sem depender da collation do PostgreSQL.
function normalized(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .toLocaleLowerCase('pt-BR');
}

@Injectable()
export class AssistantToolsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly semanticSearch: AssistantSemanticService,
  ) {}

  async execute(name: string, args: unknown, userId: number): Promise<unknown> {
    switch (name) {
      case 'search_restaurants': {
        const { query } = restaurantSearchSchema.parse(args);
        return this.searchRestaurants(query);
      }
      case 'search_products': {
        const filters = productSearchSchema.parse(args);
        return this.searchProducts(filters, 25);
      }
      case 'compare_products': {
        const filters = productSearchSchema.parse(args);
        return this.searchProducts(filters, 25);
      }
      case 'semantic_search_products': {
        const filters = semanticSearchSchema.parse(args);
        return this.semanticSearch.search(filters);
      }
      case 'get_cart': {
        emptySchema.parse(args);
        return this.getCart(userId);
      }
      default:
        return { error: 'Ferramenta não autorizada.' };
    }
  }

  private async searchRestaurants(query: string) {
    return this.prisma.restaurant.findMany({
      where: {
        active: true,
        ...(query ? {
          OR: [
            { name: { contains: query, mode: 'insensitive' as const } },
            { description: { contains: query, mode: 'insensitive' as const } },
          ],
        } : {}),
      },
      select: { id: true, name: true, description: true },
      orderBy: { name: 'asc' },
      take: 10,
    });
  }

  private async searchProducts(filters: ProductFilters, limit: number) {
    const conditions: Prisma.ProductVariantWhereInput[] = [];

    for (const term of terms(filters.query)) {
      conditions.push({
        OR: [
          { name: { contains: term, mode: 'insensitive' } },
          { product: { is: { name: { contains: term, mode: 'insensitive' } } } },
          { product: { is: { description: { contains: term, mode: 'insensitive' } } } },
          { product: { is: { restaurant: { is: { name: { contains: term, mode: 'insensitive' } } } } } },
        ],
      });
    }

    for (const term of terms(filters.product)) {
      conditions.push({
        OR: [
          { product: { is: { name: { contains: term, mode: 'insensitive' } } } },
          { product: { is: { description: { contains: term, mode: 'insensitive' } } } },
        ],
      });
    }

    for (const term of terms(filters.variant)) {
      conditions.push({ name: { contains: term, mode: 'insensitive' } });
    }

    for (const term of terms(filters.restaurant)) {
      conditions.push({
        product: {
          is: { restaurant: { is: { name: { contains: term, mode: 'insensitive' } } } },
        },
      });
    }

    const where: Prisma.ProductVariantWhereInput = {
      available: true,
      product: { is: { restaurant: { is: { active: true } } } },
      ...(filters.maxPrice !== undefined
        ? { price: { lte: new Prisma.Decimal(String(filters.maxPrice)) } }
        : {}),
      ...(conditions.length > 0 ? { AND: conditions } : {}),
    };

    const projection = {
      id: true,
      name: true,
      price: true,
      product: {
        select: {
          id: true,
          name: true,
          restaurant: { select: { id: true, name: true } },
        },
      },
    } as const;
    const orderBy = [{ price: 'asc' as const }, { id: 'asc' as const }];
    let variants = await this.prisma.productVariant.findMany({
      where, select: projection, orderBy, take: limit,
    });

    // Fallback APENAS para falhas de busca textual: nunca substituir a
    // correspondência EXATA por resultado do ranking semântico em uma compra.
    // O limite de 1000 serve ao catálogo pequeno de demonstração do YummIA.
    // Para catálogo grande, implementar unaccent/indexação normalizada no banco.
    const hasTextFilters = Boolean(
      filters.query || filters.product || filters.variant || filters.restaurant,
    );
    if (variants.length === 0 && hasTextFilters) {
      const allCandidates = await this.prisma.productVariant.findMany({
        where: {
          available: true,
          product: { is: { restaurant: { is: { active: true } } } },
          ...(filters.maxPrice !== undefined
            ? { price: { lte: new Prisma.Decimal(String(filters.maxPrice)) } }
            : {}),
        },
        select: projection,
        orderBy,
        take: 1000,
      });
      const queryTerms = terms(filters.query).map(normalized);
      const productTerms = terms(filters.product).map(normalized);
      const variantTerms = terms(filters.variant).map(normalized);
      const restaurantTerms = terms(filters.restaurant).map(normalized);

      variants = allCandidates.filter((variant) => {
        const product = normalized(variant.product.name);
        const presentation = normalized(variant.name);
        const restaurant = normalized(variant.product.restaurant.name);
        const combined = `${product} ${presentation} ${restaurant}`;
        return queryTerms.every((word) => combined.includes(word)) &&
          productTerms.every((word) => product.includes(word)) &&
          variantTerms.every((word) => presentation.includes(word)) &&
          restaurantTerms.every((word) => restaurant.includes(word));
      }).slice(0, limit);
    }

    return variants.map((variant) => ({
      variantId: variant.id,
      variantName: variant.name,
      productId: variant.product.id,
      productName: variant.product.name,
      restaurantId: variant.product.restaurant.id,
      restaurantName: variant.product.restaurant.name,
      price: variant.price.toFixed(2),
      currency: 'BRL',
    }));
  }

  private async getCart(userId: number) {
    const cart = await this.prisma.cart.findFirst({
      where: { userId, status: 'ACTIVE' },
      include: {
        items: {
          include: {
            variant: {
              include: {
                product: { include: { restaurant: true } },
              },
            },
          },
        },
      },
    });

    if (!cart) return { items: [], subtotal: '0.00', currency: 'BRL' };

    let subtotal = new Prisma.Decimal(0);
    const items = cart.items.map((item) => {
      const unitPrice = item.variant.price;
      const lineTotal = unitPrice.mul(item.quantity);
      subtotal = subtotal.plus(lineTotal);

      return {
        cartItemId: item.id,
        variantId: item.variantId,
        productName: item.variant.product.name,
        variantName: item.variant.name,
        restaurantName: item.variant.product.restaurant.name,
        quantity: item.quantity,
        unitPrice: unitPrice.toFixed(2),
        lineTotal: lineTotal.toFixed(2),
        available:
          item.variant.available && item.variant.product.restaurant.active,
      };
    });

    return { items, subtotal: subtotal.toFixed(2), currency: 'BRL' };
  }
}
