import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProductsService } from './products.service';
import { ProductsController } from './products.controller';
import { Product, ProductSchema } from './product.schema';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    HouseholdsModule, // fournit le modèle Household pour HouseholdMemberGuard
  ],
  providers: [ProductsService],
  controllers: [ProductsController],
  exports: [ProductsService], // exporté pour le module reports
})
export class ProductsModule {}
