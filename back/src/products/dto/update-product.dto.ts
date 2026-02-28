import { PartialType } from '@nestjs/mapped-types';
import { IsDateString, IsOptional } from 'class-validator';
import { CreateProductDto } from './create-product.dto';

export class UpdateProductDto extends PartialType(CreateProductDto) {
  // Permet de corriger la date de péremption si l'OCR a mal fonctionné
  @IsDateString()
  @IsOptional()
  expirationDate?: string;
}
