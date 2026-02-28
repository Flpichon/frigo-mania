import type { Product } from "@/types";
import { StatusBadge } from "./StatusBadge";
import { CalendarDays, Tag } from "lucide-react";

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
}

export function ProductCard({ product, onPress }: Props) {
  return (
    <button
      onClick={onPress}
      className="flex w-full items-center gap-3 rounded-xl bg-white p-4 shadow-sm ring-1 ring-gray-100 transition-shadow hover:shadow-md active:scale-[.98] dark:bg-zinc-900 dark:ring-zinc-800 text-left"
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
  );
}
