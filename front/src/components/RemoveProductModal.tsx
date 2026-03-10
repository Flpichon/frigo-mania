"use client";

import { Trash2, CheckCircle2, X, AlertCircle, RotateCcw } from "lucide-react";
import type { Product, DisposalReason } from "@/types";

interface Props {
  product: Product;
  loading: boolean;
  onConfirm: (reason: DisposalReason) => void;
  onClose: () => void;
}

/**
 * Bottom-sheet modal that asks the user *why* a product is being removed
 * before calling the soft-delete API.
 */
export function RemoveProductModal({
  product,
  loading,
  onConfirm,
  onClose,
}: Props) {
  return (
    /* Backdrop */
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 backdrop-blur-sm"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      {/* Sheet */}
      <div className="w-full max-w-md rounded-t-2xl bg-white px-5 pb-8 pt-5 shadow-xl dark:bg-zinc-900">
        {/* Drag handle */}
        <div className="mx-auto mb-4 h-1 w-10 rounded-full bg-gray-200 dark:bg-zinc-700" />

        {/* Title */}
        <div className="mb-1 flex items-center gap-2 text-gray-900 dark:text-zinc-100">
          <Trash2 size={18} className="shrink-0 text-red-500" />
          <h2 className="text-base font-semibold">Retirer ce produit ?</h2>
        </div>
        <p className="mb-5 text-sm text-gray-500 dark:text-zinc-400 truncate">
          {product.name}
          {product.brand ? ` · ${product.brand}` : ""}
        </p>

        {/* Reason buttons */}
        <div className="flex flex-col gap-3">
          <button
            disabled={loading}
            onClick={() => onConfirm("consumed")}
            className="flex items-center gap-3 rounded-xl bg-green-50 px-4 py-3.5 text-left ring-1 ring-green-200 transition-colors hover:bg-green-100 active:scale-[.98] disabled:opacity-50 dark:bg-green-950/30 dark:ring-green-800"
          >
            <CheckCircle2 size={20} className="shrink-0 text-green-600" />
            <div>
              <p className="font-semibold text-green-800 dark:text-green-300">
                Consommé
              </p>
              <p className="text-xs text-green-600 dark:text-green-500">
                Le produit a été mangé / utilisé
              </p>
            </div>
          </button>

          <button
            disabled={loading}
            onClick={() => onConfirm("thrown")}
            className="flex items-center gap-3 rounded-xl bg-red-50 px-4 py-3.5 text-left ring-1 ring-red-200 transition-colors hover:bg-red-100 active:scale-[.98] disabled:opacity-50 dark:bg-red-950/30 dark:ring-red-800"
          >
            <Trash2 size={20} className="shrink-0 text-red-500" />
            <div>
              <p className="font-semibold text-red-700 dark:text-red-400">
                Jeté
              </p>
              <p className="text-xs text-red-500 dark:text-red-500">
                Le produit a été jeté / gaspillé
              </p>
            </div>
          </button>

          <button
            disabled={loading}
            onClick={() => onConfirm("expired_product")}
            className="flex items-center gap-3 rounded-xl bg-amber-50 px-4 py-3.5 text-left ring-1 ring-amber-200 transition-colors hover:bg-amber-100 active:scale-[.98] disabled:opacity-50 dark:bg-amber-950/30 dark:ring-amber-800"
          >
            <AlertCircle size={20} className="shrink-0 text-amber-500" />
            <div>
              <p className="font-semibold text-amber-800 dark:text-amber-300">
                Périmé
              </p>
              <p className="text-xs text-amber-600 dark:text-amber-500">
                Le produit a dépassé sa date limite
              </p>
            </div>
          </button>

          <button
            disabled={loading}
            onClick={() => onConfirm("entry_error")}
            className="flex items-center gap-3 rounded-xl bg-gray-50 px-4 py-3.5 text-left ring-1 ring-gray-200 transition-colors hover:bg-gray-100 active:scale-[.98] disabled:opacity-50 dark:bg-zinc-800 dark:ring-zinc-700"
          >
            <RotateCcw
              size={20}
              className="shrink-0 text-gray-500 dark:text-zinc-400"
            />
            <div>
              <p className="font-semibold text-gray-700 dark:text-zinc-300">
                Erreur de saisie
              </p>
              <p className="text-xs text-gray-500 dark:text-zinc-500">
                Produit ajouté par erreur
              </p>
            </div>
          </button>

          <button
            disabled={loading}
            onClick={onClose}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-medium text-gray-500 transition-colors hover:bg-gray-100 disabled:opacity-50 dark:text-zinc-400 dark:hover:bg-zinc-800"
          >
            <X size={16} />
            Annuler
          </button>
        </div>
      </div>
    </div>
  );
}
