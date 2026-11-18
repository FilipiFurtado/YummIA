import {
  IsInt,
  Min,
  Max,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class AddCartItemDto {
  @ApiProperty({
    example: 1,
    description: 'ID da variante do produto',
  })
  @IsInt()
  @Min(1)
  variantId: number;

  @ApiProperty({
    example: 2,
    description: 'Quantidade a adicionar',
  })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}