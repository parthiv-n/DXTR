"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";

type ScheduleEvent = {
  id: string;
  title: string;
  time: string;
  type: "session" | "call" | "exercise";
  completed?: boolean;
};

type ScheduleCardProps = {
  title: string;
  date: string;
  events?: ScheduleEvent[];
};

export function ScheduleCard({ title, date }: ScheduleCardProps) {
  // Calendar days for the month view
  const days = ["S", "M", "T", "W", "T", "F", "S"];
  const calendarDays = Array.from({ length: 30 }, (_, i) => i + 1);
  const selectedDay = 12;

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <h3 className="text-sm font-medium text-dxtr-teal mb-2">{title}</h3>
      
      {/* Month navigation */}
      <div className="flex items-center justify-between mb-3">
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronLeft className="w-4 h-4 text-gray-500" />
        </button>
        <span className="text-xs text-gray-600">{date}</span>
        <button className="p-1 hover:bg-gray-100 rounded">
          <ChevronRight className="w-4 h-4 text-gray-500" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 gap-1 mb-1">
        {days.map((day, i) => (
          <div key={i} className="text-center text-xs text-gray-400 py-1">
            {day}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      <div className="grid grid-cols-7 gap-1">
        {/* Empty cells for first week offset */}
        {Array.from({ length: 6 }, (_, i) => (
          <div key={`empty-${i}`} className="text-center text-xs py-1" />
        ))}
        {calendarDays.slice(0, 28).map((day) => (
          <div
            key={day}
            className={`text-center text-xs py-1 rounded cursor-pointer transition-colors ${
              day === selectedDay
                ? "bg-dxtr-teal text-white"
                : "text-gray-600 hover:bg-gray-100"
            }`}
          >
            {day}
          </div>
        ))}
      </div>

      {/* Time slots */}
      <div className="mt-4 space-y-2">
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12">8 am</span>
          <div className="flex-1 h-6 bg-dxtr-teal/20 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12">9 am</span>
          <div className="flex-1 h-6 bg-gray-100 rounded" />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400 w-12">10 am</span>
          <div className="flex-1 h-6 bg-gray-100 rounded" />
        </div>
      </div>
    </div>
  );
}
