"use client";

import { Sidebar } from "./Sidebar";

type AppShellProps = {
  children: React.ReactNode;
  variant: "patient" | "clinician";
};

export function AppShell({ children, variant }: AppShellProps) {
  return (
    <div className="min-h-screen bg-white">
      <Sidebar variant={variant} />

      {/* Main content area - responsive margin */}
      <div className="md:ml-14">
        {/* Page content - responsive padding */}
        <main className="p-4 pt-16 md:pt-4 md:p-6">{children}</main>
      </div>
    </div>
  );
}
