"use client";

import { useEffect, useRef, useCallback } from "react";
import { ExerciseGame, AggregatedProgress } from "@/lib/exercise/types";
import { GameProgressCard } from "./GameProgressCard";
import { ExpandedGamePanel } from "./ExpandedGamePanel";
import { Modal } from "@/components/ui/modal";

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
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const expandedGame = expandedGameId ? games.find((g) => g.id === expandedGameId) : null;
  const expandedAggregate = expandedGameId
    ? progress.perGame.find((g) => g.gameId === expandedGameId)
    : null;

  const handleClose = useCallback(() => {
    const prevId = expandedGameId;
    onExpandGame(null);
    // Restore focus to the card that was clicked
    requestAnimationFrame(() => {
      if (prevId && cardRefs.current[prevId]) {
        cardRefs.current[prevId]?.focus();
      }
    });
  }, [expandedGameId, onExpandGame]);

  // Filter aggregates based on selected day
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
    <>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 grid-rows-[repeat(6,minmax(0,1fr))] md:grid-rows-[repeat(3,minmax(0,1fr))] xl:grid-rows-[repeat(2,minmax(0,1fr))] gap-3 h-full min-h-0">
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

      {/* Modal for Expanded View */}
      {expandedGame && expandedAggregate && (
        <Modal isOpen={!!expandedGameId} onClose={handleClose}>
          <ExpandedGamePanel
            game={expandedGame}
            aggregate={expandedAggregate}
            dailyBuckets={progress.dailyBuckets}
            patientId={patientId}
            className="border-0 shadow-none p-0" // Remove card styling since it's in a modal
          />
        </Modal>
      )}
    </>
  );
}
