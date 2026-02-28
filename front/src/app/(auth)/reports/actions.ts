import { apiFetch } from "@/lib/api";
import type { ReportSummary, TopWastedReport, ReportPeriod } from "@/types";

export async function fetchReportSummary(
  householdId: string,
  token: string | undefined,
  period: ReportPeriod,
  date: Date,
): Promise<ReportSummary> {
  const dateParam = date.toISOString().split("T")[0];
  const qs = `?period=${period}&date=${dateParam}`;
  return apiFetch<ReportSummary>(
    `/households/${householdId}/reports/summary${qs}`,
    { token },
  );
}

export async function fetchTopWasted(
  householdId: string,
  token: string | undefined,
  period: ReportPeriod,
  date: Date,
): Promise<TopWastedReport> {
  const dateParam = date.toISOString().split("T")[0];
  const qs = `?period=${period}&date=${dateParam}`;
  return apiFetch<TopWastedReport>(
    `/households/${householdId}/reports/top-wasted${qs}`,
    { token },
  );
}
