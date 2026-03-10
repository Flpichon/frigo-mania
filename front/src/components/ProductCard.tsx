import type { Product } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { CalendarDays, Tag, Trash2 } from "lucide-react";

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

interface Props {
  product: Product;
  onPress?: () => void;
  onDelete?: () => void;
}

export function ProductCard({ product, onPress, onDelete }: Props) {
  return (
    <div className="flex w-full items-center gap-2 rounded-xl bg-white shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md dark:bg-zinc-900 dark:ring-zinc-800">
      {/* Main card area — tappable */}
      <button
        onClick={onPress}
        className="flex flex-1 min-w-0 items-center gap-3 p-4 text-left active:scale-[.98] transition-transform"
      >
        {/* Indicateur couleur statut */}
        <div
          className={`h-10 w-1 shrink-0 rounded-full ${
            product.status === "expired"
              ? "bg-red-400"
              : product.status === "expiring_soon"
              ? "bg-amber-400"
              : "bg-green-400"
          }`}
        />

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between gap-2">
            <p className="truncate font-semibold text-gray-900 dark:text-zinc-100">
              {product.name}
            </p>
            <StatusBadge status={product.status} />
          </div>

          {product.brand && (
            <p className="mt-0.5 truncate text-xs text-gray-400">{product.brand}</p>
          )}

          <div className="mt-1.5 flex items-center gap-3 text-xs text-gray-500 dark:text-zinc-400">
            <span className="flex items-center gap-1">
              <CalendarDays size={12} />
              {formatDate(product.expirationDate)}
            </span>
            {product.category && (
              <span className="flex items-center gap-1">
                <Tag size={12} />
                {product.category}
              </span>
            )}
          </div>
        </div>
      </button>

      {/* Delete action */}
      {onDelete && (
        <button
          onClick={onDelete}
          aria-label="Retirer ce produit"
          className="flex h-full shrink-0 items-center justify-center px-4 text-gray-300 transition-colors hover:text-red-500 active:scale-90 dark:text-zinc-600 dark:hover:text-red-400"
        >
          <Trash2 size={18} />
        </button>
      )}
    </div>
  );
}
