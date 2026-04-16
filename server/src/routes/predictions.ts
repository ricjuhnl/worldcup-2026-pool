import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

router.get('/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare('SELECT * FROM predictions WHERE user_id = ? ORDER BY game');
    stmt.bind([userId as string]);
    
    const predictions: any[] = [];
    while (stmt.step()) {
      predictions.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(predictions);
  } catch (error) {
    console.error('Error getting predictions:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:userId/:game', async (req: Request, res: Response) => {
  try {
    const { userId, game } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND game = ?');
    stmt.bind([userId as string, parseInt(game as string)]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'Prediction not found' });
    }
    
    const prediction = stmt.getAsObject() as any;
    stmt.free();
    
    res.json(prediction);
  } catch (error) {
    console.error('Error getting prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { userId, game, homePrediction, awayPrediction } = req.body;
    
    if (!userId || !game || homePrediction === undefined || awayPrediction === undefined) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    if (homePrediction < 0 || homePrediction > 99 || awayPrediction < 0 || awayPrediction > 99) {
      return res.status(400).json({ error: 'Prediction must be between 0 and 99' });
    }
    
    const db = await getDb();
    
    // Check if user exists
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    userStmt.bind([userId]);
    const user = userStmt.step() ? userStmt.getAsObject() as any : null;
    userStmt.free();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if match exists
    const matchStmt = db.prepare('SELECT * FROM matches WHERE game = ?');
    matchStmt.bind([parseInt(game)]);
    const match = matchStmt.step() ? matchStmt.getAsObject() as any : null;
    matchStmt.free();
    
    if (!match) {
      return res.status(404).json({ error: 'Match not found' });
    }
    
    // Check if match hasn't started (prevent editing after kickoff)
    if (match.home_score >= 0) {
      return res.status(400).json({ error: 'Match has already started' });
    }
    
    // Upsert prediction
    db.run(`
      INSERT INTO predictions (user_id, game, home_prediction, away_prediction, points, updated_at)
      VALUES (?, ?, ?, ?, 0, ?)
      ON CONFLICT(user_id, game) DO UPDATE SET
        home_prediction = excluded.home_prediction,
        away_prediction = excluded.away_prediction,
        updated_at = excluded.updated_at
    `, [userId, parseInt(game), homePrediction, awayPrediction, Date.now()]);
    
    saveDb();
    
    const predictionStmt = db.prepare('SELECT * FROM predictions WHERE user_id = ? AND game = ?');
    predictionStmt.bind([userId, parseInt(game)]);
    const prediction = predictionStmt.step() ? predictionStmt.getAsObject() as any : null;
    predictionStmt.free();
    
    res.json(prediction);
  } catch (error) {
    console.error('Error saving prediction:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
