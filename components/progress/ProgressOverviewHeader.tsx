"use client";

import { PatientInfo } from "@/lib/types";
import { DateRangePreset } from "@/lib/exercise/types";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Clock } from "lucide-react";

type Props = {
  patients: PatientInfo[];
  selectedPatientId: string;
  onPatientChange: (id: string) => void;
  range: DateRangePreset;
  onRangeChange: (range: DateRangePreset) => void;
  totalReps: number;
  expectedReps: number;
  completionPct: number;
  homeReps: number;
  clinicReps: number;
  lastActivityAt: string | null;
};

function formatLastActivity(date: string | null): string {
  if (!date) return "No activity yet";
  const d = new Date(date + "T00:00:00");
  const now = new Date();
  const days = Math.round((now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24));
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}

export function ProgressOverviewHeader({
  patients,
  selectedPatientId,
  onPatientChange,
  range,
  onRangeChange,
  totalReps,
  expectedReps,
  completionPct,
  homeReps,
  clinicReps,
  lastActivityAt,
}: Props) {
  const selectedPatient = patients.find((p) => p.id === selectedPatientId);

  return (
    <div className="flex flex-wrap items-center gap-4 mb-4">
      {/* Patient selector */}
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-xl font-bold text-dxtr-brown leading-tight">
            {selectedPatient?.name ?? "Select Patient"}
          </h1>
          <span className="text-xs text-gray-400">{selectedPatientId || "No patient selected"}</span>
        </div>
        {patients.length > 1 && (
          <Select value={selectedPatientId} onValueChange={onPatientChange}>
            <SelectTrigger className="w-[140px] h-8 text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {patients.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>

      <div className="h-8 w-px bg-gray-200 hidden sm:block" />

      {/* Date range selector */}
      <Select value={range} onValueChange={(v) => onRangeChange(v as DateRangePreset)}>
        <SelectTrigger className="w-[120px] h-8 text-xs">
          <SelectValue placeholder="14 days" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="7">7 days</SelectItem>
          <SelectItem value="14">14 days</SelectItem>
          <SelectItem value="30">30 days</SelectItem>
        </SelectContent>
      </Select>

      <div className="h-8 w-px bg-gray-200 hidden sm:block" />

      {/* Adherence summary */}
      <div className="flex items-baseline gap-2">
        <span className="text-2xl font-bold text-dxtr-brown">{totalReps}</span>
        <span className="text-sm text-gray-500">/ {expectedReps} reps</span>
        <span className="text-sm font-semibold text-dxtr-teal">({completionPct}%)</span>
      </div>

      {/* Home/Clinic chips */}
      <div className="flex items-center gap-2">
        <Badge variant="default" className="bg-dxtr-teal/20 text-dxtr-brown border-0 text-xs">
          At-home: {homeReps}
        </Badge>
        <Badge variant="secondary" className="text-xs">
          In-clinic: {clinicReps}
        </Badge>
      </div>

      {/* Last activity */}
      <div className="flex items-center gap-1 text-xs text-gray-400 ml-auto">
        <Clock className="w-3.5 h-3.5" />
        Last activity: {formatLastActivity(lastActivityAt)}
      </div>
    </div>
  );
}
