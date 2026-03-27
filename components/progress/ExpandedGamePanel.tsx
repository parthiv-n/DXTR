"use client";

import { useState, useEffect, useCallback } from "react";
import { ExerciseGame, GameAggregate, DayBucket } from "@/lib/exercise/types";
import { GameConfigData, GameProgressMetrics } from "@/lib/types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from "@/components/ui/chart";
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { Save, Activity, TrendingUp, TrendingDown, Minus } from "lucide-react";

import { cn } from "@/lib/utils";

type Props = {
  game: ExerciseGame;
  aggregate: GameAggregate;
  dailyBuckets: DayBucket[];
  patientId: string;
  className?: string;
};

const repsChartConfig: ChartConfig = {
  reps: { label: "Reps", color: "#82C785" },
};

const difficultyChartConfig: ChartConfig = {
  successRate: { label: "Success Rate", color: "#82C785" },
};

export function ExpandedGamePanel({ game, aggregate, dailyBuckets, patientId, className }: Props) {
  const outcomeChartConfig: ChartConfig = {
    metric: { label: game.primaryMetricLabel, color: "#c2e1a5" },
  };

  const repsData = dailyBuckets.map((d) => {
    const dateObj = new Date(d.date + "T00:00:00");
    return {
      date: d.date,
      label: dateObj.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      reps: d.perGame[game.id]?.reps ?? 0,
    };
  });

  const outcomeData = dailyBuckets.map((d, i) => ({
    date: d.date,
    label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
    }),
    metric: aggregate.primaryMetricTrend[i] ?? 0,
  }));

  return (
    <div className={cn("bg-white rounded-2xl border border-gray-200 p-5", className)}>
      {/* Header */}
      <div className="flex items-center gap-3 mb-5">
        <span className="text-3xl">{game.icon}</span>
        <div>
          <h2 className="text-lg font-bold text-dxtr-brown">{game.name}</h2>
          <p className="text-xs text-gray-500">
            {aggregate.reps} / {aggregate.expectedReps} reps ({aggregate.completionPct}%)
          </p>
        </div>
      </div>

      {/* Two-column layout */}
      <div className="flex flex-col lg:flex-row gap-5">
        {/* Left: Charts */}
        <div className="flex-1 min-w-0">
          {aggregate.reps === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 text-gray-400">
              <p className="text-sm">No data available for this game</p>
              <p className="text-xs mt-1">Play {game.name} to see analytics here</p>
            </div>
          ) : (
            <Tabs defaultValue="reps">
              <TabsList>
                <TabsTrigger value="reps">Reps Trend</TabsTrigger>
                <TabsTrigger value="outcome">Outcome Trend</TabsTrigger>
                <TabsTrigger value="difficulty">Difficulty</TabsTrigger>
              </TabsList>

              <TabsContent value="reps">
                <ChartContainer config={repsChartConfig} className="h-[250px] w-full">
                  <BarChart data={repsData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ReferenceLine
                      y={game.targetRepsPerDay}
                      stroke="#6B5344"
                      strokeDasharray="4 4"
                      strokeOpacity={0.3}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="reps" fill="var(--color-reps)" radius={[3, 3, 0, 0]} />
                  </BarChart>
                </ChartContainer>
              </TabsContent>

              <TabsContent value="outcome">
                <ChartContainer config={outcomeChartConfig} className="h-[250px] w-full">
                  <LineChart data={outcomeData} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
                    <XAxis
                      dataKey="label"
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fontSize: 10, fill: "#9CA3AF" }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Line
                      type="monotone"
                      dataKey="metric"
                      stroke="var(--color-metric)"
                      strokeWidth={2}
                      dot={{ r: 3, fill: "var(--color-metric)" }}
                      activeDot={{ r: 5 }}
                    />
                  </LineChart>
                </ChartContainer>
              </TabsContent>

              <TabsContent value="difficulty">
                <DifficultyTab
                  config={difficultyChartConfig}
                  dailyBuckets={dailyBuckets}
                  gameId={game.id}
                />
              </TabsContent>
            </Tabs>
          )}
        </div>

        {/* Right: Settings */}
        <div className="lg:w-[340px] shrink-0">
          {game.id === "car-racer" ? (
            <CarRacerSettings patientId={patientId} />
          ) : game.id === "alien-abduction" ? (
            <AlienAbductionSettings patientId={patientId} />
          ) : game.id === "storm-witch" ? (
            <StormWitchSettings patientId={patientId} />
          ) : game.id === "fossil-dusting" ? (
            <FossilDustingSettings patientId={patientId} />
          ) : game.id === "fly-swatter" ? (
            <FlySwatterSettings patientId={patientId} />
          ) : game.id === "rhythm-rehab" ? (
            <RhythmRehabSettings patientId={patientId} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

function DifficultyTab({
  config,
  dailyBuckets,
  gameId,
}: {
  config: ChartConfig;
  dailyBuckets: DayBucket[];
  gameId: string;
}) {
  const data = dailyBuckets.map((d) => {
    const gameData = d.perGame[gameId];
    const reps = gameData?.reps ?? 0;
    const expected = d.expectedReps / Object.keys(d.perGame).length;
    return {
      date: d.date,
      label: new Date(d.date + "T00:00:00").toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      }),
      successRate: expected > 0 ? Math.round((reps / expected) * 100) : 0,
    };
  });

  return (
    <ChartContainer config={config} className="h-[250px] w-full">
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#E5E7EB" vertical={false} />
        <XAxis
          dataKey="label"
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
        />
        <YAxis
          tick={{ fontSize: 10, fill: "#9CA3AF" }}
          axisLine={false}
          tickLine={false}
          domain={[0, 100]}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Line
          type="monotone"
          dataKey="successRate"
          stroke="var(--color-successRate)"
          strokeWidth={2}
          dot={{ r: 3, fill: "var(--color-successRate)" }}
        />
      </LineChart>
    </ChartContainer>
  );
}

function CarRacerSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editPronation, setEditPronation] = useState(15);
  const [editSupination, setEditSupination] = useState(15);
  const [editDeadZone, setEditDeadZone] = useState(5);
  const [editAutoProgression, setEditAutoProgression] = useState(true);
  const [editMinPronation, setEditMinPronation] = useState(5);
  const [editMinSupination, setEditMinSupination] = useState(5);
  const [editMaxPronation, setEditMaxPronation] = useState(45);
  const [editMaxSupination, setEditMaxSupination] = useState(45);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config?gameId=car-racer`);
      if (res.ok) {
        const data: GameConfigData = await res.json();
        setGameConfig(data);
        setEditPronation(data.targetPronation);
        setEditSupination(data.targetSupination);
        setEditDeadZone(data.deadZone);
        setEditAutoProgression(data.autoProgressionEnabled);
        setEditMinPronation(data.minParams?.targetPronation ?? 5);
        setEditMinSupination(data.minParams?.targetSupination ?? 5);
        setEditMaxPronation(data.maxParams?.targetPronation ?? 45);
        setEditMaxSupination(data.maxParams?.targetSupination ?? 45);
      }
    } catch (err) {
      console.error("Failed to fetch config:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "car-racer",
          targetPronation: editPronation,
          targetSupination: editSupination,
          deadZone: editDeadZone,
          autoProgressionEnabled: editAutoProgression,
          minParams: { targetPronation: editMinPronation, targetSupination: editMinSupination, deadZone: 2 },
          maxParams: { targetPronation: editMaxPronation, targetSupination: editMaxSupination, deadZone: 15 },
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

  const configDirty = gameConfig && (
    editPronation !== gameConfig.targetPronation ||
    editSupination !== gameConfig.targetSupination ||
    editDeadZone !== gameConfig.deadZone ||
    editAutoProgression !== gameConfig.autoProgressionEnabled ||
    editMinPronation !== (gameConfig.minParams?.targetPronation ?? 5) ||
    editMinSupination !== (gameConfig.minParams?.targetSupination ?? 5) ||
    editMaxPronation !== (gameConfig.maxParams?.targetPronation ?? 45) ||
    editMaxSupination !== (gameConfig.maxParams?.targetSupination ?? 45)
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Car Racer — Target Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <InputRow label="Pronation (left)" value={editPronation} onChange={setEditPronation} min={1} max={90} />
        <InputRow label="Supination (right)" value={editSupination} onChange={setEditSupination} min={1} max={90} />
        <InputRow label="Dead Zone" value={editDeadZone} onChange={setEditDeadZone} min={0} max={30} />
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      <div className="border-t border-gray-200 pt-3">
        <h5 className="text-[10px] font-medium text-gray-400 mb-2 uppercase">Safety Bounds</h5>
        <div className="grid grid-cols-2 gap-2">
          <InputRow label="Min Pron" value={editMinPronation} onChange={setEditMinPronation} min={1} max={editPronation} small />
          <InputRow label="Max Pron" value={editMaxPronation} onChange={setEditMaxPronation} min={editPronation} max={90} small />
          <InputRow label="Min Sup" value={editMinSupination} onChange={setEditMinSupination} min={1} max={editSupination} small />
          <InputRow label="Max Sup" value={editMaxSupination} onChange={setEditMaxSupination} min={editSupination} max={90} small />
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!configDirty} onClick={handleSave} />
    </div>
  );
}

function AlienAbductionSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [metrics, setMetrics] = useState<GameProgressMetrics["overallStats"] | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [editFsrThreshold, setEditFsrThreshold] = useState(200);
  const [editAutoProgression, setEditAutoProgression] = useState(true);

  const fetchData = useCallback(async () => {
    try {
      const [configRes, progressRes] = await Promise.all([
        fetch(`/api/patients/${patientId}/game-config?gameId=alien-abduction`),
        fetch(`/api/patients/${patientId}/game-progress?gameId=alien-abduction`),
      ]);
      if (configRes.ok) {
        const data: GameConfigData = await configRes.json();
        setGameConfig(data);
        setEditFsrThreshold(data.difficultyParams?.fsrThreshold ?? 200);
        setEditAutoProgression(data.autoProgressionEnabled);
      }
      if (progressRes.ok) {
        const data: GameProgressMetrics = await progressRes.json();
        setMetrics(data.overallStats);
      }
    } catch (err) {
      console.error("Failed to fetch alien config/metrics:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchData(); }, [fetchData]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "alien-abduction",
          difficultyParams: { fsrThreshold: editFsrThreshold },
          autoProgressionEnabled: editAutoProgression,
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save alien config:", err);
    } finally {
      setSaving(false);
    }
  };

  const configDirty = gameConfig && (
    editFsrThreshold !== (gameConfig.difficultyParams?.fsrThreshold ?? 200) ||
    editAutoProgression !== gameConfig.autoProgressionEnabled
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Alien Abduction — Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">FSR Threshold</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={50}
              max={1023}
              step={10}
              value={editFsrThreshold}
              onChange={(e) => setEditFsrThreshold(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm text-center w-20"
            />
            <span className="text-xs text-gray-400">raw ADC</span>
          </div>
        </div>
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      {metrics && (
        <div className="space-y-2 border-t border-gray-200 pt-3">
          <div className="flex items-center gap-2">
            <Activity className="w-3.5 h-3.5 text-purple-500" />
            <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Performance Metrics</span>
          </div>
          <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
            <MetricCell label="Avg Peak FSR" value={metrics.avgPeakFsr ?? "—"} />
            <MetricCell label="Force Consistency" value={metrics.avgForceConsistency != null ? `±${metrics.avgForceConsistency}` : "—"} />
            <MetricCell label="Cows Missed" value={metrics.avgCowsMissed ?? "—"} unit="/set" />
            <MetricCell label="Time Above Threshold" value={metrics.avgTimeAboveThresholdPct != null ? `${metrics.avgTimeAboveThresholdPct}%` : "—"} />
            <MetricCell label="Avg Session" value={metrics.avgSessionDurationMs != null ? `${Math.round(metrics.avgSessionDurationMs / 1000)}s` : "—"} />
            <MetricCell label="Total Sets" value={metrics.totalSetsCompleted} />
          </div>
        </div>
      )}

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!configDirty} onClick={handleSave} />
    </div>
  );
}

// =============================================
// Shared helpers for settings components
// =============================================

function SettingsLoadingSkeleton() {
  return (
    <div className="bg-gray-50 rounded-lg p-5 animate-pulse">
      <div className="h-4 bg-gray-200 rounded w-3/4 mb-4" />
      <div className="h-8 bg-gray-200 rounded w-full mb-3" />
      <div className="h-8 bg-gray-200 rounded w-full mb-3" />
      <div className="h-8 bg-gray-200 rounded w-full" />
    </div>
  );
}

function AutoProgressionToggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center gap-3 pt-1">
      <label className="relative inline-flex items-center cursor-pointer">
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className="sr-only peer"
        />
        <div className="w-9 h-5 bg-gray-200 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all peer-checked:bg-dxtr-teal" />
      </label>
      <span className="text-xs text-gray-600">Auto-progression</span>
    </div>
  );
}

function AdaptiveStatus({ gameConfig }: { gameConfig: GameConfigData | null; goodSetsNeeded?: number }) {
  const progressToNext = gameConfig?.consecutiveGoodSets ?? 0;
  const lastAdjLabel = (() => {
    if (!gameConfig?.lastAdjustmentAt) return "No adjustments yet";
    const d = new Date(gameConfig.lastAdjustmentAt);
    const days = Math.round((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
    const dir = gameConfig.lastAdjustmentDirection === "up" ? "Increased" : "Decreased";
    if (days === 0) return `${dir} today`;
    if (days === 1) return `${dir} yesterday`;
    return `${dir} ${days}d ago`;
  })();
  const AdjIcon = gameConfig?.lastAdjustmentDirection === "up"
    ? TrendingUp
    : gameConfig?.lastAdjustmentDirection === "down"
    ? TrendingDown
    : Minus;

  return (
    <div className="space-y-2 border-t border-gray-200 pt-3">
      <div className="flex items-center gap-2">
        <Activity className="w-3.5 h-3.5 text-dxtr-teal" />
        <span className="text-xs font-medium text-gray-600 uppercase tracking-wide">Adaptive Status</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-xs">
        <div>
          <span className="text-gray-400 block">Next level</span>
          <div className="flex items-center gap-1 mt-0.5">
            <div className="flex-1 bg-gray-200 rounded-full h-1.5">
              <div className="bg-dxtr-teal rounded-full h-1.5 transition-all" style={{ width: `${(progressToNext / 3) * 100}%` }} />
            </div>
            <span className="text-gray-500 font-medium">{progressToNext}/3</span>
          </div>
        </div>
        <div>
          <span className="text-gray-400 block">Last adjustment</span>
          <div className="flex items-center gap-1 mt-0.5">
            <AdjIcon className={`w-3 h-3 ${
              gameConfig?.lastAdjustmentDirection === "up" ? "text-green-500" :
              gameConfig?.lastAdjustmentDirection === "down" ? "text-amber-500" :
              "text-gray-400"
            }`} />
            <span className="text-gray-600">{lastAdjLabel}</span>
          </div>
        </div>
        <div>
          <span className="text-gray-400 block">Struggle counter</span>
          <span className="text-gray-600 font-medium">{gameConfig?.consecutiveStruggleSets ?? 0}/2</span>
        </div>
      </div>
    </div>
  );
}

function CalibrationBadge({ gameConfig }: { gameConfig: GameConfigData | null }) {
  return (
    <div className="flex items-center gap-2">
      <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${
        gameConfig?.calibrationComplete
          ? "bg-green-100 text-green-700"
          : "bg-amber-100 text-amber-700"
      }`}>
        {gameConfig?.calibrationComplete
          ? "Calibrated"
          : `Calibrating ${gameConfig?.calibrationSetsCompleted ?? 0}/3`}
      </span>
    </div>
  );
}

