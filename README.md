# DXTR - Stroke Rehabilitation Platform

A working prototype web application for stroke rehabilitation with sensor-based tracking and session analytics.

## Tech Stack

- **Frontend**: Next.js 14 (App Router), React, TypeScript
- **Styling**: TailwindCSS + daisyUI
- **Charts**: Recharts
- **Database**: SQLite with Prisma ORM
- **Device Integration**: Web Serial API (USB-C), Simulator

## Quick Start

```bash
# Install dependencies
npm install

# Generate Prisma client and run migrations
npx prisma migrate dev

# Seed the database with initial data
npx prisma db seed

# Start development server
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000) in your browser.

## Project Structure

```
app/
  page.tsx                    # Welcome/role selection
  patient/page.tsx            # Patient mission dashboard
  patient/game/[id]/page.tsx  # Game session with device
  clinician/page.tsx          # Clinician analytics dashboard
  api/
    patients/                 # Patient list API
    patients/[id]/dashboard/  # Clinician dashboard metrics
    patients/[id]/plan/       # Mission plan CRUD
    sessions/start/           # Start session
    sessions/[id]/chunk/      # Upload session chunks
    sessions/[id]/end/        # End session, compute summary

components/
  layout/                     # AppShell, Sidebar
  dashboard/                  # StatGauge, Radar, Bar, TaskBoard, Schedule cards
  patient/                    # GameTile

lib/
  db/prisma.ts               # Prisma client singleton
  device/simulator.ts        # Mock sensor data generator
  device/uploader.ts         # Session upload manager
  device/webSerial.ts        # Web Serial API wrapper
  analytics/computeSummary.ts # Session analytics
  types.ts                   # TypeScript types
```

## Session Ingestion API

The app uses a transport-agnostic session ingestion API:

### Start Session
```
POST /api/sessions/start
{
  "patientId": "p_edwin",
  "gameId": "coin-grip",
  "source": "sim" | "usb" | "wifi",
  "sampleRateHz": 25,
  "firmwareVersion": "proto-0.1"
}
→ { "sessionId": "uuid", "startedAt": "iso", "chunkIntervalMs": 2000 }
```

### Upload Chunk
```
POST /api/sessions/[id]/chunk
{
  "seq": 0,
  "t0": 0,
  "t1": 2000,
  "samples": [{ t, fsrGrip, fsrThumb, fsrExt, pronationDeg, supinationDeg, wristFlexDeg, wristDevDeg }, ...]
}
→ { "ok": true, "receivedSeq": 0, "deduped": false }
```

### End Session
```
POST /api/sessions/[id]/end
{ "endedAtT": 25000 }
→ {
  "ok": true,
  "summary": {
    "durationMs": 25000,
    "repCount": 18,
    "peakGrip": 0.86,
    "avgGrip": 0.42,
    "romPronation": 52,
    "romSupination": 68,
    "smoothness": 0.73
  }
}
```

## Sample Data Shape

```typescript
type Sample = {
  t: number;           // ms since session start
  fsrGrip: number;     // 0..1 normalized
  fsrThumb: number;    // 0..1 normalized
  fsrExt: number;      // 0..1 normalized
  pronationDeg: number;   // -90..90
  supinationDeg: number;  // -90..90
  wristFlexDeg: number;   // -90..90
  wristDevDeg: number;    // -30..30
};
```

## Device Integration

### Simulated Mode (Default)
Works everywhere. Click "Simulate Device Stream" to generate mock sensor data at 25Hz for 20-40 seconds.

### USB Mode (Web Serial)
Requires Chrome or Edge browser. Connect ESP32 via USB-C, click "Connect via USB", and stream real sensor data.

Expected serial format:
- JSON: `{"t":100,"fsrGrip":0.5,"fsrThumb":0.4,...}`
- CSV: `100,0.5,0.4,0.3,45,-30,20,5`

## Future: Wi-Fi Integration

ESP32 Wi-Fi will call the same `/api/sessions/*` endpoints directly using the same chunk schema. Future additions:

- Wi-Fi provisioning flow
- Device pairing and registration
- Secure device authentication (API keys or JWT)
- OTA firmware updates

## Database

Using SQLite with Prisma for quick prototyping. Data persists in `prisma/dev.db`.

### Key Models
- **Patient**: id, name
- **Session**: patientId, gameId, source, timestamps
- **SessionChunk**: sessionId, seq (unique), samples JSON
- **SessionSummary**: computed metrics (ROM, grip, reps, smoothness)
- **MissionPlan**: patientId, missions JSON

### Seed Data
- Clinician: Dr. Tabish
- Patients: Edwin, Giles, Agatha
- Default mission plans for each patient

## License

Prototype - Internal use only
