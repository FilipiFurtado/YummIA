import { IsInt, Min } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class QuoteDto {
  @ApiProperty({ example: 1 })
  @IsInt()
  @Min(1)
  addressId: number;
}