import { Module } from '@nestjs/common';

import { PrismaModule } from '../prisma/prisma.module.js';
import { AuthModule } from '../auth/auth.module.js';

import { CartController } from './cart.controller.js';
import { CartService } from './cart.service.js';

import {
  AuthenticatedCartController,
} from './authenticated-cart.controller.js';

import {
  AuthenticatedCartService,
} from './authenticated-cart.service.js';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
  ],

  controllers: [
    CartController,
    AuthenticatedCartController,
  ],

  providers: [
    CartService,
    AuthenticatedCartService,
  ],

  exports: [
    CartService,
    AuthenticatedCartService,
  ],
})
export class CartModule {}