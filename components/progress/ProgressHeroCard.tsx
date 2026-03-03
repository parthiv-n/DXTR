"use client";

import { WeeklyBreakdown } from "@/lib/exercise/types";

type Props = {
  completionPct: number;
  totalReps: number;
  expectedReps: number;
  streak: number;
  missedDays: number;
  weeklyBreakdown: WeeklyBreakdown[];
  rangeDays: number;
};

function CircularProgress({ pct }: { pct: number }) {
  const radius = 54;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (Math.min(pct, 100) / 100) * circumference;

  return (
    <svg width="140" height="140" viewBox="0 0 140 140" className="shrink-0">
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#E5E7EB"
        strokeWidth="10"
      />
      <circle
        cx="70"
        cy="70"
        r={radius}
        fill="none"
        stroke="#c2e1a5"
        strokeWidth="10"
        strokeLinecap="round"
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        transform="rotate(-90 70 70)"
        className="transition-all duration-700"
      />
      <text
        x="70"
        y="64"
        textAnchor="middle"
        className="fill-dxtr-brown text-2xl font-bold"
        style={{ fontSize: "28px", fontWeight: 700, fontFamily: "Outfit" }}
      >
        {pct}%
      </text>
      <text
        x="70"
        y="84"
        textAnchor="middle"
        className="fill-gray-400"
        style={{ fontSize: "11px", fontFamily: "Outfit" }}
      >
        complete
      </text>
    </svg>
  );
}

export function ProgressHeroCard({
  completionPct,
  totalReps,
  expectedReps,
  streak,
  missedDays,
  weeklyBreakdown,
  rangeDays,
}: Props) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 mb-4 flex flex-col sm:flex-row items-center gap-6">
      {/* Circular progress */}
      <div className="flex flex-col items-center gap-1">
        <CircularProgress pct={completionPct} />
        <span className="text-sm text-gray-500 mt-1">
          {totalReps} / {expectedReps} reps
        </span>
      </div>

      {/* Streak / missed info */}
      <div className="flex-1 flex flex-col gap-2 text-center sm:text-left">
        <h3 className="text-sm font-semibold text-dxtr-teal uppercase tracking-wide">
          {rangeDays}-Day Summary
        </h3>
        {streak > 0 ? (
          <p className="text-lg font-bold text-dxtr-brown">
            {streak}-day streak 🔥
          </p>
        ) : (
          <p className="text-lg font-bold text-gray-500">No current streak</p>
        )}
        {missedDays > 0 && (
          <p className="text-sm text-gray-500">
            Missed {missedDays} of {rangeDays} days
          </p>
        )}
      </div>

      {/* Weekly breakdown mini-bars */}
      {weeklyBreakdown.length > 0 && (
        <div className="flex flex-col gap-2 min-w-[160px]">
          <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wide">
            Weekly Breakdown
          </h4>
          {weeklyBreakdown.map((w) => {
            const pct = w.expected > 0 ? Math.round((w.reps / w.expected) * 100) : 0;
            return (
              <div key={w.label} className="flex items-center gap-2">
                <span className="text-xs text-gray-500 w-14 shrink-0">{w.label}</span>
                <div className="flex-1 bg-gray-200 rounded-full h-2">
                  <div
                    className="bg-dxtr-chart-green rounded-full h-2 transition-all"
                    style={{ width: `${Math.min(pct, 100)}%` }}
                  />
                </div>
                <span className="text-xs text-gray-400 w-16 text-right">
                  {w.reps}/{w.expected}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
