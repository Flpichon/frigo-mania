import { Injectable, Logger } from '@nestjs/common';
import { OpenFoodFactsService } from './open-food-facts.service';
import { OcrService } from './ocr.service';
import type { ScanBarcodeDto } from './dto/scan-barcode.dto';

export interface ScanResult {
  /** Données produit issues d'Open Food Facts (null si code-barres inconnu) */
  name: string;
  brand?: string;
  category?: string;
  barcode: string;
  nutritionFacts?: Record<string, unknown>;
  productSource: 'open_food_facts' | 'manual';

  /** Date extraite par OCR (null si image absente ou OCR infructueux) */
  expirationDate: string | null;
  expirationDateConfidence: 'high' | 'low' | 'none';

  /** Indique si l'utilisateur doit corriger des champs manuellement */
  requiresManualReview: boolean;
}

@Injectable()
export class ScansService {
  private readonly logger = new Logger(ScansService.name);

  constructor(
    private readonly offService: OpenFoodFactsService,
    private readonly ocrService: OcrService,
  ) {}

  async scan(dto: ScanBarcodeDto): Promise<ScanResult> {
    // Lancer les deux opérations en parallèle pour minimiser la latence
    const [productInfo, expirationDate] = await Promise.all([
      this.offService.fetchByBarcode(dto.barcode),
      dto.expirationImageBase64
        ? this.ocrService.extractExpirationDate(dto.expirationImageBase64)
        : Promise.resolve(null),
    ]);

    // Construire le résultat produit (fallback si OFF ne connaît pas le code-barres)
    const name = productInfo?.name ?? '';
    const brand = productInfo?.brand;
    const category = productInfo?.category;
    const nutritionFacts = productInfo?.nutritionFacts;
    const productSource = productInfo?.source ?? 'manual';

    // Évaluer la confiance dans la date extraite
    let expirationDateConfidence: ScanResult['expirationDateConfidence'] = 'none';
    let expirationDateStr: string | null = null;

    if (expirationDate) {
      expirationDateStr = expirationDate.toISOString().split('T')[0]; // YYYY-MM-DD
      // Confiance "high" si la date est dans le futur, "low" si elle est dans le passé
      expirationDateConfidence = expirationDate >= new Date() ? 'high' : 'low';
    } else if (dto.expirationImageBase64) {
      // Image fournie mais OCR n'a rien trouvé
      expirationDateConfidence = 'none';
      this.logger.warn(`OCR: aucune date trouvée pour le barcode ${dto.barcode}`);
    }

    const requiresManualReview =
      !name || expirationDateConfidence === 'none' || expirationDateConfidence === 'low';

    return {
      name,
      brand,
      category,
      barcode: dto.barcode,
      nutritionFacts,
      productSource,
      expirationDate: expirationDateStr,
      expirationDateConfidence,
      requiresManualReview,
    };
  }
}
