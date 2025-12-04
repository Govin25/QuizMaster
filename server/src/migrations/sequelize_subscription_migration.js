/**
 * Sequelize Migration for Subscription System
 * Run with: node src/migrations/sequelize_subscription_migration.js
 */

const { sequelize, User } = require('../models/sequelize');

async function migrate() {
    try {
        console.log('🔄 Starting Sequelize subscription migration...\n');

        // Sync User model to add new columns
        console.log('📝 Syncing User model with new subscription fields...');
        await User.sync({ alter: true });
        console.log('✅ User model synced successfully\n');

        // Create user_usage table
        console.log('📝 Creating user_usage table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS user_usage (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                month VARCHAR(7) NOT NULL,
                ai_quiz_count INTEGER DEFAULT 0,
                document_quiz_count INTEGER DEFAULT 0,
                video_quiz_count INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
                UNIQUE(user_id, month)
            )
        `);
        console.log('✅ user_usage table created\n');

        // Create index
        console.log('📝 Creating index on user_usage...');
        await sequelize.query(`
            CREATE INDEX IF NOT EXISTS idx_user_usage_user_month 
            ON user_usage(user_id, month)
        `);
        console.log('✅ Index created\n');

        // Create subscription_history table
        console.log('📝 Creating subscription_history table...');
        await sequelize.query(`
            CREATE TABLE IF NOT EXISTS subscription_history (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                from_tier VARCHAR(20),
                to_tier VARCHAR(20),
                changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                reason VARCHAR(255),
                FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
            )
        `);
        console.log('✅ subscription_history table created\n');

        // Initialize existing users with free tier
        console.log('📝 Initializing existing users with free tier...');
        const [results] = await sequelize.query(`
            UPDATE users 
            SET subscription_tier = 'free', 
                subscription_status = 'active',
                subscription_start_date = CURRENT_TIMESTAMP
            WHERE subscription_tier IS NULL OR subscription_tier = ''
        `);
        console.log(`✅ Initialized ${results.affectedRows || 0} users\n`);

        console.log('✅ Migration completed successfully!\n');
        console.log('📊 Summary:');
        console.log('   - Added subscription fields to users table');
        console.log('   - Created user_usage table');
        console.log('   - Created subscription_history table');
        console.log('   - Initialized existing users with free tier\n');

        process.exit(0);
    } catch (error) {
        console.error('❌ Migration failed:', error);
        process.exit(1);
    }
}

migrate();
