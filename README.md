# FIFA World Cup 2026 Pool

A betting pool web application for the FIFA World Cup 2026. Built with React, TypeScript, and a lightweight SQLite backend.

> ℹ️ **This is a fork** of the original project [ionmx/worldcup-2026-pool](https://github.com/ionmx/worldcup-2026-pool), modified to remove Firebase dependencies and use a simple SQLite backend instead.

> [!NOTE]
> 🚧 **Status:** Currently in public beta testing.

## Features

- 🔐 Simple username authentication (no Google/Firebase required)
- ⚽ Match predictions with real-time scoring
- 🏆 Global and private league leaderboards
- 👥 Create and join private leagues with invite links
- 📱 PWA support (installable on mobile)
- 🎯 Points system: exact score (15pts), correct result (max 10pts), wrong result (0pts)
- ⏰ Prediction deadline: 10 minutes before kickoff

## Tech Stack

- **Frontend:** React 19, TypeScript, Vite, Tailwind CSS v4
- **Backend:** Express.js with SQLite (sql.js)
- **Database:** SQLite (in-memory with persistence)
- **Linting:** ESLint with TypeScript-aware rules, React 19 plugins, Tailwind CSS validation

## Project Structure

```tree
worldcup-2026-pool/
├── web/                    # React frontend application
│   ├── src/
│   │   ├── assets/         # Images, flags, and static assets
│   │   ├── components/
│   │   │   ├── ui/         # Generic reusable components (Button, Card, etc.)
│   │   │   └── features/   # Domain-specific components (Podium, MatchCard, etc.)
│   │   ├── context/        # React context providers (Auth, League, Match)
│   │   ├── hooks/          # Custom React hooks
│   │   ├── routes/         # Page components
│   │   ├── services/       # API client and utilities
│   │   └── utils/          # Helper functions
│   └── ...
├── server/                 # Express.js backend
│   ├── src/
│   │   ├── routes/         # API endpoints (users, predictions, matches)
│   │   ├── services/       # Business logic (match sync, scoring)
│   │   ├── db.ts           # SQLite database setup
│   │   └── index.ts        # Express server entry point
│   └── data/               # SQLite database files (gitignored)
└── utils/                  # Utility scripts
```

## Getting Started

### Prerequisites

- Docker

### Environment Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd worldcup-2026-pool
```

## Deploying with Docker

The easiest way to run both the frontend and backend together is with Docker Compose:

```bash
# Build and start all services
docker compose up -d --build

# View logs
docker compose logs -f

# Stop services
docker compose down
```

This will start:

- **Backend**: http://localhost:3000
- **Frontend**: http://localhost:5173

The database is persisted in `./server/data` directory.

The server will:

- Create the SQLite database automatically on first run
- Sync match data from FIFA API
- Run a cron job every 10 minutes to update scores

## Code Conventions

- **2-space indentation** across all files
- **Named exports** for all components and modules
- **Barrel files** (`index.ts`) for clean imports
- **PascalCase** for component and route file names
- **TypeScript strict mode** enabled

## Contributing

Contributions are welcome! Feel free to open a Pull Request.

## License

MIT License - see [LICENSE](LICENSE) for details.
