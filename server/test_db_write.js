const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const dbPath = path.resolve(__dirname, 'server/quizmaster.db');
console.log('Opening DB at:', dbPath);

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Error opening DB:', err.message);
        process.exit(1);
    }
    console.log('Connected to DB');
});

db.run('CREATE TABLE IF NOT EXISTS test_write (id INTEGER PRIMARY KEY)', (err) => {
    if (err) {
        console.error('Error creating table:', err.message);
        // process.exit(1);
    } else {
        console.log('Table created/verified');
    }
});

db.run('INSERT INTO test_write DEFAULT VALUES', function (err) {
    if (err) {
        console.error('Error inserting:', err.message);
    } else {
        console.log('Insert successful, ID:', this.lastID);
    }
    db.close();
});
