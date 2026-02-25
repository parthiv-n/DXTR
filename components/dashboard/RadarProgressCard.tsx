"use client";

import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
} from "recharts";

type RadarProgressCardProps = {
  title: string;
  subtitle?: string;
  data: {
    subject: string;
    value: number;
    fullMark: number;
  }[];
};

export function RadarProgressCard({ title, subtitle, data }: RadarProgressCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-dxtr-teal">{title}</h3>
      {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
      
      <div className="h-52 mt-2">
        <ResponsiveContainer width="100%" height="100%">
          <RadarChart cx="50%" cy="50%" outerRadius="65%" data={data}>
            <PolarGrid stroke="#E0E0E0" />
            <PolarAngleAxis
              dataKey="subject"
              tick={{ fill: "#666", fontSize: 10 }}
            />
            <Radar
              name="Progress"
              dataKey="value"
              stroke="#4DB6AC"
              fill="#4DB6AC"
              fillOpacity={0.3}
              strokeWidth={2}
            />
          </RadarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
