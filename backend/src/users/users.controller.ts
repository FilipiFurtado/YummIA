import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Post,
  Req,
  UseGuards,
} from '@nestjs/common';

import { ApiBearerAuth } from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard.js';
import type { AuthenticatedRequest } from '../auth/guards/jwt-auth.guard.js';

import { UsersService } from './users.service.js';
import { CreateAddressDto } from './dto/create-address.dto.js';

@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getProfile(@Req() req: AuthenticatedRequest) {
    return this.usersService.getProfile(req.user.id);
  }

  @Get('me/addresses')
  getAddresses(@Req() req: AuthenticatedRequest) {
    return this.usersService.getAddresses(req.user.id);
  }

  @Post('me/addresses')
  createAddress(
    @Req() req: AuthenticatedRequest,
    @Body() dto: CreateAddressDto,
  ) {
    return this.usersService.createAddress(req.user.id, dto);
  }

  @Delete('me/addresses/:id')
  removeAddress(
    @Req() req: AuthenticatedRequest,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.usersService.removeAddress(req.user.id, id);
  }
}