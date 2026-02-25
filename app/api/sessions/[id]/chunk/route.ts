import { NextRequest, NextResponse } from "next/server";
import prisma from "@/lib/db/prisma";
import { ChunkRequest, ChunkResponse } from "@/lib/types";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: sessionId } = await params;
    const body: ChunkRequest = await request.json();
    const { seq, t0, t1, samples } = body;

    // Validate required fields
    if (seq === undefined || t0 === undefined || t1 === undefined || !samples) {
      return NextResponse.json(
        { error: "Missing required fields: seq, t0, t1, samples" },
        { status: 400 }
      );
    }

    // Verify session exists
    const session = await prisma.session.findUnique({
      where: { id: sessionId },
    });

    if (!session) {
      return NextResponse.json(
        { error: `Session not found: ${sessionId}` },
        { status: 404 }
      );
    }

    // Check for duplicate chunk (idempotency)
    const existingChunk = await prisma.sessionChunk.findUnique({
      where: {
        sessionId_seq: {
          sessionId,
          seq,
        },
      },
    });

    if (existingChunk) {
      // Already received this chunk, return success with deduped flag
      const response: ChunkResponse = {
        ok: true,
        receivedSeq: seq,
        deduped: true,
      };
      return NextResponse.json(response);
    }

    // Store chunk
    await prisma.sessionChunk.create({
      data: {
        sessionId,
        seq,
        t0,
        t1,
        samples: JSON.stringify(samples),
      },
    });

    const response: ChunkResponse = {
      ok: true,
      receivedSeq: seq,
      deduped: false,
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error("Error storing chunk:", error);
    return NextResponse.json(
      { error: "Failed to store chunk" },
      { status: 500 }
    );
  }
}
