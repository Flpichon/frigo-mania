import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';
import { Product, ProductSchema } from '../products/product.schema';
import { HouseholdsModule } from '../households/households.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Product.name, schema: ProductSchema }]),
    HouseholdsModule, // fournit le modèle Household pour HouseholdMemberGuard
  ],
  providers: [ReportsService],
  controllers: [ReportsController],
})
export class ReportsModule {}
