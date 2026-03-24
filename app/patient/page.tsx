"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AppShell } from "@/components/layout/AppShell";
import { Lock } from "lucide-react";
import { DailyProgressData } from "@/lib/types";

const gameVisuals = [
  { id: "car-racer", bg: "url('/car_game_thumbnail.png') center/cover", name: "Car Racer", enabled: true },
  { id: "alien-abduction", bg: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)", name: "Alien Abduction", enabled: true },
  { id: "fossil-finder", bg: "linear-gradient(135deg, #8B6914 0%, #C4A35A 50%, #E8D5A3 100%)", name: "Fossil Finder", enabled: true },
  { id: "storm-witch", bg: "url('/witch_runner/assets/textures/sky_1.png') center/cover", name: "Storm Witch", enabled: true },
  { id: "game-6", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 6", enabled: false },
  { id: "game-7", bg: "linear-gradient(135deg, #E0E0E0 0%, #BDBDBD 100%)", name: "Game 7", enabled: false },
];

const PATIENT_ID = "edwin-001";

export default function PatientDashboardPage() {
  const [carRacerProgress, setCarRacerProgress] = useState<DailyProgressData | null>(null);
  const [alienProgress, setAlienProgress] = useState<DailyProgressData | null>(null);
  const [fossilProgress, setFossilProgress] = useState<DailyProgressData | null>(null);
  const [stormWitchProgress, setStormWitchProgress] = useState<DailyProgressData | null>(null);

  useEffect(() => {
    fetch(`/api/daily-progress/${PATIENT_ID}/today?gameId=car-racer`)
      .then((res) => res.json())
      .then((data: DailyProgressData) => setCarRacerProgress(data))
      .catch((err) => console.error("Error fetching car-racer progress:", err));

    fetch(`/api/daily-progress/${PATIENT_ID}/today?gameId=alien-abduction`)
      .then((res) => res.json())
      .then((data: DailyProgressData) => setAlienProgress(data))
      .catch((err) => console.error("Error fetching alien-abduction progress:", err));

    fetch(`/api/daily-progress/${PATIENT_ID}/today?gameId=fossil-finder`)
      .then((res) => res.json())
      .then((data: DailyProgressData) => setFossilProgress(data))
      .catch((err) => console.error("Error fetching fossil-finder progress:", err));

    fetch(`/api/daily-progress/${PATIENT_ID}/today?gameId=storm-witch`)
      .then((res) => res.json())
      .then((data: DailyProgressData) => setStormWitchProgress(data))
      .catch((err) => console.error("Error fetching storm-witch progress:", err));
  }, []);

  const getProgressForGame = (gameId: string) => {
    if (gameId === "car-racer" && carRacerProgress) return carRacerProgress;
    if (gameId === "alien-abduction" && alienProgress) return alienProgress;
    if (gameId === "fossil-finder" && fossilProgress) return fossilProgress;
    if (gameId === "storm-witch" && stormWitchProgress) return stormWitchProgress;
    return null;
  };

  return (
    <AppShell variant="patient">
      {/* Use flex column to fill available viewport height - scaled for 175% zoom equivalent */}
      <div className="flex flex-col h-[calc(100vh-4rem)] md:h-[calc(100vh-1.5rem)] pb-20">
        {/* Header - larger sizing */}
        <div className="mb-4 md:mb-6 shrink-0">
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-extrabold text-dxtr-teal leading-tight">
          Edwin&apos;s Dashboard
        </h1>
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-gray-700">
          Daily Missions:
        </h2>
          </div>

        {/* Game tiles grid - larger gaps and spacing */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-10 gap-y-5 md:gap-x-14 md:gap-y-6 flex-1 min-h-0">
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
                  className={`aspect-[2/1] rounded-2xl relative overflow-hidden border-[3px] transition-all ${
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
                      <Lock className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400/60" />
                        </div>
                  )}

                  {/* Completion checkmark badge */}
                  {visual.enabled && allComplete && (
                    <div className="absolute top-3 right-3 bg-green-500 text-white text-sm font-bold px-3 py-1.5 rounded-full shadow">
                      ✓ Done!
                      </div>
                  )}
                      
                  {/* Green vertical progress bar on right edge */}
                  {visual.enabled && setsCompleted > 0 && (
                    <div className="absolute top-0 right-0 w-2.5 h-full bg-black/10">
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
                <div className="mt-3 shrink-0 mx-auto w-3/4 max-w-[320px]">
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
                            className={`w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7 rounded-full border-2 shrink-0 transition-colors ${
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
                              className={`h-1 flex-1 transition-colors ${
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
                          <span className={`text-[11px] sm:text-[12px] md:text-[14px] mt-1 whitespace-nowrap -ml-1 ${
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
                <p className="text-center text-lg sm:text-xl md:text-2xl font-bold text-dxtr-brown mt-2">
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
      <div className="fixed bottom-0 left-0 md:left-14 right-0 bg-dxtr-gold py-5 px-6 md:px-10 z-30">
        <input
          type="text"
          placeholder="Ask a question about your progress!"
          className="w-full bg-transparent border-none text-dxtr-brown placeholder-dxtr-brown/70 focus:outline-none text-base md:text-lg"
        />
      </div>
    </AppShell>
  );
}
