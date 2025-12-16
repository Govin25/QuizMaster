const db = require('./src/db');
const logger = require('./src/utils/logger');

/**
 * Fix group challenge stats for existing users
 * Recalculates stats based on actual completed group challenges
 */
async function fixGroupChallengeStats() {
    console.log('🔧 Fixing group challenge stats for existing users...\n');

    try {
        // Get all users who have group challenge stats
        const usersWithStats = await new Promise((resolve, reject) => {
            db.all('SELECT user_id FROM group_challenge_stats', (err, rows) => {
                if (err) reject(err);
                else resolve(rows || []);
            });
        });

        console.log(`Found ${usersWithStats.length} users with group challenge stats\n`);

        for (const { user_id } of usersWithStats) {
            // Get user info
            const user = await new Promise((resolve, reject) => {
                db.get('SELECT username FROM users WHERE id = ?', [user_id], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
            });

            console.log(`Processing user: ${user?.username || user_id}`);

            // Get all completed group challenges for this user
            const completedChallenges = await new Promise((resolve, reject) => {
                db.all(
                    `SELECT gcp.rank, gcp.score
                     FROM group_challenges gc
                     JOIN group_challenge_participants gcp ON gc.id = gcp.group_challenge_id
                     WHERE gc.status = 'completed' AND gcp.user_id = ?
                     ORDER BY gc.completed_at ASC`,
                    [user_id],
                    (err, rows) => {
                        if (err) reject(err);
                        else resolve(rows || []);
                    }
                );
            });

            // Calculate stats
            const totalChallenges = completedChallenges.length;
            const firstPlaceCount = completedChallenges.filter(c => c.rank === 1).length;
            const secondPlaceCount = completedChallenges.filter(c => c.rank === 2).length;
            const thirdPlaceCount = completedChallenges.filter(c => c.rank === 3).length;

            const totalScore = completedChallenges.reduce((sum, c) => sum + (c.score || 0), 0);

            const ranks = completedChallenges.map(c => c.rank).filter(r => r > 0);
            const bestRank = ranks.length > 0 ? Math.min(...ranks) : null;
            const avgRank = ranks.length > 0 ? ranks.reduce((sum, r) => sum + r, 0) / ranks.length : null;

            // Get old stats for comparison
            const oldStats = await new Promise((resolve, reject) => {
                db.get(
                    'SELECT * FROM group_challenge_stats WHERE user_id = ?',
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
                    `UPDATE group_challenge_stats
                     SET total_group_challenges = ?,
                         first_place_finishes = ?,
                         second_place_finishes = ?,
                         third_place_finishes = ?,
                         best_rank = ?,
                         average_rank = ?,
                         total_score = ?,
                         updated_at = CURRENT_TIMESTAMP
                     WHERE user_id = ?`,
                    [totalChallenges, firstPlaceCount, secondPlaceCount, thirdPlaceCount, bestRank, avgRank, totalScore, user_id],
                    (err) => {
                        if (err) reject(err);
                        else resolve();
                    }
                );
            });

            console.log(`  ✓ Updated stats for ${user?.username || user_id}:`);
            console.log(`    Total Challenges: ${oldStats?.total_group_challenges || 0} → ${totalChallenges}`);
            console.log(`    1st Place: ${oldStats?.first_place_finishes || 0} → ${firstPlaceCount}`);
            console.log(`    2nd Place: ${oldStats?.second_place_finishes || 0} → ${secondPlaceCount}`);
            console.log(`    3rd Place: ${oldStats?.third_place_finishes || 0} → ${thirdPlaceCount}`);
            console.log(`    Best Rank: ${oldStats?.best_rank || 'N/A'} → ${bestRank || 'N/A'}`);
            console.log(`    Avg Rank: ${oldStats?.average_rank?.toFixed(2) || 'N/A'} → ${avgRank?.toFixed(2) || 'N/A'}`);
            console.log(`    Total Score: ${oldStats?.total_score || 0} → ${totalScore}\n`);
        }

        console.log('✅ Group challenge stats fixed successfully!\n');

        // Show summary
        console.log('📊 Summary of all group challenge stats:');
        const allStats = await new Promise((resolve, reject) => {
            db.all(
                `SELECT gcs.*, u.username
                 FROM group_challenge_stats gcs
                 JOIN users u ON gcs.user_id = u.id
                 ORDER BY gcs.total_group_challenges DESC`,
                (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows || []);
                }
            );
        });

        allStats.forEach(stat => {
            const places = `${stat.first_place_finishes}🥇-${stat.second_place_finishes}🥈-${stat.third_place_finishes}🥉`;
            const bestRank = stat.best_rank ? `Best: #${stat.best_rank}` : 'N/A';
            console.log(`  ${stat.username}: ${stat.total_group_challenges} challenges, ${places}, ${bestRank}`);
        });

        process.exit(0);
    } catch (err) {
        console.error('❌ Error fixing group challenge stats:', err);
        process.exit(1);
    }
}

// Wait for DB to be ready
setTimeout(() => {
    fixGroupChallengeStats();
}, 1000);
