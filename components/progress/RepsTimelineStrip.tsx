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
    const dayLabel = dateObj.toLocaleDateString("en-US", { weekday: "short", day: "numeric" });
    return {
      date: d.date,
      label: dayLabel,
      reps: d.totalReps,
      target: d.expectedReps,
    };
  });

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
      <ChartContainer config={chartConfig} className="h-[120px] w-full">
        <LineChart
          data={data}
          margin={{ top: 10, right: 10, bottom: 0, left: 10 }}
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
            interval={0}
            dy={10}
          />
          <YAxis hide domain={[0, "auto"]} />
          <ReferenceLine
            y={dailyTarget}
            stroke="#6B5344"
            strokeDasharray="4 4"
            strokeOpacity={0.3}
            label={{ value: "Target", position: "insideTopRight", fill: "#6B5344", fontSize: 10, opacity: 0.5 }}
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
            strokeWidth={3}
            dot={{ r: 4, fill: "#82C785", strokeWidth: 0 }}
            activeDot={{ r: 6, strokeWidth: 0 }}
          />
        </LineChart>
      </ChartContainer>
    </div>
  );
}
