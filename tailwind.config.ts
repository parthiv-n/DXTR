import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        // Exact DXTR colors from Figma
        "dxtr-teal": "#c2e1a5",           // Main green - sidebar/headings
        "dxtr-brown": "#6B5344",          // Brown text from Welcome page
        "dxtr-brown-light": "#8B7355",    // Lighter brown for subtitles
        "dxtr-gold": "#F5D76E",           // Yellow bar at bottom
        "dxtr-green": "#7BC47F",          // Green for pronation gauge
        "dxtr-blue": "#5BB5CF",           // Blue for supination gauge  
        "dxtr-orange": "#E8734A",         // Orange for task items
        "dxtr-yellow-task": "#F4D03F",    // Yellow for task items
        "dxtr-blue-task": "#5DADE2",      // Blue for task items
        "dxtr-chart-green": "#82C785",    // Chart bar green
        "dxtr-chart-yellow": "#F7DC6F",   // Chart bar yellow
      },
    },
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      {
        dxtr: {
          "primary": "#c2e1a5",
          "primary-content": "#ffffff",
          "secondary": "#5BB5CF",
          "secondary-content": "#ffffff",
          "accent": "#F5D76E",
          "accent-content": "#6B5344",
          "neutral": "#6B5344",
          "neutral-content": "#ffffff",
          "base-100": "#FFFFFF",
          "base-200": "#F8F8F8",
          "base-300": "#EEEEEE",
          "base-content": "#4A4A4A",
          "info": "#5BB5CF",
          "success": "#7BC47F",
          "warning": "#F5D76E",
          "error": "#E8734A",
        },
      },
    ],
  },
};

export default config;
