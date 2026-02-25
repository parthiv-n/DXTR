import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DXTR - Stroke Rehabilitation",
  description: "Stroke rehabilitation web app with sensor-based tracking",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" data-theme="dxtr">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-screen bg-base-200">{children}</body>
    </html>
  );
}
