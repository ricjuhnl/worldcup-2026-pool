import { Router, Request, Response } from 'express';
import { getDb, saveDb } from '../db.js';

const router = Router();

const normalizeUsername = (username: string) => username.toLowerCase().replace(/\./g, '');

router.get('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const normalizedUsername = normalizeUsername(username as string);
    
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    stmt.bind([normalizedUsername]);
    
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = stmt.getAsObject() as any;
    stmt.free();
    
    res.json(user);
  } catch (error) {
    console.error('Error getting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.post('/', async (req: Request, res: Response) => {
  try {
    const { username, displayName } = req.body;
    
    if (!username || username.length < 3) {
      return res.status(400).json({ error: 'Username must be at least 3 characters' });
    }
    
    if (!displayName) {
      return res.status(400).json({ error: 'Display name is required' });
    }
    
    const normalizedUsername = normalizeUsername(username);
    const reservedUsernames = ['about', 'leaderboard', 'rules', 'edit-profile', 'editprofile', 'admin', 'api', 'settings', 'login', 'signin', 'signup', 'register', 'logout', 'signout', 'profile', 'user', 'users', 'club', 'clubs', 'league', 'leagues'];
    
    if (reservedUsernames.includes(normalizedUsername)) {
      return res.status(400).json({ error: 'Username is reserved' });
    }
    
    const db = await getDb();
    
    // Check if user exists
    const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    checkStmt.bind([normalizedUsername]);
    const existingUser = checkStmt.step() ? checkStmt.getAsObject() as any : null;
    checkStmt.free();
    
    if (existingUser) {
      return res.json(existingUser);
    }
    
    // Check if this is the first user (make them admin)
    const countStmt = db.prepare('SELECT COUNT(*) as count FROM users');
    countStmt.step();
    const userCount = countStmt.getAsObject() as any;
    countStmt.free();
    const isAdmin = userCount.count === 0 ? 1 : 0;
    
    // Create user
    const avatarInitials = displayName
      .split(' ')
      .map((n: string) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
    
    db.run(
      'INSERT INTO users (id, display_name, avatar_initials, score, created_at, is_admin) VALUES (?, ?, ?, 0, ?, ?)',
      [normalizedUsername, displayName, avatarInitials, Date.now(), isAdmin]
    );
    
    saveDb();
    
    const newUserStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    newUserStmt.bind([normalizedUsername]);
    const newUser = newUserStmt.step() ? newUserStmt.getAsObject() as any : null;
    newUserStmt.free();
    
    res.status(201).json(newUser);
  } catch (error) {
    console.error('Error creating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.get('/', async (req: Request, res: Response) => {
  try {
    const db = await getDb();
    const stmt = db.prepare('SELECT * FROM users ORDER BY score DESC');
    const users: any[] = [];
    
    while (stmt.step()) {
      users.push(stmt.getAsObject());
    }
    stmt.free();
    
    res.json(users);
  } catch (error) {
    console.error('Error getting users:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.put('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const { displayName, newUsername } = req.body;
    
    const normalizedOldUsername = normalizeUsername(username as string);
    const db = await getDb();
    
    // Get user
    const userStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    userStmt.bind([normalizedOldUsername]);
    const user = userStmt.step() ? userStmt.getAsObject() as any : null;
    userStmt.free();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const updates: string[] = [];
    const params: any[] = [];
    
    if (displayName) {
      updates.push('display_name = ?');
      params.push(displayName);
      
      const avatarInitials = displayName
        .split(' ')
        .map((n: string) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2);
      updates.push('avatar_initials = ?');
      params.push(avatarInitials);
    }
    
    if (newUsername && newUsername !== username) {
      const normalizedNewUsername = normalizeUsername(newUsername as string);
      const reservedUsernames = ['about', 'leaderboard', 'rules', 'edit-profile', 'editprofile', 'admin', 'api', 'settings', 'login', 'signin', 'signup', 'register', 'logout', 'signout', 'profile', 'user', 'users', 'club', 'clubs', 'league', 'leagues'];
      
      if (reservedUsernames.includes(normalizedNewUsername)) {
        return res.status(400).json({ error: 'Username is reserved' });
      }
      
      // Check if new username is available
      const existingStmt = db.prepare('SELECT * FROM users WHERE id = ?');
      existingStmt.bind([normalizedNewUsername]);
      const existingUser = existingStmt.step() ? existingStmt.getAsObject() as any : null;
      existingStmt.free();
      
      if (existingUser) {
        return res.status(400).json({ error: 'Username is already taken' });
      }
      
      updates.push('id = ?');
      params.push(normalizedNewUsername);
    }
    
    if (updates.length > 0) {
      params.push(normalizedOldUsername);
      db.run(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params);
      saveDb();
    }
    
    const finalUsername = newUsername ? normalizeUsername(newUsername as string) : normalizedOldUsername;
    const updatedStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    updatedStmt.bind([finalUsername]);
    const updatedUser = updatedStmt.step() ? updatedStmt.getAsObject() as any : null;
    updatedStmt.free();
    
    res.json(updatedUser);
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

router.delete('/:username', async (req: Request, res: Response) => {
  try {
    const { username } = req.params;
    const normalizedUsername = normalizeUsername(username as string);
    
    const db = await getDb();
    
    // Check if user exists
    const checkStmt = db.prepare('SELECT * FROM users WHERE id = ?');
    checkStmt.bind([normalizedUsername]);
    const user = checkStmt.step() ? checkStmt.getAsObject() as any : null;
    checkStmt.free();
    
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Delete league memberships
    db.run('DELETE FROM league_members WHERE user_id = ?', [normalizedUsername]);
    
    // Delete leagues owned by user
    const ownedStmt = db.prepare('SELECT id FROM leagues WHERE owner_id = ?');
    ownedStmt.bind([normalizedUsername]);
    const ownedLeagues: string[] = [];
    while (ownedStmt.step()) {
      const row = ownedStmt.getAsObject() as any;
      ownedLeagues.push(row.id);
    }
    ownedStmt.free();
    
    for (const leagueId of ownedLeagues) {
      db.run('DELETE FROM league_members WHERE league_id = ?', [leagueId]);
      db.run('DELETE FROM leagues WHERE id = ?', [leagueId]);
    }
    
    // Delete predictions
    db.run('DELETE FROM predictions WHERE user_id = ?', [normalizedUsername]);
    
    // Delete user
    db.run('DELETE FROM users WHERE id = ?', [normalizedUsername]);
    saveDb();
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

export default router;
