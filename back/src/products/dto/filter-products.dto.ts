import { IsOptional, IsString, IsEnum, IsInt, Min, Max } from 'class-validator';
import { Type } from 'class-transformer';
import { ProductStatus } from '../product.schema';

export class FilterProductsDto {
  @IsString()
  @IsOptional()
  category?: string;

  @IsEnum(ProductStatus)
  @IsOptional()
  status?: ProductStatus;

  /** Nombre de jours avant péremption pour le filtre "bientôt périmé" (défaut: 7) */
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(365)
  @IsOptional()
  expiringSoonDays?: number = 7;

  @IsString()
  @IsOptional()
  sortBy?: 'expirationDate' | 'name' | 'category' = 'expirationDate';

  @IsEnum(['asc', 'desc'])
  @IsOptional()
  sortOrder?: 'asc' | 'desc' = 'asc';
}
