import { Module } from '@nestjs/common';
import { ScansService } from './scans.service';
import { ScansController } from './scans.controller';
import { OpenFoodFactsService } from './open-food-facts.service';
import { OcrService } from './ocr.service';
import { BarcodeService } from './barcode.service';

@Module({
  providers: [ScansService, OpenFoodFactsService, OcrService, BarcodeService],
  controllers: [ScansController],
})
export class ScansModule {}
