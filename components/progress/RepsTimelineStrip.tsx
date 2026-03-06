"use client";

import { DayBucket } from "@/lib/exercise/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  ReferenceLine,
  CartesianGrid,
} from "recharts";

type Props = {
  dailyBuckets: DayBucket[];
  selectedDay: string | null;
  onDayClick: (date: string | null) => void;
};

const chartConfig: ChartConfig = {
  reps: {
    label: "Reps",
    color: "#82C785",
  },
};

export function RepsTimelineStrip({ dailyBuckets, selectedDay, onDayClick }: Props) {
  const dailyTarget = dailyBuckets.length > 0 ? dailyBuckets[0].expectedReps : 0;

  const data = dailyBuckets.map((d) => {
    const dateObj = new Date(d.date + "T00:00:00");
    // e.g. "Feb 19"
    const tickLabel = dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" });
    return {
      date: d.date,
      label: tickLabel,
      reps: d.totalReps,
      target: d.expectedReps,
    };
  });

  const pointCount = data.length;
  // Show ~7 evenly-spaced ticks regardless of range
  const xInterval = pointCount > 7 ? Math.round((pointCount - 1) / 6) : 0;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 h-full min-w-0 overflow-hidden flex flex-col">
      <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-1 shrink-0">
        Daily Reps
      </p>
      <ChartContainer config={chartConfig} className="flex-1 w-full min-w-0 min-h-0">
        <LineChart
          data={data}
          margin={{ top: 8, right: 12, bottom: 0, left: 8 }}
          onClick={(state) => {
            if (state?.activePayload?.[0]) {
              const date = state.activePayload[0].payload.date;
              onDayClick(date === selectedDay ? null : date);
            }
          }}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            interval={xInterval}
            dy={4}
          />
          <YAxis
            domain={[0, "auto"]}
            tick={{ fontSize: 10, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            width={32}
            label={{ value: "Reps", angle: -90, position: "insideLeft", offset: 8, style: { fill: "#9CA3AF", fontSize: 10 } }}
          />
          <ReferenceLine
            y={dailyTarget}
            stroke="#6B5344"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            label={{ value: "Target", position: "insideTopRight", fill: "#6B5344", fontSize: 9, opacity: 0.5 }}
          />
          <ChartTooltip
            cursor={false}
            content={
              <ChartTooltipContent
                labelFormatter={(_, payload) => {
                  if (payload?.[0]?.payload) {
                    const p = payload[0].payload;
                    return `${p.date} — ${p.reps}/${p.target} reps`;
                  }
                  return "";
                }}
              />
            }
          />
          <Line
            type="monotone"
            dataKey="reps"
            stroke="#82C785"
            strokeWidth={2.5}
            dot={{ r: 3, fill: "#82C785", strokeWidth: 0 }}
            activeDot={{ r: 5, strokeWidth: 0 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
