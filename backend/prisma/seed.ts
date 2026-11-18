/**
 * Seed de DESENVOLVIMENTO para o marketplace YummIA (Prisma 7 + NestJS).
 *
 * Apaga carrinhos, propostas, conversas de IA e o catálogo existente.
 * Pedidos existentes só são apagados com autorização separada.
 * Preserva usuários, senhas, endereços e migrations.
 *
 * Executar a partir de backend/:
 *   $env:YUMMIA_RESET_DEMO='SIM'
 *   npx tsx prisma/seed.ts
 *
 * Se já houver pedidos de teste que DEVEM ser apagados:
 *   $env:YUMMIA_APAGAR_PEDIDOS='SIM'
 *   npx tsx prisma/seed.ts
 */

import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../src/prisma/prisma.service.js';

type Variant = { name: string; price: string };
type MenuProduct = { name: string; description: string; variants: Variant[] };
type MenuRestaurant = { name: string; description: string; products: MenuProduct[] };

const sizes = (small: string, medium: string, large: string): Variant[] => [
  { name: 'Pequena', price: small },
  { name: 'Média', price: medium },
  { name: 'Grande', price: large },
];

const portions = (single: string, double: string): Variant[] => [
  { name: 'Individual', price: single },
  { name: 'Para 2 pessoas', price: double },
];