function SaveButton({ saving, saveSuccess, dirty, onClick }: {
  saving: boolean; saveSuccess: boolean; dirty: boolean; onClick: () => void;
}) {
  return (
    <>
      <button
        onClick={onClick}
        disabled={saving || !dirty}
        className={`w-full flex items-center justify-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
          dirty ? "bg-dxtr-teal text-white hover:bg-dxtr-teal/90" : "bg-gray-200 text-gray-400 cursor-not-allowed"
        }`}
      >
        <Save className="w-3.5 h-3.5" />
        {saving ? "Saving..." : saveSuccess ? "Saved!" : "Save Settings"}
      </button>
      {saveSuccess && <p className="text-xs text-green-600 text-center">Settings saved. Changes apply on next session.</p>}
    </>
  );
}

// =============================================
// Storm Witch Settings  (FSR grip)
// =============================================

function StormWitchSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editGripForce, setEditGripForce] = useState(0.5);
  const [editHoldDuration, setEditHoldDuration] = useState(1000);
  const [editAutoProgression, setEditAutoProgression] = useState(true);
  const [editMinGrip, setEditMinGrip] = useState(0.1);
  const [editMaxGrip, setEditMaxGrip] = useState(0.9);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config?gameId=storm-witch`);
      if (res.ok) {
        const data: GameConfigData = await res.json();
        setGameConfig(data);
        setEditGripForce(data.difficultyParams?.targetGripForce ?? 0.5);
        setEditHoldDuration(data.difficultyParams?.targetHoldDurationMs ?? 1000);
        setEditAutoProgression(data.autoProgressionEnabled);
        setEditMinGrip(data.minParams?.targetGripForce ?? 0.1);
        setEditMaxGrip(data.maxParams?.targetGripForce ?? 0.9);
      }
    } catch (err) {
      console.error("Failed to fetch storm-witch config:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "storm-witch",
          difficultyParams: { targetGripForce: editGripForce, targetHoldDurationMs: editHoldDuration },
          autoProgressionEnabled: editAutoProgression,
          minParams: { targetGripForce: editMinGrip, targetHoldDurationMs: 500 },
          maxParams: { targetGripForce: editMaxGrip, targetHoldDurationMs: 5000 },
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save storm-witch config:", err);
    } finally {
      setSaving(false);
    }
  };

  const dirty = gameConfig && (
    editGripForce !== (gameConfig.difficultyParams?.targetGripForce ?? 0.5) ||
    editHoldDuration !== (gameConfig.difficultyParams?.targetHoldDurationMs ?? 1000) ||
    editAutoProgression !== gameConfig.autoProgressionEnabled ||
    editMinGrip !== (gameConfig.minParams?.targetGripForce ?? 0.1) ||
    editMaxGrip !== (gameConfig.maxParams?.targetGripForce ?? 0.9)
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Storm Witch — Target Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Target Grip Force</label>
          <div className="flex items-center gap-2">
            <input
              type="range"
              min={0.1}
              max={0.9}
              step={0.01}
              value={editGripForce}
              onChange={(e) => setEditGripForce(parseFloat(e.target.value))}
              className="flex-1 accent-dxtr-teal"
            />
            <span className="text-sm font-medium text-gray-700 w-12 text-right">
              {Math.round(editGripForce * 100)}%
            </span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Hold Duration</label>
          <div className="flex items-center gap-1">
            <input
              type="number"
              min={200}
              max={5000}
              step={100}
              value={editHoldDuration}
              onChange={(e) => setEditHoldDuration(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm text-center w-20"
            />
            <span className="text-xs text-gray-400">ms</span>
          </div>
        </div>
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      <div className="border-t border-gray-200 pt-3">
        <h5 className="text-[10px] font-medium text-gray-400 mb-2 uppercase">Safety Bounds (Grip Force)</h5>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Min Force</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={0.05} max={editGripForce} step={0.05}
                value={editMinGrip}
                onChange={(e) => setEditMinGrip(parseFloat(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-xs text-center w-14"
              />
              <span className="text-[10px] text-gray-400">{Math.round(editMinGrip * 100)}%</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Max Force</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={editGripForce} max={0.95} step={0.05}
                value={editMaxGrip}
                onChange={(e) => setEditMaxGrip(parseFloat(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-xs text-center w-14"
              />
              <span className="text-[10px] text-gray-400">{Math.round(editMaxGrip * 100)}%</span>
            </div>
          </div>
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!dirty} onClick={handleSave} />
    </div>
  );
}

// =============================================
// Fossil Dusting Settings  (wrist radial/ulnar deviation)
// =============================================

function FossilDustingSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editDeviation, setEditDeviation] = useState(12);
  const [editDeadZone, setEditDeadZone] = useState(3);
  const [editAutoProgression, setEditAutoProgression] = useState(true);
  const [editMinDeviation, setEditMinDeviation] = useState(3);
  const [editMaxDeviation, setEditMaxDeviation] = useState(25);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config?gameId=fossil-dusting`);
      if (res.ok) {
        const data: GameConfigData = await res.json();
        setGameConfig(data);
        setEditDeviation(data.difficultyParams?.targetDeviation ?? 12);
        setEditDeadZone(data.difficultyParams?.deadZone ?? 3);
        setEditAutoProgression(data.autoProgressionEnabled);
        setEditMinDeviation(data.minParams?.targetDeviation ?? 3);
        setEditMaxDeviation(data.maxParams?.targetDeviation ?? 25);
      }
    } catch (err) {
      console.error("Failed to fetch fossil-dusting config:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "fossil-dusting",
          difficultyParams: { targetDeviation: editDeviation, deadZone: editDeadZone },
          autoProgressionEnabled: editAutoProgression,
          minParams: { targetDeviation: editMinDeviation, deadZone: 1 },
          maxParams: { targetDeviation: editMaxDeviation, deadZone: 10 },
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save fossil-dusting config:", err);
    } finally {
      setSaving(false);
    }
  };

  const dirty = gameConfig && (
    editDeviation !== (gameConfig.difficultyParams?.targetDeviation ?? 12) ||
    editDeadZone !== (gameConfig.difficultyParams?.deadZone ?? 3) ||
    editAutoProgression !== gameConfig.autoProgressionEnabled ||
    editMinDeviation !== (gameConfig.minParams?.targetDeviation ?? 3) ||
    editMaxDeviation !== (gameConfig.maxParams?.targetDeviation ?? 25)
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Fossil Dusting — Target Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <InputRow label="Target Deviation" value={editDeviation} onChange={setEditDeviation} min={3} max={30} />
        <InputRow label="Dead Zone" value={editDeadZone} onChange={setEditDeadZone} min={0} max={15} />
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      <div className="border-t border-gray-200 pt-3">
        <h5 className="text-[10px] font-medium text-gray-400 mb-2 uppercase">Safety Bounds</h5>
        <div className="grid grid-cols-2 gap-2">
          <InputRow label="Min Dev" value={editMinDeviation} onChange={setEditMinDeviation} min={1} max={editDeviation} small />
          <InputRow label="Max Dev" value={editMaxDeviation} onChange={setEditMaxDeviation} min={editDeviation} max={30} small />
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!dirty} onClick={handleSave} />
    </div>
  );
}

