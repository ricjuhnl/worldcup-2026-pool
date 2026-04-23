import initSqlJs from 'sql.js';
import { readFileSync, writeFileSync } from 'fs';

async function main() {
  const SQL = await initSqlJs();
  const db = new SQL.Database(readFileSync('./data/database.sqlite'));

  // Set match 1 outcome: Mexico 2 - 1 South Africa
  console.log('Setting match 1 outcome: Mexico 2 - 1 South Africa');
  db.run('UPDATE matches SET home_score = 2, away_score = 1 WHERE game = 1');

  // Update prediction for match 1 to get a correct winner (predict home win)
  console.log('Updating prediction for match 1 to 2-0 (home win)');
  db.run('UPDATE predictions SET home_prediction = 2, away_prediction = 0 WHERE user_id = \'ricjuh\' AND game = 1');

  console.log('Running scoring logic...');

  // Recalculate points
  const matchesStmt = db.prepare('SELECT * FROM matches WHERE home_score >= 0 AND away_score >= 0');
  const matches: any[] = [];
  while (matchesStmt.step()) {
    matches.push(matchesStmt.getAsObject());
  }
  matchesStmt.free();

  const winner = (home: number, away: number) => {
    if (home > away) return 'home';
    if (home < away) return 'away';
    return 'tied';
  };

  const calculatePoints = (
    homeScore: number,
    awayScore: number,
    homePrediction: number | null,
    awayPrediction: number | null
  ): number => {
    if (homeScore < 0 || homePrediction === null || awayPrediction === null) {
      return 0;
    }

    if (homeScore === homePrediction && awayScore === awayPrediction) {
      return 15;
    }

    if (winner(homeScore, awayScore) === winner(homePrediction, awayPrediction)) {
      const difference = Math.abs(homePrediction - homeScore) + Math.abs(awayPrediction - awayScore);
      return Math.max(0, 10 - difference);
    }

    return 0;
  };

  for (const match of matches) {
    const predStmt = db.prepare('SELECT * FROM predictions WHERE game = ?');
    predStmt.bind([match.game]);

    while (predStmt.step()) {
      const prediction = predStmt.getAsObject() as any;
      const points = calculatePoints(
        match.home_score,
        match.away_score,
        prediction.home_prediction,
        prediction.away_prediction
      );

      console.log(`Match ${match.game}: ${match.home_team} ${match.home_score} - ${match.away_score} ${match.away_team}`);
      console.log(`  Prediction: ${prediction.home_prediction}-${prediction.away_prediction}`);
      console.log(`  Points: ${points}`);

      if (prediction.points !== points) {
        db.run('UPDATE predictions SET points = ? WHERE user_id = ? AND game = ?', [
          points,
          prediction.user_id,
          match.game
        ]);
        console.log(`  Updated points from ${prediction.points} to ${points}`);
      }
    }
    predStmt.free();
  }

  // Update user score
  const userStmt = db.prepare('SELECT * FROM users WHERE id = ?', ['ricjuh']);
  if (userStmt.step()) {
    const user = userStmt.getAsObject() as any;
    userStmt.free();

    const totalStmt = db.prepare('SELECT COALESCE(SUM(points), 0) as total FROM predictions WHERE user_id = ?', [user.id]);
    totalStmt.step();
    const totalScore = totalStmt.getAsObject() as any;
    totalStmt.free();

    console.log(`\nUser ${user.display_name} total score: ${totalScore.total}`);

    if (user.score !== totalScore.total) {
      db.run('UPDATE users SET score = ? WHERE id = ?', [totalScore.total, user.id]);
      console.log(`Updated user score from ${user.score} to ${totalScore.total}`);
    }
  }

  // Save to a new file since we don't have permission to overwrite the original
  writeFileSync('./data/database-test.sqlite', db.export());
  console.log('\nDone! Test database written to ./data/database-test.sqlite');
  
  // Also export the updated predictions
  const updatedPredsStmt = db.prepare('SELECT * FROM predictions WHERE user_id = \'ricjuh\'');
  const updatedPreds: any[] = [];
  while (updatedPredsStmt.step()) {
    updatedPreds.push(updatedPredsStmt.getAsObject());
  }
  updatedPredsStmt.free();
  console.log('\nUpdated predictions:', JSON.stringify(updatedPreds, null, 2));

  db.close();
}

main().catch(console.error);
