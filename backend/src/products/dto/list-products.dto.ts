import {
  IsInt,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';

import { Type } from 'class-transformer';

export class ListProductsDto {
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(1)
  restaurantId?: number;

  @IsOptional()
  @IsString()
  search?: string;
}