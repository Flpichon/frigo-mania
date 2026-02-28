import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { HouseholdsService } from './households.service';
import { HouseholdsController } from './households.controller';
import { Household, HouseholdSchema } from './household.schema';
import { KeycloakAdminModule } from '../keycloak-admin/keycloak-admin.module';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Household.name, schema: HouseholdSchema }]),
    KeycloakAdminModule,
  ],
  providers: [HouseholdsService],
  controllers: [HouseholdsController],
  exports: [HouseholdsService, MongooseModule], // MongooseModule exporté pour HouseholdMemberGuard
})
export class HouseholdsModule {}
