import {
  Body,
  Controller,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';

import { CheckoutService } from '../checkout/checkout.service.js';

import {
  CreateOrderDto,
} from '../checkout/dto/create-order.dto.js';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Orders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('orders')
export class OrdersController {
  constructor(
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post()
  @ApiHeader({
    name: 'Idempotency-Key',
    required: true,
    description: 'UUID v4 da tentativa de compra',
  })
  create(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateOrderDto,
    @Headers('idempotency-key') key: string,
  ) {
    return this.checkoutService.createOrder(
      req.user.id,
      dto,
      key,
    );
  }

  @Get()
  findAll(@Req() req: AuthenticatedRequest) {
    return this.checkoutService.findAllOrders(
      req.user.id,
    );
  }

  @Get(':id')
  findOne(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.checkoutService.findOneOrder(
      req.user.id,
      id,
    );
  }
}