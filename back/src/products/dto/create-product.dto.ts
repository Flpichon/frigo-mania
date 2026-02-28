import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsDateString,
  IsObject,
  MinLength,
} from 'class-validator';

export class CreateProductDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(1)
  name: string;

  @IsString()
  @IsOptional()
  brand?: string;

  @IsString()
  @IsOptional()
  category?: string;

  @IsString()
  @IsNotEmpty()
  barcode: string;

  @IsDateString()
  expirationDate: string;

  @IsObject()
  @IsOptional()
  nutritionFacts?: Record<string, unknown>;
}
