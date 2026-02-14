# RoboLens — Vision-Guided Multi-Robot Coordination System

> An "air traffic control system" for autonomous robot fleets. RoboLens uses an overhead vision simulation layer + Gemini AI reasoning to dynamically assign tasks to multiple robots in a warehouse simulation.

**One-sentence pitch:** RoboLens is a vision-guided orchestration layer that transforms overhead cameras into a centralized intelligence system coordinating autonomous robot fleets in real time.

![RoboLens Dashboard](./docs/screenshot-placeholder.png)

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    ROBOLENS ARCHITECTURE                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│   ┌──────────────┐    WebSocket     ┌──────────────────┐    │
│   │   Frontend    │◄───────────────►│    Backend        │    │
│   │  React 19 +   │    REST API     │  Node.js/Express  │    │
│   │  TypeScript   │◄───────────────►│  + TypeScript     │    │
│   │  + Vite       │                 │                    │    │
│   │               │                 │  ┌──────────────┐  │    │
│   │ ┌───────────┐ │                 │  │  Simulation   │  │    │
│   │ │ Warehouse │ │                 │  │   Engine      │  │    │
│   │ │  Canvas   │ │                 │  │ ┌──────────┐  │  │    │
│   │ └───────────┘ │                 │  │ │ A* Path  │  │  │    │
│   │ ┌───────────┐ │                 │  │ │ finding  │  │  │    │
│   │ │ ReactFlow │ │                 │  │ └──────────┘  │  │    │
│   │ │ Workflow  │ │                 │  │ ┌──────────┐  │  │    │
│   │ └───────────┘ │                 │  │ │  Task    │  │  │    │
│   │ ┌───────────┐ │                 │  │ │ Manager  │  │  │    │
│   │ │ Recharts  │ │                 │  │ └──────────┘  │  │    │
│   │ │ Analytics │ │                 │  └──────────────┘  │    │
│   │ └───────────┘ │                 │                    │    │
│   └──────────────┘                 │  ┌──────────────┐  │    │
│                                     │  │ Gemini 2.0   │  │    │
│                                     │  │ Flash API    │  │    │
│                                     │  └──────────────┘  │    │
│                                     └──────────────────┘    │
│                                              │               │
│                                     ┌────────▼─────────┐    │
│                                     │   Vultr VM        │    │
│                                     │   Ubuntu 22.04    │    │
│                                     │   + nginx + PM2   │    │
│                                     └──────────────────┘    │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

| Layer      | Technology                                     |
|------------|------------------------------------------------|
| Frontend   | React 19, TypeScript, Vite, Tailwind CSS       |
| Workflow   | ReactFlow                                      |
| Charts     | Recharts                                       |
| State      | Zustand                                        |
| Real-time  | WebSockets (ws)                                |
| Backend    | Node.js, Express, TypeScript                   |
| AI Engine  | Google Gemini 2.0 Flash (@google/generative-ai)|
| Deployment | Vultr VM, nginx, PM2                           |

---

## Quick Start (Local Development)

### Prerequisites
- Node.js 20+
- npm 10+

### 1. Clone the repo
```bash
git clone https://github.com/YOUR_USERNAME/robolens.git
cd robolens
```

### 2. Backend setup
```bash
cd backend
cp .env.example .env
# Edit .env and add your GEMINI_API_KEY
npm install
npm run dev
```

### 3. Frontend setup (new terminal)
```bash
cd frontend
npm install
npm run dev
```

### 4. Open the app
Navigate to `http://localhost:5173`

---

## Vultr VM Deployment

