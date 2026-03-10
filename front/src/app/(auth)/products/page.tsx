"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useProducts, type ProductFilter } from "@/hooks/useProducts";
import { useHousehold } from "@/contexts/HouseholdContext";
import { ProductCard } from "@/components/ProductCard";
import { RemoveProductModal } from "@/components/RemoveProductModal";
import { removeProduct } from "./actions";
import { ScanLine, RefreshCw } from "lucide-react";
import Link from "next/link";
import type { Product, DisposalReason } from "@/types";

const STATUS_FILTERS: {
  value: ProductFilter["status"] | "all";
  label: string;
}[] = [
  { value: "all", label: "Tous" },
  { value: "expiring_soon", label: "Bientôt périmés" },
  { value: "expired", label: "Périmés" },
  { value: "ok", label: "OK" },
];

export default function ProductsPage() {
  const { household } = useHousehold();
  const { data: session } = useSession();
  const token = session?.accessToken;

  const [statusFilter, setStatusFilter] = useState<
    ProductFilter["status"] | "all"
  >("all");
  const [pendingDelete, setPendingDelete] = useState<Product | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const filters: ProductFilter = {
    status: statusFilter === "all" ? undefined : statusFilter,
    sortBy: "expirationDate",
    sortOrder: "asc",
  };

  const { products, loading, error, refetch } = useProducts(
    household?._id ?? null,
    filters,
  );

  const handleDeleteConfirm = async (reason: DisposalReason) => {
    if (!pendingDelete || !household) {
      return;
    }
    setDeleteLoading(true);
    setDeleteError(null);
    try {
      await removeProduct(household._id, pendingDelete._id, reason, token);
      setPendingDelete(null);
      await refetch();
    } catch (e) {
      setDeleteError((e as Error).message);
    } finally {
      setDeleteLoading(false);
    }
  };

  return (
    <div className="flex flex-col gap-4 p-4">
      {/* Header */}
      <div className="flex items-center justify-between pt-2">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">
          Mon frigo
        </h1>
        <button
          onClick={refetch}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
          aria-label="Actualiser"
        >
          <RefreshCw size={18} className={loading ? "animate-spin" : ""} />
        </button>
      </div>

      {/* Filtres de statut */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
        {STATUS_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            onClick={() => setStatusFilter(value)}
            className={`shrink-0 rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              statusFilter === value
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Erreur de chargement */}
      {error && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Erreur : {error}
        </div>
      )}

      {/* Erreur de suppression */}
      {deleteError && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Impossible de retirer le produit : {deleteError}
        </div>
      )}

      {!loading && !error && products.length === 0 && (
        <div className="flex flex-col items-center gap-4 py-16 text-center">
          <p className="text-gray-400 dark:text-zinc-500">
            Aucun produit trouvé.
          </p>
          <Link
            href="/scan"
            className="flex items-center gap-2 rounded-full bg-green-600 px-5 py-2.5 text-sm font-semibold text-white shadow hover:bg-green-700"
          >
            <ScanLine size={16} />
            Scanner un produit
          </Link>
        </div>
      )}

      <div className="flex flex-col gap-3">
        {products.map((product) => (
          <ProductCard
            key={product._id}
            product={product}
            onDelete={() => {
              setDeleteError(null);
              setPendingDelete(product);
            }}
          />
        ))}
      </div>

      {/* FAB scan */}
      <Link
        href="/scan"
        className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-green-600 text-white shadow-lg hover:bg-green-700 active:scale-95 transition-transform"
        aria-label="Scanner un produit"
      >
        <ScanLine size={24} />
      </Link>

      {/* Modal de confirmation de suppression */}
      {pendingDelete && (
        <RemoveProductModal
          product={pendingDelete}
          loading={deleteLoading}
          onConfirm={handleDeleteConfirm}
          onClose={() => {
            if (!deleteLoading) {
              setPendingDelete(null);
            }
          }}
        />
      )}
    </div>
  );
}
