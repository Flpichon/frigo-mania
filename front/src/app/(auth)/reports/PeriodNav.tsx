import { ChevronLeft, ChevronRight } from "lucide-react";
import type { ReportPeriod } from "@/types";
import { formatPeriodLabel, offsetDate, isCurrentPeriod } from "./utils";

interface PeriodNavProps {
  period: ReportPeriod;
  refDate: Date;
  onPeriodChange: (period: ReportPeriod) => void;
  onNavigate: (dir: -1 | 1) => void;
}

export default function PeriodNav({
  period,
  refDate,
  onPeriodChange,
  onNavigate,
}: PeriodNavProps) {
  const current = isCurrentPeriod(refDate, period);

  return (
    <div className="flex flex-col gap-3">
      {/* Sélecteur semaine / mois */}
      <div className="flex gap-2">
        {(["weekly", "monthly"] as ReportPeriod[]).map((p) => (
          <button
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
              period === p
                ? "bg-green-600 text-white"
                : "bg-white text-gray-600 ring-1 ring-gray-200 hover:bg-gray-50 dark:bg-zinc-800 dark:text-zinc-300 dark:ring-zinc-700"
            }`}
          >
            {p === "weekly" ? "Semaine" : "Mois"}
          </button>
        ))}
      </div>

      {/* Flèches de navigation */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => onNavigate(-1)}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          <ChevronLeft size={18} />
        </button>
        <span className="capitalize text-sm font-semibold text-gray-700 dark:text-zinc-300">
          {formatPeriodLabel(refDate, period)}
        </span>
        <button
          onClick={() => onNavigate(1)}
          disabled={current}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-30 dark:hover:bg-zinc-800"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export { offsetDate };
