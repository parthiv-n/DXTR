"use client";

import { useEffect, useState, useCallback } from "react";
import { AppShell } from "@/components/layout/AppShell";
import {
  PatientInfo,
  DashboardMetrics,
  GameProgressMetrics,
  GameConfigData,
} from "@/lib/types";
import { Loader2, ChevronLeft, ChevronRight, Save, TrendingUp, TrendingDown, Minus, Activity } from "lucide-react";
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Legend,
  PieChart,
  Pie,
  Cell,
  Tooltip,
} from "recharts";

export default function ClinicianDashboardPage() {
  const [patients, setPatients] = useState<PatientInfo[]>([]);
  const [selectedPatientId, setSelectedPatientId] = useState<string>("");
  const [dashboard, setDashboard] = useState<DashboardMetrics | null>(null);
  const [gameProgress, setGameProgress] = useState<GameProgressMetrics | null>(null);
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Editable target angle form state
  const [editPronation, setEditPronation] = useState<number>(15);
  const [editSupination, setEditSupination] = useState<number>(15);
  const [editDeadZone, setEditDeadZone] = useState<number>(5);
  const [editAutoProgression, setEditAutoProgression] = useState<boolean>(true);
  const [editMinPronation, setEditMinPronation] = useState<number>(5);
  const [editMinSupination, setEditMinSupination] = useState<number>(5);
  const [editMaxPronation, setEditMaxPronation] = useState<number>(45);
  const [editMaxSupination, setEditMaxSupination] = useState<number>(45);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  useEffect(() => {
    async function fetchPatients() {
      try {
        const response = await fetch("/api/patients");
        if (!response.ok) throw new Error("Failed to fetch patients");
        const data = await response.json();
        setPatients(data);
        if (data.length > 0 && !selectedPatientId) {
          setSelectedPatientId(data[0].id);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      }
    }
    fetchPatients();
  }, [selectedPatientId]);

  const fetchAllData = useCallback(async () => {
    if (!selectedPatientId) return;
    setLoading(true);
    try {
      const [dashRes, progressRes, configRes] = await Promise.all([
        fetch(`/api/patients/${selectedPatientId}/dashboard`),
        fetch(`/api/patients/${selectedPatientId}/game-progress?gameId=car-racer`),
        fetch(`/api/patients/${selectedPatientId}/game-config?gameId=car-racer`),
      ]);

      if (!dashRes.ok) throw new Error("Failed to fetch dashboard");
      setDashboard(await dashRes.json());

      if (progressRes.ok) {
        setGameProgress(await progressRes.json());
      } else {
        setGameProgress(null);
      }

      if (configRes.ok) {
        const configData: GameConfigData = await configRes.json();
        setGameConfig(configData);
        setEditPronation(configData.targetPronation);
        setEditSupination(configData.targetSupination);
        setEditDeadZone(configData.deadZone);
        setEditAutoProgression(configData.autoProgressionEnabled);
        setEditMinPronation(configData.minParams?.targetPronation ?? 5);
        setEditMinSupination(configData.minParams?.targetSupination ?? 5);
        setEditMaxPronation(configData.maxParams?.targetPronation ?? 45);
        setEditMaxSupination(configData.maxParams?.targetSupination ?? 45);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }, [selectedPatientId]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  // Save updated target angles + adaptive settings
  const handleSaveConfig = async () => {
    if (!selectedPatientId) return;
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${selectedPatientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "car-racer",
          targetPronation: editPronation,
          targetSupination: editSupination,
          deadZone: editDeadZone,
          autoProgressionEnabled: editAutoProgression,
          minParams: {
            targetPronation: editMinPronation,
            targetSupination: editMinSupination,
            deadZone: 2,
          },
          maxParams: {
            targetPronation: editMaxPronation,
            targetSupination: editMaxSupination,
            deadZone: 15,
          },
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save config:", err);
    } finally {
      setSaving(false);
    }
  };

  // Check if form values differ from saved config
  const configDirty =
    gameConfig &&
    (editPronation !== gameConfig.targetPronation ||
      editSupination !== gameConfig.targetSupination ||
      editDeadZone !== gameConfig.deadZone ||
      editAutoProgression !== gameConfig.autoProgressionEnabled ||
      editMinPronation !== (gameConfig.minParams?.targetPronation ?? 5) ||
      editMinSupination !== (gameConfig.minParams?.targetSupination ?? 5) ||
      editMaxPronation !== (gameConfig.maxParams?.targetPronation ?? 45) ||
      editMaxSupination !== (gameConfig.maxParams?.targetSupination ?? 45));

  // ---------- Derived chart data ----------

  const stats = gameProgress?.overallStats;
  const targetPron = gameConfig?.targetPronation ?? 15;
  const targetSup = gameConfig?.targetSupination ?? 15;

  // Radar: multi-axis performance metrics (scaled to 0-100)
  const radarData = stats
    ? [
        {
          subject: "LEFT ANGLE",
          value: targetPron > 0
            ? Math.min(Math.round((stats.avgLeftAngle / targetPron) * 100), 100)
            : 0,
          fullMark: 100,
        },
        {
          subject: "RIGHT ANGLE",
          value: targetSup > 0
            ? Math.min(Math.round((stats.avgRightAngle / targetSup) * 100), 100)
            : 0,
          fullMark: 100,
        },
        { subject: "SUCCESS RATE", value: stats.successRate, fullMark: 100 },
        {
          subject: "REACTION",
          value:
            stats.avgReactionTimeMs > 0
              ? Math.max(Math.round(((2000 - stats.avgReactionTimeMs) / 2000) * 100), 0)
              : 0,
          fullMark: 100,
        },
        {
          subject: "COMPLETION",
          value:
            stats.totalDaysPlayed > 0
              ? Math.round(
                  (stats.totalSetsCompleted / (stats.totalDaysPlayed * 5)) * 100
                )
              : 0,
          fullMark: 100,
        },
      ]
    : [
        { subject: "LEFT ANGLE", value: 0, fullMark: 100 },
        { subject: "RIGHT ANGLE", value: 0, fullMark: 100 },
        { subject: "SUCCESS RATE", value: 0, fullMark: 100 },
        { subject: "REACTION", value: 0, fullMark: 100 },
        { subject: "COMPLETION", value: 0, fullMark: 100 },
      ];

  // Bar chart: daily left vs right average angles (last 7 days)
  const dayLabels = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const barData =
    gameProgress && gameProgress.dailySummaries.length > 0
      ? gameProgress.dailySummaries.slice(-7).map((d) => {
          const dateObj = new Date(d.date + "T00:00:00");
          return {
            name: dayLabels[dateObj.getDay()],
            left: d.avgLeftAngle,
            right: d.avgRightAngle,
          };
        })
      : [];

  // Gauge values
  const avgLeftAngle = stats?.avgLeftAngle ?? 0;
  const avgRightAngle = stats?.avgRightAngle ?? 0;

  // Task items (kept static for now)
  const tasks = [
    { id: "1", name: "Induct Agatha", date: "13 MAR 2019", time: "12:00AM", color: "#E8734A" },
    { id: "2", name: "Edwin Check Up", date: "26 JAN 2019", time: "1:00PM", color: "#F4D03F" },
    { id: "3", name: "Giles Check Up", date: "31 SEP 2019", time: "4:00PM", color: "#5DADE2" },
  ];

  const calendarDays = ["S", "M", "T", "W", "T", "F", "S"];

  // --- Adaptive status helpers ---
  const calibrationLabel = gameConfig
    ? gameConfig.calibrationComplete
      ? "✓ Calibrated"
      : `Calibrating ${gameConfig.calibrationSetsCompleted}/3 sets...`
    : "—";

  const progressToNextLevel = gameConfig
    ? gameConfig.consecutiveGoodSets
    : 0;

  const lastAdjustmentLabel = (() => {
    if (!gameConfig?.lastAdjustmentAt) return "No adjustments yet";
    const d = new Date(gameConfig.lastAdjustmentAt);
    const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    const dir = gameConfig.lastAdjustmentDirection === "up" ? "Increased" : "Decreased";
    if (days === 0) return `${dir} today`;
    if (days === 1) return `${dir} yesterday`;
    return `${dir} ${days} days ago`;
  })();

  const AdjustmentIcon = gameConfig?.lastAdjustmentDirection === "up"
    ? TrendingUp
    : gameConfig?.lastAdjustmentDirection === "down"
    ? TrendingDown
    : Minus;

  // Gauge component — shows achieved angle with target as max
  const GaugeChart = ({
    value,
    target,
    color,
    label,
  }: {
    value: number;
    target: number;
    color: string;
    label: string;
  }) => {
    const maxValue = Math.max(target, value, 10);
    const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
    const data = [{ value: percentage }, { value: 100 - percentage }];

    return (
      <div className="bg-white rounded-lg border border-gray-200 p-3 flex flex-col">
        <h3 className="text-sm text-dxtr-teal text-center mb-1">{label}</h3>
        <div className="relative flex-1 min-h-[200px] md:min-h-[240px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="50%"
                cy="75%"
                startAngle={180}
                endAngle={0}
                innerRadius="45%"
                outerRadius="95%"
                dataKey="value"
                stroke="none"
              >
                <Cell fill={color} />
                <Cell fill="#E8E8E8" />
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div className="absolute bottom-[15%] left-1/2 -translate-x-1/2 text-center">
            <div className="text-4xl md:text-5xl font-bold text-gray-700">
              {Math.round(value * 10) / 10}°
            </div>
            <div className="text-xs text-gray-500">
              achieved
            </div>
            <div className="text-sm font-semibold mt-1" style={{ color }}>
              target: {target}°
            </div>
          </div>
        </div>
        <div className="flex justify-between text-xs text-gray-400 px-6">
          <span>0°</span>
          <span>{maxValue}°</span>
        </div>
      </div>
    );
  };

  // No-data placeholder
  const NoData = ({ label }: { label: string }) => (
    <div className="flex flex-col items-center justify-center h-full text-gray-400 py-10">
      <p className="text-sm">{label}</p>
      <p className="text-xs mt-1">Play the car game to see data here</p>
    </div>
  );

  return (
    <AppShell variant="clinician">
      <div className="max-w-6xl mx-auto pb-20">
        {/* Header */}
        <h1 className="text-xl md:text-2xl font-bold text-dxtr-teal mb-4">
          Tabish&apos;s Dashboard
        </h1>

        {/* Patient Select */}
        <div className="mb-6">
          <label className="text-xs text-dxtr-teal mb-1 block">Patient Select</label>
          <select
            value={selectedPatientId}
            onChange={(e) => setSelectedPatientId(e.target.value)}
            className="border border-gray-300 rounded px-3 py-2 text-sm bg-white w-full sm:w-auto sm:min-w-[140px]"
          >
            {patients.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        {error && <div className="text-red-500 mb-4">{error}</div>}

        {loading && !dashboard ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-dxtr-teal" />
          </div>
        ) : (
          <>
            {/* ═══ TARGET ANGLE & ADAPTIVE DIFFICULTY PANEL ═══ */}
            <div className="bg-white rounded-lg border border-gray-200 p-4 mb-5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-dxtr-teal">
                  Car Racer — Target Angle Configuration
                </h3>
                {/* Calibration badge */}
                <span
                  className={`text-xs px-2.5 py-1 rounded-full font-medium ${
                    gameConfig?.calibrationComplete
                      ? "bg-green-100 text-green-700"
                      : "bg-amber-100 text-amber-700"
                  }`}
                >
                  {calibrationLabel}
                </span>
              </div>

              {/* Target angle inputs */}
              <div className="flex flex-wrap items-end gap-4 mb-4">
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 block mb-1">
                    Pronation Target (left dodge)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      step={1}
                      value={editPronation}
                      onChange={(e) => setEditPronation(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 text-center"
                    />
                    <span className="text-sm text-gray-500">°</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 block mb-1">
                    Supination Target (right dodge)
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={1}
                      max={90}
                      step={1}
                      value={editSupination}
                      onChange={(e) => setEditSupination(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 text-center"
                    />
                    <span className="text-sm text-gray-500">°</span>
                  </div>
                </div>
                <div className="flex-1 min-w-[120px]">
                  <label className="text-xs text-gray-500 block mb-1">
                    Dead Zone
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="number"
                      min={0}
                      max={30}
                      step={1}
                      value={editDeadZone}
                      onChange={(e) => setEditDeadZone(Number(e.target.value))}
                      className="border border-gray-300 rounded px-2 py-1.5 text-sm w-20 text-center"
                    />
                    <span className="text-sm text-gray-500">°</span>
                  </div>
                </div>
                <div>
                  <button
                    onClick={handleSaveConfig}
                    disabled={saving || !configDirty}
                    className={`inline-flex items-center gap-1.5 px-4 py-1.5 rounded text-sm font-medium transition-colors ${
                      configDirty
                        ? "bg-dxtr-teal text-white hover:bg-dxtr-teal/90"
                        : "bg-gray-100 text-gray-400 cursor-not-allowed"
                    }`}
                  >
                    <Save className="w-3.5 h-3.5" />
                    {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save"}
                  </button>
                </div>
              </div>
              {saveSuccess && (
                <p className="text-xs text-green-600 mb-3">
                  Target angles saved. They will apply the next time the patient starts a game session.
                </p>
              )}

              {/* ── Adaptive Progression Section ── */}
              <div className="border-t border-gray-100 pt-3 mt-1">
                <div className="flex items-center gap-3 mb-3">
                  <Activity className="w-4 h-4 text-dxtr-teal" />
                  <h4 className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                    Adaptive Difficulty
                  </h4>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
                  {/* Auto-progression toggle */}
                  <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input
                        type="checkbox"
                        checked={editAutoProgression}
                        onChange={(e) => setEditAutoProgression(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-9 h-5 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dxtr-teal"></div>
                    </label>
                    <span className="text-xs text-gray-600">Auto-progression</span>
                  </div>

                  {/* Progress to next level */}
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Progress to next level</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-dxtr-teal rounded-full h-2 transition-all"
                          style={{ width: `${(progressToNextLevel / 3) * 100}%` }}
                        />
                      </div>
                      <span className="text-xs font-medium text-gray-600">
                        {progressToNextLevel}/3
                      </span>
                    </div>
                  </div>

                  {/* Last adjustment */}
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Last adjustment</span>
                    <div className="flex items-center gap-1.5">
                      <AdjustmentIcon className={`w-3.5 h-3.5 ${
                        gameConfig?.lastAdjustmentDirection === "up"
                          ? "text-green-500"
                          : gameConfig?.lastAdjustmentDirection === "down"
                          ? "text-amber-500"
                          : "text-gray-400"
                      }`} />
                      <span className="text-xs text-gray-600">{lastAdjustmentLabel}</span>
                    </div>
                  </div>

                  {/* Consecutive struggling sets */}
                  <div>
                    <span className="text-xs text-gray-500 block mb-1">Struggle counter</span>
                    <span className="text-xs font-medium text-gray-600">
                      {gameConfig?.consecutiveStruggleSets ?? 0}/2 before ease
                    </span>
                  </div>
                </div>

                {/* Safety bounds */}
                <div className="bg-gray-50 rounded-lg p-3">
                  <h5 className="text-xs font-medium text-gray-500 mb-2">
                    Safety Bounds (clinician override limits)
                  </h5>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Min Pronation</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={editPronation}
                          step={1}
                          value={editMinPronation}
                          onChange={(e) => setEditMinPronation(Number(e.target.value))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs w-14 text-center"
                        />
                        <span className="text-xs text-gray-400">°</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Max Pronation</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={editPronation}
                          max={90}
                          step={1}
                          value={editMaxPronation}
                          onChange={(e) => setEditMaxPronation(Number(e.target.value))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs w-14 text-center"
                        />
                        <span className="text-xs text-gray-400">°</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Min Supination</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={1}
                          max={editSupination}
                          step={1}
                          value={editMinSupination}
                          onChange={(e) => setEditMinSupination(Number(e.target.value))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs w-14 text-center"
                        />
                        <span className="text-xs text-gray-400">°</span>
                      </div>
                    </div>
                    <div>
                      <label className="text-[10px] text-gray-400 block mb-0.5">Max Supination</label>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={editSupination}
                          max={90}
                          step={1}
                          value={editMaxSupination}
                          onChange={(e) => setEditMaxSupination(Number(e.target.value))}
                          className="border border-gray-200 rounded px-1.5 py-1 text-xs w-14 text-center"
                        />
                        <span className="text-xs text-gray-400">°</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Top Row: Radar + 2 Gauges (achieved vs target) */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              {/* Performance Radar */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 pb-2">
                <h3 className="text-sm text-dxtr-teal">Car Racer Performance</h3>
                <p className="text-xs text-gray-500 mb-1">(% of target)</p>
                <div className="h-64 md:h-72 -mx-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <RadarChart data={radarData} cx="50%" cy="50%" outerRadius="80%">
                      <PolarGrid stroke="#E0E0E0" />
                      <PolarAngleAxis
                        dataKey="subject"
                        tick={{ fill: "#666", fontSize: 10 }}
                      />
                      <Radar
                        dataKey="value"
                        stroke="#c2e1a5"
                        fill="#c2e1a5"
                        fillOpacity={0.4}
                      />
                    </RadarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              {/* Left (Pronation) Gauge — achieved vs target */}
              <GaugeChart
                value={avgLeftAngle}
                target={targetPron}
                color="#7BC47F"
                label="Left Dodge (Pronation)"
              />

              {/* Right (Supination) Gauge — achieved vs target */}
              <GaugeChart
                value={avgRightAngle}
                target={targetSup}
                color="#5BB5CF"
                label="Right Dodge (Supination)"
              />
            </div>

            {/* Middle Row: Bar chart + Tasks + Calendar */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-5 mb-5">
              {/* Bar Chart */}
              <div className="bg-white rounded-lg border border-gray-200 p-3 pb-2">
                <h3 className="text-sm text-dxtr-teal mb-2">
                  Daily Left vs Right Dodge Angle
                </h3>
                <div className="h-64 md:h-72 -mx-1">
                  {barData.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={barData}
                        margin={{ left: 0, right: 10, top: 10, bottom: 5 }}
                      >
                        <CartesianGrid
                          strokeDasharray="3 3"
                          stroke="#E8E8E8"
                          vertical={false}
                        />
                        <XAxis
                          dataKey="name"
                          tick={{ fontSize: 12, fill: "#666" }}
                          axisLine={false}
                          tickLine={false}
                        />
                        <YAxis
                          tick={{ fontSize: 12, fill: "#666" }}
                          axisLine={false}
                          tickLine={false}
                          label={{
                            value: "degrees",
                            angle: -90,
                            position: "insideLeft",
                            style: { fontSize: 11, fill: "#999" },
                          }}
                        />
                        <Tooltip
                          formatter={(value: number) => [`${value}°`, ""]}
                          contentStyle={{ fontSize: 12 }}
                        />
                        <Legend wrapperStyle={{ fontSize: 12 }} iconSize={12} />
                        <Bar
                          dataKey="left"
                          name="Left Dodge"
                          fill="#82C785"
                          radius={[3, 3, 0, 0]}
                        />
                        <Bar
                          dataKey="right"
                          name="Right Dodge"
                          fill="#F7DC6F"
                          radius={[3, 3, 0, 0]}
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <NoData label="No daily angle data yet" />
                  )}
                </div>
              </div>

              {/* Task Boards */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-sm text-dxtr-teal mb-3">Task boards</h3>
                <div className="space-y-2">
                  {tasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-3 bg-gray-50 rounded-lg p-3"
                    >
                      <div
                        className="w-1.5 h-16 rounded"
                        style={{ backgroundColor: task.color }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-base font-medium text-gray-700 truncate">
                          {task.name}
                        </p>
                        <p className="text-sm text-gray-500 mt-1">
                          <span style={{ color: task.color }}>●</span> {task.date} |{" "}
                          {task.time}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Schedule Calendar */}
              <div className="bg-white rounded-lg border border-gray-200 p-3">
                <h3 className="text-sm text-dxtr-teal mb-2">
                  Saturday 12th Schedule
                </h3>
                <div className="flex items-center justify-between mb-2">
                  <ChevronLeft className="w-5 h-5 text-gray-400 cursor-pointer hover:text-dxtr-teal" />
                  <span className="text-sm text-gray-500">September 2019</span>
                  <ChevronRight className="w-5 h-5 text-gray-400 cursor-pointer hover:text-dxtr-teal" />
                </div>
                <div className="grid grid-cols-7 gap-0.5 mb-1">
                  {calendarDays.map((d, i) => (
                    <div key={i} className="text-center text-xs text-gray-400 py-0.5">
                      {d}
                    </div>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-0.5 text-sm">
                  {Array.from({ length: 35 }, (_, i) => {
                    const day = i - 5;
                    const isValid = day > 0 && day <= 30;
                    const isSelected = day === 12;
                    return (
                      <div
                        key={i}
                        className={`text-center py-1.5 rounded cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-dxtr-teal text-white font-medium"
                            : isValid
                            ? "text-gray-600 hover:bg-gray-100"
                            : "text-transparent"
                        }`}
                      >
                        {isValid ? day : "0"}
                      </div>
                    );
                  })}
                </div>
                <div className="mt-3 space-y-1.5">
                  {["8 am", "9 am", "10 am", "11 am"].map((t, i) => (
                    <div key={t} className="flex items-center gap-2">
                      <span className="text-xs text-gray-400 w-10">{t}</span>
                      <div className={`flex-1 h-5 rounded ${i === 0 ? "bg-dxtr-teal/30" : "bg-gray-100"}`} />
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Stats summary row */}
            {stats && stats.totalReps > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
                <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-dxtr-teal">{stats.totalDaysPlayed}</p>
                  <p className="text-xs text-gray-500">Days Played</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-dxtr-teal">{stats.totalSetsCompleted}</p>
                  <p className="text-xs text-gray-500">Sets Completed</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-dxtr-teal">
                    {stats.successfulReps}/{stats.totalReps}
                  </p>
                  <p className="text-xs text-gray-500">Successful Reps</p>
                </div>
                <div className="bg-white rounded-lg border border-gray-200 p-3 text-center">
                  <p className="text-2xl font-bold text-dxtr-teal">
                    {stats.avgReactionTimeMs > 0 ? `${stats.avgReactionTimeMs}ms` : "--"}
                  </p>
                  <p className="text-xs text-gray-500">Avg Reaction Time</p>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Yellow Ask Question Bar */}
      <div className="fixed bottom-0 left-0 md:left-14 right-0 bg-dxtr-gold py-3 px-4 md:px-6 z-30">
        <input
          type="text"
          placeholder="Ask a question!"
          className="w-full bg-transparent border-none text-dxtr-brown placeholder-dxtr-brown/70 focus:outline-none text-sm md:text-base"
        />
      </div>
    </AppShell>
  );
}
