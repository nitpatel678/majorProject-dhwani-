# DhwaniAI 🎙️

## AI-Powered Smart Acoustic Public Safety Monitoring System

DhwaniAI is a production-grade platform for detecting dangerous acoustic events in real-time using AI-powered IoT devices and coordinating emergency response through a command center dashboard and mobile responder application.

### 🏗️ Architecture

```
dhwaniai/
├── apps/
│   ├── backend/          # Node.js + Express + Prisma + Socket.io
│   ├── dashboard/        # React + Vite + TailwindCSS + Recharts
│   └── mobile/           # React Native + Expo (coming soon)
├── packages/
│   └── shared/           # Shared TypeScript types & constants
└── README.md
```

### 🛠️ Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React, Vite, TypeScript, TailwindCSS, Framer Motion, Recharts, React Leaflet |
| Backend | Node.js, Express, TypeScript, Prisma ORM, Socket.io |
| Database | Neon PostgreSQL |
| AI Model | TensorFlow Lite (MobileNetV5-Edge) |
| Storage | Supabase Storage |
| Auth | JWT |

### 🎯 AI Model

The DhwaniAI model detects 7 acoustic event classes:

| Class | Description |
|-------|-------------|
| SCREAM | Human screams / distress calls |
| GLASS_BREAK | Glass breaking / shattering |
| IMPACT_CRASH | Vehicle crashes / collisions |
| GUNSHOT_EXPLOSION | Gunshots / explosions |
| CROWD_PANIC | Mass crowd panic / stampede |
| SIREN | Emergency vehicle sirens |
| NORMAL | Normal ambient sounds |

**Model Specs:** 16kHz sample rate · 2.5s clips · 64-bin mel spectrogram · 155×64×1 input · MobileNetV2 architecture

### 🚀 Quick Start

```bash
# Backend
cd apps/backend
npm install
npx prisma db push
npx tsx prisma/seed.ts
npm run dev

# Dashboard
cd apps/dashboard
npm install
npm run dev
```

### 🔐 Demo Credentials

- **Admin:** admin@dhwaniai.com / admin123
- **Responder:** arjun.patel@dhwaniai.com / responder123

### 📊 Dashboard Pages

1. **Dashboard Overview** — Real-time stats, charts, system health
2. **Live Monitoring** — Incoming alerts with Socket.io
3. **Device Management** — IoT device CRUD, battery/signal monitoring
4. **Responder Management** — Officer profiles, assignments, performance
5. **Incident Management** — Status pipeline, assign, resolve, escalate
6. **AI Audio Analyzer** — Upload WAV, waveform, AI predictions
7. **Interactive Map** — Leaflet map with device/responder/incident markers
8. **Analytics** — Performance trends, detection stats
9. **Settings** — Model config, thresholds, preferences

### 👤 Authors

Built as a Final Year Major Project.

---

© 2025 DhwaniAI · AI-Powered Safety
