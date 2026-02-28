import { apiFetch } from "@/lib/api";
import type { ScanResult } from "@/types";

export async function fetchScanResult(
  barcode: string,
  token: string | undefined,
  expirationImageBase64?: string,
): Promise<ScanResult> {
  return apiFetch<ScanResult>("/scan", {
    method: "POST",
    token,
    body: JSON.stringify({ barcode, expirationImageBase64 }),
  });
}

/**
 * Envoie une image au backend pour décodage du code-barres (zxing-wasm + sharp).
 * Retourne le code-barres décodé, ou null si non trouvé.
 */
export async function decodeBarcodeFromImage(
  imageBase64: string,
  token: string | undefined,
): Promise<string | null> {
  const result = await apiFetch<{ barcode: string | null }>(
    "/scan/decode-barcode",
    {
      method: "POST",
      token,
      body: JSON.stringify({ imageBase64 }),
    },
  );
  return result.barcode;
}

export async function saveProduct(
  householdId: string,
  token: string | undefined,
  data: {
    name: string;
    brand?: string;
    category?: string;
    barcode: string;
    expirationDate: string;
    nutritionFacts?: Record<string, unknown>;
  },
): Promise<void> {
  await apiFetch(`/households/${householdId}/products`, {
    method: "POST",
    token,
    body: JSON.stringify(data),
  });
}
