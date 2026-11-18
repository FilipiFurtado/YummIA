import {
  IsString,
  Matches,
} from 'class-validator';

import { ApiProperty } from '@nestjs/swagger';
import { QuoteDto } from './quote.dto.js';

export class CreateOrderDto extends QuoteDto {
  @ApiProperty({ example: '103.80' })
  @IsString()
  @Matches(/^\d{1,8}\.\d{2}$/)
  expectedTotal: string;

  @ApiProperty({
    description: 'Hash retornado pela cotação',
  })
  @IsString()
  @Matches(/^[0-9a-f]{64}$/)
  quoteHash: string;
}