# Portfolio Gateway - Monorepo

A modern web application featuring real-time chat, voice communication, games, and admin tools built with a hybrid serverless + dedicated server architecture.

## 🏗️ Architecture

```
┌─────────────────┐    ┌─────────────────┐
│   Frontend      │    │   Game Server   │
│   (Vercel)      │◄──►│   (Railway)     │
│                 │    │                 │
│ • Next.js 14    │    │ • Node.js       │
│ • React         │    │ • Socket.io     │
│ • Tailwind CSS  │    │ • Matter.js     │
│ • Supabase      │    │ • Express       │
└─────────────────┘    └─────────────────┘
```

## 📁 Project Structure

```
portfolio-gateway/
├── packages/
│   ├── frontend/           # Next.js frontend (Vercel)
│   │   ├── app/           # Next.js app router
│   │   ├── lib/           # Frontend utilities
│   │   └── package.json   # Frontend dependencies
│   │
│   ├── game-server/       # Real-time game server (Railway)
│   │   ├── src/
│   │   │   ├── game/      # Game logic
│   │   │   ├── physics/   # Physics engine
│   │   │   └── server.ts  # Express + Socket.io server
│   │   └── package.json   # Server dependencies
│   │
│   └── shared/            # Shared types and constants
│       ├── types/         # TypeScript definitions
│       └── constants/     # Game constants
│
├── package.json           # Workspace configuration
└── README.md
```

## 🚀 Development

### Prerequisites

- Node.js 18+
- npm 9+

### Setup

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd portfolio-gateway
   ```

2. **Install dependencies:**
   ```bash
   npm run install:all
   ```

3. **Environment Setup:**
   
   **Frontend (.env.local):**
   ```bash
   cp packages/frontend/.env.local.example packages/frontend/.env.local
   # Edit with your Supabase credentials
   ```
   
   **Game Server (.env):**
   ```bash
   cp packages/game-server/.env.example packages/game-server/.env
   # Edit with your configuration
   ```

4. **Start Development Servers:**
   
   **Frontend only:**
   ```bash
   npm run dev
   ```
   
   **Game server only:**
   ```bash
   npm run dev:server
   ```
   
   **Both simultaneously:**
   ```bash
   npm run dev:all
   ```

## 🎮 Features

### Frontend (Vercel)
- **Authentication System**: SHA-256 secure user management
- **Real-time Chat**: Supabase Realtime messaging
- **Voice Chat**: WebRTC P2P communication
- **Admin Panel**: User and content management
- **Hacker Simulator**: Typing game with DOS terminal theme
- **Responsive Design**: Mobile-optimized interface

### Game Server (Railway)
- **Zero-G Combat**: Real-time multiplayer space combat
- **60fps Game Loop**: Server-authoritative physics
- **Room System**: Create/join game rooms with codes
- **Real-time Sync**: Socket.io WebSocket communication
- **Physics Engine**: Matter.js integration
- **Auto-scaling**: Railway container deployment

## 🚢 Deployment

### Frontend (Vercel)

1. **Connect to Vercel:**
   - Import project from GitHub
   - Set build command: `npm run build:frontend`
   - Set output directory: `packages/frontend/.next`

2. **Environment Variables:**
   ```
   NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_key
   NEXT_PUBLIC_GAME_SERVER_URL=your_railway_url
   ```

### Game Server (Railway)

1. **Connect to Railway:**
   - Import project from GitHub
   - Set root directory: `packages/game-server`
   - Build command: `npm run build`
   - Start command: `npm start`

2. **Environment Variables:**
   ```
   FRONTEND_URL=your_vercel_url
   NODE_ENV=production
   ```

## 🛠️ Development Commands

```bash
# Development
npm run dev              # Start frontend dev server
npm run dev:server       # Start game server dev
npm run dev:all          # Start both servers

# Building
npm run build            # Build all packages
npm run build:frontend   # Build frontend only
npm run build:server     # Build game server only

# Dependencies
npm run install:all      # Install all dependencies
```

## 🎮 Zero-G Combat Game

Real-time multiplayer space combat game with:

- **8-player battles**: Simultaneous multiplayer combat
- **Physics-based movement**: Zero gravity with momentum
- **Room system**: Private rooms with 6-digit codes
- **Real-time sync**: 60fps server-authoritative gameplay
- **Fair spawning**: 8-direction distributed spawn points

### Controls
- **A/D**: Rotate spaceship
- **SPACE**: Apply thrust
- **Goal**: Last ship standing wins!

## 🔧 Technical Details

### Frontend Stack
- **Framework**: Next.js 14 with App Router
- **Styling**: Tailwind CSS with retro terminal theme
- **Database**: Supabase PostgreSQL with Realtime
- **Authentication**: Custom SHA-256 hash system
- **Deployment**: Vercel serverless

### Game Server Stack
- **Runtime**: Node.js with TypeScript
- **WebSocket**: Socket.io for real-time communication
- **Physics**: Matter.js for server-side simulation
- **Framework**: Express.js for REST endpoints
- **Deployment**: Railway containers

### Shared Libraries
- **Types**: Common TypeScript interfaces
- **Constants**: Game configuration values
- **Utilities**: Shared helper functions

## 📝 Contributing

1. Create feature branch from `development`
2. Make changes in appropriate package
3. Test both frontend and server
4. Submit PR to `development` branch

## 📄 License

MIT License - see LICENSE file for details.

---

**Live Demo**: [Portfolio Gateway Frontend](https://your-vercel-url.vercel.app)  
**Game Server**: [Railway Backend](https://your-railway-url.up.railway.app)
