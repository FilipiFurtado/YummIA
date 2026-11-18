import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { CheckoutController } from './checkout.controller.js';
import { OrdersController } from '../orders/orders.controller.js';
import { CheckoutService } from './checkout.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    CheckoutController,
    OrdersController,
  ],

  providers: [
    CheckoutService,
  ],

  exports: [
    CheckoutService,
  ],
})
export class CheckoutModule {}