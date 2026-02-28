import { Injectable, Logger } from '@nestjs/common';
import sharp from 'sharp';
import { readBarcodesFromImageData } from 'zxing-wasm';

/**
 * Service de décodage de codes-barres côté backend.
 *
 * Utilise zxing-wasm (ZXing-C++ compilé en WebAssembly) pour décoder les
 * codes-barres, avec sharp pour le preprocessing image.
 *
 * Cascade de tentatives :
 *   1. Image originale (zxing-wasm tente automatiquement toutes les rotations)
 *   2. Niveaux de gris + normalisation contraste
 *   3. Niveaux de gris + contraste fort (fond coloré / surexposition)
 *   4. Redimensionnement 50% + niveaux de gris (réduit le bruit des grandes photos)
 */
@Injectable()
export class BarcodeService {
  private readonly logger = new Logger(BarcodeService.name);

  /**
   * Tente de décoder un code-barres depuis un buffer image.
   * Retourne le texte du premier code-barres trouvé, ou null.
   */
  async decode(imageBase64: string): Promise<string | null> {
    const buffer = Buffer.from(imageBase64, 'base64');

    const attempts: { label: string; process: () => Promise<Buffer> }[] = [
      {
        label: 'original',
        process: () => Promise.resolve(buffer),
      },
      {
        label: 'grayscale+normalize',
        process: () =>
          sharp(buffer).grayscale().normalize().png().toBuffer(),
      },
      {
        label: 'grayscale+contrast',
        process: () =>
          sharp(buffer).grayscale().linear(1.8, -60).png().toBuffer(),
      },
      {
        label: 'resize50%+grayscale+normalize',
        process: async () => {
          const meta = await sharp(buffer).metadata();
          const w = Math.round((meta.width ?? 1000) * 0.5);
          return sharp(buffer).resize(w).grayscale().normalize().png().toBuffer();
        },
      },
    ];

    for (const { label, process } of attempts) {
      try {
        const processed = await process();
        const result = await this.decodeBuffer(processed);
        if (result) {
          this.logger.log(`[barcode] trouvé avec "${label}" : ${result}`);
          return result;
        }
        this.logger.debug(`[barcode] aucun résultat avec "${label}"`);
      } catch (err) {
        this.logger.warn(`[barcode] erreur avec "${label}" : ${(err as Error).message}`);
      }
    }

    this.logger.warn('[barcode] aucun code-barres trouvé après toutes les tentatives');
    return null;
  }

  /**
   * Passe un buffer image (PNG/JPEG) à zxing-wasm via ImageData.
   * zxing-wasm gère nativement toutes les rotations et tous les formats 1D/2D.
   */
  private async decodeBuffer(buffer: Buffer): Promise<string | null> {
    // Convertir en RGBA raw pour ImageData
    const { data, info } = await sharp(buffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const imageData = {
      data: new Uint8ClampedArray(data),
      width: info.width,
      height: info.height,
      colorSpace: 'srgb' as PredefinedColorSpace,
    };

    const results = await readBarcodesFromImageData(imageData, {
      tryHarder: true,
      formats: [], // tous les formats
    });

    if (results.length === 0) return null;

    // Retourner le premier résultat valide (texte non vide)
    const valid = results.find((r) => r.text && r.text.trim().length > 0);
    return valid?.text ?? null;
  }
}
