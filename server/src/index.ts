import express from 'express';
import cors from 'cors';
import { initDb, getDb } from './db.js';
import userRoutes from './routes/users.js';
import matchRoutes from './routes/matches.js';
import predictionRoutes from './routes/predictions.js';
import leagueRoutes from './routes/leagues.js';
import * as cron from './cron.js';
import { syncMatchesFromApi } from './services/matchSync.js';

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

app.use('/api/users', userRoutes);
app.use('/api/matches', matchRoutes);
app.use('/api/predictions', predictionRoutes);
app.use('/api/leagues', leagueRoutes);

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
