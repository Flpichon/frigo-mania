import { IsString, IsNotEmpty, IsBase64, IsOptional, MaxLength } from 'class-validator';

// 5 Mo en binaire → ~6 865 000 caractères en base64 (ratio x1.37)
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export class ScanBarcodeDto {
  @IsString()
  @IsNotEmpty()
  barcode: string;

  /**
   * Image de la zone date de péremption encodée en base64 (sans le préfixe data:...).
   * Optionnelle : si absente, la date devra être saisie manuellement par l'utilisateur.
   * Taille maximale : ~5 Mo (7 000 000 caractères base64).
   */
  @MaxLength(MAX_IMAGE_BASE64_LENGTH)
  @IsBase64()
  @IsOptional()
  expirationImageBase64?: string;
}
