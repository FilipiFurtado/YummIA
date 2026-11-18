import {
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';

export class ChatDto {
  @ApiProperty({
    example: 'Quero duas pizzas grandes de calabresa.',
  })
  @IsString()
  @MinLength(2)
  @MaxLength(500)
  message!: string;

  @ApiPropertyOptional({
    description: 'ID de uma conversa existente do mesmo usuário',
    format: 'uuid',
  })
  @IsOptional()
  @IsUUID()
  conversationId?: string;
}
