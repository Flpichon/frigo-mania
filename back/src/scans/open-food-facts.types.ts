/**
 * Sous-ensemble des données retournées par l'API Open Food Facts
 * https://world.openfoodfacts.org/api/v2/product/{barcode}
 */
export interface OpenFoodFactsProduct {
  code: string;
  status: number; // 1 = found, 0 = not found
  product?: {
    product_name?: string;
    product_name_fr?: string;
    brands?: string;
    categories?: string;
    categories_tags?: string[];
    nutriments?: {
      energy_100g?: number;
      'energy-kcal_100g'?: number;
      fat_100g?: number;
      'saturated-fat_100g'?: number;
      carbohydrates_100g?: number;
      sugars_100g?: number;
      fiber_100g?: number;
      proteins_100g?: number;
      salt_100g?: number;
    };
    nova_group?: number;
    nutriscore_grade?: string;
    image_url?: string;
  };
}

export interface NormalizedProductInfo {
  name: string;
  brand?: string;
  category?: string;
  nutritionFacts?: Record<string, unknown>;
  /** null si non trouvé sur Open Food Facts */
  source: 'open_food_facts' | 'manual';
}
