"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PenLine, User, BarChart2, Menu, X, Home, type LucideIcon } from "lucide-react";
import { useState } from "react";

type NavItem = {
  href: string;
  icon: LucideIcon;
  label: string;
};

const patientNavItems: NavItem[] = [
  { href: "/patient", icon: Home, label: "Dashboard" },
  { href: "/", icon: User, label: "Switch Role" },
];

const clinicianNavItems: NavItem[] = [
  { href: "/clinician", icon: PenLine, label: "Dashboard" },
  { href: "#", icon: User, label: "Patients" },
  { href: "#", icon: BarChart2, label: "Analytics" },
  { href: "/", icon: Home, label: "Switch Role" },
];

export function Sidebar({ variant }: { variant: "patient" | "clinician" }) {
  const pathname = usePathname();
  const navItems = variant === "patient" ? patientNavItems : clinicianNavItems;
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <>
      {/* Mobile menu button */}
      <button
        onClick={() => setMobileOpen(!mobileOpen)}
        className="md:hidden fixed top-4 left-4 z-[60] w-10 h-10 bg-dxtr-teal rounded-lg flex items-center justify-center text-white shadow-lg"
      >
        {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="md:hidden fixed inset-0 bg-black/50 z-40"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar - hidden on mobile unless open */}
      <aside
        className={`fixed left-0 top-0 h-full w-14 bg-dxtr-teal flex flex-col items-center pt-4 z-50 transition-transform duration-300 ${
          mobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0"
        }`}
      >
        {/* Navigation icons */}
        <nav className="flex flex-col gap-4 mt-12 md:mt-0">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;

            return (
              <Link
                key={item.href + item.label}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className="flex flex-col items-center gap-1"
                title={item.label}
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center transition-colors ${
                    isActive ? "bg-white/20 text-white" : "text-white/80 hover:text-white hover:bg-white/10"
                  }`}
                >
                  <Icon className="w-5 h-5" strokeWidth={1.5} />
                </div>
                <span className="text-[9px] text-white/80">{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </aside>
    </>
  );
}
