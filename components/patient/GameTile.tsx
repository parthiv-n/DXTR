"use client";

import Link from "next/link";

type GameTileProps = {
  id: string;
  name: string;
  description: string;
  targetReps: number;
  completed: boolean;
  roundNum?: number;
  bgGradient?: string;
  emoji?: string;
};

export function GameTile({
  id,
  name,
  roundNum = 1,
  bgGradient = "from-gray-200 to-gray-300",
  emoji = "🎮",
}: GameTileProps) {
  return (
    <Link href={`/patient/game/${id}`}>
      <div className="group cursor-pointer">
        {/* Game visual area */}
        <div
          className={`h-40 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center relative overflow-hidden shadow-sm group-hover:shadow-md transition-shadow`}
        >
          {/* Emoji/visual placeholder */}
          <span className="text-6xl opacity-80">{emoji}</span>
          
          {/* Progress bar at bottom */}
          <div className="absolute bottom-0 left-0 right-0 h-2 bg-black/10">
            <div className="h-full bg-dxtr-teal w-2/3 rounded-r" />
          </div>
        </div>
        
        {/* Label */}
        <div className="mt-2 text-center">
          <span className="text-sm text-gray-600">Round {roundNum}</span>
        </div>
      </div>
    </Link>
  );
}
