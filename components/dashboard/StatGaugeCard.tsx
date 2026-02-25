"use client";

import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";

type StatGaugeCardProps = {
  title: string;
  value: number;
  maxValue: number;
  unit: string;
  subtitle?: string;
  color?: string;
};

export function StatGaugeCard({
  title,
  value,
  maxValue,
  unit,
  subtitle,
  color = "#66BB6A",
}: StatGaugeCardProps) {
  const percentage = Math.min((value / maxValue) * 100, 100);
  
  const data = [
    { value: percentage },
    { value: 100 - percentage },
  ];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-xs font-medium text-dxtr-teal mb-2 text-center">{title}</h3>
      
      <div className="relative h-32">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="85%"
              startAngle={180}
              endAngle={0}
              innerRadius="60%"
              outerRadius="90%"
              paddingAngle={0}
              dataKey="value"
              stroke="none"
            >
              <Cell fill={color} />
              <Cell fill="#E0E0E0" />
            </Pie>
          </PieChart>
        </ResponsiveContainer>
        
        {/* Value display */}
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 text-center">
          <span className="text-4xl font-bold text-gray-700">
            {Math.round(value)}
          </span>
        </div>
      </div>
      
      {subtitle && (
        <div className="text-center -mt-2">
          <span className="text-sm text-gray-500">{subtitle}</span>
        </div>
      )}

      {/* Scale markers */}
      <div className="flex justify-between px-4 mt-1">
        <span className="text-xs text-gray-400">0</span>
        <span className="text-xs text-gray-400">{maxValue}</span>
      </div>
    </div>
  );
}
