"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function CarRacerPage() {
  const router = useRouter();

  useEffect(() => {
    // Listen for messages from the game iframe
    const handleMessage = (event: MessageEvent) => {
      if (event.data?.type === "gameComplete") {
        router.push("/patient");
      }
    };
    window.addEventListener("message", handleMessage);
    return () => window.removeEventListener("message", handleMessage);
  }, [router]);

  return (
    <div className="fixed inset-0 bg-black">
      {/* Game iframe - fills entire screen */}
      <iframe
        src="/car-game/v5.therapy.html?patientId=edwin-001"
        className="w-full h-full border-0"
        title="Car Racer - DXTR Therapy Game"
        allow="autoplay; serial; bluetooth"
      />

      {/* Floating back button - top left corner */}
      <Link
        href="/patient"
        className="fixed top-5 left-5 z-50 inline-flex items-center gap-2 bg-black/50 hover:bg-black/80 text-white/80 hover:text-white text-base px-5 py-2.5 rounded-full backdrop-blur-sm transition-all"
      >
        <ArrowLeft className="w-5 h-5" />
        Back
      </Link>
    </div>
  );
}
