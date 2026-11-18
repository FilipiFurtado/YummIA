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
} from '@nestjs/common';

import { ApiHeader, ApiTags } from '@nestjs/swagger';

import { CartService } from './cart.service.js';
import { AddCartItemDto } from './dto/add-cart-item.dto.js';
import { UpdateCartItemDto } from './dto/update-cart-item.dto.js';

@ApiTags('Cart')
@Controller('cart')
export class CartController {
  constructor(private readonly cartService: CartService) {}

  // Criar carrinho
  @Post()
  create() {
    return this.cartService.create();
  }

  // Consultar carrinho
  @Get()
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
  })
  getCart(@Headers('x-cart-token') token: string) {
    return this.cartService.getCart(token);
  }

  // Adicionar item
  @Post('items')
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
  })
  addItem(
    @Headers('x-cart-token') token: string,
    @Body() dto: AddCartItemDto,
  ) {
    return this.cartService.addItem(token, dto);
  }

  // Alterar quantidade
  @Patch('items/:id')
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
  })
  updateItem(
    @Headers('x-cart-token') token: string,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCartItemDto,
  ) {
    return this.cartService.updateItem(token, id, dto);
  }

  // Remover item
  @Delete('items/:id')
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
  })
  removeItem(
    @Headers('x-cart-token') token: string,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.cartService.removeItem(token, id);
  }

  // Esvaziar carrinho
  @Delete('items')
  @ApiHeader({
    name: 'X-Cart-Token',
    required: true,
  })
  clear(@Headers('x-cart-token') token: string) {
    return this.cartService.clear(token);
  }
}