// =============================================
// Fly Swatter Settings  (ultrasonic distance)
// =============================================

function FlySwatterSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editThreshold, setEditThreshold] = useState(20);
  const [editCooldown, setEditCooldown] = useState(600);
  const [editAutoProgression, setEditAutoProgression] = useState(true);
  const [editMinThreshold, setEditMinThreshold] = useState(5);
  const [editMaxThreshold, setEditMaxThreshold] = useState(40);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config?gameId=fly-swatter`);
      if (res.ok) {
        const data: GameConfigData = await res.json();
        setGameConfig(data);
        setEditThreshold(data.difficultyParams?.shooThresholdCm ?? 20);
        setEditCooldown(data.difficultyParams?.shooCooldownMs ?? 600);
        setEditAutoProgression(data.autoProgressionEnabled);
        setEditMinThreshold(data.minParams?.shooThresholdCm ?? 5);
        setEditMaxThreshold(data.maxParams?.shooThresholdCm ?? 40);
      }
    } catch (err) {
      console.error("Failed to fetch fly-swatter config:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "fly-swatter",
          difficultyParams: { shooThresholdCm: editThreshold, shooCooldownMs: editCooldown },
          autoProgressionEnabled: editAutoProgression,
          minParams: { shooThresholdCm: editMinThreshold, shooCooldownMs: 200 },
          maxParams: { shooThresholdCm: editMaxThreshold, shooCooldownMs: 2000 },
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save fly-swatter config:", err);
    } finally {
      setSaving(false);
    }
  };

  const dirty = gameConfig && (
    editThreshold !== (gameConfig.difficultyParams?.shooThresholdCm ?? 20) ||
    editCooldown !== (gameConfig.difficultyParams?.shooCooldownMs ?? 600) ||
    editAutoProgression !== gameConfig.autoProgressionEnabled ||
    editMinThreshold !== (gameConfig.minParams?.shooThresholdCm ?? 5) ||
    editMaxThreshold !== (gameConfig.maxParams?.shooThresholdCm ?? 40)
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Fly Swatter — Target Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Shoo Distance</label>
          <div className="flex items-center gap-1">
            <input
              type="number" min={5} max={40} step={1}
              value={editThreshold}
              onChange={(e) => setEditThreshold(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm text-center w-16"
            />
            <span className="text-xs text-gray-400">cm</span>
          </div>
        </div>
        <div>
          <label className="text-xs text-gray-500 block mb-0.5">Cooldown</label>
          <div className="flex items-center gap-1">
            <input
              type="number" min={200} max={2000} step={50}
              value={editCooldown}
              onChange={(e) => setEditCooldown(Number(e.target.value))}
              className="border border-gray-200 rounded px-2 py-1 text-sm text-center w-20"
            />
            <span className="text-xs text-gray-400">ms</span>
          </div>
        </div>
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      <div className="border-t border-gray-200 pt-3">
        <h5 className="text-[10px] font-medium text-gray-400 mb-2 uppercase">Safety Bounds (Distance)</h5>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Min Dist</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={5} max={editThreshold} step={1}
                value={editMinThreshold}
                onChange={(e) => setEditMinThreshold(Number(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-xs text-center w-12"
              />
              <span className="text-[10px] text-gray-400">cm</span>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-500 block mb-0.5">Max Dist</label>
            <div className="flex items-center gap-1">
              <input
                type="number" min={editThreshold} max={60} step={1}
                value={editMaxThreshold}
                onChange={(e) => setEditMaxThreshold(Number(e.target.value))}
                className="border border-gray-200 rounded px-2 py-1 text-xs text-center w-12"
              />
              <span className="text-[10px] text-gray-400">cm</span>
            </div>
          </div>
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!dirty} onClick={handleSave} />
    </div>
  );
}

// =============================================
// Rhythm Rehab Settings  (IMU pitch — wrist flex/ext)
// =============================================

function RhythmRehabSettings({ patientId }: { patientId: string }) {
  const [gameConfig, setGameConfig] = useState<GameConfigData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);

  const [editPitchThreshold, setEditPitchThreshold] = useState(15);
  const [editPitchNeutral, setEditPitchNeutral] = useState(5);
  const [editAutoProgression, setEditAutoProgression] = useState(true);
  const [editMinThreshold, setEditMinThreshold] = useState(5);
  const [editMaxThreshold, setEditMaxThreshold] = useState(45);

  const fetchConfig = useCallback(async () => {
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config?gameId=rhythm-rehab`);
      if (res.ok) {
        const data: GameConfigData = await res.json();
        setGameConfig(data);
        setEditPitchThreshold(data.difficultyParams?.pitchThreshold ?? 15);
        setEditPitchNeutral(data.difficultyParams?.pitchNeutral ?? 5);
        setEditAutoProgression(data.autoProgressionEnabled);
        setEditMinThreshold(data.minParams?.pitchThreshold ?? 5);
        setEditMaxThreshold(data.maxParams?.pitchThreshold ?? 45);
      }
    } catch (err) {
      console.error("Failed to fetch rhythm-rehab config:", err);
    } finally {
      setLoading(false);
    }
  }, [patientId]);

  useEffect(() => { fetchConfig(); }, [fetchConfig]);

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await fetch(`/api/patients/${patientId}/game-config`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          gameId: "rhythm-rehab",
          difficultyParams: { pitchThreshold: editPitchThreshold, pitchNeutral: editPitchNeutral },
          autoProgressionEnabled: editAutoProgression,
          minParams: { pitchThreshold: editMinThreshold, pitchNeutral: 2 },
          maxParams: { pitchThreshold: editMaxThreshold, pitchNeutral: 15 },
        }),
      });
      if (res.ok) {
        const updated: GameConfigData = await res.json();
        setGameConfig(updated);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error("Failed to save rhythm-rehab config:", err);
    } finally {
      setSaving(false);
    }
  };

  const dirty = gameConfig && (
    editPitchThreshold !== (gameConfig.difficultyParams?.pitchThreshold ?? 15) ||
    editPitchNeutral !== (gameConfig.difficultyParams?.pitchNeutral ?? 5) ||
    editAutoProgression !== gameConfig.autoProgressionEnabled ||
    editMinThreshold !== (gameConfig.minParams?.pitchThreshold ?? 5) ||
    editMaxThreshold !== (gameConfig.maxParams?.pitchThreshold ?? 45)
  );

  if (loading) return <SettingsLoadingSkeleton />;

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      <h3 className="text-sm font-semibold text-dxtr-teal">Rhythm Rehab — Target Configuration</h3>
      <CalibrationBadge gameConfig={gameConfig} />

      <div className="space-y-3">
        <InputRow label="Pitch Threshold" value={editPitchThreshold} onChange={setEditPitchThreshold} min={3} max={60} />
        <InputRow label="Neutral Zone" value={editPitchNeutral} onChange={setEditPitchNeutral} min={1} max={20} />
      </div>

      <AutoProgressionToggle checked={editAutoProgression} onChange={setEditAutoProgression} />
      <AdaptiveStatus gameConfig={gameConfig} />

      <div className="border-t border-gray-200 pt-3">
        <h5 className="text-[10px] font-medium text-gray-400 mb-2 uppercase">Safety Bounds</h5>
        <div className="grid grid-cols-2 gap-2">
          <InputRow label="Min Threshold" value={editMinThreshold} onChange={setEditMinThreshold} min={3} max={editPitchThreshold} small />
          <InputRow label="Max Threshold" value={editMaxThreshold} onChange={setEditMaxThreshold} min={editPitchThreshold} max={60} small />
        </div>
      </div>

      <SaveButton saving={saving} saveSuccess={saveSuccess} dirty={!!dirty} onClick={handleSave} />
    </div>
  );
}

function MetricCell({ label, value, unit }: { label: string; value: string | number; unit?: string }) {
  return (
    <div>
      <span className="text-gray-400 block">{label}</span>
      <span className="text-gray-700 font-medium">
        {value}{unit && <span className="text-gray-400 font-normal">{unit}</span>}
      </span>
    </div>
  );
}

function InputRow({
  label,
  value,
  onChange,
  min,
  max,
  small = false,
}: {
  label: string;
  value: number;
  onChange: (v: number) => void;
  min: number;
  max: number;
  small?: boolean;
}) {
  return (
    <div>
      <label className={`text-gray-500 block mb-0.5 ${small ? "text-[10px]" : "text-xs"}`}>
        {label}
      </label>
      <div className="flex items-center gap-1">
        <input
          type="number"
          min={min}
          max={max}
          step={1}
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          className={`border border-gray-200 rounded px-2 py-1 text-center ${small ? "text-xs w-12" : "text-sm w-16"}`}
        />
        <span className={`text-gray-400 ${small ? "text-[10px]" : "text-xs"}`}>°</span>
      </div>
    </div>
  );
}
