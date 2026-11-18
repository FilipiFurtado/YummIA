import {
  Injectable,
  Logger,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';

import { Prisma } from '../generated/prisma/client.js';
import { PrismaService } from '../prisma/prisma.service.js';

export type SemanticSearchFilters = {
  query: string;
  variant?: string;
  restaurant?: string;
  maxPrice?: number;
  limit?: number;
};

function plain(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLocaleLowerCase('pt-BR');
}

// O banco guarda os vetores. Para o catálogo atual (36 produtos),
// o ranking em memória não exige pgvector nem mudanças no Docker.
export function cosineSimilarity(a: readonly number[], b: readonly number[]): number {
  if (a.length === 0 || a.length !== b.length) return -1;
  let dot = 0;
  let aa = 0;
  let bb = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    aa += a[i] * a[i];
    bb += b[i] * b[i];
  }
  if (aa === 0 || bb === 0) return -1;
  return dot / Math.sqrt(aa * bb);
}

@Injectable()
export class AssistantSemanticService {
  private readonly logger = new Logger(AssistantSemanticService.name);
  private readonly ollama: Ollama;
  private readonly embeddingModel: string;

  constructor(
    private readonly prisma: PrismaService,
    config: ConfigService,
  ) {
    this.ollama = new Ollama({
      host: config.get<string>('OLLAMA_HOST') ?? 'http://127.0.0.1:11434',
    });
    this.embeddingModel =
      config.get<string>('OLLAMA_EMBED_MODEL') ?? 'embeddinggemma';
  }

  async search(filters: SemanticSearchFilters) {
    const query = filters.query.trim();
    const limit = Math.min(Math.max(filters.limit ?? 12, 1), 20);
    const indexes = await this.prisma.productSemanticIndex.findMany({
      where: { model: this.embeddingModel },
      select: { productId: true, embedding: true },
    });

    if (indexes.length === 0) {
      this.logger.warn('Nenhum embedding encontrado; execute prisma/index-catalog.ts.');
      return [];
    }

    let queryVector: number[];
    try {
      const result = await this.ollama.embed({
        model: this.embeddingModel,
        input: query,
      });
      queryVector = result.embeddings[0] ?? [];
    } catch (error) {
      this.logger.warn(
        `Falha na consulta semântica: ${error instanceof Error ? error.message : String(error)}`,
      );
      throw new ServiceUnavailableException('Modelo de embeddings indisponível no Ollama.');
    }

    if (queryVector.length !== 768 || queryVector.some((value) => !Number.isFinite(value))) {
      throw new ServiceUnavailableException('O modelo de embeddings não retornou um vetor válido de 768 dimensões.');
    }

    const ranks = indexes
      .map((index) => ({
        productId: index.productId,
        score: cosineSimilarity(index.embedding, queryVector),
      }))
      .filter((item) => Number.isFinite(item.score) && item.score > -1)
      .sort((a, b) => b.score - a.score)
      .slice(0, 24);

    if (!ranks.length) return [];

    const scoreByProduct = new Map(ranks.map((item) => [item.productId, item.score]));
    const where: Prisma.ProductVariantWhereInput = {
      available: true,
      productId: { in: ranks.map((item) => item.productId) },
      product: { is: { restaurant: { is: { active: true } } } },
      ...(filters.maxPrice !== undefined
        ? { price: { lte: new Prisma.Decimal(String(filters.maxPrice)) } }
        : {}),
    };

    const variants = await this.prisma.productVariant.findMany({
      where,
      select: {
        id: true,
        name: true,
        price: true,
        productId: true,
        product: {
          select: {
            id: true,
            name: true,
            description: true,
            restaurant: { select: { id: true, name: true } },
          },
        },
      },
    });

    return variants
      .filter((item) =>
        (!filters.variant || plain(item.name).includes(plain(filters.variant))) &&
        (!filters.restaurant || plain(item.product.restaurant.name).includes(plain(filters.restaurant))))
      .sort((a, b) =>
        (scoreByProduct.get(b.productId) ?? 0) - (scoreByProduct.get(a.productId) ?? 0) ||
        a.price.comparedTo(b.price) || a.id - b.id)
      .slice(0, limit)
      .map((item) => ({
        variantId: item.id,
        variantName: item.name,
        productId: item.product.id,
        productName: item.product.name,
        description: item.product.description,
        restaurantId: item.product.restaurant.id,
        restaurantName: item.product.restaurant.name,
        price: item.price.toFixed(2),
        currency: 'BRL',
        semanticScore: Number((scoreByProduct.get(item.productId) ?? 0).toFixed(4)),
      }));
  }
}
