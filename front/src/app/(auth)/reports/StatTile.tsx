import type { ReactNode } from "react";

type Color = "green" | "red" | "amber";

const BG: Record<Color, string> = {
  green: "bg-green-50 dark:bg-green-900/20",
  red: "bg-red-50 dark:bg-red-900/20",
  amber: "bg-amber-50 dark:bg-amber-900/20",
};

interface StatTileProps {
  label: string;
  value: number | string;
  icon: ReactNode;
  color: Color;
}

export default function StatTile({ label, value, icon, color }: StatTileProps) {
  return (
    <div className={`flex flex-col items-center gap-1 rounded-2xl p-3 ${BG[color]}`}>
      {icon}
      <span className="text-xl font-bold text-gray-800 dark:text-zinc-100">
        {value}
      </span>
      <span className="text-xs text-gray-500 dark:text-zinc-400 text-center">
        {label}
      </span>
    </div>
  );
}
