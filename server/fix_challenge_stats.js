const db = require('./src/db');
const logger = require('./src/utils/logger');

/**
 * Fix challenge stats for existing users
 * Recalculates stats based on actual completed challenges
 */
async function fixChallengeStats() {
    console.log('🔧 Fixing challenge stats for existing users...\n');

    try {
        // Get all users who have challenge stats
        const usersWithStats = await new Promise((resolve, reject) => {
            db.all('SELECT user_id FROM challenge_stats', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        console.log(`Found ${usersWithStats.length} users with challenge stats\n`);

        for (const { user_id } of usersWithStats) {
            // Get user info
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT username FROM users WHERE id = ?', [user_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            console.log(`Processing user: ${user?.username || user_id}`);

            // Count actual completed challenges where user participated
            const totalChallenges = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT COUNT(DISTINCT c.id) as count 
                     FROM challenges c 
                     WHERE c.status = 'completed' 
                     AND (c.creator_id = ? OR c.opponent_id = ?)`,
                    [user_id, user_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count || 0);
                    }
                );
            });

            // Count wins
            const wins = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT COUNT(*) as count 
                     FROM challenges 
                     WHERE status = 'completed' 
                     AND winner_id = ?`,
                    [user_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count || 0);
                    }
                );
            });

            // Count losses (completed challenges where user participated but didn't win and there was a winner)
            const losses = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT COUNT(*) as count 
                     FROM challenges 
                     WHERE status = 'completed' 
                     AND (creator_id = ? OR opponent_id = ?)
                     AND winner_id IS NOT NULL
                     AND winner_id != ?`,
                    [user_id, user_id, user_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count || 0);
                    }
                );
            });

            // Count draws (completed challenges where user participated but no winner)
            const draws = await new Promise((resolve, reject) => {
                db.get(
                    `SELECT COUNT(*) as count 
                     FROM challenges 
                     WHERE status = 'completed' 
                     AND (creator_id = ? OR opponent_id = ?)
                     AND winner_id IS NULL`,
                    [user_id, user_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row.count || 0);
                    }
                );
            });

            // Calculate current win streak
            // Get user's most recent completed challenges in order
            const recentChallenges = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT id, winner_id 
                     FROM challenges 
                     WHERE status = 'completed' 
                     AND (creator_id = ? OR opponent_id = ?)
                     ORDER BY completed_at DESC
                     LIMIT 20`,
                    [user_id, user_id],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });

            let currentWinStreak = 0;
            for (const challenge of recentChallenges) {
                if (challenge.winner_id === user_id) {
                    currentWinStreak++;
                } else {
                    break; // Streak broken
                }
            }

            // Get old stats for comparison
            const oldStats = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM challenge_stats WHERE user_id = ?',
                    [user_id],
                    (err, row) => {
                        if (err) reject(err);
                        else resolve(row);
                    }
                );
            });

            // Update stats with correct values
            await new Promise((resolve, reject) => {
                db.run(
                    `UPDATE challenge_stats 
                     SET total_challenges = ?,
                         challenges_won = ?,
                         challenges_lost = ?,
                         challenges_drawn = ?,
                         current_win_streak = ?,
                         best_win_streak = MAX(best_win_streak, ?)
                     WHERE user_id = ?`,
                    [totalChallenges, wins, losses, draws, currentWinStreak, currentWinStreak, user_id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            console.log(`  ✓ Updated stats for ${user?.username || user_id}:`);
            console.log(`    Total: ${oldStats.total_challenges} → ${totalChallenges}`);
            console.log(`    Wins: ${oldStats.challenges_won} → ${wins}`);
            console.log(`    Losses: ${oldStats.challenges_lost} → ${losses}`);
            console.log(`    Draws: ${oldStats.challenges_drawn} → ${draws}`);
            console.log(`    Current Streak: ${oldStats.current_win_streak} → ${currentWinStreak}\n`);
        }

        console.log('✅ Challenge stats fixed successfully!\n');

        // Show summary
        console.log('📊 Summary of all challenge stats:');
        const allStats = await new Promise((resolve, reject) => {
            db.all(
                `SELECT cs.*, u.username 
                 FROM challenge_stats cs 
                 JOIN users u ON cs.user_id = u.id 
                 ORDER BY cs.total_challenges DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        allStats.forEach(stat => {
            console.log(`  ${stat.username}: ${stat.total_challenges} challenges, ${stat.challenges_won}W-${stat.challenges_lost}L-${stat.challenges_drawn}D`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing challenge stats:', err);
        process.exit(1);
    }
}

// Wait for DB to be ready
setTimeout(() => {
    fixChallengeStats();
}, 1000);
