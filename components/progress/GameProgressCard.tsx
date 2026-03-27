"use client";

import React from "react";
import { GameAggregate, ExerciseGame } from "@/lib/exercise/types";
import { Badge } from "@/components/ui/badge";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { AlertTriangle } from "lucide-react";
import {
  ChartContainer,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
} from "recharts";

type Props = {
  game: ExerciseGame;
  aggregate: GameAggregate;
  isExpanded: boolean;
  onClick: () => void;
  cardRef?: (el: HTMLDivElement | null) => void;
};

const statusBadgeProps: Record<
  string,
  { label: string; variant: "success" | "secondary" | "warning" | "muted" }
> = {
  improving: { label: "Improving", variant: "success" },
  stable: { label: "Stable", variant: "secondary" },
  declining: { label: "Declining", variant: "warning" },
  insufficient_data: { label: "Not enough data", variant: "muted" },
};

const sparkConfig: ChartConfig = {
  metric: { label: "Metric", color: "#c2e1a5" },
};

export function GameProgressCard({ game, aggregate, isExpanded, onClick, cardRef }: Props) {
  const statusInfo = statusBadgeProps[aggregate.status] ?? statusBadgeProps.insufficient_data;
  const hasData = aggregate.reps > 0;

  const sparkData = aggregate.primaryMetricTrend.map((v, i) => ({
    idx: i,
    metric: v,
  }));

  const deltaSign = aggregate.primaryMetricDelta > 0 ? "+" : "";
  const deltaDisplay = hasData && aggregate.primaryMetricDelta !== 0
    ? `${deltaSign}${aggregate.primaryMetricDelta}${game.primaryMetricUnit}`
    : "--";

  function formatLastPlayed(date: string | null): string {
    if (!date) return "Never";
    const d = new Date(date + "T00:00:00");
    const now = new Date();
    const days = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
    if (days === 0) return "Today";
    if (days === 1) return "Yesterday";
    return `${days}d ago`;
  }

  return (
    <div
      ref={cardRef}
      role="button"
      tabIndex={0}
      aria-expanded={isExpanded}
      onClick={onClick}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          onClick();
        }
      }}
      className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 cursor-pointer transition-all hover:border-dxtr-teal/40 hover:shadow-md focus-visible:ring-2 focus-visible:ring-dxtr-teal focus-visible:ring-offset-2 outline-none flex flex-col"
    >
      {/* Top: icon + name + status */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xl shrink-0">{game.icon}</span>
          <h3 className="text-sm font-bold text-dxtr-brown leading-tight line-clamp-2">{game.name}</h3>
        </div>
        <div className="flex items-center gap-1.5">
          <Badge variant={statusInfo.variant}>{statusInfo.label}</Badge>
          {aggregate.reviewFlag?.flagged && (
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex items-center gap-0.5 bg-red-100 text-red-700 text-xs font-semibold px-2 py-0.5 rounded-full cursor-help">
                  <AlertTriangle className="w-3 h-3" />
                  Review
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">{aggregate.reviewFlag.reason}</p>
              </TooltipContent>
            </Tooltip>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <div className="mb-3">
        <div className="flex items-center justify-between text-xs mb-1">
          <span className="text-gray-500">Reps</span>
          <span className="text-gray-700 font-medium">
            {aggregate.reps}/{aggregate.expectedReps} ({aggregate.completionPct}%)
          </span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div
            className="bg-dxtr-teal rounded-full h-2 transition-all"
            style={{ width: `${Math.min(aggregate.completionPct, 100)}%` }}
          />
        </div>
      </div>

      {/* Bottom: metric delta + sparkline + last played */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`text-xs font-semibold ${
            aggregate.primaryMetricDelta > 0
              ? "text-green-600"
              : aggregate.primaryMetricDelta < 0
              ? "text-amber-600"
              : "text-gray-400"
          }`}>
            {deltaDisplay}
          </span>
          {hasData && sparkData.length > 2 && (
            <ChartContainer config={sparkConfig} className="h-5 w-16">
              <LineChart data={sparkData} margin={{ top: 2, right: 0, bottom: 2, left: 0 }}>
                <Line
                  type="monotone"
                  dataKey="metric"
                  stroke="var(--color-metric)"
                  strokeWidth={1.5}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          )}
        </div>
        <span className="text-xs text-gray-400">
          {formatLastPlayed(aggregate.lastPlayed)}
        </span>
      </div>
    </div>
  );
}
