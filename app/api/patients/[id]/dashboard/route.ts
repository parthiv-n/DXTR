import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { DashboardMetrics, MissionPlanData, SessionSummary } from "@/lib/types";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: patientId } = await params;

    // Fetch patient with related data
    const patient = await prisma.patient.findUnique({
      where: { id: patientId },
      include: {
        plan: true,
        sessions: {
          orderBy: { startedAt: "desc" },
          take: 10,
          include: {
            summary: true,
          },
        },
      },
    });

    if (!patient) {
      return NextResponse.json(
        { error: `Patient not found: ${patientId}` },
        { status: 404 }
      );
    }

    // Get latest summary
    const latestSession = patient.sessions[0];
    const latestSummary = latestSession?.summary
      ? {
          durationMs: latestSession.summary.durationMs,
          repCount: latestSession.summary.repCount,
          peakGrip: latestSession.summary.peakGrip,
          avgGrip: latestSession.summary.avgGrip,
          romPronation: latestSession.summary.romPronation,
          romSupination: latestSession.summary.romSupination,
          smoothness: latestSession.summary.smoothness,
        }
      : null;

    // Compute average metrics from all sessions with summaries
    const sessionsWithSummaries = patient.sessions.filter((s) => s.summary);
    let averageMetrics = null;

    if (sessionsWithSummaries.length > 0) {
      const totals = sessionsWithSummaries.reduce(
        (acc, s) => {
          if (s.summary) {
            acc.avgGrip += s.summary.avgGrip;
            acc.avgRomPronation += s.summary.romPronation;
            acc.avgRomSupination += s.summary.romSupination;
            acc.avgSmoothness += s.summary.smoothness;
          }
          return acc;
        },
        { avgGrip: 0, avgRomPronation: 0, avgRomSupination: 0, avgSmoothness: 0 }
      );

      const count = sessionsWithSummaries.length;
      averageMetrics = {
        avgGrip: Math.round((totals.avgGrip / count) * 100) / 100,
        avgRomPronation: Math.round((totals.avgRomPronation / count) * 10) / 10,
        avgRomSupination: Math.round((totals.avgRomSupination / count) * 10) / 10,
        avgSmoothness: Math.round((totals.avgSmoothness / count) * 100) / 100,
      };
    }

    // Parse mission plan
    let missionPlan: MissionPlanData | null = null;
    if (patient.plan) {
      try {
        missionPlan = JSON.parse(patient.plan.data) as MissionPlanData;
      } catch {
        console.error("Failed to parse mission plan");
      }
    }

    // Format recent sessions
    const recentSessions = patient.sessions.map((s) => ({
      id: s.id,
      gameId: s.gameId,
      startedAt: s.startedAt.toISOString(),
      summary: s.summary
        ? ({
            durationMs: s.summary.durationMs,
            repCount: s.summary.repCount,
            peakGrip: s.summary.peakGrip,
            avgGrip: s.summary.avgGrip,
            romPronation: s.summary.romPronation,
            romSupination: s.summary.romSupination,
            smoothness: s.summary.smoothness,
          } as SessionSummary)
        : null,
    }));

    const dashboard: DashboardMetrics = {
      patient: {
        id: patient.id,
        name: patient.name,
      },
      latestSummary,
      sessionCount: patient.sessions.length,
      averageMetrics,
      recentSessions,
      missionPlan,
    };

    return NextResponse.json(dashboard);
  } catch (error) {
    console.error("Error fetching dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch dashboard" },
      { status: 500 }
    );
  }
}
