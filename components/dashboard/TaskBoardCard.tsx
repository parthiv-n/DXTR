"use client";

import { Mission } from "@/lib/types";

type TaskItem = {
  id: string;
  name: string;
  date: string;
  time: string;
  color: string;
};

type TaskBoardCardProps = {
  title: string;
  missions?: Mission[];
  taskItems?: TaskItem[];
};

const colorMap: Record<string, string> = {
  orange: "bg-orange-500",
  yellow: "bg-yellow-400",
  blue: "bg-blue-500",
  green: "bg-green-500",
  red: "bg-red-500",
};

export function TaskBoardCard({ title, taskItems }: TaskBoardCardProps) {
  // Use taskItems if provided, otherwise show default
  const items = taskItems || [
    { id: "1", name: "Induct Agatha", date: "13 MAR 2019", time: "12:00AM", color: "orange" },
    { id: "2", name: "Edwin Check Up", date: "26 JAN 2019", time: "1:00PM", color: "yellow" },
    { id: "3", name: "Giles Check Up", date: "31 SEP 2019", time: "4:00PM", color: "blue" },
  ];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-dxtr-teal mb-4">{title}</h3>

      <div className="space-y-3">
        {items.map((item) => (
          <div
            key={item.id}
            className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg"
          >
            <div className={`w-1 h-12 rounded-full ${colorMap[item.color] || "bg-gray-400"}`} />
            
            <div className="flex-1">
              <p className="text-sm font-medium text-gray-800">{item.name}</p>
              <p className="text-xs text-gray-500">
                <span className="text-orange-500">●</span> {item.date} <span className="text-gray-400">|</span> {item.time}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
