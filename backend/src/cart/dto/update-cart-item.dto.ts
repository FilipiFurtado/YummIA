import {
  IsInt,
  Min,
  Max,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';

export class UpdateCartItemDto {
  @ApiProperty({
    example: 3,
    description: 'Nova quantidade do item',
  })
  @IsInt()
  @Min(1)
  @Max(20)
  quantity: number;
}