import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import type { OpenFoodFactsProduct, NormalizedProductInfo } from './open-food-facts.types';

const OFF_BASE_URL = 'https://world.openfoodfacts.org/api/v2/product';

@Injectable()
export class OpenFoodFactsService {
  private readonly logger = new Logger(OpenFoodFactsService.name);

  async fetchByBarcode(barcode: string): Promise<NormalizedProductInfo | null> {
    try {
      const { data } = await axios.get<OpenFoodFactsProduct>(`${OFF_BASE_URL}/${barcode}.json`, {
        timeout: 8000,
        headers: {
          // Bonne pratique : identifier l'app auprès de l'API
          'User-Agent': 'FrigoMania/1.0 (francklepichonpro@gmail.com)',
        },
      });

      if (data.status !== 1 || !data.product) {
        this.logger.warn(`Open Food Facts: produit ${barcode} non trouvé`);
        return null;
      }

      return this.normalize(barcode, data.product);
    } catch (err) {
      this.logger.error(`Open Food Facts: erreur réseau pour ${barcode}`, (err as Error).message);
      return null;
    }
  }

  private normalize(
    barcode: string,
    p: NonNullable<OpenFoodFactsProduct['product']>,
  ): NormalizedProductInfo {
    // Préférer le nom français, sinon le nom générique
    const name = p.product_name_fr || p.product_name || `Produit ${barcode}`;

    // Première catégorie lisible (ex: "en:dairy" → "dairy")
    const rawCategory = p.categories_tags?.[0];
    const category = rawCategory
      ? rawCategory.replace(/^[a-z]{2}:/, '')
      : p.categories?.split(',')[0]?.trim();

    const nutritionFacts: Record<string, unknown> = {};
    if (p.nutriments) {
      const n = p.nutriments;
      if (n['energy-kcal_100g'] != null) {
        nutritionFacts.energyKcal = n['energy-kcal_100g'];
      }
      if (n.fat_100g != null) {
        nutritionFacts.fat = n.fat_100g;
      }
      if (n['saturated-fat_100g'] != null) {
        nutritionFacts.saturatedFat = n['saturated-fat_100g'];
      }
      if (n.carbohydrates_100g != null) {
        nutritionFacts.carbohydrates = n.carbohydrates_100g;
      }
      if (n.sugars_100g != null) {
        nutritionFacts.sugars = n.sugars_100g;
      }
      if (n.proteins_100g != null) {
        nutritionFacts.proteins = n.proteins_100g;
      }
      if (n.salt_100g != null) {
        nutritionFacts.salt = n.salt_100g;
      }
      if (n.fiber_100g != null) {
        nutritionFacts.fiber = n.fiber_100g;
      }
    }
    if (p.nutriscore_grade) {
      nutritionFacts.nutriscore = p.nutriscore_grade.toUpperCase();
    }
    if (p.nova_group) {
      nutritionFacts.novaGroup = p.nova_group;
    }

    return {
      name,
      brand: p.brands?.split(',')[0]?.trim(),
      category,
      nutritionFacts: Object.keys(nutritionFacts).length ? nutritionFacts : undefined,
      source: 'open_food_facts',
    };
  }
}
