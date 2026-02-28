import type { ReportPeriod } from "@/types";

/** Décale une date d'une semaine ou d'un mois dans la direction donnée. */
export function offsetDate(
  date: Date,
  period: ReportPeriod,
  direction: -1 | 1,
): Date {
  const d = new Date(date);
  if (period === "weekly") {
    d.setDate(d.getDate() + direction * 7);
  } else {
    d.setMonth(d.getMonth() + direction);
  }
  return d;
}

/** Libellé localisé de la période (ex: "lun. 3 juin – dim. 9 juin" ou "juin 2025"). */
export function formatPeriodLabel(date: Date, period: ReportPeriod): string {
  if (period === "weekly") {
    const day = date.getDay();
    const diffToMonday = day === 0 ? -6 : 1 - day;
    const monday = new Date(date);
    monday.setDate(date.getDate() + diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const fmt = (d: Date) =>
      d.toLocaleDateString("fr-FR", { day: "numeric", month: "short" });
    return `${fmt(monday)} – ${fmt(sunday)}`;
  }
  return date.toLocaleDateString("fr-FR", { month: "long", year: "numeric" });
}

/** Retourne le numéro de semaine ISO d'une date. */
function isoWeek(d: Date): number {
  const tmp = new Date(d);
  tmp.setHours(0, 0, 0, 0);
  const day = tmp.getDay() || 7;
  tmp.setDate(tmp.getDate() + 4 - day);
  const yearStart = new Date(tmp.getFullYear(), 0, 1);
  return Math.ceil(((+tmp - +yearStart) / 86400000 + 1) / 7);
}

/** Vérifie si la date de référence correspond à la période courante. */
export function isCurrentPeriod(refDate: Date, period: ReportPeriod): boolean {
  const now = new Date();
  if (period === "monthly") {
    return (
      refDate.getFullYear() === now.getFullYear() &&
      refDate.getMonth() === now.getMonth()
    );
  }
  return (
    refDate.getFullYear() === now.getFullYear() &&
    isoWeek(refDate) === isoWeek(now)
  );
}
