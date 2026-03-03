"use client";

import { DayBucket } from "@/lib/exercise/types";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  ReferenceLine,
  Cell,
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
    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    return {
      date: d.date,
      label: dayLabel,
      reps: d.totalReps,
      target: d.expectedReps,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
      <ChartContainer config={chartConfig} className="h-[80px] w-full">
        <BarChart
          data={data}
          margin={{ top: 4, right: 4, bottom: 0, left: 0 }}
          onClick={(state) => {
            if (state?.activePayload?.[0]) {
              const date = state.activePayload[0].payload.date;
              onDayClick(date === selectedDay ? null : date);
            }
          }}
        >
          <XAxis
            dataKey="label"
            tick={{ fontSize: 9, fill: "#9CA3AF" }}
            axisLine={false}
            tickLine={false}
            interval={0}
          />
          <YAxis hide domain={[0, "auto"]} />
          <ReferenceLine
            y={dailyTarget}
            stroke="#6B5344"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
          />
          <ChartTooltip
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
          <Bar dataKey="reps" radius={[2, 2, 0, 0]} cursor="pointer">
            {data.map((entry) => (
              <Cell
                key={entry.date}
                fill={entry.date === selectedDay ? "#c2e1a5" : "#82C785"}
                fillOpacity={entry.date === selectedDay ? 1 : 0.7}
              />
            ))}
          </Bar>
        </BarChart>
      </ChartContainer>
    </div>
  );
}
