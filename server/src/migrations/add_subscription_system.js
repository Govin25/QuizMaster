const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.join(__dirname, '../../quiz.db');
const db = new sqlite3.Database(dbPath);

console.log('🔄 Starting subscription system migration...\n');

db.serialize(() => {
    // 1. Add subscription fields to users table
    console.log('📝 Adding subscription fields to users table...');

    db.run(`ALTER TABLE users ADD COLUMN subscription_tier VARCHAR(20) DEFAULT 'free'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding subscription_tier:', err.message);
        } else {
            console.log('✅ Added subscription_tier column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN subscription_status VARCHAR(20) DEFAULT 'active'`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding subscription_status:', err.message);
        } else {
            console.log('✅ Added subscription_status column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN subscription_start_date DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding subscription_start_date:', err.message);
        } else {
            console.log('✅ Added subscription_start_date column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN subscription_end_date DATETIME`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding subscription_end_date:', err.message);
        } else {
            console.log('✅ Added subscription_end_date column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN stripe_customer_id VARCHAR(255)`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding stripe_customer_id:', err.message);
        } else {
            console.log('✅ Added stripe_customer_id column');
        }
    });

    db.run(`ALTER TABLE users ADD COLUMN stripe_subscription_id VARCHAR(255)`, (err) => {
        if (err && !err.message.includes('duplicate column')) {
            console.error('Error adding stripe_subscription_id:', err.message);
        } else {
            console.log('✅ Added stripe_subscription_id column\n');
        }
    });

    // 2. Create user_usage table
    console.log('📝 Creating user_usage table...');

    db.run(`
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
    `, (err) => {
        if (err) {
            console.error('Error creating user_usage table:', err.message);
        } else {
            console.log('✅ Created user_usage table');
        }
    });

    // 3. Create index for performance
    db.run(`
        CREATE INDEX IF NOT EXISTS idx_user_usage_user_month 
        ON user_usage(user_id, month)
    `, (err) => {
        if (err) {
            console.error('Error creating index:', err.message);
        } else {
            console.log('✅ Created index on user_usage\n');
        }
    });

    // 4. Create subscription_history table
    console.log('📝 Creating subscription_history table...');

    db.run(`
        CREATE TABLE IF NOT EXISTS subscription_history (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            from_tier VARCHAR(20),
            to_tier VARCHAR(20),
            changed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            reason VARCHAR(255),
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `, (err) => {
        if (err) {
            console.error('Error creating subscription_history table:', err.message);
        } else {
            console.log('✅ Created subscription_history table\n');
        }
    });

    // 5. Initialize existing users with free tier
    console.log('📝 Initializing existing users with free tier...');

    db.run(`
        UPDATE users 
        SET subscription_tier = 'free', 
            subscription_status = 'active',
            subscription_start_date = CURRENT_TIMESTAMP
        WHERE subscription_tier IS NULL OR subscription_tier = ''
    `, function (err) {
        if (err) {
            console.error('Error initializing users:', err.message);
        } else {
            console.log(`✅ Initialized ${this.changes} users with free tier\n`);
        }

        // Close database connection
        db.close((err) => {
            if (err) {
                console.error('Error closing database:', err.message);
            } else {
                console.log('✅ Migration completed successfully!');
                console.log('\n📊 Summary:');
                console.log('   - Added 6 subscription columns to users table');
                console.log('   - Created user_usage table for tracking');
                console.log('   - Created subscription_history table for audit');
                console.log('   - Initialized existing users with free tier\n');
            }
        });
    });
});
