import { IsBase64, IsNotEmpty, MaxLength } from 'class-validator';

// 5 Mo en binaire → ~6 865 000 caractères en base64 (ratio x1.37)
const MAX_IMAGE_BASE64_LENGTH = 7_000_000;

export class DecodeBarcodeDto {
  /**
   * Image contenant le code-barres encodée en base64 (sans le préfixe data:...).
   * Taille maximale : ~5 Mo.
   */
  @IsNotEmpty()
  @IsBase64()
  @MaxLength(MAX_IMAGE_BASE64_LENGTH)
  imageBase64: string;
}
