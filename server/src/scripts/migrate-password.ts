import { getDb, saveDb } from '../db.js';

async function addPasswordHashColumn() {
  console.log('Adding password_hash column to users table...');
  
  const db = await getDb();
  
  try {
    // Check if column already exists
    const tableInfo = db.prepare("PRAGMA table_info(users)");
    const columns: any[] = [];
    while (tableInfo.step()) {
      columns.push(tableInfo.getAsObject() as any);
    }
    tableInfo.free();
    
    const hasPasswordHash = columns.some(col => col.name === 'password_hash');
    
    if (hasPasswordHash) {
      console.log('password_hash column already exists');
      return;
    }
    
    // Add the column
    db.run('ALTER TABLE users ADD COLUMN password_hash TEXT');
    
    // IMPORTANT: Save the database to persist the changes
    saveDb();
    
    console.log('Successfully added password_hash column and saved database');
    
  } catch (error) {
    console.error('Error adding column:', error);
    throw error;
  }
}

addPasswordHashColumn()
  .then(() => {
    console.log('Migration completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Migration failed:', error);
    process.exit(1);
  });
