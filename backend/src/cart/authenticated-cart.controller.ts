import {
  Body,
  Controller,
  Delete,
  Get,
  Headers,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import {
  ApiBearerAuth,
  ApiHeader,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';

import type {
  AuthenticatedRequest,
} from '../auth/guards/jwt-auth.guard.js';

import {
  AuthenticatedCartService,
} from './authenticated-cart.service.js';

import {
  AddCartItemDto,
} from './dto/add-cart-item.dto.js';

import {
  UpdateCartItemDto,
} from './dto/update-cart-item.dto.js';

@ApiTags('Authenticated Cart')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('cart/me')
export class AuthenticatedCartController {
  constructor(
    private readonly cartService: AuthenticatedCartService,
  ) {}

  @Get()
  getCart(@Req() req: AuthenticatedRequest) {
    return this.cartService.getMine(req.user.id);
  }

  @Post('items')
  addItem(
    @Req() req: AuthenticatedRequest,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(req.user.id, dto);
  }

  @Patch('items/:id')
  updateItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) itemId: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(
      req.user.id,
      itemId,
      dto,
    );
  }

  @Delete('items/:id')
  removeItem(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) itemId: number,
  ) {
    return this.cartService.removeItem(
      req.user.id,
      itemId,
    );
  }

  @Delete('items')
  clear(@Req() req: AuthenticatedRequest) {
    return this.cartService.clear(req.user.id);
  }

  @Post('claim')
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
    description: 'Token do carrinho de visitante',
  })
  claim(
    @Req() req: AuthenticatedRequest,
    @Headers('x-cart-token') guestToken: string,
  ) {
    return this.cartService.claimGuestCart(
      req.user.id,
      guestToken,
    );
  }
}