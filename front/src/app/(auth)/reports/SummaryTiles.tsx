import { Leaf, Trash2, Flame } from "lucide-react";
import type { ReportSummary } from "@/types";
import StatTile from "./StatTile";

interface SummaryTilesProps {
  summary: ReportSummary;
}

export default function SummaryTiles({ summary }: SummaryTilesProps) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile
        label="Consommés"
        value={summary.consumed}
        icon={<Leaf size={18} className="text-green-600" />}
        color="green"
      />
      <StatTile
        label="Jetés"
        value={summary.thrown}
        icon={<Trash2 size={18} className="text-red-500" />}
        color="red"
      />
      <StatTile
        label="Gaspillage"
        value={`${summary.wasteRate}%`}
        icon={<Flame size={18} className="text-amber-500" />}
        color="amber"
      />
    </div>
  );
}
