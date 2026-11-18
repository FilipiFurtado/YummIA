/**
 * Indexação semântica NÃO destrutiva do catálogo atual.
 * Execute a partir de backend/: npx tsx prisma/index-catalog.ts
 * Reexecute quando produtos, descrições ou variantes forem alterados.
 */
import 'dotenv/config';
import { createHash } from 'node:crypto';
import { ConfigService } from '@nestjs/config';
import { Ollama } from 'ollama';
import { PrismaService } from '../src/prisma/prisma.service.js';

const embeddingModel = process.env.OLLAMA_EMBED_MODEL ?? 'embeddinggemma';
const ollama = new Ollama({
  host: process.env.OLLAMA_HOST ?? 'http://127.0.0.1:11434',
});

async function main() {
  const prisma = new PrismaService(new ConfigService());
  try {
    const products = await prisma.product.findMany({
      where: { restaurant: { is: { active: true } } },
      select: {
        id: true,
        name: true,
        description: true,
        restaurant: { select: { name: true } },
      },
      orderBy: { id: 'asc' },
    });
    const variants = await prisma.productVariant.findMany({
      where: { available: true },
      select: { productId: true, name: true },
    });
    const sizesByProduct = new Map<number, string[]>();
    for (const variant of variants) {
      const list = sizesByProduct.get(variant.productId) ?? [];
      list.push(variant.name);
      sizesByProduct.set(variant.productId, list);
    }

    let added = 0;
    let skipped = 0;
    for (const product of products) {
      const text = [
        `Restaurante: ${product.restaurant.name}.`,
        `Produto: ${product.name}.`,
        `Descrição: ${product.description ?? ''}.`,
        `Variações: ${(sizesByProduct.get(product.id) ?? []).join(', ')}.`,
      ].join(' ');
      const textHash = createHash('sha256').update(text).digest('hex');
      const old = await prisma.productSemanticIndex.findUnique({
        where: { productId: product.id },
        select: { model: true, textHash: true },
      });
      if (old?.model === embeddingModel && old.textHash === textHash) {
        skipped++;
        continue;
      }

      const embeddingResult = await ollama.embed({ model: embeddingModel, input: text });
      const embedding = embeddingResult.embeddings[0] ?? [];
      if (embedding.length !== 768 || embedding.some((v) => !Number.isFinite(v))) {
        throw new Error(`Embedding inválido para ${product.name}: ${embedding.length} dimensões.`);
      }
      await prisma.productSemanticIndex.upsert({
        where: { productId: product.id },
        create: { productId: product.id, model: embeddingModel, textHash, embedding },
        update: { model: embeddingModel, textHash, embedding },
      });
      added++;
      console.log(`[${added + skipped}/${products.length}] Indexado: ${product.name}`);
    }

    // Remove SOMENTE índices de produtos que deixaram de estar ativos.
    const ids = products.map((product) => product.id);
    const removed = await prisma.productSemanticIndex.deleteMany({
      where: { productId: { notIn: ids } },
    });
    console.log(`\nIndexação concluída. Atualizados: ${added}; mantidos: ${skipped}; índices antigos removidos: ${removed.count}.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Falha ao indexar catálogo:', error);
  process.exitCode = 1;
});
