# FIFA World Cup 2026 Pool

A betting pool web application for the FIFA World Cup 2026. Built with React, TypeScript, and a lightweight SQLite backend.

### 🚀 **Play Now**

Join the action live at **[worldcup-2026.web.app](https://worldcup-2026.web.app/)**!

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

```
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

- Node.js (v18+)
- npm or yarn

### Environment Setup

1. Clone the repository:

```bash
git clone <repository-url>
cd worldcup-2026-pool
```

2. Install dependencies:

```bash
# Install root dependencies
npm install

# Install web dependencies
cd web && npm install

# Install server dependencies
cd ../server && npm install
```

3. Set up environment variables for the web app:

```bash
cd web
cp .env.example .env
```

4. Configure the API URL in `web/.env`:

```env
VITE_API_URL=http://localhost:3000/api
```

For production, update this to your backend URL.

## Development

### Web Application

```bash
cd web

# Start development server
npm run dev

# Run linting
npm run lint

# Build for production
npm run build

# Preview production build
npm run preview
```

### Server

```bash
cd server

# Start development server with hot reload
npm run dev

# Build for production
npm run build

# Start production server
npm run start
```

The server will:
- Create the SQLite database automatically on first run
- Sync match data from FIFA API
- Run a cron job every 10 minutes to update scores

### Deploying to Firebase Hosting

The web app can be deployed to Firebase Hosting, but note that you'll need to host the backend separately (e.g., Railway, Render, Heroku) since Firebase Hosting is static-only.

```bash
# Build the web app
cd web && npm run build

# Deploy to Firebase Hosting
firebase deploy --only hosting
```

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