const catalog: MenuRestaurant[] = [
  {
    name: 'Forno da Vila',
    description: 'Pizzaria artesanal com massas de fermentação lenta, sabores clássicos e pizzas doces.',
    products: [
      { name: 'Pizza Calabresa', description: 'Muçarela, calabresa fatiada, cebola e orégano.', variants: sizes('27.90', '36.90', '44.90') },
      { name: 'Pizza Muçarela', description: 'Molho de tomate, muçarela, tomate e orégano.', variants: sizes('25.90', '34.90', '42.90') },
      { name: 'Pizza Portuguesa', description: 'Presunto, muçarela, ovos, cebola, ervilha e azeitonas.', variants: sizes('31.90', '42.90', '52.90') },
      { name: 'Pizza Frango com Catupiry', description: 'Frango desfiado temperado, requeijão cremoso e muçarela.', variants: sizes('31.90', '43.90', '54.90') },
      { name: 'Pizza Quatro Queijos', description: 'Muçarela, parmesão, provolone e gorgonzola.', variants: sizes('33.90', '45.90', '56.90') },
      { name: 'Pizza Margherita', description: 'Muçarela, tomates frescos e manjericão.', variants: sizes('29.90', '39.90', '49.90') },
      { name: 'Pizza Vegetariana', description: 'Abobrinha, pimentões, cogumelos, cebola e muçarela.', variants: sizes('30.90', '42.90', '51.90') },
      { name: 'Pizza Pepperoni', description: 'Muçarela, pepperoni e molho de tomate artesanal.', variants: sizes('34.90', '46.90', '58.90') },
      { name: 'Pizza Chocolate com Morango', description: 'Chocolate ao leite e morangos frescos.', variants: sizes('32.90', '44.90', '55.90') },
      { name: 'Refrigerante Cola', description: 'Refrigerante tradicional para acompanhar as pizzas.', variants: [{ name: 'Lata 350 ml', price: '6.50' }, { name: 'Garrafa 2 L', price: '12.90' }] },
    ],
  },
  {
    name: 'Ponto do Hambúrguer',
    description: 'Lanchonete com hambúrgueres, sanduíches, porções crocantes e bebidas.',
    products: [
      { name: 'X-Burguer', description: 'Hambúrguer bovino, queijo e pão macio.', variants: [{ name: 'Simples', price: '19.90' }, { name: 'Duplo', price: '26.90' }] },
      { name: 'X-Salada', description: 'Hambúrguer bovino, queijo, alface, tomate e maionese.', variants: [{ name: 'Simples', price: '23.90' }, { name: 'Duplo', price: '29.90' }] },
      { name: 'X-Bacon', description: 'Hambúrguer, queijo, bacon crocante e maionese da casa.', variants: [{ name: 'Simples', price: '26.90' }, { name: 'Duplo', price: '33.90' }] },
      { name: 'X-Tudo', description: 'Hambúrguer, queijo, presunto, ovo, bacon, alface e tomate.', variants: [{ name: 'Simples', price: '32.90' }, { name: 'Duplo', price: '39.90' }] },
      { name: 'Hambúrguer Artesanal', description: 'Blend bovino artesanal, queijo cheddar e cebola caramelizada.', variants: [{ name: 'Carne 150 g', price: '29.90' }, { name: 'Carne 200 g', price: '37.90' }] },
      { name: 'Smash Burger', description: 'Hambúrguer prensado na chapa, queijo e molho especial.', variants: [{ name: 'Smash simples', price: '22.90' }, { name: 'Smash duplo', price: '31.90' }] },
      { name: 'Sanduíche de Frango', description: 'Frango grelhado, alface, tomate e molho leve.', variants: [{ name: 'Simples', price: '21.90' }, { name: 'Duplo', price: '28.90' }] },
      { name: 'Batata Frita', description: 'Batatas crocantes, preparadas na hora.', variants: sizes('11.90', '17.90', '23.90') },
      { name: 'Onion Rings', description: 'Anéis de cebola empanados e crocantes.', variants: [{ name: 'Pequena', price: '13.90' }, { name: 'Grande', price: '21.90' }] },
      { name: 'Milk-shake de Chocolate', description: 'Milk-shake cremoso com sorvete e calda de chocolate.', variants: [{ name: '300 ml', price: '14.90' }, { name: '500 ml', price: '19.90' }] },
      { name: 'Suco Natural de Laranja', description: 'Suco de laranja feito na hora.', variants: [{ name: '300 ml', price: '9.90' }, { name: '500 ml', price: '13.90' }] },
      { name: 'Refrigerante Cola', description: 'Refrigerante tradicional.', variants: [{ name: 'Lata 350 ml', price: '6.50' }, { name: 'Garrafa 600 ml', price: '9.90' }, { name: 'Garrafa 2 L', price: '13.90' }] },
    ],
  },
  {
    name: 'Panela da Vó',
    description: 'Restaurante de comida caseira: pratos feitos, marmitas, acompanhamentos e sobremesas.',
    products: [
      { name: 'Feijoada Completa', description: 'Feijoada com arroz, couve refogada, farofa e laranja.', variants: [{ name: 'Individual', price: '29.90' }, { name: 'Para 2 pessoas', price: '54.90' }, { name: 'Para 4 pessoas', price: '99.90' }] },
      { name: 'Strogonoff de Frango', description: 'Frango ao molho cremoso, arroz branco e batata palha.', variants: portions('25.90', '47.90') },
      { name: 'Bife Acebolado', description: 'Bife grelhado, cebola dourada, arroz, feijão e salada.', variants: portions('27.90', '51.90') },
      { name: 'Frango Grelhado', description: 'Filé de frango com arroz, feijão e legumes salteados.', variants: portions('24.90', '45.90') },
      { name: 'Lasanha à Bolonhesa', description: 'Massa recheada com molho bolonhesa e queijo gratinado.', variants: portions('28.90', '52.90') },
      { name: 'Escondidinho de Carne-seca', description: 'Purê de mandioca, carne-seca desfiada e queijo gratinado.', variants: portions('31.90', '56.90') },
      { name: 'Filé de Tilápia', description: 'Tilápia grelhada, arroz, purê de batatas e legumes.', variants: portions('32.90', '59.90') },
      { name: 'Parmegiana de Frango', description: 'Filé empanado com molho de tomate, queijo, arroz e fritas.', variants: portions('29.90', '54.90') },
      { name: 'Prato Vegetariano', description: 'Arroz integral, feijão, legumes, abóbora assada e salada.', variants: portions('26.90', '48.90') },
      { name: 'Marmita do Dia', description: 'Arroz, feijão, proteína do dia e dois acompanhamentos.', variants: [{ name: 'Tradicional', price: '21.90' }, { name: 'Grande', price: '25.90' }] },
      { name: 'Arroz Branco', description: 'Arroz soltinho, preparado diariamente.', variants: [{ name: '1 porção', price: '7.90' }, { name: '2 porções', price: '13.90' }] },
      { name: 'Feijão Carioca', description: 'Feijão caseiro com tempero suave.', variants: [{ name: '1 porção', price: '8.90' }, { name: '2 porções', price: '15.90' }] },
      { name: 'Suco Natural de Laranja', description: 'Suco de laranja feito na hora.', variants: [{ name: '300 ml', price: '8.90' }, { name: '500 ml', price: '12.90' }] },
      { name: 'Pudim de Leite', description: 'Pudim de leite condensado com calda de caramelo.', variants: [{ name: 'Fatia', price: '10.90' }, { name: 'Inteiro', price: '47.90' }] },
    ],
  },
];

