import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { PrismaModule } from './prisma/prisma.module.js';
import { RestaurantsModule } from './restaurants/restaurants.module.js';
import { ProductsModule } from './products/products.module.js';
import { CartModule } from './cart/cart.module.js';
import { AuthModule } from './auth/auth.module.js';
import { UsersModule } from './users/users.module.js';
import { CheckoutModule } from './checkout/checkout.module.js';
import { OrdersController } from './orders/orders.controller.js';
import { AssistantModule } from './assistant/assistant.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    RestaurantsModule,
    ProductsModule,
    CartModule,
    AuthModule,
    UsersModule,
    CheckoutModule,
    AssistantModule, // Adicionar
  ],
})
export class AppModule {}