### Step 1: Create Vultr VM
1. Log in to [Vultr](https://www.vultr.com/)
2. Deploy a new Cloud Compute instance:
   - **OS:** Ubuntu 22.04 LTS
   - **Plan:** 2 vCPU, 4GB RAM ($24/mo recommended)
   - **Region:** Choose nearest to your users
3. Note down the IP address

### Step 2: SSH into VM
```bash
ssh root@YOUR_VULTR_IP
```

### Step 3: Run setup script
```bash
# Clone repo
cd /opt
git clone https://github.com/YOUR_USERNAME/robolens.git
cd robolens

# Run automated setup
chmod +x deploy/setup.sh
./deploy/setup.sh
```

### Step 4: Configure environment
```bash
nano /opt/robolens/backend/.env
```

Set these values:
```env
GEMINI_API_KEY=your_actual_gemini_api_key
PORT=3001
NODE_ENV=production
CORS_ORIGIN=http://YOUR_VULTR_IP
SIMULATION_TICK_MS=100
```

### Step 5: Restart backend
```bash
pm2 restart robolens-backend
```

### Step 6: Access the app
Open `http://YOUR_VULTR_IP` in your browser.

---

## Environment Variables

### Backend (.env)
| Variable           | Description                    | Default                  |
|--------------------|--------------------------------|--------------------------|
| `GEMINI_API_KEY`   | Google Gemini API key          | (required)               |
| `PORT`             | Backend server port            | `3001`                   |
| `NODE_ENV`         | Environment mode               | `development`            |
| `CORS_ORIGIN`      | Allowed frontend origin        | `http://localhost:5173`  |
| `SIMULATION_TICK_MS`| Simulation loop interval (ms) | `100`                    |

### Frontend (Vite env)
| Variable               | Description              | Default                    |
|------------------------|--------------------------|----------------------------|
| `VITE_BACKEND_WS_URL`  | WebSocket backend URL    | `ws://localhost:3001`      |
| `VITE_BACKEND_API_URL`  | REST API backend URL    | `http://localhost:3001`    |

---

## REST API Documentation

### `GET /api/health`
Health check endpoint.
```json
{
  "status": "operational",
  "uptime": 3600,
  "vultr": true,
  "message": "Powered by Vultr",
  "timestamp": 1700000000000
}
```

### `GET /api/state`
Full warehouse state snapshot. Returns all robots, events, grid, metrics.

### `POST /api/event`
Trigger a manual simulation event.
```json
{
  "type": "PACKAGE_DROP | SPILL | HUMAN_ENTRY | CONGESTION | BATTERY_LOW",
  "location": { "x": 10, "y": 7 }
}
```

### `POST /api/robot/:id/command`
Send a command to a specific robot.
```json
{
  "command": "move | pause | resume | recharge",
  "params": { "destination": { "x": 5, "y": 10 } }
}
```

### `GET /api/logs`
Get last 100 event logs. Supports `?limit=N` query parameter.

### `POST /api/gemini/analyze`
Send current state to Gemini for AI analysis.
```json
{
  "event": {
    "type": "PACKAGE_DROP",
    "location": { "x": 10, "y": 7 },
    "description": "Package detected"
  }
}
```

### `GET /api/metrics`
Get simulation KPIs: tasks completed, avg response time, efficiency %.

---

## WebSocket API Documentation

### Server → Client Events

| Event              | Payload                                            |
|--------------------|----------------------------------------------------|
| `robot:update`     | `RobotData` — position, state, battery, task       |
| `event:new`        | `SimulationEvent` — type, location, priority       |
| `gemini:response`  | `GeminiResponse` — reasoning, assignments, alerts  |
| `metrics:update`   | `SimulationMetrics` — KPIs                         |
| `task:assigned`    | `{taskId, robotId, taskType, location}`            |
| `task:completed`   | `{taskId, robotId, duration}`                      |
| `alert:safety`     | `{message, zone, severity}`                        |
| `state:full`       | Full `WarehouseState` snapshot                     |
| `workflow:execute` | `{nodeId, status}` — workflow node execution       |

### Client → Server Events

| Event               | Payload                                  |
|---------------------|------------------------------------------|
| `robot:manual`      | `{robotId, destination: {x, y}}`         |
| `event:trigger`     | `{type, location?}`                      |
| `workflow:activate`  | `{workflowId, active}`                  |
| `simulation:speed`   | `{multiplier: 0.5 \| 1 \| 2 \| 4}`    |

---

## Features

- **2D Warehouse Simulation**: Animated 20x15 grid with 4 zones, obstacles, and smooth robot movement
- **4 Autonomous Robots**: A* pathfinding, battery management, task queues, collision avoidance
- **Gemini AI Reasoning**: Real-time task allocation decisions with Gemini 2.0 Flash
- **Visual Workflow Builder**: ReactFlow-based drag-and-drop automation rules
- **Real-time Dashboard**: WebSocket-powered live updates, robot status cards, event log
- **Analytics**: Task history charts, robot utilization, efficiency metrics

---

## License

Built for the AI Meets Robotics Hackathon. Powered by Vultr + Gemini.
