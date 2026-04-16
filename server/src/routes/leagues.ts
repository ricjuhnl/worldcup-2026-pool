import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

const generateInviteCode = (): string => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
};

const generateSlug = (name: string): string => {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
};

router.get('/:slug', async (req: Request, res: Response) => {
  try {
    const { slug } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare('SELECT * FROM leagues WHERE slug = ?');
    stmt.bind([slug as string]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'League not found' });
    }
    
    const league = stmt.getAsObject() as any;
    stmt.free();
    
    // Get member count
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM league_members WHERE league_id = ?');
    countStmt.bind([league.id]);
    countStmt.step();
    const memberCount = countStmt.getAsObject() as any;
    countStmt.free();
    
    res.json({ ...league, member_count: memberCount.count });
  } catch (error) {
    console.error('Error getting league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/join/:code', async (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare('SELECT * FROM leagues WHERE invite_code = ?');
    stmt.bind([(code as string).toUpperCase()]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'League not found' });
    }
    
    const league = stmt.getAsObject() as any;
    stmt.free();
    
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM league_members WHERE league_id = ?');
    countStmt.bind([league.id]);
    countStmt.step();
    const memberCount = countStmt.getAsObject() as any;
    countStmt.free();
    
    res.json({ ...league, member_count: memberCount.count });
  } catch (error) {
    console.error('Error getting league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/:id/members', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare(`
      SELECT lm.user_id, u.display_name, u.score
      FROM league_members lm
      JOIN users u ON lm.user_id = u.id
      WHERE lm.league_id = ?
      ORDER BY u.score DESC
    `);
    stmt.bind([id as string]);
    
    const members: any[] = [];
    while (stmt.step()) {
      members.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(members);
  } catch (error) {
    console.error('Error getting league members:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, ownerId, slug, description } = req.body;
    
    if (!name || !ownerId) {
      return res.status(400).json({ error: 'Name and ownerId are required' });
    }
    
    const db = await getDb();
    
    // Check if user exists
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    userStmt.bind([ownerId]);
    const user = userStmt.step() ? userStmt.getAsObject() as any : null;
    userStmt.free();
    
    if (!user) {
      return res.status(404).json({ error: 'Owner not found' });
    }
    
    // Generate slug if not provided
    let leagueSlug = slug || generateSlug(name);
    
    // Check if slug is available
    const existingStmt = db.prepare('SELECT * FROM leagues WHERE slug = ?');
    existingStmt.bind([leagueSlug]);
    const existingLeague = existingStmt.step() ? existingStmt.getAsObject() as any : null;
    existingStmt.free();
    
    if (existingLeague) {
      // Try to make unique slug
      let suffix = 0;
      let uniqueSlug = `${leagueSlug}-${suffix}`;
      while (true) {
        existingStmt.bind([uniqueSlug]);
        if (!existingStmt.step()) {
          existingStmt.free();
          break;
        }
        existingStmt.free();
        suffix++;
        uniqueSlug = `${leagueSlug}-${suffix}`;
      }
      leagueSlug = uniqueSlug;
    }
    
    // Create league
    const inviteCode = generateInviteCode();
    const leagueId = Date.now().toString(36) + Math.random().toString(36).substr(2);
    
    db.run(
      'INSERT INTO leagues (id, name, slug, owner_id, invite_code, description, created_at) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [leagueId, name, leagueSlug, ownerId, inviteCode, description || null, Date.now()]
    );
    
    // Add owner as member
    db.run('INSERT INTO league_members (league_id, user_id) VALUES (?, ?)', [leagueId, ownerId]);
    
    saveDb();
    
    const leagueStmt = db.prepare('SELECT * FROM leagues WHERE id = ?');
    leagueStmt.bind([leagueId]);
    leagueStmt.step();
    const league = leagueStmt.getAsObject() as any;
    leagueStmt.free();
    
    res.status(201).json({ ...league, member_count: 1 });
  } catch (error) {
    console.error('Error creating league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/user/:userId', async (req: Request, res: Response) => {
  try {
    const { userId } = req.params;
    const db = await getDb();
    
    const stmt = db.prepare(`
      SELECT l.*, COUNT(league_members.user_id) as member_count
      FROM leagues l
      JOIN league_members ON l.id = league_members.league_id
      WHERE league_members.user_id = ?
      GROUP BY l.id
      ORDER BY l.created_at DESC
    `);
    stmt.bind([userId as string]);
    
    const leagues: any[] = [];
    while (stmt.step()) {
      leagues.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(leagues);
  } catch (error) {
    console.error('Error getting user leagues:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/:id/join', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
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
    
    // Check if league exists
    const leagueStmt = db.prepare('SELECT * FROM leagues WHERE id = ?');
    leagueStmt.bind([id as string]);
    const league = leagueStmt.step() ? leagueStmt.getAsObject() as any : null;
    leagueStmt.free();
    
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    // Check if already member
    const existingStmt = db.prepare('SELECT * FROM league_members WHERE league_id = ? AND user_id = ?');
    existingStmt.bind([id, userId]);
    const existing = existingStmt.step() ? existingStmt.getAsObject() as any : null;
    existingStmt.free();
    
    if (existing) {
      return res.status(400).json({ error: 'Already a member' });
    }
    
    // Add member
    db.run('INSERT INTO league_members (league_id, user_id) VALUES (?, ?)', [id, userId]);
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error joining league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id/leave', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { userId } = req.body;
    
    if (!userId) {
      return res.status(400).json({ error: 'userId is required' });
    }
    
    const db = await getDb();
    
    // Check if member
    const existingStmt = db.prepare('SELECT * FROM league_members WHERE league_id = ? AND user_id = ?');
    existingStmt.bind([id as string, userId]);
    const existing = existingStmt.step() ? existingStmt.getAsObject() as any : null;
    existingStmt.free();
    
    if (!existing) {
      return res.status(404).json({ error: 'Not a member' });
    }
    
    // Get league
    const leagueStmt = db.prepare('SELECT * FROM leagues WHERE id = ?');
    leagueStmt.bind([id as string]);
    const league = leagueStmt.step() ? leagueStmt.getAsObject() as any : null;
    leagueStmt.free();
    
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    // Check if owner trying to leave
    if (league.owner_id === userId) {
      return res.status(400).json({ error: 'Owner cannot leave league. Delete it instead.' });
    }
    
    // Remove member
    db.run('DELETE FROM league_members WHERE league_id = ? AND user_id = ?', [id, userId]);
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error leaving league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { ownerId } = req.body;
    
    if (!ownerId) {
      return res.status(400).json({ error: 'ownerId is required' });
    }
    
    const db = await getDb();
    
    // Get league
    const leagueStmt = db.prepare('SELECT * FROM leagues WHERE id = ?');
    leagueStmt.bind([id as string]);
    const league = leagueStmt.step() ? leagueStmt.getAsObject() as any : null;
    leagueStmt.free();
    
    if (!league) {
      return res.status(404).json({ error: 'League not found' });
    }
    
    // Check ownership
    if (league.owner_id !== ownerId) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    
    // Delete members
    db.run('DELETE FROM league_members WHERE league_id = ?', [id as string]);
    
    // Delete league
    db.run('DELETE FROM leagues WHERE id = ?', [id as string]);
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting league:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
