import { IsEnum, IsNotEmpty } from 'class-validator';
import { ProductDisposalReason } from '../product.schema';

export class RemoveProductDto {
  @IsEnum(ProductDisposalReason)
  @IsNotEmpty()
  disposalReason: ProductDisposalReason;
}
