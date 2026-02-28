"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
import { useSession } from "next-auth/react";
import { apiFetch } from "@/lib/api";
import type { Product } from "@/types";

export type ProductFilter = {
  status?: "ok" | "expiring_soon" | "expired";
  category?: string;
  sortBy?: "expirationDate" | "name";
  sortOrder?: "asc" | "desc";
  expiringSoonDays?: number;
};

export function useProducts(householdId: string | null, filters: ProductFilter = {}) {
  const { data: session } = useSession();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const token = session?.accessToken;

  // Stable key from filters to use as a proper dep
  const filtersKey = useMemo(
    () => JSON.stringify(filters),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [
      filters.status,
      filters.category,
      filters.sortBy,
      filters.sortOrder,
      filters.expiringSoonDays,
    ],
  );

  const fetchProducts = useCallback(async () => {
    if (!householdId || !token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (filters.status) {
        params.set("status", filters.status);
      }
      if (filters.category) {
        params.set("category", filters.category);
      }
      if (filters.sortBy) {
        params.set("sortBy", filters.sortBy);
      }
      if (filters.sortOrder) {
        params.set("sortOrder", filters.sortOrder);
      }
      if (filters.expiringSoonDays) {
        params.set("expiringSoonDays", String(filters.expiringSoonDays));
      }

      const qs = params.toString();
      const data = await apiFetch<Product[]>(
        `/households/${householdId}/products${qs ? `?${qs}` : ""}`,
        { token }
      );
      setProducts(data);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
    // filtersKey is a stable serialized version of filters fields
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [householdId, token, filtersKey]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  return { products, loading, error, refetch: fetchProducts };
}
