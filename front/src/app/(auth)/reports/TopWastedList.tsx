import type { TopWastedReport } from "@/types";

interface TopWastedListProps {
  topWasted: TopWastedReport;
}

export default function TopWastedList({ topWasted }: TopWastedListProps) {
  if (topWasted.items.length === 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-gray-100 dark:bg-zinc-900 dark:ring-zinc-800">
      <h2 className="mb-3 text-sm font-semibold text-gray-700 dark:text-zinc-200">
        Produits les plus jetés
      </h2>
      <ol className="flex flex-col gap-2">
        {topWasted.items.map((item, i) => (
          <li key={item.name} className="flex items-center gap-3">
            <span className="w-5 text-center text-xs font-bold text-gray-400">
              {i + 1}
            </span>
            <span className="flex-1 truncate text-sm text-gray-800 dark:text-zinc-200">
              {item.name}
            </span>
            <span className="rounded-full bg-red-100 px-2 py-0.5 text-xs font-semibold text-red-600 dark:bg-red-900/30 dark:text-red-400">
              ×{item.count}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
