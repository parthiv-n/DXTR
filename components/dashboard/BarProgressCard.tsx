"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

type BarProgressCardProps = {
  title: string;
  data: {
    name: string;
    left: number;
    right: number;
  }[];
};

export function BarProgressCard({ title, data }: BarProgressCardProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-dxtr-teal mb-4">{title}</h3>
      
      <div className="h-48">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#E0E0E0" vertical={false} />
            <XAxis
              dataKey="name"
              tick={{ fill: "#666", fontSize: 10 }}
              axisLine={{ stroke: "#E0E0E0" }}
              tickLine={false}
            />
            <YAxis
              tick={{ fill: "#666", fontSize: 10 }}
              axisLine={{ stroke: "#E0E0E0" }}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: "#fff",
                border: "1px solid #E0E0E0",
                borderRadius: "8px",
                fontSize: "12px",
              }}
            />
            <Legend 
              wrapperStyle={{ fontSize: "11px" }}
              iconType="square"
            />
            <Bar dataKey="left" name="Left Hand" fill="#66BB6A" radius={[2, 2, 0, 0]} />
            <Bar dataKey="right" name="Right Hand" fill="#FFC107" radius={[2, 2, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
