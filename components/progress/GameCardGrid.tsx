"use client";

import { useEffect, useRef, useCallback } from "react";
import { GameAggregate, ExerciseGame, AggregatedProgress, DayBucket } from "@/lib/exercise/types";
import { GameProgressCard } from "./GameProgressCard";
import { ExpandedGamePanel } from "./ExpandedGamePanel";
import { ArrowLeft } from "lucide-react";

type Props = {
  games: ExerciseGame[];
  progress: AggregatedProgress;
  expandedGameId: string | null;
  onExpandGame: (gameId: string | null) => void;
  patientId: string;
  selectedDay: string | null;
};

export function GameCardGrid({
  games,
  progress,
  expandedGameId,
  onExpandGame,
  patientId,
  selectedDay,
}: Props) {
  const backBtnRef = useRef<HTMLButtonElement>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const expandedGame = expandedGameId ? games.find((g) => g.id === expandedGameId) : null;
  const expandedAggregate = expandedGameId
    ? progress.perGame.find((g) => g.gameId === expandedGameId)
    : null;

  useEffect(() => {
    if (expandedGameId && backBtnRef.current) {
      backBtnRef.current.focus();
    }
  }, [expandedGameId]);

  const handleClose = useCallback(() => {
    const prevId = expandedGameId;
    onExpandGame(null);
    requestAnimationFrame(() => {
      if (prevId && cardRefs.current[prevId]) {
        cardRefs.current[prevId]?.focus();
      }
    });
  }, [expandedGameId, onExpandGame]);

  useEffect(() => {
    if (!expandedGameId) return;
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") handleClose();
    }
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [expandedGameId, handleClose]);

  if (expandedGame && expandedAggregate) {
    return (
      <div>
        <button
          ref={backBtnRef}
          onClick={handleClose}
          className="flex items-center gap-1.5 text-sm text-dxtr-teal hover:text-dxtr-teal/80 mb-4 focus-visible:ring-2 focus-visible:ring-dxtr-teal rounded px-1 outline-none"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to all games
        </button>
        <ExpandedGamePanel
          game={expandedGame}
          aggregate={expandedAggregate}
          dailyBuckets={progress.dailyBuckets}
          patientId={patientId}
        />
      </div>
    );
  }

  const filteredAggregates = selectedDay
    ? progress.perGame.map((agg) => {
        const dayData = progress.dailyBuckets.find((d) => d.date === selectedDay);
        if (!dayData) return agg;
        const gameDay = dayData.perGame[agg.gameId];
        if (!gameDay) return agg;
        return {
          ...agg,
          reps: gameDay.reps,
          completionPct: agg.expectedReps > 0
            ? Math.round((gameDay.reps / (agg.expectedReps / progress.dailyBuckets.length)) * 100)
            : 0,
        };
      })
    : progress.perGame;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {games.map((game) => {
        const aggregate = filteredAggregates.find((a) => a.gameId === game.id) ?? {
          gameId: game.id,
          reps: 0,
          expectedReps: game.targetRepsPerDay * progress.dailyBuckets.length,
          completionPct: 0,
          homeReps: 0,
          clinicReps: 0,
          lastPlayed: null,
          primaryMetricTrend: [],
          primaryMetricDelta: 0,
          primaryMetricDeltaPct: 0,
          status: "insufficient_data" as const,
          reviewFlag: null,
        };

        return (
          <GameProgressCard
            key={game.id}
            game={game}
            aggregate={aggregate}
            isExpanded={expandedGameId === game.id}
            onClick={() => onExpandGame(game.id)}
            cardRef={(el) => { cardRefs.current[game.id] = el; }}
          />
        );
      })}
    </div>
  );
}
