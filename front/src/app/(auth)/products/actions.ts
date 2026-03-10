import { apiFetch } from "@/lib/api";
import type { DisposalReason } from "@/types";

/**
 * Soft-deletes a product by marking it as removed with a disposal reason.
 * Maps to: DELETE /api/households/:householdId/products/:productId
 */
export async function removeProduct(
  householdId: string,
  productId: string,
  disposalReason: DisposalReason,
  token: string | undefined,
): Promise<void> {
  await apiFetch(`/households/${householdId}/products/${productId}`, {
    method: "DELETE",
    token,
    body: JSON.stringify({ disposalReason }),
  });
}
