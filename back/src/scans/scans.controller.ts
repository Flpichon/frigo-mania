import { Controller, Post, Body, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { ScansService } from './scans.service';
import { BarcodeService } from './barcode.service';
import { ScanBarcodeDto } from './dto/scan-barcode.dto';
import { DecodeBarcodeDto } from './dto/decode-barcode.dto';

/**
 * POST /api/scan
 *
 * Flux typique côté front :
 *  1. L'utilisateur pointe la caméra sur le code-barres → ZXing décode le barcode
 *  2. L'utilisateur cadre la zone date de péremption → photo recadrée envoyée en base64
 *  3. Le front envoie { barcode, expirationImageBase64 } à cet endpoint
 *  4. Le back répond avec les infos produit + la date extraite (ou null)
 *  5. Le front affiche un formulaire de confirmation/correction
 *  6. L'utilisateur valide → appel POST /api/households/:id/products avec les données finales
 */
@UseGuards(JwtAuthGuard)
@Controller('scan')
export class ScansController {
  constructor(
    private readonly scansService: ScansService,
    private readonly barcodeService: BarcodeService,
  ) {}

  /**
   * POST /api/scan
   * Orchestre la récupération des infos produit (Open Food Facts) et l'OCR de la date.
   */
  @Post()
  @HttpCode(HttpStatus.OK)
  async scan(@Body() dto: ScanBarcodeDto) {
    return this.scansService.scan(dto);
  }

  /**
   * POST /api/scan/decode-barcode
   * Décode un code-barres depuis une image base64 (preprocessing sharp + zxing-wasm).
   * Retourne { barcode: string } ou { barcode: null } si non trouvé.
   */
  @Post('decode-barcode')
  @HttpCode(HttpStatus.OK)
  async decodeBarcode(@Body() dto: DecodeBarcodeDto) {
    const barcode = await this.barcodeService.decode(dto.imageBase64);
    return { barcode };
  }
}
