"use client";

import { useState, useEffect, useCallback } from "react";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";
import { useHousehold } from "@/contexts/HouseholdContext";
import type { ReportSummary, TopWastedReport, ReportPeriod } from "@/types";
import { fetchReportSummary, fetchTopWasted } from "./actions";
import { offsetDate } from "./utils";
import PeriodNav from "./PeriodNav";
import SummaryTiles from "./SummaryTiles";
import TopWastedList from "./TopWastedList";

export default function ReportsPage() {
  const { data: session } = useSession();
  const token = session?.accessToken;
  const { household } = useHousehold();

  const [period, setPeriod] = useState<ReportPeriod>("weekly");
  const [refDate, setRefDate] = useState<Date>(new Date());
  const [summary, setSummary] = useState<ReportSummary | null>(null);
  const [topWasted, setTopWasted] = useState<TopWastedReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadReports = useCallback(async () => {
    if (!household || !token) {
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryData, topData] = await Promise.all([
        fetchReportSummary(household._id, token, period, refDate),
        fetchTopWasted(household._id, token, period, refDate),
      ]);
      setSummary(summaryData);
      setTopWasted(topData);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  }, [household, token, period, refDate]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handlePeriodChange = (p: ReportPeriod) => {
    setPeriod(p);
    setRefDate(new Date());
  };

  const handleNavigate = (dir: -1 | 1) => {
    setRefDate((d) => offsetDate(d, period, dir));
  };

  return (
    <main className="flex flex-col gap-5 p-4 pt-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-zinc-100">Rapports</h1>

      <PeriodNav
        period={period}
        refDate={refDate}
        onPeriodChange={handlePeriodChange}
        onNavigate={handleNavigate}
      />

      {!household && (
        <p className="text-center text-sm text-gray-400">Aucun foyer sélectionné.</p>
      )}

      {loading && (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-green-600" size={32} />
        </div>
      )}

      {error && !loading && (
        <div className="rounded-xl bg-red-50 p-4 text-sm text-red-600 dark:bg-red-900/20 dark:text-red-400">
          Erreur : {error}
        </div>
      )}

      {!loading && !error && summary && (
        <>
          <SummaryTiles summary={summary} />
          {topWasted && <TopWastedList topWasted={topWasted} />}
          {summary.total === 0 && (
            <p className="py-4 text-center text-sm text-gray-400">
              Aucune donnée pour cette période.
            </p>
          )}
        </>
      )}
    </main>
  );
}
