"use client";

import Link from "next/link";

export default function WelcomePage() {
  return (
    <div className="min-h-screen bg-white flex items-center justify-center p-4">
      <div className="text-center w-full max-w-sm">
        {/* Title - responsive */}
        <h1 className="text-4xl sm:text-5xl font-bold text-dxtr-brown mb-2">
          Welcome!
        </h1>
        <p className="text-base sm:text-lg text-dxtr-brown-light mb-8 sm:mb-10">
          Who are you?
        </p>

        {/* Role Selection Buttons - responsive */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 justify-center">
          <Link 
            href="/clinician" 
            className="w-full sm:w-auto px-8 py-3 border border-gray-300 rounded text-gray-500 hover:border-dxtr-teal hover:text-dxtr-teal active:scale-[0.98] transition-all text-sm text-center inline-block cursor-pointer"
          >
            Clinician
          </Link>
          <Link 
            href="/patient" 
            className="w-full sm:w-auto px-8 py-3 border border-gray-300 rounded text-gray-500 hover:border-dxtr-teal hover:text-dxtr-teal active:scale-[0.98] transition-all text-sm text-center inline-block cursor-pointer"
          >
            User
          </Link>
        </div>
      </div>
    </div>
  );
}
