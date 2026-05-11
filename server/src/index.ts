import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import predictionRoutes from './routes/predictions.js';
import * as cron from './cron.js';
import { syncMatchesFromApi } from './services/matchSync.js';

const app = express();
const PORT = process.env.PORT || 3000;

// Configure CORS to allow requests from the web container and external origins
const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // Allow requests from the web container (Docker network)
    const allowedOrigins = [
      'http://server:5173',
      'http://localhost:5173',
      'https://poule.ricjuh.nl'
    ];
    
    // Allow requests without origin (like Postman or curl)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.includes(origin) || process.env.CORS_ORIGIN === '*') {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
};

app.use(cors(corsOptions));
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

async function startServer() {
  await initDb();

  // Sync matches from FIFA API if database is empty
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT COUNT(*) as count FROM matches');
    stmt.step();
    const result = stmt.getAsObject() as any;
    stmt.free();

    if (result.count === 0) {
      console.log('Database is empty, syncing matches from FIFA API...');
      await syncMatchesFromApi();
      console.log('Match sync completed');
    }
  } catch (error) {
    console.error('Error checking/syncing matches:', error);
  }

  app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: ${process.cwd()}/data/database.sqlite`);
  });

  cron.start();

  process.on('SIGINT', () => {
    cron.stop();
    process.exit(0);
  });
}

startServer();
