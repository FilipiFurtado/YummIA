import {
  Body,
  Controller,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiTags,
} from '@nestjs/swagger';

import { CheckoutService } from './checkout.service.js';
import { QuoteDto } from './dto/quote.dto.js';

import {
  JwtAuthGuard,
} from '../auth/guards/jwt-auth.guard.js';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard.js';

@ApiTags('Checkout')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('checkout')
export class CheckoutController {
  constructor(
    private readonly checkoutService: CheckoutService,
  ) {}

  @Post('quote')
  getQuote(
    @Req() req: AuthenticatedRequest,
    @Body() dto: QuoteDto,
  ) {
    return this.checkoutService.getQuote(
      req.user.id,
      dto.addressId,
    );
  }
}