# Database Migrations Guide

This document explains how to manage database schema changes using Sequelize migrations in the QuizMaster project.

## Overview

We use Sequelize CLI for database migrations to:
- Track schema changes over time
- Apply changes consistently across environments
- Enable rollback capabilities
- Preserve data during schema updates
- Support both SQLite (development) and PostgreSQL (production)

## Quick Start

### Check Migration Status
```bash
npm run migrate:status
```

### Run Pending Migrations
```bash
npm run migrate
```

### Rollback Last Migration
```bash
npm run migrate:undo
```

## Fresh Database Setup

When setting up a new environment (new team member, staging, production), simply run:

```bash
# Clone the repository
git clone <repo-url>
cd server

# Install dependencies
npm install

# Run migrations to create all tables
npm run migrate
```

This will:
1. Create all database tables in the correct order
2. Add all foreign key constraints
3. Create all indexes for optimal performance
4. Set up the complete schema matching your Sequelize models

**No manual SQL scripts needed!**

## PostgreSQL Deployment

When deploying to production with PostgreSQL:

1. **Set environment variables**:
   ```bash
   export NODE_ENV=production
   export DB_HOST=your-postgres-host
   export DB_PORT=5432
   export DB_NAME=quizmaster
   export DB_USER=your-db-user
   export DB_PASSWORD=your-db-password
   ```

2. **Run migrations**:
   ```bash
   npm run migrate
   ```

The same migrations work for both SQLite (development) and PostgreSQL (production).

## Creating New Migrations

### 1. Generate Migration File
```bash
npm run migration:create your-migration-name
```

This creates a new migration file in `src/migrations/` with a timestamp prefix.

### 2. Edit the Migration File

Each migration has two methods:

**`up` method**: Defines changes to apply
```javascript
async up(queryInterface, Sequelize) {
  await queryInterface.addColumn('table_name', 'column_name', {
    type: Sequelize.STRING,
    allowNull: false,
  });
}
```

**`down` method**: Defines how to rollback changes
```javascript
async down(queryInterface, Sequelize) {
  await queryInterface.removeColumn('table_name', 'column_name');
}
```

### 3. Run the Migration
```bash
npm run migrate
```

## Common Migration Operations

### Adding a Column
```javascript
await queryInterface.addColumn('users', 'email', {
  type: Sequelize.STRING,
  allowNull: true,
  unique: true,
});
```

### Removing a Column
```javascript
await queryInterface.removeColumn('users', 'old_column');
```

### Creating a Table
```javascript
await queryInterface.createTable('new_table', {
  id: {
    type: Sequelize.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  name: {
    type: Sequelize.STRING,
    allowNull: false,
  },
  created_at: {
    type: Sequelize.DATE,
    defaultValue: Sequelize.NOW,
  },
});
```

### Adding an Index
```javascript
await queryInterface.addIndex('users', ['email'], {
  name: 'users_email_idx',
  unique: true,
});
```

### Changing Column Type
```javascript
await queryInterface.changeColumn('users', 'age', {
  type: Sequelize.INTEGER,
  allowNull: false,
});
```

## Best Practices

### 1. Always Include Down Method
Every migration should have a corresponding `down` method for rollback.

### 2. Test Migrations Locally First
Run migrations on your local database before deploying to production.

### 3. Make Migrations Atomic
Each migration should represent a single logical change.

### 4. Never Modify Existing Migrations
Once a migration has been run in production, create a new migration instead of modifying the old one.

### 5. Use Transactions for Complex Changes
```javascript
async up(queryInterface, Sequelize) {
  const transaction = await queryInterface.sequelize.transaction();
  try {
    await queryInterface.addColumn('users', 'email', {
      type: Sequelize.STRING,
    }, { transaction });
    
    await queryInterface.addIndex('users', ['email'], {
      name: 'users_email_idx',
    }, { transaction });
    
    await transaction.commit();
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}
```

### 6. Handle Data Migrations Carefully
When migrating data, ensure you handle null values and edge cases:
```javascript
async up(queryInterface, Sequelize) {
  // First add the column as nullable
  await queryInterface.addColumn('users', 'status', {
    type: Sequelize.STRING,
    allowNull: true,
  });
  
  // Then populate it with default values
  await queryInterface.sequelize.query(
    "UPDATE users SET status = 'active' WHERE status IS NULL"
  );
  
  // Finally make it non-nullable
  await queryInterface.changeColumn('users', 'status', {
    type: Sequelize.STRING,
    allowNull: false,
  });
}
```

## Environment-Specific Considerations

### SQLite (Development)
- Supports most operations but has limitations on ALTER TABLE
- Some operations require table recreation
- Foreign key constraints must be explicitly enabled

### PostgreSQL (Production)
- Full ALTER TABLE support
- Better concurrent migration support
- Use `CASCADE` carefully when dropping columns/tables

## Migration Workflow

### Development
1. Create migration: `npm run migration:create add-feature`
2. Edit migration file in `src/migrations/`
3. Run migration: `npm run migrate`
4. Test the changes
5. If issues, rollback: `npm run migrate:undo`
6. Fix and re-run

### Production Deployment
1. Backup database before deployment
2. Run `npm run migrate:status` to see pending migrations
3. Run `npm run migrate` to apply changes
4. Verify application works correctly
5. If issues, rollback: `npm run migrate:undo`

## Troubleshooting

### Migration Already Executed
If you see "Migration has already been executed", check the `SequelizeMeta` table:
```sql
SELECT * FROM SequelizeMeta;
```

### Migration Failed Midway
If a migration fails partway through:
1. Check database state manually
2. Fix any inconsistencies
3. Mark migration as complete or rollback manually
4. Re-run migration if needed

### Schema Out of Sync
If your database schema doesn't match your models:
1. Check migration status: `npm run migrate:status`
2. Run pending migrations: `npm run migrate`
3. If needed, create a new migration to fix discrepancies

## File Structure

```
server/
├── .sequelizerc              # Sequelize CLI configuration
├── src/
│   ├── config/
│   │   └── database.js       # Database configuration
│   ├── migrations/           # Migration files (timestamped)
│   ├── models/
│   │   └── sequelize/        # Sequelize model definitions
│   └── seeders/              # Seed data files (optional)
└── package.json              # Migration scripts
```

## Additional Resources

- [Sequelize Migrations Documentation](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Sequelize CLI Documentation](https://github.com/sequelize/cli)
- [QueryInterface API](https://sequelize.org/api/v6/class/src/dialects/abstract/query-interface.js~queryinterface)
