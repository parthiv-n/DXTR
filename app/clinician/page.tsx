"use client";

import { Suspense, useEffect, useState, useCallback } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";
import { AppShell } from "@/components/layout/AppShell";
import { PatientInfo } from "@/lib/types";
import { AggregatedProgress, DateRangePreset } from "@/lib/exercise/types";
import { EXERCISE_GAMES } from "@/lib/exercise/games";
import { ProgressOverviewHeader } from "@/components/progress/ProgressOverviewHeader";
import { RepsTimelineStrip } from "@/components/progress/RepsTimelineStrip";
import { ProgressHeroCard } from "@/components/progress/ProgressHeroCard";
import { GameCardGrid } from "@/components/progress/GameCardGrid";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Loader2 } from "lucide-react";

type ProgressResponse = AggregatedProgress & {
  patientId: string;
  patientName: string;
  range: number;
  startDate: string;
  endDate: string;
};

function useProgressData(patientId: string, range: DateRangePreset) {
  const [data, setData] = useState<ProgressResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!patientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/patients/${patientId}/exercise-progress?range=${range}`
      );
      if (!res.ok) throw new Error("Failed to fetch progress data");
      const json = await res.json();
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [patientId, range]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
}

export default function ClinicianDashboardPage() {
  return (
    <Suspense fallback={
      <AppShell variant="clinician">
        <div className="flex justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-dxtr-teal" />
        </div>
      </AppShell>
    }>
      <ClinicianDashboardInner />
    </Suspense>
  );
}

function ClinicianDashboardInner() {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const rangeParam = (searchParams.get("range") || "14") as DateRangePreset;
  const gameIdParam = searchParams.get("gameId");
  const dayParam = searchParams.get("day");

  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [expandedGameId, setExpandedGameId] = useState<string | null>(gameIdParam);
  const [selectedDay, setSelectedDay] = useState<string | null>(dayParam);

  const { data: progress, loading, error } = useProgressData(selectedPatientId, rangeParam);

  useEffect(() => {
    async function loadPatients() {
      try {
        const res = await fetch("/api/patients");
        if (!res.ok) return;
        const data: PatientInfo[] = await res.json();
        setPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      } catch {
        // silent
      }
    }
    loadPatients();
  }, [selectedPatientId]);

  function updateQueryParam(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) {
      params.set(key, value);
    } else {
      params.delete(key);
    }
    router.replace(`${pathname}?${params.toString()}`, { scroll: false });
  }

  function handleRangeChange(range: DateRangePreset) {
    updateQueryParam("range", range);
  }

  function handleDayClick(day: string | null) {
    setSelectedDay(day);
    updateQueryParam("day", day);
  }

  function handleExpandGame(gameId: string | null) {
    setExpandedGameId(gameId);
    updateQueryParam("gameId", gameId);
  }

  const rangeDays = parseInt(rangeParam, 10);

  return (
    <AppShell variant="clinician">
      <TooltipProvider>
        <div className="max-w-6xl mx-auto pb-20 flex flex-col h-[calc(100vh-5rem)]">
          {/* TOP HALF: adherence overview */}
          <div className="shrink-0">
            <ProgressOverviewHeader
              patients={patients}
              selectedPatientId={selectedPatientId}
              onPatientChange={setSelectedPatientId}
              range={rangeParam}
              onRangeChange={handleRangeChange}
              totalReps={progress?.totalReps ?? 0}
              expectedReps={progress?.expectedReps ?? 0}
              completionPct={progress?.completionPct ?? 0}
              homeReps={progress?.homeReps ?? 0}
              clinicReps={progress?.clinicReps ?? 0}
              lastActivityAt={progress?.lastActivityAt ?? null}
            />

            {loading && !progress ? (
              <div className="flex justify-center py-10">
                <Loader2 className="w-6 h-6 animate-spin text-dxtr-teal" />
              </div>
            ) : error ? (
              <div className="text-red-500 text-sm mb-4">{error}</div>
            ) : progress ? (
              <>
                <RepsTimelineStrip
                  dailyBuckets={progress.dailyBuckets}
                  selectedDay={selectedDay}
                  onDayClick={handleDayClick}
                />
                <ProgressHeroCard
                  completionPct={progress.completionPct}
                  totalReps={progress.totalReps}
                  expectedReps={progress.expectedReps}
                  streak={progress.streak}
                  missedDays={progress.missedDays}
                  weeklyBreakdown={progress.weeklyBreakdown}
                  rangeDays={rangeDays}
                />
              </>
            ) : null}
          </div>

          {/* Divider */}
          <hr className="border-gray-200 my-2" />

          {/* BOTTOM HALF: game cards / drill-in */}
          <div className="flex-1 overflow-y-auto pt-2">
            {loading && !progress ? (
              <SkeletonGrid />
            ) : progress ? (
              <GameCardGrid
                games={EXERCISE_GAMES}
                progress={progress}
                expandedGameId={expandedGameId}
                onExpandGame={handleExpandGame}
                patientId={selectedPatientId}
                selectedDay={selectedDay}
              />
            ) : (
              <div className="text-center text-gray-400 py-10">
                <p className="text-sm">No exercise data in this range</p>
              </div>
            )}
          </div>
        </div>
      </TooltipProvider>

      {/* Yellow Ask Question Bar */}
      <div className="fixed bottom-0 left-0 md:left-14 right-0 bg-dxtr-gold py-3 px-4 md:px-6 z-30">
        <input
          type="text"
          placeholder="Ask a question!"
          className="w-full bg-transparent border-none text-dxtr-brown placeholder-dxtr-brown/70 focus:outline-none text-sm md:text-base"
        />
      </div>
    </AppShell>
  );
}

function SkeletonGrid() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="bg-white rounded-2xl border border-gray-200 p-4 animate-pulse">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-8 h-8 bg-gray-200 rounded-full" />
            <div className="h-4 bg-gray-200 rounded w-24" />
          </div>
          <div className="h-2 bg-gray-200 rounded-full w-full mb-3" />
          <div className="flex justify-between">
            <div className="h-3 bg-gray-200 rounded w-12" />
            <div className="h-3 bg-gray-200 rounded w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