async function main() {
  // Este script é DESTRUTIVO: nunca execute em produção.
  if (process.env.YUMMIA_RESET_DEMO !== 'SIM') {
    throw new Error(
      'Execução bloqueada. Para limpar os dados de demonstração, defina YUMMIA_RESET_DEMO=SIM.',
    );
  }

  if (process.env.NODE_ENV === 'production') {
    throw new Error('Seed destrutivo bloqueado em NODE_ENV=production.');
  }

  // Fora do NestFactory, o tsx nao precisa emitir metadados de decorators.
  // Usa o mesmo PrismaService e seu adapter PostgreSQL do projeto.
  const prisma = new PrismaService(new ConfigService());
  try {

    const counts = await prisma.$transaction(
      async (tx) => {
        const existingOrders = await tx.order.count();
        if (existingOrders > 0 && process.env.YUMMIA_APAGAR_PEDIDOS !== 'SIM') {
          throw new Error(
            `Existem ${existingOrders} pedido(s). Nada foi apagado. ` +
            'Se forem pedidos de TESTE e você realmente quiser excluí-los, ' +
            'defina YUMMIA_APAGAR_PEDIDOS=SIM e execute novamente.',
          );
        }
        // Ordem: filhos -> pais, respeitando as FKs do schema conhecido.
        await tx.cartProposalItem.deleteMany();
        await tx.cartProposal.deleteMany();
        await tx.assistantMessage.deleteMany();
        await tx.assistantConversation.deleteMany();

        await tx.orderItem.deleteMany();
        await tx.restaurantOrder.deleteMany();
        await tx.order.deleteMany();

        await tx.cartItem.deleteMany();
        await tx.cart.deleteMany();

        await tx.productVariant.deleteMany();
        await tx.product.deleteMany();
        await tx.restaurant.deleteMany();

        const result: { restaurante: string; produtos: number; variantes: number }[] = [];

        for (const restaurantData of catalog) {
          const restaurant = await tx.restaurant.create({
            data: {
              name: restaurantData.name,
              description: restaurantData.description,
              active: true,
            },
          });

          let variantsCount = 0;
          for (const productData of restaurantData.products) {
            const product = await tx.product.create({
              data: {
                restaurantId: restaurant.id,
                name: productData.name,
                description: productData.description,
              },
            });
            await tx.productVariant.createMany({
              data: productData.variants.map((variant) => ({
                productId: product.id,
                name: variant.name,
                price: variant.price,
                available: true,
              })),
            });
            variantsCount += productData.variants.length;
          }

          result.push({
            restaurante: restaurantData.name,
            produtos: restaurantData.products.length,
            variantes: variantsCount,
          });
        }
        return result;
      },
      { maxWait: 15000, timeout: 120000, isolationLevel: 'Serializable' },
    );

    console.log('\n✅ Base de demonstração substituída pelo catálogo YummIA.');
    console.table(counts);
    console.log('Usuários, senhas e endereços foram preservados.');
    console.log('Carrinhos, histórico de IA e propostas anteriores foram removidos.');
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error: unknown) => {
  console.error('Falha no seed:', error);
  process.exitCode = 1;
});
