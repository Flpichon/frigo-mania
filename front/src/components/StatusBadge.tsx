import type { ProductStatus } from "@/types";

const CONFIG: Record<ProductStatus, { label: string; className: string }> = {
  ok:             { label: "OK",           className: "bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-400" },
  expiring_soon:  { label: "Bientôt périmé", className: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
  expired:        { label: "Périmé",       className: "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400" },
};

export function StatusBadge({ status }: { status: ProductStatus }) {
  const { label, className } = CONFIG[status];
  return (
    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${className}`}>
      {label}
    </span>
  );
}
