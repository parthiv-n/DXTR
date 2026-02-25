"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Lock } from "lucide-react";
import { DailyProgressData } from "@/lib/types";

// 6 game tiles: car-racer is active, rest are grey placeholders
const gameVisuals = [
  { id: "car-racer", bg: "url('/car_game_thumbnail.png') center/cover", name: "Car Racer", enabled: true },
  { id: "game-2", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 2", enabled: false },
  { id: "game-3", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 3", enabled: false },
  { id: "game-4", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 4", enabled: false },
  { id: "game-5", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 5", enabled: false },
  { id: "game-6", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 6", enabled: false },
];

const PATIENT_ID = "edwin-001";

export default function PatientDashboardPage() {
  const [carRacerProgress, setCarRacerProgress] = useState<DailyProgressData | null>(null);

  useEffect(() => {
    fetch(`/api/daily-progress/${PATIENT_ID}/today?gameId=car-racer`)
      .then((res) => res.json())
      .then((data: DailyProgressData) => setCarRacerProgress(data))
      .catch((err) => console.error("Error fetching progress:", err));
  }, []);

  const getProgressForGame = (gameId: string) => {
    if (gameId === "car-racer" && carRacerProgress) {
      return carRacerProgress;
    }
    return null;
  };

  return (
    <AppShell variant="patient">
      {/* Use flex column to fill available viewport height */}
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-1.5rem)] pb-12">
        {/* Header - compact */}
        <div className="mb-2 md:mb-3 shrink-0">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-dxtr-teal leading-tight">
          Edwin&apos;s Dashboard
        </h1>
          <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-700">
          Daily Missions:
        </h2>
          </div>

        {/* Game tiles grid - fills remaining space */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-6 gap-y-2 md:gap-x-8 md:gap-y-3 flex-1 min-h-0">
          {gameVisuals.map((visual) => {
            const progress = getProgressForGame(visual.id);
            const setsCompleted = progress?.setsCompleted ?? 0;
            const setsTarget = progress?.setsTarget ?? 5;
            const allComplete = progress?.allComplete ?? false;

            // Build round dots array
            const rounds = Array.from({ length: setsTarget }, (_, i) => i + 1);

            const tileInner = (
              <div className="flex flex-col">
                {/* Thumbnail - 2:1 aspect ratio */}
                    <div
                  className={`aspect-[2/1] rounded-xl relative overflow-hidden border-2 transition-all ${
                    visual.enabled
                      ? "border-dxtr-teal/30 hover:border-dxtr-teal/60 hover:shadow-lg active:scale-[0.98]"
                      : "border-gray-200 opacity-50"
                  }`}
                      style={{ background: visual.bg }}
                    >
                  {/* Subtle vignette for enabled tiles */}
                  {visual.enabled && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent" />
                  )}

                  {/* Lock icon for disabled games */}
                  {!visual.enabled && (
                      <div className="absolute inset-0 flex items-center justify-center">
                      <Lock className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-gray-400/60" />
                        </div>
                  )}

                  {/* Completion checkmark badge */}
                  {visual.enabled && allComplete && (
                    <div className="absolute top-2 right-2 bg-green-500 text-white text-xs font-bold px-2 py-1 rounded-full shadow">
                      ✓ Done!
                      </div>
                  )}
                      
                  {/* Green vertical progress bar on right edge */}
                  {visual.enabled && setsCompleted > 0 && (
                    <div className="absolute top-0 right-0 w-1.5 h-full bg-black/10">
                        <div 
                        className={`w-full transition-all duration-500 rounded-b ${
                          allComplete ? "bg-green-400" : "bg-dxtr-teal"
                        }`}
                        style={{ height: `${(setsCompleted / setsTarget) * 100}%` }}
                        />
                    </div>
                  )}
                      </div>
                      
                {/* Round dots connected by lines + labels below tile */}
                <div className="mt-1.5 shrink-0 mx-auto w-3/4 max-w-[200px]">
                  {/* Dots and connecting lines row */}
                  <div className="flex items-center">
                    {rounds.map((roundNum) => {
                      const isComplete = visual.enabled && roundNum <= setsCompleted;
                      const isCurrent = visual.enabled && roundNum === setsCompleted + 1 && !allComplete;
                      const nextComplete = visual.enabled && roundNum < setsTarget && (roundNum + 1) <= setsCompleted;
                      const isLast = roundNum === setsTarget;

                      return (
                        <div key={roundNum} className={`flex items-center ${isLast ? "" : "flex-1"}`}>
                          {/* Dot */}
                          <div
                            className={`w-3 h-3 sm:w-3.5 sm:h-3.5 md:w-4 md:h-4 rounded-full border-2 shrink-0 transition-colors ${
                              isComplete
                                ? "bg-dxtr-teal border-dxtr-teal"
                                : isCurrent
                                ? "bg-white border-dxtr-teal"
                                : visual.enabled
                                ? "bg-white border-gray-300"
                                : "bg-gray-100 border-gray-200"
                            }`}
                          />
                          {/* Connecting line (not after last dot) */}
                          {!isLast && (
                            <div
                              className={`h-0.5 flex-1 transition-colors ${
                                nextComplete || isComplete && (roundNum + 1) <= setsCompleted
                                  ? "bg-dxtr-teal"
                                  : visual.enabled
                                  ? "bg-gray-300"
                                  : "bg-gray-200"
                              }`}
                            />
                          )}
                        </div>
                      );
                    })}
                  </div>
                  {/* Labels row */}
                  <div className="flex items-center">
                    {rounds.map((roundNum) => {
                      const isComplete = visual.enabled && roundNum <= setsCompleted;
                      const isLast = roundNum === setsTarget;
                      return (
                        <div key={roundNum} className={`${isLast ? "" : "flex-1"} flex justify-start`}>
                          <span className={`text-[7px] sm:text-[8px] md:text-[9px] mt-0.5 whitespace-nowrap -ml-1 ${
                            isComplete ? "text-dxtr-teal font-semibold" : "text-gray-400"
                          }`}>
                            Round {roundNum}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                    </div>
                    
                {/* Game name in brown lettering */}
                <p className="text-center text-sm sm:text-base md:text-lg font-bold text-dxtr-brown mt-1">
                      {visual.name}
                    </p>
                  </div>
            );

            if (visual.enabled) {
              return (
                <Link
                  key={visual.id}
                  href={`/patient/game/${visual.id}`}
                  className="block cursor-pointer"
                >
                  {tileInner}
                </Link>
              );
            }

            return (
              <div key={visual.id} className="cursor-not-allowed">
                {tileInner}
              </div>
              );
            })}
          </div>
      </div>

      {/* Yellow Ask Question Bar - fixed at bottom */}
      <div className="fixed bottom-0 left-0 md:left-14 right-0 bg-dxtr-gold py-3 px-4 md:px-6 z-30">
        <input
          type="text"
          placeholder="Ask a question about your progress!"
          className="w-full bg-transparent border-none text-dxtr-brown placeholder-dxtr-brown/70 focus:outline-none text-sm md:text-base"
        />
      </div>
    </AppShell>
  );
}
